// Share buybacks (SIMULATION §19.6a) and share-for-share deals (§19.8): the
// cap table, cash, retained earnings and paid-in capital move together, the
// balance identity holds, and the board weighs a share-paid price at a discount.
import { describe, expect, it } from 'vitest';
import { BUYBACK, SHARE_DEALS } from '../../src/config/balance';
import {
  buybackBlocker,
  buybackImpact,
  buybackQuote,
  maxBuybackShares,
} from '../../src/sim/buybacks';
import { advanceWeeks } from '../../src/sim/engine';
import { PUBLIC_HOLDER } from '../../src/sim/equityIpo';
import { boardPrice, referencePrice } from '../../src/sim/mergerPricing';
import { shareDealImpact } from '../../src/sim/shareDeals';
import { FOUNDER_ID, founderStake, sharesHeld } from '../../src/sim/shares';
import type { GameState } from '../../src/sim/state';
import { capTableGap, eligibleBank, identityGap, publicBank } from '../helpers/markets';
import { capitalisedBank, cmd, smallestRival } from '../helpers/mergers';

describe('share buybacks (§19.6a)', () => {
  it('needs a listed bank', () => {
    const r = cmd.buyBackShares(eligibleBank(), 0.05);
    expect(r.ok).toBe(false);
  });

  it('retires public shares at price × 1.02 plus the fee, from cash and retained earnings', () => {
    const s = publicBank();
    s.company.cash += 50_000_000;
    s.company.paidInCapital += 50_000_000;
    const p0 = s.stock.price;
    const out0 = s.company.sharesOutstanding;
    const pub0 = sharesHeld(s, PUBLIC_HOLDER.id);
    const cash0 = s.company.cash;
    const re0 = s.company.retainedEarnings;
    const stake0 = founderStake(s);
    const q = buybackQuote(s, 0.05);
    const n = Math.round(out0 * 0.05);
    expect(q.shares).toBe(n);
    expect(q.price).toBeCloseTo(p0 * (1 + BUYBACK.premium), 9);
    expect(q.cost).toBeCloseTo(n * q.price * (1 + BUYBACK.fee), 6);
    const lift = buybackImpact(s, n);

    const r = cmd.buyBackShares(s, 0.05);
    expect(r.ok).toBe(true);
    expect(s.company.sharesOutstanding).toBe(out0 - n);
    expect(sharesHeld(s, PUBLIC_HOLDER.id)).toBe(pub0 - n);
    expect(cash0 - s.company.cash).toBeCloseTo(q.cost, 6);
    expect(re0 - s.company.retainedEarnings).toBeCloseTo(q.cost, 6);
    expect(s.stock.price).toBeCloseTo(p0 * (1 + lift), 9);
    expect(founderStake(s)).toBeGreaterThan(stake0);
    expect(capTableGap(s)).toBe(0);
    expect(identityGap(s)).toBeLessThan(1);
    expect(s.events.log.some((e) => e.type === 'SHARE_BUYBACK')).toBe(true);

    // One a quarter.
    expect(cmd.buyBackShares(s, 0.01).ok).toBe(false);
    s.clock.week += BUYBACK.gapWeeks;
    expect(cmd.buyBackShares(s, 0.01).ok).toBe(true);
  });

  it('keeps the public at the minimum float', () => {
    const s = publicBank(42, 0.12);
    s.company.cash += 50_000_000;
    s.company.paidInCapital += 50_000_000;
    const max = maxBuybackShares(s);
    const out = s.company.sharesOutstanding;
    const pub = sharesHeld(s, PUBLIC_HOLDER.id);
    expect(max).toBeLessThan(Math.floor(out * BUYBACK.maxPct));
    expect((pub - max) / (out - max)).toBeGreaterThanOrEqual(BUYBACK.minFloat - 1e-9);
    expect(buybackQuote(s, BUYBACK.maxPct).shares).toBe(max);
  });

  it('refuses a buyback that would leave under a year of runway', () => {
    const s = publicBank();
    s.company.cash += 500_000_000;
    const q = buybackQuote(s, 0.05);
    expect(buybackBlocker(s, q)).toBeUndefined();
    const tight = { ...q.runwayAfter, months: 8, tier: 'tight' as const };
    expect(buybackBlocker(s, { ...q, runwayAfter: tight })).toMatch(/Runway/);
  });
});

/** A capitalised Calgary bank listed at $20 with a public float. */
function listedBuyer(): GameState {
  const s = capitalisedBank();
  s.stock.status = 'public';
  s.stock.ticker = 'TSTB';
  s.stock.price = 20;
  s.stock.history = [20];
  s.stock.high52 = 20;
  s.stock.low52 = 20;
  return s;
}

describe('share-for-share deals (§19.8)', () => {
  it('needs a listed bank to pay in shares', () => {
    const s = capitalisedBank();
    const target = smallestRival(s);
    const r = cmd.offerMerger(s, target.id, referencePrice(target) * 1.6, 0.5);
    expect(r.ok).toBe(false);
  });

  it('pays half in new shares: less cash, more paid-in capital, the identity holds', () => {
    const s = listedBuyer();
    const target = smallestRival(s);
    const price = referencePrice(target) * 1.8;
    const cashOnly = cmd.mergerQuote(s, target.id, price, 0)!;
    const half = cmd.mergerQuote(s, target.id, price, 0.5)!;
    expect(half.plan.cash).toBeCloseTo(cashOnly.plan.cash / 2, 3);
    expect(half.plan.split.stockValue).toBeCloseTo(cashOnly.plan.cash / 2, 3);
    expect(half.plan.split.newShares).toBe(Math.round(half.plan.split.stockValue / 20));
    // Same goodwill; more cash left, since half the price is paid in shares.
    expect(half.plan.goodwill).toBeCloseTo(cashOnly.plan.goodwill, 3);
    expect(half.plan.proFormaRunway.cash).toBeGreaterThan(cashOnly.plan.proFormaRunway.cash);
    // The board sees a lower premium.
    expect(half.premium).toBeLessThan(cashOnly.premium);
    expect(boardPrice(price, 0.5)).toBeCloseTo(price * (1 - 0.5 * SHARE_DEALS.boardDiscount), 9);

    const out0 = s.company.sharesOutstanding;
    const paidIn0 = s.company.paidInCapital;
    const stake0 = founderStake(s);
    const fall = shareDealImpact(s, half.plan.split.newShares);
    expect(cmd.offerMerger(s, target.id, price, 0.5).ok).toBe(true);
    expect(s.mergers.offers.at(-1)!.stockPct).toBe(0.5);
    advanceWeeks(s, 1);
    expect(identityGap(s)).toBeLessThan(1);
    expect(s.mergers.offers.at(-1)!.status).toBe('accepted');
    expect(s.company.sharesOutstanding).toBeGreaterThan(out0);
    expect(s.company.paidInCapital - paidIn0).toBeGreaterThan(0);
    expect(founderStake(s)).toBeLessThan(stake0);
    expect(s.mergers.deals.at(-1)!.stockValue).toBeGreaterThan(0);
    expect(capTableGap(s)).toBe(0);
    expect(fall).toBeGreaterThanOrEqual(SHARE_DEALS.impact[0]);
    const closed = s.events.log.find((e) => e.type === 'ACQUISITION_CLOSED');
    expect((closed?.payload as { stockPct?: number }).stockPct).toBe(0.5);
  });

  it('caps the new shares one deal may issue', () => {
    const s = listedBuyer();
    s.stock.price = 0.01;
    const target = smallestRival(s);
    const q = cmd.mergerQuote(s, target.id, referencePrice(target) * 1.6, 1)!;
    expect(q.blocker).toMatch(/new shares/);
  });

  it('pays your own holding of the target partly in founder shares', () => {
    const s = listedBuyer();
    const target = smallestRival(s);
    s.market.holdings.personal[target.id] = { shares: 1000, avgCost: 1 };
    const q = cmd.mergerQuote(s, target.id, 10, 0.5)!;
    expect(q.plan.personalCash).toBeCloseTo(1000 * 10 * 0.5, 6);
    expect(q.plan.split.founderNewShares).toBe(Math.round((1000 * 10 * 0.5) / 20));
    expect(sharesHeld(s, FOUNDER_ID)).toBeGreaterThan(0);
  });
});
