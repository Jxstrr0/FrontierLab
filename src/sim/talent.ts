// The talent war (stage C6c, SIMULATION §16.13): named AI researchers work for
// you, for a rival lab or for no one yet. Yours raise your training-run odds
// (more on their specialty) and are paid weekly; a rival's make its model
// releases bigger. Each quarter rivals bid for your researchers (the
// RESEARCHER_POACHED case decides), free researchers sign with rivals, and
// new graduates join the market. Hiring and releasing are commands in
// commands/talent.ts. Also the Chief Scientist's lift on training odds.
import { CHIEF_SCIENTIST, RESEARCHERS, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import { raiseIncident } from './incidents';
import { newId } from './ids';
import { spend } from './ledger';
import { roundToStep } from './math';
import { nominalIndex } from './nominal';
import { personName, randomAvatar } from './people';
import { stream, type Rng } from './rng';
import type { GameState, Researcher, RivalBank } from './state';

const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function activeRivals(state: GameState): RivalBank[] {
  return Object.values(state.rivals)
    .filter((r) => r.status === 'active')
    .sort(byId);
}

/** Every researcher, in id order. */
export function allResearchers(state: GameState): Researcher[] {
  return Object.values(state.talent.researchers).sort(byId);
}

/** Researchers who work for you. */
export function yourResearchers(state: GameState): Researcher[] {
  return allResearchers(state).filter((r) => r.employer?.type === 'player');
}

/** Researchers a rival lab employs. */
export function rivalResearchers(state: GameState, rivalId: string): Researcher[] {
  return allResearchers(state).filter(
    (r) => r.employer?.type === 'rival' && r.employer.id === rivalId,
  );
}

/** §16.13: the going salary a year for a researcher with this many stars. */
export function researcherMarketSalary(state: GameState, stars: number): number {
  const cityId = state.meta.homeCityId;
  const wage = (CITIES[cityId]?.wageIndex ?? 1) * nominalIndex(state, cityId);
  const r = RESEARCHERS;
  return roundToStep(r.salaryBase * (1 + r.salaryPerStar * (stars - 1)) * wage, r.salaryStep);
}

/** What hiring `r` costs: their salary (with the poaching premium from a rival) and a signing bonus. */
export function hireTerms(state: GameState, r: Researcher): { salary: number; signing: number } {
  const fromRival = r.employer?.type === 'rival';
  const base = Math.max(r.salary, researcherMarketSalary(state, r.stars));
  const salary = fromRival
    ? roundToStep(base * (1 + RESEARCHERS.poachPremium), RESEARCHERS.salaryStep)
    : base;
  const signing = fromRival ? (salary * RESEARCHERS.signingWeeks) / WEEKS_PER_YEAR : 0;
  return { salary, signing };
}

/** §16.13: the Chief Scientist's addition to a training run's score. */
export function chiefScientistBonus(state: GameState): number {
  const csci = state.executives.seats.csci;
  return csci ? (CHIEF_SCIENTIST.scoreMax * csci.expertise) / 100 : 0;
}

/** §16.13: your researchers' addition to a training run's score with this focus. */
export function researchBonus(state: GameState, focus?: number): number {
  let total = 0;
  for (const r of yourResearchers(state))
    total +=
      RESEARCHERS.scorePerStar * r.stars * (r.specialty === focus ? RESEARCHERS.focusMatch : 1);
  return Math.min(RESEARCHERS.maxBonus, total);
}

/** §16.13: extra quality on each of a rival's model releases from its researchers. */
export function rivalResearchGain(state: GameState, rivalId: string): number {
  return rivalResearchers(state, rivalId).reduce(
    (sum, r) => sum + RESEARCHERS.rivalGainPerStar * r.stars,
    0,
  );
}

function newResearcher(state: GameState, rng: Rng, employer?: Researcher['employer']): Researcher {
  const stars = rng.pickWeighted(
    RESEARCHERS.starWeights.map((weight, i) => ({ item: i + 1, weight })),
  );
  const r: Researcher = {
    id: newId(state, 'res'),
    name: personName(rng),
    portrait: randomAvatar(rng),
    specialty: rng.int(0, 4),
    stars,
    salary: researcherMarketSalary(state, stars),
    ...(employer ? { employer, joinedWeek: state.clock.week } : {}),
  };
  state.talent.researchers[r.id] = r;
  return r;
}

/** New game (and migration 15 → 16): the starting researchers, most at rival labs. */
export function seedResearchers(state: GameState): void {
  if (Object.keys(state.talent.researchers).length > 0) return;
  const rng = stream(state, 'talent');
  const rivals = activeRivals(state);
  for (let i = 0; i < RESEARCHERS.count; i++) {
    const atRival = rivals.length > 0 && rng.chance(RESEARCHERS.rivalShare);
    newResearcher(state, rng, atRival ? { type: 'rival', id: rng.pick(rivals).id } : undefined);
  }
}

/** Weekly salaries of your researchers. */
export function researcherPayroll(state: GameState): number {
  return yourResearchers(state).reduce((sum, r) => sum + r.salary / WEEKS_PER_YEAR, 0);
}

/** Tick step 8: pay your researchers (P&L line hqStaff). */
export function runTalent(state: GameState): void {
  const pay = researcherPayroll(state);
  if (pay > 0) spend(state, 'hqStaff', pay);
}

/** §16.13: the quarterly chance a rival bids for one of your researchers. */
export function poachChance(state: GameState, r: Researcher): number {
  const ratio = researcherMarketSalary(state, r.stars) / Math.max(1, r.salary);
  return Math.min(1, RESEARCHERS.poachQuarterly * ratio * ratio);
}

/**
 * Tick step 13, a quarter start: rivals bid for your researchers, researchers
 * at labs that closed or merged go back on the market, free researchers sign
 * with rivals, and graduates keep freeMin on the market.
 */
export function talentQuarter(state: GameState): void {
  const rng = stream(state, 'talent');
  const rivals = activeRivals(state);
  for (const r of allResearchers(state)) {
    if (
      r.employer?.type === 'rival' &&
      !rivals.some((x) => x.id === (r.employer as { id: string }).id)
    ) {
      delete r.employer;
      delete r.joinedWeek;
    }
  }
  if (rivals.length === 0) return;
  for (const r of yourResearchers(state)) {
    if (!rng.chance(poachChance(state, r))) continue;
    const rival = rng.pick(rivals);
    raiseIncident(state, 'RESEARCHER_POACHED', 'company', r.id, {
      researcherId: r.id,
      name: r.name,
      rivalId: rival.id,
      rival: rival.name,
    });
  }
  for (const r of allResearchers(state)) {
    if (r.employer || !rng.chance(RESEARCHERS.freeSignQuarterly)) continue;
    r.employer = { type: 'rival', id: rng.pick(rivals).id };
    r.joinedWeek = state.clock.week;
  }
  const free = allResearchers(state).filter((r) => !r.employer).length;
  for (let i = free; i < RESEARCHERS.freeMin; i++) newResearcher(state, rng);
}
