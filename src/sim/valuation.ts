// Your lab's valuation (SIMULATION §19.2, §19.5; stage C7b): trailing ROE,
// revenue growth, and the revenue multiple that values the company at ARR ×
// a multiple set by growth and model quality, with book value as the floor.
// The private valuation per share is that value with a private discount; the
// public price model lives in equityPrice.ts.
import { PRIVATE_VALUATION, QUARTERS_PER_YEAR, VALUATION } from '../config/balance';
import { companyArr } from './arr';
import { balanceSheet } from './balanceSheet';
import { dpow } from './detmath';
import { clamp } from './math';
import { bookValuePerShare } from './shares';
import type { GameState } from './state';
import { activeModel, modelQuality, qualityBar } from './underwriting';

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

/**
 * §19.2: the latest quarter's revenue against the same quarter a year earlier.
 * With under five quarters reported, the growth since the first one, scaled to
 * a year; 0 before two quarters or while the base is zero.
 */
export function revenueGrowth(state: GameState): number {
  return quarterlyGrowth(state.history.quarterly);
}

/** §19.2 growth over a list of reported quarters, oldest first (yours or a rival's). */
export function quarterlyGrowth(q: readonly { revenue: number }[]): number {
  if (q.length < 2) return 0;
  const last = q[q.length - 1]!.revenue;
  const back = Math.min(QUARTERS_PER_YEAR, q.length - 1);
  const base = q[q.length - 1 - back]!.revenue;
  if (base <= 0 || last <= 0) return 0;
  return dpow(last / base, QUARTERS_PER_YEAR / back) - 1;
}

/** §19.2: base + growthSlope × growth + qualitySlope × the model's lead over the bar, clamped. */
export function revenueMultiple(state: GameState): number {
  return multipleFor(revenueGrowth(state), modelQuality(activeModel(state)) - qualityBar(state));
}

/** §19.2: the multiple for a growth rate and a model lead over the bar. */
export function multipleFor(growth: number, lead: number): number {
  growth = clamp(growth, 0, VALUATION.growthCap);
  return clamp(
    VALUATION.base + VALUATION.growthSlope * growth + VALUATION.qualitySlope * lead,
    ...VALUATION.range,
  );
}

/** §19.2: what the business is worth per share: ARR × multiple, never below book value. */
export function fundamentalPerShare(
  state: GameState,
  equity = balanceSheet(state).equity,
  discount = 1,
): number {
  const shares = Math.max(1, state.company.sharesOutstanding);
  const byRevenue = (companyArr(state) * revenueMultiple(state) * discount) / shares;
  return Math.max(0, bookValuePerShare(state, equity), byRevenue);
}

/** §19.2: valuation/share = max(BVPS, ARR × multiple × 0.8 ÷ shares). */
export function privateValuation(state: GameState): number {
  return fundamentalPerShare(state, undefined, PRIVATE_VALUATION.discount);
}

/**
 * What the whole company is worth today: market capitalisation once listed,
 * else the undiscounted fundamental value (ARR × multiple, book value as the
 * floor) across every share. The valuation milestones read this (DESIGN §5.18).
 */
export function companyValuation(state: GameState): number {
  const shares = Math.max(1, state.company.sharesOutstanding);
  const perShare = state.stock.status === 'public' ? state.stock.price : fundamentalPerShare(state);
  return perShare * shares;
}
