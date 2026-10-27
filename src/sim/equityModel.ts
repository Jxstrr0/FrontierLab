// The share-price formulas for your lab (SIMULATION §19.5; listed rivals share
// the sentiment walk and shocks): the mean-reverting sentiment walk, the shocks from earnings,
// incidents and dividends, the investor-relations penalty and the target price.
// Pure functions of their inputs; callers supply the random draws.
import { INCIDENT_PRICE_SEVERITY, OWN_STOCK, PUBLIC_PRICE } from '../config/balance';
import { clamp } from './math';

/** Sentiment stays inside OWN_STOCK.sentimentRange. */
export function clampSentiment(s: number): number {
  return clamp(s, ...OWN_STOCK.sentimentRange);
}

/** §19.5: σ = 2% per week, reverting 5% per week toward 1. `z` is a standard normal draw. */
export function walkSentiment(s: number, z: number): number {
  return s + PUBLIC_PRICE.sentimentRevert * (1 - s) + PUBLIC_PRICE.sentimentSigma * z;
}

/**
 * §19.5: earnings growth vs last quarter moves sentiment ±(0–8%). Growth of
 * OWN_STOCK.earningsGrowthRef or more (or a swing from a loss to a profit)
 * gives the full move.
 */
export function earningsShock(current: number, previous: number): number {
  const growth = (current - previous) / Math.max(Math.abs(previous), 1);
  return clamp(growth / OWN_STOCK.earningsGrowthRef, -1, 1) * PUBLIC_PRICE.earningsShockMax;
}

/** §19.5: an incident's sentiment shock, −3% to −15% by severity; undefined if it doesn't move the price. */
export function incidentShock(type: string): number | undefined {
  const severity = INCIDENT_PRICE_SEVERITY[type];
  if (severity === undefined) return undefined;
  const [lo, hi] = PUBLIC_PRICE.incidentShock;
  return -(lo + (hi - lo) * clamp(severity, 0, 1));
}

/** §19.5: a dividend raise lifts sentiment 3%, a cut drops it 6%. */
export function dividendShock(dps: number, prevDps: number): number {
  if (dps > prevDps) return PUBLIC_PRICE.dividendRaise;
  if (dps < prevDps) return -PUBLIC_PRICE.dividendCut;
  return 0;
}

/** §19.5: irPenalty = 1 − 0.15 × (1 − financeCoverage′). */
export function irPenalty(financeKPrime: number): number {
  return 1 - PUBLIC_PRICE.irPenalty * (1 - clamp(financeKPrime, 0, 1));
}

/** §19.5: target = value per share (ARR × multiple, at least book) × sentiment × irPenalty. */
export function publicTarget(
  valuePerShare: number,
  sentiment: number,
  financeKPrime: number,
): number {
  return Math.max(0, valuePerShare) * sentiment * irPenalty(financeKPrime);
}
