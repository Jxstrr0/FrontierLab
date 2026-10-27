// Price competitiveness and price factors (SIMULATION §8 Rates, §9.7). Shared by
// ratings, demand, churn and the delegated manager.
import { CITIES } from '../../data/cities';
import {
  COMP_CLAMP,
  FEE_COMP_MIN,
  FEE_COMP_SCALE,
  FEE_PF_SCALE,
  FEE_STEP_MIN,
  PF_RATE_STEP,
  PRICE_FACTOR_CLAMP,
  RATE_COMP_STEP,
} from '../../config/balance';
import type { ProductSpec } from '../../data/products';
import { SEGMENT_SPECS } from '../../data/segments';
import type { SegmentId } from '../../data/types';
import { clamp } from '../math';
import type { Branch, GameState } from '../state';
import { savingsBoost } from '../incident/effects';

const isFee = (spec: ProductSpec) => spec.priceType !== 'rate';
const isDepositRate = (spec: ProductSpec) =>
  spec.priceType === 'rate' && spec.category === 'deposits';

/** Denominator floor for fee comparisons: $ for $ fees, pp for % fees. */
function feeFloor(spec: ProductSpec, table: { dollars: number; pct: number }): number {
  return spec.priceType === 'pctFee' ? table.pct : table.dollars;
}

/** c_p in [−2, +2]: positive means better for the customer than the market (§8). */
export function competitiveness(spec: ProductSpec, price: number, m: number): number {
  let c: number;
  if (isFee(spec)) c = (m - price) / Math.max(FEE_COMP_SCALE * m, feeFloor(spec, FEE_COMP_MIN));
  else if (isDepositRate(spec)) c = (price - m) / RATE_COMP_STEP;
  else c = (m - price) / RATE_COMP_STEP;
  return clamp(c, -COMP_CLAMP, COMP_CLAMP);
}

/** pf[s][p]: how price versus market changes take-up for a segment (§9.7). */
export function priceFactor(spec: ProductSpec, seg: SegmentId, price: number, m: number): number {
  const s = SEGMENT_SPECS[seg];
  if (isFee(spec)) {
    const [lo, hi] = PRICE_FACTOR_CLAMP.fee;
    const denom = Math.max(FEE_PF_SCALE * m, feeFloor(spec, FEE_STEP_MIN));
    return clamp(1 - (s.sensFee * (price - m)) / denom, lo, hi);
  }
  if (isDepositRate(spec)) {
    const [lo, hi] = PRICE_FACTOR_CLAMP.deposit;
    return clamp(1 + (s.sensDep * (price - m)) / PF_RATE_STEP, lo, hi);
  }
  const [lo, hi] = PRICE_FACTOR_CLAMP.loan;
  return clamp(1 - (s.sensLoan * (price - m)) / PF_RATE_STEP, lo, hi);
}

/**
 * How much worse than market a price is for churn purposes, in competitiveness
 * steps (≥ 0). Rate products use (m − price)/0.005; fee products compare fees.
 */
export function churnGap(spec: ProductSpec, price: number, m: number): number {
  return Math.max(0, -competitiveness(spec, price, m));
}

/** Whether HQ sets this office's prices and lineup: Apply-to-all on and no override (C2d2). */
export function followsHq(state: GameState, branch: Branch): boolean {
  return state.company.applyRatesToAll && !branch.ownPrices;
}

/** The price a branch actually charges: the HQ price when it follows HQ. */
export function branchPrice(state: GameState, branch: Branch, productId: string): number {
  return basePrice(state, branch, productId) + incidentBoost(state, branch, productId);
}

/** The price the player (or the manager) set, before incident boosts. */
export function basePrice(state: GameState, branch: Branch, productId: string): number {
  if (followsHq(state, branch)) {
    const p = companyPrice(state, branch.cityId, productId);
    if (p !== undefined) return p;
  }
  return branch.offered[productId]?.price ?? 0;
}

/** The HQ price for a product in a city's country (Apply-to-all), if its list has one. */
export function companyPrice(
  state: GameState,
  cityId: string,
  productId: string,
): number | undefined {
  const country = CITIES[cityId]?.country;
  return country ? state.company.companyPrices[country]?.[productId] : undefined;
}

/** Savings boosts from incident choices: price-war match, bank-run raise (§23). */
export function incidentBoost(state: GameState, branch: Branch, productId: string): number {
  const base = state.products.catalog[productId]?.base ?? productId;
  return base === 'savings' ? savingsBoost(state, branch.cityId) : 0;
}

export function isOffered(branch: Branch, productId: string): boolean {
  return branch.offered[productId]?.on === true;
}
