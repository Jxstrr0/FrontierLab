// Milestones (DESIGN §5.18): checked at the end of every weekly tick from the
// state itself, so a save from before milestones existed catches up on load.
// Each one is recorded once with the week it was reached.
import { MILESTONE_GOALS, MILESTONE_HQ_DEPTS } from '../config/balance';
import { CITIES } from '../data/cities';
import { MILESTONES } from '../data/milestones';
import { totalDeposits } from './balanceSheet';
import { pushEvent } from './events';
import { deptDesks } from './hq';
import { netWorth } from './netWorth';
import type { GameState } from './state';

const openBranches = (s: GameState) => Object.values(s.branches).filter((b) => b.status === 'open');

const REACHED: Record<string, (s: GameState) => boolean> = {
  first_branch: (s) => openBranches(s).length > 0,
  first_loan: (s) => s.underwriting.loansBooked > 0,
  first_profit: (s) => s.history.quarterly.some((q) => q.netIncome > 0),
  ten_branches: (s) => openBranches(s).length >= MILESTONE_GOALS.branches,
  hq_staffed: (s) =>
    MILESTONE_HQ_DEPTS.every((d) => deptDesks(s, d) > 0 && (s.hq.coverage[d]?.kPrime ?? 0) >= 1),
  ipo: (s) => s.stock.status === 'public',
  first_acquisition: (s) => s.mergers.deals.length > 0,
  deposits_1b: (s) => totalDeposits(s) >= MILESTONE_GOALS.deposits,
  five_countries: (s) =>
    new Set(openBranches(s).map((b) => CITIES[b.cityId]?.country)).size >=
    MILESTONE_GOALS.countries,
  billionaire: (s) => netWorth(s).total >= MILESTONE_GOALS.founderWorth,
  rich_list_1: (s) => s.personal.empire.richList.rank === 1,
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
