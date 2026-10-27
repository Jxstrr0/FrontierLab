// Runway (SIMULATION §15): how many months corporate cash lasts at the lab's
// current net burn, and its tier. It replaced the bank game's credit ratio:
// lenders price debt on it, and buybacks, acquisitions and the CFO's buying,
// investing and share sales are gated by it. Net burn is the average weekly
// loss over the last EXEC_DELEGATION.revenueWeeks closes, the same window as
// cash cover (cashCover.ts). A lab that is not losing money, or has no closes
// yet, has no burn and counts as Strong. Pure: reads state only.
import { EXEC_DELEGATION as X, RUNWAY } from '../config/balance';
import type { RunwayTier } from '../data/types';
import type { GameState } from './state';

export interface RunwaySnapshot {
  cash: number;
  /** Average weekly net loss; 0 when the lab is profitable. */
  burn: number;
  /** Months of cash at that burn, or null when there is no burn. */
  months: number | null;
  tier: RunwayTier;
}

/** Average weekly net loss over the delegation's revenue window (0 if profitable). */
export function weeklyBurn(state: GameState): number {
  const recent = state.history.weekly.slice(-X.revenueWeeks);
  if (recent.length === 0) return 0;
  const income = recent.reduce((s, w) => s + w.netIncome, 0) / recent.length;
  return Math.max(0, -income);
}

/** The tier for a runway in months (null = no burn). Negative cash is Critical. */
export function runwayTierFor(months: number | null): RunwayTier {
  if (months === null) return 'strong';
  for (const t of RUNWAY.tiers) if (months >= t.minMonths) return t.tier;
  return 'critical';
}

/** Runway now, or after `cashDelta` leaves (negative) or joins corporate cash. */
export function runwaySnapshot(state: GameState, cashDelta = 0): RunwaySnapshot {
  const cash = state.company.cash + cashDelta;
  const burn = weeklyBurn(state);
  const months = burn > 0 ? Math.max(0, cash) / burn / RUNWAY.weeksPerMonth : null;
  const tier = cash < 0 ? 'critical' : runwayTierFor(months);
  return { cash, burn, months, tier };
}

/**
 * Cash the lab can spend while keeping `months` of runway (RUNWAY.gateMonths
 * by default): all of it when there is no burn.
 */
export function spendableCash(state: GameState, months: number = RUNWAY.gateMonths): number {
  const burn = weeklyBurn(state);
  const keep = burn * months * RUNWAY.weeksPerMonth;
  return Math.max(0, state.company.cash - keep);
}

/** True when the runway tier is Comfortable or Strong. */
export function runwayHealthy(tier: RunwayTier): boolean {
  return tier === 'strong' || tier === 'comfortable';
}
