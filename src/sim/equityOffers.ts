// Quotes for raising equity (SIMULATION §19.3, §19.4, §19.6): what a private
// placement, an IPO and a secondary offering would raise, at what price and
// fee, plus the IPO eligibility checklist. Read by the Equity tab (as
// selectors) and by the commands in commands/marketsEquity.ts, so the screen
// and the action always agree.
import { IPO, PLACEMENT, SECONDARY } from '../config/balance';
import { INVESTMENT_BANKS } from '../data/investmentBanks';
import { FUND_NAMES } from '../data/names';
import { clamp } from './math';
import { hashSeed, rngFromState } from './rng';
import type { GameState } from './state';
import { homeCountry } from './treasury';
import { companyArr } from './arr';
import { runwaySnapshot } from './runway';
import { fundamentalPerShare, privateValuation } from './valuation';

export interface EquityQuote {
  shares: number;
  price: number;
  gross: number;
  feeRate: number;
  fee: number;
  /** Capital raised: gross − fee. */
  net: number;
}

/** Fee rate of an investment bank (the default secondary fee if unknown). */
export function bankFee(bankId: string): number {
  return INVESTMENT_BANKS[bankId]?.fee ?? SECONDARY.defaultFee;
}

function quote(shares: number, price: number, feeRate: number): EquityQuote {
  const gross = shares * price;
  const fee = gross * feeRate;
  return { shares, price, gross, feeRate, fee, net: gross - fee };
}

// ─── Private placement (§19.3) ────────────────────────────────────────────────

/** §19.3: new shares (pct of outstanding) at the private valuation × 0.9. */
export function placementQuote(state: GameState, bankId: string, pct: number): EquityQuote {
  const shares = Math.round(state.company.sharesOutstanding * clamp(pct, 0, PLACEMENT.maxPct));
  return quote(shares, privateValuation(state) * PLACEMENT.discount, bankFee(bankId));
}

/** Rounds used, rounds left and the first week another round is allowed. */
export function placementStatus(state: GameState): {
  used: number;
  left: number;
  nextWeek: number;
} {
  const used = state.stock.placements.length;
  const last = state.stock.placements.at(-1);
  return {
    used,
    left: Math.max(0, PLACEMENT.maxRounds - used),
    nextWeek: last ? last.week + PLACEMENT.gapWeeks : 0,
  };
}

/**
 * The fund the next placement goes to: the first name the `equity` stream
 * would pick among funds not yet on the cap table. Peeks at a copy of the
 * stream, so the preview matches the raise without consuming a draw.
 */
export function nextInvestor(state: GameState): string {
  const raw = state.rng.equity ?? hashSeed(state.meta.seed, 'equity');
  return rngFromState([...raw]).pick(investorPool(state));
}

/** Funds not yet on the cap table (every fund once all have invested). */
export function investorPool(state: GameState): readonly string[] {
  const held = new Set(state.stock.holders.map((h) => h.name));
  const fresh = FUND_NAMES.filter((n) => !held.has(n));
  return fresh.length > 0 ? fresh : FUND_NAMES;
}

// ─── IPO (§19.4) ──────────────────────────────────────────────────────────────

export interface EligibilityRule {
  id: 'arr' | 'profitable' | 'finance' | 'tier' | 'recession';
  label: string;
  ok: boolean;
  /** Where you stand, e.g. "$18.2M" or "3 of 4". */
  detail: string;
}

const money = (x: number) => `$${(x / 1e6).toFixed(1)}M`;

/** §19.4 eligibility, one row per rule. */
export function ipoChecklist(state: GameState): EligibilityRule[] {
  const arr = companyArr(state);
  const recent = state.history.quarterly.slice(-IPO.profitableQuarters);
  const profitable = recent.filter((q) => q.netIncome > 0).length;
  const kPrime = state.hq.coverage.finance?.kPrime ?? 1;
  const tier = state.company.tier;
  const recession = homeCountry(state).phase === 'recession';
  const runway = runwaySnapshot(state);
  return [
    {
      id: 'arr',
      label: `ARR of at least ${money(IPO.minArr)}`,
      ok: arr >= IPO.minArr,
      detail: money(arr),
    },
    {
      id: 'profitable',
      label: `Profitable in each of the last ${IPO.profitableQuarters} quarters`,
      ok: recent.length >= IPO.profitableQuarters && profitable === recent.length,
      detail: `${profitable} of ${IPO.profitableQuarters}`,
    },
    {
      id: 'finance',
      label: `Finance team at ${Math.round(IPO.minFinanceCoverage * 100)}% coverage or better`,
      ok: kPrime >= IPO.minFinanceCoverage,
      detail: `${Math.round(kPrime * 100)}%`,
    },
    {
      id: 'tier',
      label: 'Safety tier Adequate or Strong',
      ok: tier === 'adequate' || tier === 'strong',
      detail: tier.charAt(0).toUpperCase() + tier.slice(1),
    },
    {
      id: 'recession',
      label: 'No recession at home, unless runway is Strong',
      ok: !recession || runway.tier === 'strong',
      detail: recession
        ? `Recession, ${runway.tier.charAt(0).toUpperCase()}${runway.tier.slice(1)} runway`
        : 'No recession',
    },
  ];
}

/** True when every rule passes. */
export const ipoEligible = (state: GameState): boolean => ipoChecklist(state).every((r) => r.ok);

/** §19.4: offer price = value per share (ARR × multiple, at least book) × 0.9. */
export function ipoOfferPrice(state: GameState): number {
  return fundamentalPerShare(state, undefined, IPO.discount);
}

/**
 * New shares for a float: the public ends up holding floatPct of the bank
 * after listing (assumption, decision log), so n = outstanding × f / (1 − f).
 */
export function ipoQuote(state: GameState, bankId: string, floatPct: number): EquityQuote {
  const f = clamp(floatPct, ...IPO.floatPct);
  const shares = Math.round((state.company.sharesOutstanding * f) / (1 - f));
  return quote(shares, ipoOfferPrice(state), bankFee(bankId));
}

// ─── Secondary offering (§19.6) ───────────────────────────────────────────────

/** §19.6: new shares at the current price × (1 − 3%), fee = the bank's. */
export function secondaryQuote(state: GameState, bankId: string, pct: number): EquityQuote {
  const shares = Math.round(state.company.sharesOutstanding * clamp(pct, 0, SECONDARY.maxPct));
  return quote(shares, state.stock.price * (1 - SECONDARY.discount), bankFee(bankId));
}

/** §19.6: price impact −2% to −5%, scaled by size up to the largest issue. */
export function secondaryImpact(pct: number): number {
  const [lo, hi] = SECONDARY.impact;
  return lo + (hi - lo) * clamp(pct / SECONDARY.maxPct, 0, 1);
}
