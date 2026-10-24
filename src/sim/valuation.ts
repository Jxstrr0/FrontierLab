// Your bank's valuation (SIMULATION §19.2, §19.5): trailing ROE and the
// private valuation per share. The public price model lives in market code.
import { COE, PRIVATE_VALUATION, QUARTERS_PER_YEAR } from '../config/balance';
import { balanceSheet } from './balanceSheet';
import { clamp } from './math';
import { bookValuePerShare } from './shares';
import type { GameState } from './state';

/** Trailing net income over the last four reported quarters (annualised if fewer). */
export function netIncomeTtm(state: GameState): number {
  const recent = state.history.quarterly.slice(-QUARTERS_PER_YEAR);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((s, q) => s + q.netIncome, 0);
  return (sum * QUARTERS_PER_YEAR) / recent.length;
}

/** ROE_ttm = trailing net income ÷ current equity (0 when equity ≤ 0). */
export function roeTtm(state: GameState, equity = balanceSheet(state).equity): number {
  return equity > 0 ? netIncomeTtm(state) / equity : 0;
}

/** §19.2: valuation/share = BVPS × clamp(ROE_ttm / COE, 0.5, 2.5) × 0.8. */
export function privateValuation(state: GameState): number {
  const equity = balanceSheet(state).equity;
  const pb =
    clamp(roeTtm(state, equity) / COE, ...PRIVATE_VALUATION.pb) * PRIVATE_VALUATION.discount;
  return Math.max(0, bookValuePerShare(state, equity) * pb);
}
