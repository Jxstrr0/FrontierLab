// Milestones (DESIGN §5.18): checked at the end of every weekly tick from the
// state itself, so a save from before milestones existed catches up on load.
// Each one is recorded once with the week it was reached.
import { MILESTONE_GOALS, MILESTONE_HQ_DEPTS, RESEARCHERS } from '../config/balance';
import { CITIES } from '../data/cities';
import { MILESTONES } from '../data/milestones';
import { companyArr } from './arr';
import { MAX_OFFICE_SIZE } from './branch/officeSize';
import { pushEvent } from './events';
import { yourClubs } from './franchise';
import { deptDesks } from './hq';
import { netWorth } from './netWorth';
import { bestRivalModel } from './rivalModels';
import type { GameState } from './state';
import { yourResearchers } from './talent';
import { activeModel, modelQuality } from './underwriting';
import { companyValuation } from './valuation';

const openBranches = (s: GameState) => Object.values(s.branches).filter((b) => b.status === 'open');
const flagships = (s: GameState) =>
  openBranches(s).filter((b) => (b.size ?? 0) >= MAX_OFFICE_SIZE).length;
const cityCount = (s: GameState) => new Set(openBranches(s).map((b) => b.cityId)).size;
const countryCount = (s: GameState) =>
  new Set(openBranches(s).map((b) => CITIES[b.cityId]?.country)).size;

const REACHED: Record<string, (s: GameState) => boolean> = {
  first_branch: (s) => openBranches(s).length > 0,
  first_data_center: (s) => Object.values(s.dataCenters).some((d) => d.openedWeek !== undefined),
  three_data_centers: (s) =>
    Object.values(s.dataCenters).filter((d) => d.openedWeek !== undefined).length >=
    MILESTONE_GOALS.dataCenters,
  first_loan: (s) => s.underwriting.loansBooked > 0,
  first_profit: (s) => s.history.quarterly.some((q) => q.netIncome > 0),
  // C2a: ids kept for saves; one office per city, so these now count Flagships.
  ten_branches: (s) => flagships(s) >= 1,
  hq_staffed: (s) =>
    MILESTONE_HQ_DEPTS.every((d) => deptDesks(s, d) > 0 && (s.hq.coverage[d]?.kPrime ?? 0) >= 1),
  ipo: (s) => s.stock.status === 'public',
  first_acquisition: (s) => s.mergers.deals.length > 0,
  hundred_branches: (s) => flagships(s) >= MILESTONE_GOALS.flagships,
  ten_cities: (s) => cityCount(s) >= MILESTONE_GOALS.cities,
  // C8f: id kept for saves; now a billion in ARR.
  deposits_1b: (s) => companyArr(s) >= MILESTONE_GOALS.arr,
  five_countries: (s) => countryCount(s) >= MILESTONE_GOALS.countries,
  // 2026-10-27: ids kept for saves; the three "assets" goals now read the valuation (§19.2).
  assets_10b: (s) => companyValuation(s) >= MILESTONE_GOALS.valuation,
  five_acquisitions: (s) => s.mergers.deals.length >= MILESTONE_GOALS.acquisitions,
  club_owner: (s) => yourClubs(s).length > 0,
  twenty_cities: (s) => cityCount(s) >= MILESTONE_GOALS.allCities,
  ten_countries: (s) => countryCount(s) >= MILESTONE_GOALS.allCountries,
  billionaire: (s) => netWorth(s).total >= MILESTONE_GOALS.founderWorth,
  rich_list: (s) => s.personal.empire.richList.rank !== undefined,
  ten_acquisitions: (s) => s.mergers.deals.length >= MILESTONE_GOALS.manyAcquisitions,
  assets_100b: (s) => companyValuation(s) >= MILESTONE_GOALS.bigValuation,
  rich_list_1: (s) => s.personal.empire.richList.rank === 1,
  worth_10b: (s) => netWorth(s).total >= MILESTONE_GOALS.richFounder,
  assets_1t: (s) => companyValuation(s) >= MILESTONE_GOALS.hugeValuation,
  // AI milestones (2026-10-27)
  first_model: (s) => s.training.generation >= 1,
  model_gen_5: (s) => s.training.generation >= MILESTONE_GOALS.modelGeneration,
  // Your model beats every rival's (§16.12); needs at least one rival model to beat.
  leaderboard_top: (s) => {
    const best = bestRivalModel(s);
    return best !== undefined && modelQuality(activeModel(s)) > best;
  },
  full_research_team: (s) => yourResearchers(s).length >= RESEARCHERS.maxTeam,
  // tierWeeks is 0 on the week the tier is entered, so +1 counts that week too.
  safety_strong_2y: (s) =>
    s.company.tier === 'strong' && s.company.tierWeeks + 1 >= MILESTONE_GOALS.strongTierWeeks,
  owned_compute_quarter: (s) => (s.compute.ownedStreak ?? 0) >= MILESTONE_GOALS.ownedComputeWeeks,
  big_contract: (s) =>
    Object.values(s.businesses).some(
      (b) => b.vendor?.type === 'player' && (b.contractValue ?? 0) >= MILESTONE_GOALS.bigContract,
    ),
};

/** Records newly reached milestones. `quiet` skips the events (catching up an old save). */
export function checkMilestones(state: GameState, quiet = false): void {
  for (const m of MILESTONES) {
    if (state.milestones[m.id] !== undefined) continue;
    if (!REACHED[m.id]?.(state)) continue;
    state.milestones[m.id] = state.clock.week;
    if (!quiet) pushEvent(state, 'MILESTONE', { id: m.id, title: m.title }, 1);
  }
}
