// Capital and the regulator (SIMULATION §15): CET1, risk-weighted assets, the
// capital ratio and its tier.
import {
  CHARTER_MIN_EQUITY,
  FIXED_ASSET_RISK_WEIGHT,
  OP_RISK_MULT,
  REO_RISK_WEIGHT,
  TIER_THRESHOLDS,
  WEEKS_PER_YEAR,
} from '../config/balance';
import type { Tier } from '../data/types';
import { balanceSheet, loanTotals } from './balanceSheet';
import type { GameState } from './state';

export interface CapitalSnapshot {
  cet1: number;
  rwa: number;
  capitalRatio: number;
  tier: Tier;
  equity: number;
}

export function tierFor(cr: number): Tier {
  for (const t of TIER_THRESHOLDS) if (cr >= t.minCr) return t.tier;
  return 'critical';
}

/** Trailing 52-week net revenue (net interest income + fee & other income). */
export function trailingNetRevenue(state: GameState): number {
  return state.history.weekly.slice(-WEEKS_PER_YEAR).reduce((sum, w) => sum + w.netRevenue, 0);
}

export function capitalSnapshot(state: GameState): CapitalSnapshot {
  const bs = balanceSheet(state);
  // No goodwill or intangibles until acquisitions and partnerships exist.
  const cet1 = bs.equity;
  const rwa =
    loanTotals(state).rwa +
    bs.reo * REO_RISK_WEIGHT +
    bs.fixedAssets * FIXED_ASSET_RISK_WEIGHT +
    OP_RISK_MULT * Math.max(0, trailingNetRevenue(state));
  const capitalRatio = cet1 / Math.max(rwa, 1);
  const tier = bs.equity < CHARTER_MIN_EQUITY ? 'critical' : tierFor(capitalRatio);
  return { cet1, rwa, capitalRatio, tier, equity: bs.equity };
}

/** Tick step 10: updates the company's capital ratio, tier and liquidity ratio. */
export function evaluateCapital(state: GameState): CapitalSnapshot {
  const snap = capitalSnapshot(state);
  const c = state.company;
  if (snap.tier === c.tier) c.tierWeeks += 1;
  else {
    c.tier = snap.tier;
    c.tierWeeks = 0;
  }
  c.capitalRatio = snap.capitalRatio;
  return snap;
}
