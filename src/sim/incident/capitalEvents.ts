// Outage rumours (SIMULATION §13.8, the `BANK_RUN` case): the rumour's trigger
// condition, start and end, and the public statement's odds. (The emergency
// recapitalisation became the mandated pause in stage C7a: mandatedPause.ts.)
import { BANK_RUN } from '../../config/balance';
import type { Tier } from '../../data/types';
import { pushEvent } from '../events';
import type { GameState } from '../state';

const TIER_RANK: Record<Tier, number> = {
  strong: 4,
  adequate: 3,
  watch: 2,
  restricted: 1,
  critical: 0,
};

/** The safety tier fell within the last BANK_RUN.tierDropWeeks (read from the weekly closes). */
export function tierDropped(state: GameState): boolean {
  const weeks = state.company.tierWeeks;
  if (weeks >= BANK_RUN.tierDropWeeks) return false;
  const history = state.history.weekly;
  // The close `weeks + 1` weeks back is the last one in the previous tier.
  const before = history[history.length - 2 - weeks];
  return before !== undefined && TIER_RANK[before.tier] > TIER_RANK[state.company.tier];
}

/**
 * §13.8: average overall rating < 2.6 AND one of: a compute outage is running,
 * the safety tier is Restricted or Critical, the tier dropped within the last
 * tierDropWeeks, or the average rating has slid under slideOverall.
 */
export function bankRunCondition(state: GameState): boolean {
  const open = Object.values(state.branches).filter((b) => b.status === 'open');
  if (open.length === 0) return false;
  const avg = open.reduce((s, b) => s + b.ratings.overall, 0) / open.length;
  if (avg >= BANK_RUN.maxOverall) return false;
  const tier = state.company.tier;
  return (
    state.compute.outageWeeksLeft > 0 ||
    tier === 'restricted' ||
    tier === 'critical' ||
    tierDropped(state) ||
    avg < BANK_RUN.slideOverall
  );
}

export function startBankRun(state: GameState, weeks: number): void {
  state.incidents.bankRunWeeksLeft = weeks;
  pushEvent(state, 'BANK_RUN', { bank: state.meta.bankName }, 1);
}

export function endBankRun(state: GameState): void {
  if (state.incidents.bankRunWeeksLeft === undefined) return;
  delete state.incidents.bankRunWeeksLeft;
  pushEvent(state, 'BANK_RUN_ENDED', { bank: state.meta.bankName }, 2);
}

/** Public statement: 30% + 2% per safety-ratio point above 70% (capped at 95%). */
export function statementOdds(state: GameState): number {
  const points = Math.max(0, (state.company.safetyRatio - BANK_RUN.statementFromSr) * 100);
  return Math.min(
    BANK_RUN.statementMax,
    BANK_RUN.statementBase + BANK_RUN.statementPerPoint * points,
  );
}
