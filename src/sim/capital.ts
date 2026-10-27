// Capital and the regulator (SIMULATION §15): CET1, risk-weighted assets, the
// capital ratio and its tier.
import {
  FIXED_ASSET_RISK_WEIGHT,
  FRANCHISE,
  FX_RISK_WEIGHT,
  OP_RISK_MULT,
  PROPERTY_RISK_WEIGHT,
  STOCK_RISK_WEIGHT,
  TIER_THRESHOLDS,
  VENTURE_DEBT_RISK_WEIGHT,
  VENTURE_RISK_WEIGHT,
  WEEKS_PER_YEAR,
} from '../config/balance';
import type { Tier } from '../data/types';
import { balanceSheet, loanTotals } from './balanceSheet';
import type { GameState } from './state';
import { homeCountry } from './treasury';

export interface CapitalSnapshot {
  cet1: number;
  rwa: number;
  capitalRatio: number;
  tier: Tier;
  equity: number;
}

/** The tier for a capital ratio; a policy capital buffer raises every threshold (§24 Politics). */
export function tierFor(cr: number, bufferPp = 0): Tier {
  for (const t of TIER_THRESHOLDS) if (cr >= t.minCr + bufferPp / 100) return t.tier;
  return 'critical';
}

/**
 * Capital buffer in force in your home country, in percentage points: a passed
 * buffer policy adds, a won lobbying campaign ("Ease the capital buffer") subtracts.
 */
export function capitalBufferPp(state: GameState): number {
  const home = homeCountry(state);
  const week = state.clock.week;
  const b = home.capitalBuffer;
  const relief = state.lobbying?.bufferRelief; // absent mid-migration from older saves
  const plus = b && b.untilWeek > week ? b.pp : 0;
  const minus = relief && relief.country === home.id && relief.untilWeek > week ? relief.pp : 0;
  return plus - minus;
}

/** Trailing 52-week net revenue (net interest income + fee & other income). */
export function trailingNetRevenue(state: GameState): number {
  return state.history.weekly.slice(-WEEKS_PER_YEAR).reduce((sum, w) => sum + w.netRevenue, 0);
}

export function capitalSnapshot(state: GameState): CapitalSnapshot {
  const bs = balanceSheet(state);
  // CET1 = equity − goodwill − intangibles (§15).
  const cet1 = bs.equity - bs.intangibles - bs.goodwill;
  const rwa =
    loanTotals(state).rwa +
    bs.fixedAssets * FIXED_ASSET_RISK_WEIGHT +
    bs.investments * STOCK_RISK_WEIGHT +
    bs.ventures * VENTURE_RISK_WEIGHT +
    bs.ventureDebt * VENTURE_DEBT_RISK_WEIGHT +
    bs.realEstate * PROPERTY_RISK_WEIGHT +
    bs.currencies * FX_RISK_WEIGHT +
    bs.franchise * FRANCHISE.riskWeight +
    OP_RISK_MULT * Math.max(0, trailingNetRevenue(state));
  const capitalRatio = cet1 / Math.max(rwa, 1);
  const tier = tierFor(capitalRatio, capitalBufferPp(state));
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
