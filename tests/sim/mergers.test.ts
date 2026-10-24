// Rival M&A rules (SIMULATION §19.8): the acceptance curve and required
// premiums, reference prices, offer validation, the regulator's checks
// (pro-forma capital and city deposit share), rejections and the retry window,
// and closing with holdings of the target and corporate debt owed to it.
import { describe, expect, it } from 'vitest';
import { MERGERS, STOCK_RISK_WEIGHT } from '../../src/config/balance';
import { ACQUIRED_LOAN_MIX } from '../../src/data/mergers';
import { PRODUCTS } from '../../src/data/products';
import { planDeal, regulatorBlock, regulatorChecks } from '../../src/sim/acquisitionPlan';
import { capitalSnapshot } from '../../src/sim/capital';
import { closeBranch } from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import {
  acceptChance,
  offerPremium,
  referencePrice,
  requiredPremium,
  rivalBvps,
} from '../../src/sim/mergerPricing';
import { newGame } from '../../src/sim/newGame';
import { openScriptedBranch } from '../helpers/scenario';
import type { GameState } from '../../src/sim/state';
import { capitalisedBank, cmd, identityGap, smallestRival, addCapital } from '../helpers/mergers';

const cityName = (id: string) => id;

describe('acceptance curve (§19.8)', () => {
  it('is a sigmoid in (premium − req) / 0.06', () => {
    expect(acceptChance(0.3, 0.3)).toBeCloseTo(0.5, 10);
    expect(acceptChance(0.36, 0.3)).toBeCloseTo(1 / (1 + Math.exp(-1)), 6);
    expect(acceptChance(0.24, 0.3)).toBeCloseTo(1 / (1 + Math.exp(1)), 6);
    expect(acceptChance(0, MERGERS.reqDistressed)).toBeGreaterThan(0.96);
    expect(acceptChance(-0.5, 0.3)).toBeLessThan(1e-5);
  });

  it('asks healthy banks for 30%, Watch-tier banks for 15% and distressed sales for −20%', () => {
    const s = capitalisedBank(4, 0);
    const bank = smallestRival(s);
    bank.capitalRatio = 0.13;
    expect(requiredPremium(bank)).toBe(0.3);
    bank.capitalRatio = 0.09;
    expect(requiredPremium(bank)).toBe(0.15);
    bank.status = 'distressed';
    expect(requiredPremium(bank)).toBe(-0.2);
  });
});

describe('reference price', () => {
  it('uses the market price if listed, book value per share if private, the ask if distressed', () => {
    const s = capitalisedBank(4, 0);
    const bank = smallestRival(s);
    bank.listed = true;
    bank.price = 23.5;
    expect(referencePrice(bank)).toBe(23.5);
    expect(offerPremium(bank, 23.5 * 1.3)).toBeCloseTo(0.3, 10);
    bank.listed = false;
    expect(referencePrice(bank)).toBeCloseTo(bank.equity / bank.shares, 8);
    bank.status = 'distressed';
    bank.distressedAsk = 7.25;
    expect(referencePrice(bank)).toBe(7.25);
  });
});

describe('offer validation', () => {
  it('records a pending offer answered next week', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    const r = cmd.offerMerger(s, bank.id, referencePrice(bank) * 1.4);
    expect(r.ok).toBe(true);
    const o = s.mergers.offers[0]!;
    expect(o.status).toBe('pending');
    expect(o.respondWeek).toBe(s.clock.week + 1);
    expect(o.total).toBeCloseTo(o.pricePerShare * bank.shares, 4);
    expect(s.events.log.at(-1)!.type).toBe('MERGER_OFFER');
    // A second offer while the first is pending is refused.
    const again = cmd.offerMerger(s, bank.id, referencePrice(bank) * 1.5);
    expect(again.ok).toBe(false);
  });

  it('refuses at Restricted or Critical, without the cash, for a bad price or a bank off the market', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    const price = referencePrice(bank) * 1.4;
    s.company.tier = 'restricted';
    expect(cmd.offerMerger(s, bank.id, price).ok).toBe(false);
    s.company.tier = 'critical';
    expect(cmd.offerMerger(s, bank.id, price).ok).toBe(false);
    s.company.tier = 'strong';
    expect(cmd.offerMerger(s, bank.id, 0).ok).toBe(false);
    expect(cmd.offerMerger(s, bank.id, Number.NaN).ok).toBe(false);
    const cash = s.company.cash;
    s.company.cash = price * bank.shares - 1;
    const short = cmd.offerMerger(s, bank.id, price);
    expect(short.ok).toBe(false);
    expect(!short.ok && short.reason).toMatch(/Not enough cash/);
    s.company.cash = cash;
    bank.status = 'seized';
    expect(cmd.offerMerger(s, bank.id, price).ok).toBe(false);
    expect(cmd.offerMerger(s, 'nobody', price).ok).toBe(false);
    expect(s.mergers.offers).toHaveLength(0);
  });

  it('turns down a lowball offer and holds a retry for 4 weeks', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    expect(cmd.offerMerger(s, bank.id, referencePrice(bank) * 0.6).ok).toBe(true);
    advanceWeeks(s, 1);
    const o = s.mergers.offers[0]!;
    expect(o.status).toBe('rejected');
    expect(s.events.log.some((e) => e.type === 'MERGER_REJECTED')).toBe(true);
    expect(bank.status).toBe('active');
    expect(cmd.offerMerger(s, bank.id, referencePrice(bank) * 1.5).ok).toBe(false);
    advanceWeeks(s, MERGERS.retryWeeks - 1);
    expect(cmd.offerMerger(s, bank.id, referencePrice(bank) * 1.5).ok).toBe(false);
    advanceWeeks(s, 1);
    expect(cmd.offerMerger(s, bank.id, referencePrice(bank) * 1.5).ok).toBe(true);
  });
});

describe('regulator checks', () => {
  it('computes pro-forma capital from CET1 less goodwill over RWA plus the acquired loans', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    const plan = planDeal(s, bank, referencePrice(bank) * 1.5);
    const snap = capitalSnapshot(s);
    let rwa = snap.rwa - plan.holdingValue * STOCK_RISK_WEIGHT;
    for (const [pid, share] of Object.entries(ACQUIRED_LOAN_MIX))
      rwa += plan.loans * share * PRODUCTS[pid]!.riskWeight;
    expect(plan.goodwill).toBeCloseTo(plan.cash - bank.equity, 2);
    expect(plan.proFormaCr).toBeCloseTo((snap.cet1 - plan.goodwill) / rwa, 10);
    const weak = { ...plan, proFormaCr: MERGERS.minProFormaCr - 0.001 };
    expect(regulatorChecks(weak, cityName)[0]!.ok).toBe(false);
    expect(regulatorBlock(weak, cityName)).toMatch(/Capital after the deal/);
    expect(regulatorBlock(plan, cityName)).toBeUndefined();
  });

  it('blocks a deal that would give you over 35% of a city’s deposits', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank', competitors: 2 });
    openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 4);
    addCapital(s, 200_000_000);
    const bank = smallestRival(s);
    const plan = planDeal(s, bank, referencePrice(bank) * 1.5);
    expect(plan.cityShares[0]!.share).toBeGreaterThan(MERGERS.maxCityShare);
    expect(cmd.offerMerger(s, bank.id, referencePrice(bank) * 1.5).ok).toBe(true);
    advanceWeeks(s, 1);
    const o = s.mergers.offers[0]!;
    expect(o.status).toBe('blocked');
    expect(o.reason).toMatch(/Deposit share in Calgary/);
    expect(s.events.log.some((e) => e.type === 'MERGER_BLOCKED')).toBe(true);
    expect(bank.status).toBe('active');
    expect(identityGap(s)).toBeLessThan(1);
  });
});

/** Buys the smallest Calgary rival at a 60% premium and runs the closing tick. */
function buy(s: GameState) {
  const bank = smallestRival(s);
  const r = cmd.offerMerger(s, bank.id, referencePrice(bank) * 1.6);
  if (!r.ok) throw new Error(r.reason);
  advanceWeeks(s, 1);
  return bank;
}

describe('closing', () => {
  it('consumes your holdings of the target, pays your own shares to you and settles debt owed to it', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    // Company holds 10% at market (cash swapped for shares), you hold 5% personally.
    const held = Math.round(bank.shares * 0.1);
    s.company.cash -= held * bank.price;
    s.market.holdings.company[bank.id] = { shares: held, avgCost: bank.price };
    const mine = Math.round(bank.shares * 0.05);
    s.market.holdings.personal[bank.id] = { shares: mine, avgCost: bank.price };
    // A drawn line of credit from the target (corporate cash in, a liability).
    s.company.cash += 1_000_000;
    s.corporateDebt.lines[bank.id] = { lenderId: bank.id, drawn: 1_000_000, rate: 0.07 };
    expect(identityGap(s)).toBeLessThan(1);

    const price = referencePrice(bank) * 1.6;
    const equity = bank.equity;
    const value = held * bank.price;
    const personalBefore = s.personal.cash;
    expect(cmd.offerMerger(s, bank.id, price).ok).toBe(true);
    expect(s.mergers.offers[0]!.total).toBeCloseTo(price * (bank.shares - held), 4);
    advanceWeeks(s, 1);
    expect(bank.status).toBe('acquired');
    expect(s.market.holdings.company[bank.id]).toBeUndefined();
    expect(s.market.holdings.personal[bank.id]).toBeUndefined();
    expect(s.corporateDebt.lines[bank.id]).toBeUndefined();
    expect(s.personal.cash - personalBefore).toBeGreaterThanOrEqual(mine * price - 1);
    // Goodwill = C + V − equity (the rival's week of earnings before closing moves it a little).
    const deal = s.mergers.deals[0]!;
    expect(deal.goodwill).toBe(s.company.goodwill);
    expect(Math.abs(deal.price - (price * (bank.shares - held) + value))).toBeLessThan(
      value * 0.05,
    );
    expect(Math.abs(s.company.goodwill - (deal.price - equity))).toBeLessThan(equity * 0.01);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('runs years after a deal with converted branches like any other', () => {
    const s = capitalisedBank();
    buy(s);
    const acquired = Object.values(s.branches).filter((b) => b.converting);
    expect(acquired.length).toBeGreaterThan(0);
    for (let w = 0; w < 156; w++) {
      advanceWeeks(s, 1);
      expect(identityGap(s)).toBeLessThan(1);
    }
    expect(JSON.stringify(s)).not.toMatch(/NaN|null/);
    for (const b of acquired) {
      const now = s.branches[b.id]!;
      expect(now.converting).toBeUndefined();
      expect(now.pnl.length).toBeGreaterThanOrEqual(52);
      expect(now.customers).toBeGreaterThan(0);
    }
    // Closing an acquired branch works like any other.
    const r = closeBranch(s, acquired[0]!.id);
    expect(r.ok).toBe(true);
    expect(identityGap(s)).toBeLessThan(1);
    advanceWeeks(s, 4);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('takes the rival off the market with its employer partnerships', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    const site = Object.values(s.world.sites).find((x) => x.employer);
    if (site?.employer) site.employer.partnerRivalId = bank.id;
    buy(s);
    if (site?.employer) expect(site.employer.partnerRivalId).toBeUndefined();
    expect(cmd.offerMerger(s, bank.id, 30).ok).toBe(false);
    expect(rivalBvps(bank)).toBeGreaterThan(0);
  });
});
