// Treasury funding market and lots (SIMULATION §13.4–13.6): offer generation,
// borrowing, interest, maturities, early repayment, the central bank window and
// bond mark-to-market (ROADMAP Stage 4 acceptance).
import { describe, expect, it } from 'vitest';
import {
  FUNDING_OFFERS,
  FUNDING_REFRESH_WEEKS,
  LIQ_MIN,
  OVERNIGHT_LIMIT,
  OVERNIGHT_LIMIT_MULT,
} from '../../src/config/balance';
import { FUNDING_TYPES } from '../../src/data/fundingTypes';
import { balanceSheet, totalDeposits } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { lotInterestWeekly, matureLots } from '../../src/sim/fundingLots';
import { offerCount, refreshFundingOffers } from '../../src/sim/fundingMarket';
import { ftpLong } from '../../src/sim/rates';
import type { FundingLot, GameState } from '../../src/sim/state';
import { homeCountry, liquidAssets, runTreasury } from '../../src/sim/treasury';
import { bankWithFloors } from '../helpers/scenario';

const identityGap = (s: GameState) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

/** The first market offer (C3c: covered bonds are gone, so any offer will do). */
const plainOffer = (s: GameState) => s.treasury.offers[0]!;

describe('funding market offers', () => {
  it('needs a Treasury floor', () => {
    const s = bankWithFloors(['finance']);
    advanceWeeks(s, 2);
    expect(s.treasury.offers).toEqual([]);
    expect(cmd.borrowOffer(s, 'fo_1', 1_000_000)).toEqual({
      ok: false,
      reason: 'The funding market needs a Treasury floor at HQ.',
    });
  });

  it('generates the same offers for the same seed and commands', () => {
    const a = bankWithFloors(['treasury']);
    const b = bankWithFloors(['treasury']);
    advanceWeeks(a, 1);
    advanceWeeks(b, 1);
    expect(a.treasury.offers.length).toBeGreaterThan(0);
    expect(JSON.stringify(a.treasury.offers)).toBe(JSON.stringify(b.treasury.offers));
  });

  it('offers 2 + floor(3 × coverage′) and refreshes every 2 weeks', () => {
    const s = bankWithFloors(['treasury']);
    advanceWeeks(s, 1);
    // Requirements are off (founder ramp 0), so coverage′ is 1: five offers.
    expect(offerCount(s)).toBe(FUNDING_OFFERS.base + FUNDING_OFFERS.perCoverage);
    expect(s.treasury.offers).toHaveLength(5);
    const first = s.treasury.offers.map((o) => o.id);
    expect(s.treasury.offersRefreshWeek).toBe(s.clock.week + FUNDING_REFRESH_WEEKS);
    advanceWeeks(s, 1);
    expect(s.treasury.offers.map((o) => o.id)).toEqual(first);
    advanceWeeks(s, 1);
    expect(s.treasury.offers.map((o) => o.id)).not.toEqual(first);

    for (const [k, n] of [
      [0, 2],
      [0.34, 3],
      [0.5, 3],
      [0.7, 4],
    ] as const) {
      s.hq.coverage.treasury.kPrime = k;
      expect(offerCount(s)).toBe(n);
      s.treasury.offersRefreshWeek = s.clock.week;
      refreshFundingOffers(s);
      expect(s.treasury.offers).toHaveLength(n);
    }
  });

  it('builds each offer from its type: size, rate, term and radar', () => {
    const s = bankWithFloors(['treasury']);
    advanceWeeks(s, 1);
    const policy = homeCountry(s).policyRate;
    for (const o of s.treasury.offers) {
      const spec = FUNDING_TYPES[o.type]!;
      expect(spec.weight).toBeGreaterThan(0);
      const [lo, hi] = spec.size!;
      expect(o.amount).toBeGreaterThanOrEqual(lo * 0.75 - 1e5);
      expect(o.amount).toBeLessThanOrEqual(hi * 1.25 + 1e5);
      expect(o.termWeeks).toBeGreaterThanOrEqual(spec.term[0]);
      expect(o.termWeeks).toBeLessThanOrEqual(spec.term[1]);
      expect(o.radar).toEqual(spec.radar);
      expect(o.rate).toBeGreaterThan(policy - 0.01);
    }
  });
});

describe('funding lots', () => {
  it('borrowing raises liquid assets and liabilities together', () => {
    const s = bankWithFloors(['treasury']);
    advanceWeeks(s, 1);
    const offer = plainOffer(s);
    const before = { reserves: s.treasury.reserves, wholesale: balanceSheet(s).wholesale };
    const r = cmd.borrowOffer(s, offer.id, 2_000_000);
    expect(r.ok).toBe(true);
    expect(s.treasury.reserves).toBeCloseTo(before.reserves + 2_000_000);
    expect(balanceSheet(s).wholesale).toBeCloseTo(before.wholesale + 2_000_000);
    expect(identityGap(s)).toBeLessThan(1);
    const lot = s.treasury.lots[0]!;
    expect(lot.rate).toBe(offer.rate);
    expect(lot.maturityWeek).toBe(s.clock.week + offer.termWeeks);
    expect(cmd.borrowOffer(s, offer.id, offer.amount + 1)).toMatchObject({ ok: false });
  });

  it('pays weekly interest from corporate cash and matures on time', () => {
    const s = bankWithFloors(['treasury']);
    advanceWeeks(s, 1);
    const offer = plainOffer(s);
    cmd.borrowOffer(s, offer.id, 3_000_000);
    const lot = s.treasury.lots[0]!;
    const interest = lotInterestWeekly(s);
    expect(interest).toBeCloseTo((3_000_000 * lot.rate) / 52);
    advanceWeeks(s, 1);
    expect(s.history.weekly.at(-1)!.pnl.wholesaleInterest).toBeGreaterThanOrEqual(interest - 1e-6);

    // Bring maturity forward: the lot leaves at the next tick, and the identity holds.
    lot.maturityWeek = s.clock.week + 1;
    advanceWeeks(s, 1);
    expect(s.treasury.lots).toHaveLength(0);
    expect(s.events.log.some((e) => e.type === 'FUNDING_MATURED')).toBe(true);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('a maturity that breaches the minimum triggers §13.5 funding', () => {
    const s = bankWithFloors(['treasury']);
    const t = s.treasury;
    const deposits = totalDeposits(s);
    // Target at the minimum, so only the §13.5 shortfall itself is borrowed.
    Object.assign(t, { overnight: 0, window: 0, liqTarget: LIQ_MIN });
    t.reserves = LIQ_MIN * deposits + 1_000_000;
    t.lots.push({
      id: 'fl_x',
      type: 'term_interbank',
      counterparty: 'Atlas Money Markets',
      amount: 5_000_000,
      rate: 0.05,
      startWeek: 0,
      maturityWeek: s.clock.week,
      radar: [7, 5, 5, 5, 7],
    });
    homeCountry(s).prevFtpLong = ftpLong(homeCountry(s));
    runTreasury(s);
    expect(t.lots).toHaveLength(0);
    expect(t.overnight + t.window).toBeCloseTo(4_000_000, 0);
    expect(liquidAssets(s)).toBeCloseTo(LIQ_MIN * deposits, 0);
  });

  it('matureLots only takes lots that are due', () => {
    const s = bankWithFloors(['treasury']);
    const lot = (id: string, amount: number, maturityWeek: number): FundingLot => ({
      id,
      type: 'term_interbank',
      counterparty: 'Pinecrest Capital',
      amount,
      rate: 0.05,
      startWeek: 0,
      maturityWeek,
      radar: [7, 5, 5, 5, 7],
    });
    s.treasury.lots.push(lot('a', 1e6, s.clock.week), lot('b', 2e6, s.clock.week + 1));
    const reserves = s.treasury.reserves;
    expect(matureLots(s).map((l) => l.id)).toEqual(['a']);
    expect(s.treasury.reserves).toBeCloseTo(reserves - 1e6);
    expect(s.treasury.lots.map((l) => l.id)).toEqual(['b']);
  });

  it('repays early only where the type allows it', () => {
    const s = bankWithFloors(['treasury']);
    const base = { counterparty: 'X', rate: 0.05, startWeek: 0, maturityWeek: 999, amount: 1e6 };
    // C3c: every market type allows early repayment; an unknown type does not.
    s.treasury.lots.push(
      { ...base, id: 'ti', type: 'term_interbank', radar: [7, 5, 5, 5, 7] },
      { ...base, id: 'xx', type: 'retired_type', radar: [5, 9, 9, 2, 9] },
    );
    s.treasury.reserves += 2e6;
    expect(cmd.repayLot(s, 'xx')).toEqual({
      ok: false,
      reason: "This funding can't be repaid early; it runs to maturity.",
    });
    const reserves = s.treasury.reserves;
    expect(cmd.repayLot(s, 'ti')).toEqual({ ok: true });
    expect(s.treasury.reserves).toBeCloseTo(reserves - 1e6);
    expect(s.treasury.lots.map((l) => l.id)).toEqual(['xx']);
  });

  it('keeps the balance identity through borrowing and maturities', () => {
    const s = bankWithFloors(['treasury', 'finance']);
    advanceWeeks(s, 1);
    for (const o of [...s.treasury.offers]) {
      cmd.borrowOffer(s, o.id, Math.min(o.amount, 1_500_000));
    }
    expect(s.treasury.lots.length).toBeGreaterThan(0);
    for (let w = 0; w < 110; w++) {
      advanceWeeks(s, 1);
      expect(identityGap(s)).toBeLessThan(1);
      expect(s.treasury.lots.every((l) => l.maturityWeek > s.clock.week)).toBe(true);
    }
  });
});

describe('auto-funding holds the target (§13.5)', () => {
  const bare = (autoFunding: boolean, lr: number) => {
    const s = bankWithFloors(['treasury']);
    const t = s.treasury;
    const deposits = totalDeposits(s);
    Object.assign(t, { overnight: 0, window: 0, autoFunding });
    t.reserves = lr * deposits;
    homeCountry(s).prevFtpLong = ftpLong(homeCountry(s));
    return { s, t, deposits };
  };

  it('borrows overnight up to the target, not just the minimum', () => {
    const { s, t, deposits } = bare(true, 0.12);
    runTreasury(s);
    expect(t.overnight).toBeCloseTo((t.liqTarget - 0.12) * deposits, 0);
    expect(t.window).toBe(0);
    expect(t.freeze).toBe(false);
    expect(liquidAssets(s)).toBeCloseTo(t.liqTarget * deposits, 0);
  });

  it('the window covers only what the minimum still lacks once overnight is capped', () => {
    const { s, t, deposits } = bare(true, 0.02);
    const limit = OVERNIGHT_LIMIT * deposits * OVERNIGHT_LIMIT_MULT[s.company.tier];
    runTreasury(s);
    expect(t.overnight).toBeCloseTo(Math.min((t.liqTarget - 0.02) * deposits, limit), 0);
    expect(t.window).toBeCloseTo(Math.max(0, (LIQ_MIN - 0.02) * deposits - t.overnight), 0);
    expect(liquidAssets(s)).toBeGreaterThanOrEqual(LIQ_MIN * deposits - 1);
    // Overnight at the cap and still under the minimum: the window takes the rest of the minimum only.
    const capped = bare(true, 0.05);
    capped.t.overnight =
      OVERNIGHT_LIMIT * capped.deposits * OVERNIGHT_LIMIT_MULT[capped.s.company.tier];
    runTreasury(capped.s);
    expect(capped.t.window).toBeCloseTo((LIQ_MIN - 0.05) * capped.deposits, 0);
    expect(liquidAssets(capped.s)).toBeCloseTo(LIQ_MIN * capped.deposits, 0);
  });

  it('without auto-funding, under target borrows nothing; under the minimum freezes', () => {
    const a = bare(false, 0.12);
    runTreasury(a.s);
    expect(a.t.overnight).toBe(0);
    expect(a.t.freeze).toBe(false);
    // C3a: with no deposit book the minimum is zero, so "under the minimum" means
    // reserves overdrawn (by Loan Desk lending, say).
    const b = bare(false, 0);
    b.t.reserves = -1_000_000;
    runTreasury(b.s);
    expect(b.t.overnight).toBe(0);
    expect(b.t.freeze).toBe(true);
  });
});

describe('treasury policy and the central bank window', () => {
  it('validates policy ranges', () => {
    const s = bankWithFloors(['treasury']);
    expect(cmd.setTreasuryPolicy(s, { liqTarget: 0.05 })).toMatchObject({ ok: false });
    expect(cmd.setTreasuryPolicy(s, { liqTarget: 0.2, autoFunding: false })).toEqual({ ok: true });
    expect(s.treasury).toMatchObject({ liqTarget: 0.2, autoFunding: false });
  });

  it('borrows and repays at the window with stigma', () => {
    const s = bankWithFloors([]);
    const t = s.treasury;
    const w0 = t.window; // automatic window use so far
    t.reserves += 1_000_000; // headroom above the liquidity minimum
    t.windowStigmaWeeks = 0;
    const reserves = t.reserves;
    expect(cmd.borrowWindow(s, 1_000_000)).toEqual({ ok: true });
    expect(t.window).toBeCloseTo(w0 + 1_000_000);
    expect(t.reserves).toBeCloseTo(reserves + 1_000_000);
    expect(t.windowStigmaWeeks).toBe(4);
    expect(cmd.repayWindow(s, w0 + 2_000_000)).toMatchObject({ ok: false });
    expect(cmd.repayWindow(s, 1_000_000)).toEqual({ ok: true });
    expect(t.window).toBeCloseTo(w0);
    t.window = 0;
    expect(cmd.repayWindow(s, 1)).toEqual({
      ok: false,
      reason: 'You have no central bank borrowing to repay.',
    });
  });
});
