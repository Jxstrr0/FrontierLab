// Raising equity (SIMULATION §19.3, §19.4, §19.6): placement, IPO and
// secondary offering accounting (balance identity, cap table, paid-in capital,
// financing cash) and the IPO eligibility checklist.
import { describe, expect, it } from 'vitest';
import { IPO, LATE_FILING, PLACEMENT, SECONDARY } from '../../src/config/balance';
import { BENEFIT_RULES } from '../../src/data/benefits';
import { INVESTMENT_BANKS } from '../../src/data/investmentBanks';
import { FUND_NAMES } from '../../src/data/names';
import * as cmd from '../../src/sim/commands';
import { listPendingIpo, makeTicker } from '../../src/sim/equityIpo';
import {
  ipoChecklist,
  ipoOfferPrice,
  nextInvestor,
  placementQuote,
  secondaryImpact,
} from '../../src/sim/equityOffers';
import { marketsQuarter } from '../../src/sim/market';
import { founderStake } from '../../src/sim/shares';
import { privateValuation } from '../../src/sim/valuation';
import { annualPayroll, benefitWeeklyCost, requiredStaff } from '../../src/sim/hq';
import {
  BANK,
  capTableGap,
  eligibleBank,
  identityGap,
  publicBank,
  setQuarters,
} from '../helpers/markets';

const fee = INVESTMENT_BANKS[BANK]!.fee;

describe('private placement (§19.3)', () => {
  it('sells new shares to a fund at the private valuation × 0.9, net of the fee', () => {
    const s = eligibleBank();
    const shares0 = s.company.sharesOutstanding;
    const paidIn0 = s.company.paidInCapital;
    const cash0 = s.company.cash;
    const price = privateValuation(s) * PLACEMENT.discount;
    const investor = nextInvestor(s);
    const r = cmd.privatePlacement(s, BANK, 0.2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const n = Math.round(shares0 * 0.2);
    const net = n * price * (1 - fee);
    expect(r.investor).toBe(investor);
    expect(FUND_NAMES).toContain(investor);
    expect(s.company.sharesOutstanding).toBe(shares0 + n);
    expect(s.company.paidInCapital - paidIn0).toBeCloseTo(net, 4);
    expect(s.company.cash - cash0).toBeCloseTo(net, 4);
    expect(s.ledger.cash.financing).toBeCloseTo(net, 4);
    expect(s.stock.holders.find((h) => h.name === investor)?.shares).toBe(n);
    expect(capTableGap(s)).toBe(0);
    expect(identityGap(s)).toBeLessThan(1);
    expect(s.events.log.some((e) => e.type === 'PLACEMENT')).toBe(true);
  });

  it('caps a round at 25%, three rounds 26 weeks apart, and refuses once public', () => {
    const s = eligibleBank();
    expect(cmd.privatePlacement(s, BANK, 0.3).ok).toBe(false);
    expect(cmd.privatePlacement(s, BANK, 0.1).ok).toBe(true);
    expect(cmd.privatePlacement(s, BANK, 0.1).ok).toBe(false);
    for (let i = 0; i < 2; i++) {
      s.clock.week += PLACEMENT.gapWeeks;
      expect(cmd.privatePlacement(s, BANK, 0.1).ok).toBe(true);
    }
    s.clock.week += PLACEMENT.gapWeeks;
    expect(cmd.privatePlacement(s, BANK, 0.1).ok).toBe(false);
    expect(new Set(s.stock.placements.map((p) => p.investor)).size).toBe(3);
    expect(cmd.privatePlacement(publicBank(), BANK, 0.1).ok).toBe(false);
  });

  it('quotes the same numbers the command books', () => {
    const s = eligibleBank();
    const q = placementQuote(s, BANK, 0.25);
    expect(q.net).toBeCloseTo(q.gross - q.fee, 6);
    expect(q.fee).toBeCloseTo(q.gross * fee, 6);
  });
});

describe('IPO eligibility (§19.4)', () => {
  const failing = (s: ReturnType<typeof eligibleBank>) =>
    ipoChecklist(s)
      .filter((r) => !r.ok)
      .map((r) => r.id);

  it('passes every rule for a qualifying bank', () => {
    expect(failing(eligibleBank())).toEqual([]);
  });

  it('flags each rule on its own', () => {
    expect(failing(eligibleBank(42, 40_000_000, 50_000_000))).toEqual(['arr']);
    const s = eligibleBank();
    s.history.quarterly[1]!.netIncome = -1;
    expect(failing(s)).toEqual(['profitable']);
    const t = eligibleBank();
    setQuarters(t, 0.15, 3);
    expect(failing(t)).toEqual(['profitable']);
    const u = eligibleBank();
    u.hq.coverage.finance = { ...u.hq.coverage.finance, kPrime: 0.7 };
    expect(failing(u)).toEqual(['finance']);
    const v = eligibleBank();
    v.company.tier = 'watch';
    expect(failing(v)).toEqual(['tier']);
    const w = eligibleBank();
    for (const c of Object.values(w.world.countries)) if (c) c.phase = 'recession';
    w.company.capitalRatio = 0.12;
    expect(failing(w)).toEqual(['recession']);
    w.company.capitalRatio = 0.15;
    expect(failing(w)).toEqual([]);
  });

  it('refuses to launch when not eligible', () => {
    const s = eligibleBank(42, 40_000_000, 50_000_000);
    expect(cmd.launchIpo(s, BANK, 0.25).ok).toBe(false);
    expect(s.stock.ipo).toBeUndefined();
  });
});

describe('IPO (§19.4)', () => {
  it('launches at BVPS × clamp(ROE/COE, 0.5, 3) × 0.9 and lists at quarter-end', () => {
    const s = eligibleBank();
    const offer = ipoOfferPrice(s);
    const shares0 = s.company.sharesOutstanding;
    expect(cmd.launchIpo(s, BANK, 0.25).ok).toBe(true);
    expect(s.stock.ipo?.price).toBeCloseTo(offer, 9);
    expect(s.stock.status).toBe('private');
    const n = s.stock.ipo!.shares;
    expect(n).toBe(Math.round((shares0 * 0.25) / 0.75));
    const cash0 = s.company.cash;
    const paidIn0 = s.company.paidInCapital;
    marketsQuarter(s);
    expect(s.stock.status).toBe('public');
    const net = n * offer * (1 - fee);
    expect(s.company.cash - cash0).toBeCloseTo(net, 3);
    expect(s.company.paidInCapital - paidIn0).toBeCloseTo(net, 3);
    expect(s.stock.holders.find((h) => h.id === 'public')!.shares).toBe(n);
    expect(founderStake(s)).toBeCloseTo(0.75, 6);
    expect(s.stock.ticker).toMatch(/^[A-Z]{3,4}$/);
    expect(s.stock.exchange).toBe('Maple Exchange');
    expect(s.stock.price).toBeGreaterThanOrEqual(offer);
    expect(s.stock.price).toBeLessThanOrEqual(offer * 1.1 + 1e-9);
    expect(s.events.log.some((e) => e.type === 'IPO_LISTED')).toBe(true);
    expect(capTableGap(s)).toBe(0);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('withdraws at listing if the bank no longer qualifies', () => {
    const s = eligibleBank();
    expect(cmd.launchIpo(s, BANK, 0.2).ok).toBe(true);
    s.company.tier = 'restricted';
    expect(listPendingIpo(s)).toBe(false);
    expect(s.stock.status).toBe('private');
    expect(s.stock.ipo).toBeUndefined();
    expect(s.stock.ipoWithdrawn?.reason).toMatch(/tier/i);
  });

  it('keeps the float between 10% and 40%', () => {
    const s = eligibleBank();
    expect(cmd.launchIpo(s, BANK, 0.05).ok).toBe(false);
    expect(cmd.launchIpo(s, BANK, 0.5).ok).toBe(false);
    expect(cmd.launchIpo(s, BANK, IPO.floatPct[1]).ok).toBe(true);
  });

  it('picks a ticker that clashes with no other', () => {
    const s = eligibleBank();
    s.meta.monogram = 'SL';
    s.meta.bankName = 'Silverline Savings';
    expect(makeTicker(s)).not.toBe('SLVS');
    const taken = Object.values(s.market.companies).map((c) => c.ticker);
    expect(taken).not.toContain(makeTicker(s));
  });

  it('adds four Finance staff once public', () => {
    const s = eligibleBank();
    const before = requiredStaff(s, 'finance');
    s.stock.status = 'public';
    expect(requiredStaff(s, 'finance') - before).toBeCloseTo(4, 9);
  });
});

describe('secondary offering (§19.6)', () => {
  it('issues shares at price × 0.97, books the net and dents the price', () => {
    const s = publicBank();
    const p0 = s.stock.price;
    const shares0 = s.company.sharesOutstanding;
    const cash0 = s.company.cash;
    const r = cmd.secondaryOffering(s, BANK, 0.1);
    expect(r.ok).toBe(true);
    const n = Math.round(shares0 * 0.1);
    const net = n * p0 * (1 - SECONDARY.discount) * (1 - fee);
    expect(s.company.cash - cash0).toBeCloseTo(net, 3);
    expect(s.company.sharesOutstanding).toBe(shares0 + n);
    expect(s.stock.price).toBeCloseTo(p0 * (1 - secondaryImpact(0.1)), 9);
    expect(capTableGap(s)).toBe(0);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('scales the price impact from −2% to −5% and needs a listed bank', () => {
    expect(secondaryImpact(0)).toBeCloseTo(0.02, 12);
    expect(secondaryImpact(SECONDARY.maxPct)).toBeCloseTo(0.05, 12);
    expect(cmd.secondaryOffering(eligibleBank(), BANK, 0.1).ok).toBe(false);
  });
});

describe('public-company hooks', () => {
  it('fines a listed bank 0.02% of quarterly revenue when Finance coverage is below 60%', () => {
    const s = publicBank();
    s.hq.coverage.finance = { ...s.hq.coverage.finance, kPrime: 0.5 };
    const revenue = 1_000_000;
    s.history.quarterly.at(-1)!.revenue = revenue;
    const fines = s.ledger.pnl.fines;
    marketsQuarter(s);
    expect(s.ledger.pnl.fines - fines).toBeCloseTo(revenue * LATE_FILING.fineRate, 6);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('costs the Employee Stock Plan only once listed', () => {
    const s = eligibleBank(); // its office carries the payroll
    expect(annualPayroll(s)).toBeGreaterThan(0);
    expect(benefitWeeklyCost(s, 'espp', 0.1)).toBe(0);
    s.stock.status = 'public';
    expect(benefitWeeklyCost(s, 'espp', 0.1)).toBeCloseTo(
      (BENEFIT_RULES.esppPayrollCost * 0.1 * annualPayroll(s)) / 52,
      9,
    );
  });
});
