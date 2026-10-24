// Venture formulas (SIMULATION §20.2, §20.5): growth, margin, failure, IPO
// rules, round terms, venture debt payments; plus seeding and the pipeline.
import { describe, expect, it } from 'vitest';
import { VENTURE_DEBT, VENTURES } from '../../src/config/balance';
import { SEED_STARTUPS } from '../../src/data/startups';
import { newGame } from '../../src/sim/newGame';
import { rngFromState } from '../../src/sim/rng';
import type { Startup } from '../../src/sim/state';
import { serviceLoan } from '../../src/sim/ventureDebt';
import {
  amortizedPayment,
  debtAccepted,
  failureChance,
  growthMean,
  ipoEligible,
  nextMargin,
  roundTerms,
  runwayQuarters,
  targetMargin,
} from '../../src/sim/ventureModel';
import { makeTicker } from '../../src/sim/ventureExits';
import { pipelineSize, refreshPipeline } from '../../src/sim/ventures';
import { bankWithFloors } from '../helpers/scenario';

describe('startup formulas (§20.2)', () => {
  it('growth mean = μ + 0.03 × (avg − 5)', () => {
    expect(growthMean(0.08, [5, 5, 5, 5, 5])).toBeCloseTo(0.08, 10);
    expect(growthMean(0.08, [7, 7, 7, 7, 7])).toBeCloseTo(0.14, 10);
    expect(growthMean(0.05, [3, 3, 3, 3, 3])).toBeCloseTo(-0.01, 10);
  });

  it('draws growth with sigma 0.12 around the mean', () => {
    const rng = rngFromState([1, 2, 3, 4]);
    const n = 4000;
    let sum = 0;
    let sq = 0;
    for (let i = 0; i < n; i++) {
      const g = rng.normal(growthMean(0.06, [5, 5, 5, 5, 5]), VENTURES.growthSigma);
      sum += g;
      sq += g * g;
    }
    const mean = sum / n;
    expect(mean).toBeCloseTo(0.06, 2);
    expect(Math.sqrt(sq / n - mean * mean)).toBeCloseTo(0.12, 2);
  });

  it('margin target reaches the sector margin at maturity 8 and moves a quarter of the gap', () => {
    expect(targetMargin(0.18, 8)).toBeCloseTo(0.18, 10);
    expect(targetMargin(0.18, 10)).toBeCloseTo(0.18, 10);
    expect(targetMargin(0.18, 4)).toBeCloseTo(0.18 - 4 * 0.5, 10);
    expect(nextMargin(-1, 0.2)).toBeCloseTo(-0.7, 10);
  });

  it('failure = 0.03 × (1 + 0.35 × (5 − FinHealth)) × 1.5 in recession', () => {
    expect(failureChance(5, false)).toBeCloseTo(0.03, 10);
    expect(failureChance(3, false)).toBeCloseTo(0.03 * 1.7, 10);
    expect(failureChance(3, true)).toBeCloseTo(0.03 * 1.7 * 1.5, 10);
    expect(failureChance(8, false)).toBeCloseTo(0, 10);
  });

  it('IPO needs stage ≥ C, quarterly revenue > $50M and a profit', () => {
    expect(ipoEligible('C', 60e6, 1)).toBe(true);
    expect(ipoEligible('D', 60e6, 1)).toBe(true);
    expect(ipoEligible('B', 60e6, 1)).toBe(false);
    expect(ipoEligible('C', 40e6, 1)).toBe(false);
    expect(ipoEligible('C', 60e6, -1)).toBe(false);
  });

  it('runway counts quarters of burn', () => {
    expect(runwayQuarters(1_000_000, -250_000)).toBe(4);
    expect(runwayQuarters(1_000_000, 10)).toBe(Infinity);
  });

  it('a round raises fraction f of post-money in two equal lots', () => {
    const t = roundTerms(1_000_000, 2, 0.2);
    expect(t.newShares).toBe(250_000);
    expect(t.lotShares).toBe(125_000);
    expect(t.amount).toBe(500_000);
    expect(t.postMoney).toBe(2_500_000);
    expect(t.amount / t.postMoney).toBeCloseTo(0.2, 10);
    // A 30% round gives the original's two 15% lots.
    const full = roundTerms(700_000, 1, 0.3);
    expect(full.lotShares / (700_000 + full.newShares)).toBeCloseTo(0.15, 6);
  });
});

describe('venture debt (§20.5)', () => {
  it('accepts a rate up to policy + 8%', () => {
    expect(debtAccepted(0.11, 0.03)).toBe(true);
    expect(debtAccepted(0.1101, 0.03)).toBe(false);
  });

  it('amortizes over 156 weekly payments to zero', () => {
    const p = amortizedPayment(1_000_000, 0.104, VENTURE_DEBT.termWeeks);
    const r = 0.104 / 52;
    expect(p).toBeCloseTo((1_000_000 * r) / (1 - (1 + r) ** -156), 6);
    expect(amortizedPayment(520_000, 0, 52)).toBe(10_000);

    const s = newGame({ seed: 1, cityId: 'cal', bankName: 'B' });
    const st = Object.values(s.ventures.startups)[0]!;
    st.ventureDebt = {
      principal: 1_000_000,
      balance: 1_000_000,
      rate: 0.104,
      weeksLeft: 156,
      payment: p,
      lender: 'personal',
      startWeek: 0,
    };
    const before = s.personal.cash;
    for (let i = 0; i < 156; i++) serviceLoan(s, st);
    expect(st.ventureDebt).toBeUndefined();
    expect(s.personal.cash - before).toBeCloseTo(p * 156, 0);
  });
});

describe('seeding and the pipeline (§20.1, §20.3)', () => {
  it('seeds the 20 startups with tied-out cap tables and history', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
    const all = Object.values(s.ventures.startups);
    expect(all).toHaveLength(SEED_STARTUPS.length);
    for (const st of all) {
      const seed = SEED_STARTUPS.find((x) => x.name === st.name)!;
      expect(st.shares * st.lastPrice).toBeCloseTo(seed.postMoney, 0);
      expect(st.holders.reduce((t, h) => t + h.shares, 0)).toBe(st.shares);
      expect(st.holders.filter((h) => h.kind === 'fund').length).toBeGreaterThanOrEqual(1);
      expect(st.quarters.length).toBe(4);
      expect(st.history[0]!.round).toBe('Seed');
      expect(st.ceo.name).toMatch(/\w+ \w+/);
      expect(st.cash).toBeGreaterThan(0);
    }
    expect(s.ventures.pipeline).toEqual([]);
  });

  it('shows N = 1 + floor(staff/4) raising startups, max 8, only with an Investment floor', () => {
    const none = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
    expect(pipelineSize(none)).toBe(0);
    const s = bankWithFloors(['investment'], { weeks: 1 });
    s.departments.investment!.staff = 9;
    expect(pipelineSize(s)).toBe(3);
    s.departments.investment!.staff = 100;
    expect(pipelineSize(s)).toBe(8);
    s.ventures.pipelineRefreshWeek = -VENTURES.pipelineEveryWeeks;
    refreshPipeline(s);
    expect(s.ventures.pipeline).toHaveLength(8);
    for (const id of s.ventures.pipeline) {
      const st: Startup = s.ventures.startups[id]!;
      expect(st.seenAt).toBe('pipeline');
      expect(st.round!.closesWeek).toBeGreaterThan(s.clock.week);
    }
  });

  it('makes unique tickers', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
    const a = makeTicker(s, 'Ledgerly');
    expect(a).toBe('LEDG');
    s.market.companies.x = { ...Object.values(s.market.companies)[0]!, id: 'x', ticker: 'LEDG' };
    expect(makeTicker(s, 'Ledgerly')).toBe('LEDA');
  });
});
