// Bank runs (SIMULATION §13.8): the run's trigger condition, start and end,
// and the public statement's odds. (The emergency recapitalisation became the
// mandated pause in stage C7a: mandatedPause.ts.)
import { BANK_RUN } from '../../config/balance';
import { pushEvent } from '../events';
import type { GameState } from '../state';

// ─── Bank runs ────────────────────────────────────────────────────────────────

/** §13.8: average overall < 2.6 AND (tier Restricted/Critical OR liquidity ratio < 0.08). */
export function bankRunCondition(state: GameState): boolean {
  const open = Object.values(state.branches).filter((b) => b.status === 'open');
  if (open.length === 0) return false;
  const avg = open.reduce((s, b) => s + b.ratings.overall, 0) / open.length;
  if (avg >= BANK_RUN.maxOverall) return false;
  const tier = state.company.tier;
  const lr = state.company.liquidityRatio;
  return (
    tier === 'restricted' || tier === 'critical' || (lr !== null && lr < BANK_RUN.maxLiquidity)
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

/** Public statement: 30% + 5% per capital-ratio point above 8% (capped). */
export function statementOdds(state: GameState): number {
  const points = Math.max(0, (state.company.capitalRatio - BANK_RUN.statementFromCr) * 100);
  return Math.min(
    BANK_RUN.statementMax,
    BANK_RUN.statementBase + BANK_RUN.statementPerPoint * points,
  );
}
