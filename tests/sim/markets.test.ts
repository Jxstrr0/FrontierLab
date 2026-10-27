// The stock market (SIMULATION §19.1, §19.2, §19.5): company returns, the
// cap-weighted index, rival bank pricing, the private valuation's worked
// numbers and dividends paid to holdings.
import { describe, expect, it } from 'vitest';
import { STOCK_MARKET, VALUATION, WEEKS_PER_YEAR } from '../../src/config/balance';
import { SECTOR_MU } from '../../src/data/stocks';
import { advanceWeeks } from '../../src/sim/engine';
import { earningsShock, incidentShock, irPenalty, publicTarget } from '../../src/sim/equityModel';
import { capWeightedReturn, marketsQuarter, runMarkets } from '../../src/sim/market';
import { bankingReturn, priceRivalShares, rivalTargetPrice } from '../../src/sim/marketRivals';
import { companyReturn, payCompanyDividends, recordClose } from '../../src/sim/marketStocks';
import { topHolders } from '../../src/sim/marketHolders';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import { rngFromState, hashSeed } from '../../src/sim/rng';
import { activeModel } from '../../src/sim/underwriting';
import { privateValuation, revenueGrowth, revenueMultiple } from '../../src/sim/valuation';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { addCapital, giveArr, identityGap, setQuarters } from '../helpers/markets';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });

describe('listed company returns (§19.1)', () => {
  it('r = μ_sector/52 + β × shock + σ/√52 × z', () => {
    const s = game();
    const c = s.market.companies.slvs!;
    const r = companyReturn(c, 'expansion', 0.01, 0.5);
    const expected =
      SECTOR_MU.technology.expansion / WEEKS_PER_YEAR +
      c.beta * 0.01 +
      (c.vol / Math.sqrt(WEEKS_PER_YEAR)) * 0.5;
    expect(r).toBeCloseTo(expected, 12);
  });

  it('keeps 104 weeks of history and a 52-week range', () => {
    const item = { history: [] as number[], high52: 0, low52: 0 };
    for (let i = 1; i <= 120; i++) recordClose(item, i);
    expect(item.history).toHaveLength(STOCK_MARKET.historyWeeks);
    expect(item.high52).toBe(120);
    expect(item.low52).toBe(69);
  });

  it('never prices a company below the $1 floor', () => {
    const s = game();
    for (const c of Object.values(s.market.companies)) c.price = 1.01;
    for (let i = 0; i < 30; i++) runMarkets(s);
    for (const c of Object.values(s.market.companies))
      expect(c.price).toBeGreaterThanOrEqual(STOCK_MARKET.priceFloor);
  });

  it('runs earnings each quarter and logs COMPANY_EARNINGS', () => {
    const s = game();
    const eps = s.market.companies.dbrk!.eps;
    marketsQuarter(s);
    const events = s.events.log.filter((e) => e.type === 'COMPANY_EARNINGS');
    expect(events).toHaveLength(Object.keys(s.market.companies).length);
    expect(s.market.companies.dbrk!.eps).not.toBe(eps);
  });
});

describe('the index (§19.1)', () => {
  it('is the cap-weighted return of members present in both weeks', () => {
    const before = new Map([
      ['a', 100],
      ['b', 300],
    ]);
    const after = new Map([
      ['a', 110],
      ['b', 300],
      ['c', 50],
    ]);
    expect(capWeightedReturn(before, after)).toBeCloseTo(10 / 400, 12);
  });

  it('starts at 1000 and chains weekly', () => {
    const s = game();
    expect(s.market.index).toBe(STOCK_MARKET.startIndex);
    advanceWeeks(s, 3);
    expect(s.market.indexHistory).toHaveLength(4);
    expect(s.market.indexHistory.at(-1)).toBe(s.market.index);
  });
});

describe('your lab while private (§19.2 worked numbers)', () => {
  // Equity $50M on 10M shares: BVPS $5. ARR $50M; quarterly revenue `revs`.
  const lab = (arr: number, revs?: number[]) => {
    const s = game();
    if (arr > 0) giveArr(s, arr);
    addCapital(s, 50_000_000 - balanceSheet(s).equity);
    setQuarters(s, 0.15, revs?.length ?? 4);
    revs?.forEach((r, i) => (s.history.quarterly[i]!.revenue = r));
    return s;
  };
  it('flat revenue: ARR × 3 × 0.8 ÷ shares = $12.00', () => {
    const s = lab(50_000_000);
    expect(revenueGrowth(s)).toBe(0);
    expect(revenueMultiple(s)).toBeCloseTo(VALUATION.base, 6);
    expect(privateValuation(s)).toBeCloseTo(12, 6);
  });
  it('revenue doubled in a year: multiple 3 + 6 × 1 = 9 → $36.00', () => {
    const s = lab(50_000_000, [1e6, 1.2e6, 1.4e6, 1.7e6, 2e6]);
    expect(revenueGrowth(s)).toBeCloseTo(1, 9);
    expect(privateValuation(s)).toBeCloseTo(36, 6);
  });
  it('growth counts up to 200%: tripling-plus clamps the multiple at 15 → $60.00', () => {
    const s = lab(50_000_000, [1e6, 2e6, 3e6, 4e6, 5e6]);
    expect(revenueMultiple(s)).toBeCloseTo(VALUATION.base + VALUATION.growthSlope * 2, 6);
    expect(privateValuation(s)).toBeCloseTo(60, 6);
  });
  it('a young lab’s growth is scaled to a year', () => {
    const s = lab(50_000_000, [1e6, 2e6]);
    expect(revenueGrowth(s)).toBeCloseTo(15, 9); // doubling a quarter: 2⁴ − 1
  });
  it('book value is the floor: no ARR → BVPS $5.00', () => {
    expect(privateValuation(lab(0))).toBeCloseTo(5, 6);
  });
  it('a model ahead of the bar earns a higher multiple', () => {
    const s = lab(50_000_000);
    const before = revenueMultiple(s);
    const m = activeModel(s);
    m.radar = m.radar.map((v) => v + 1) as typeof m.radar;
    expect(revenueMultiple(s)).toBeCloseTo(before + VALUATION.qualitySlope, 6);
  });
});

describe('public price model (§19.5)', () => {
  it('irPenalty = 1 − 0.15 × (1 − k′)', () => {
    expect(irPenalty(1)).toBe(1);
    expect(irPenalty(0.6)).toBeCloseTo(0.94, 12);
  });
  it('target = value per share × sentiment × irPenalty', () => {
    expect(publicTarget(10, 1.1, 1)).toBeCloseTo(11, 9);
    expect(publicTarget(-3, 1, 1)).toBe(0);
    expect(publicTarget(30, 1, 0.8)).toBeCloseTo(30 * 0.97, 9);
  });
  it('earnings growth moves sentiment ±(0–8%)', () => {
    expect(earningsShock(125, 100)).toBeCloseTo(0.08, 12);
    expect(earningsShock(110, 100)).toBeCloseTo(0.032, 12);
    expect(earningsShock(50, 100)).toBeCloseTo(-0.08, 12);
    expect(earningsShock(100, 100)).toBe(0);
  });
  it('incidents cost −3% to −15% by severity', () => {
    expect(incidentShock('ROBBERY')).toBeCloseTo(-(0.03 + 0.12 * 0.15), 12);
    expect(incidentShock('VIRAL_COMPLAINT')).toBeUndefined();
    expect(incidentShock('BANK_RUN')).toBeCloseTo(-0.15, 12);
    expect(incidentShock('DIVIDEND_DUE')).toBeUndefined();
  });
});

describe('rival banks (§19.5 for rivals)', () => {
  it('private rivals trade at book, listed rivals follow the target', () => {
    const s = game();
    advanceWeeks(s, 30);
    for (const r of Object.values(s.rivals)) {
      if (r.status !== 'active') continue;
      if (!r.listed) expect(r.price).toBeCloseTo(r.equity / r.shares, 6);
      else {
        expect(r.history.length).toBeGreaterThan(20);
        expect(r.price).toBeGreaterThan(0.3 * (r.equity / r.shares) * 0.5);
      }
    }
  });

  it('the target trades at book before the first report', () => {
    const s = game();
    const r = Object.values(s.rivals).find((x) => x.listed)!;
    expect(rivalTargetPrice(r)).toBeCloseTo(r.equity / r.shares, 9);
  });

  it('a seized rival is worth nothing', () => {
    const s = game();
    const r = Object.values(s.rivals).find((x) => x.listed)!;
    r.status = 'seized';
    priceRivalShares(s, rngFromState(hashSeed(1, 'x')), 'expansion', 0);
    expect(r.price).toBe(0);
  });

  it('banking returns carry the sector drift and beta', () => {
    expect(bankingReturn('expansion', 0)).toBeCloseTo(SECTOR_MU.banking.expansion / 52, 12);
    expect(bankingReturn('recession', -0.01)).toBeLessThan(0);
  });
});

describe('dividends to holders (§19.1)', () => {
  it('pays company holders as dividend income (cash) and personal holders into personal cash', () => {
    const s = game();
    addCapital(s, 5_000_000);
    expect(cmd.trade(s, 'company', 'nre', 10_000).ok).toBe(true);
    expect(cmd.trade(s, 'personal', 'nre', 1_000).ok).toBe(true);
    const c = s.market.companies.nre!;
    const dps = (c.price * c.divYield) / 4;
    const cash = s.company.cash;
    const personal = s.personal.cash;
    payCompanyDividends(s);
    expect(s.ledger.pnl.dividendIncome).toBeCloseTo(10_000 * dps, 6);
    expect(s.company.cash - cash).toBeCloseTo(10_000 * dps, 6);
    expect(s.personal.cash - personal).toBeCloseTo(1_000 * dps, 6);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('lists your stakes among the top holders', () => {
    const s = game();
    addCapital(s, 2e11);
    const c = s.market.companies.trhd!;
    const n = Math.floor(c.shares * 0.2);
    expect(cmd.trade(s, 'company', 'trhd', n).ok).toBe(true);
    const top = topHolders(s, 'trhd');
    expect(top[0]!.you).toBe('company');
    expect(top[0]!.pct).toBeCloseTo(n / c.shares, 9);
    expect(top).toHaveLength(3);
  });
});
