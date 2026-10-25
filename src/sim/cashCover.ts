// Cash cover (SCREENS §24, DESIGN §5.8.8): how many weeks of the bank's running
// costs corporate cash would pay for. Running costs are averaged over the last
// EXEC_DELEGATION.revenueWeeks closes, the same window the COO uses to keep an
// expansion reserve, so the Company screen, the build sheet, "Where to look"
// and the COO all read the same number. Pure: reads state only.
import { EXEC_DELEGATION as X } from '../config/balance';
import type { GameState } from './state';

/** Average weekly costs over the delegation's revenue window (revenue less net income). */
export function weeklyCosts(state: GameState): number {
  const recent = state.history.weekly.slice(-X.revenueWeeks);
  if (recent.length === 0) return 0;
  return recent.reduce((s, w) => s + Math.max(0, w.revenue - w.netIncome), 0) / recent.length;
}

/**
 * Weeks of running costs that `cash` (default: corporate cash) would cover, or
 * null before the first weekly close, when there are no costs to measure.
 */
export function cashCoverWeeks(state: GameState, cash = state.company.cash): number | null {
  const costs = weeklyCosts(state);
  if (costs <= 0) return null;
  return Math.max(0, cash) / costs;
}
