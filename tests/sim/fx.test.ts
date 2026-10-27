// Currencies (SIMULATION §19.10): levels drift with growth, rates and the
// cycle; HK follows the US; trades move cash and positions; company positions
// tie out to the balance sheet and keep the balance identity.
import { describe, expect, it } from 'vitest';
import { FX, FX_START_INDEX } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { tradeFx } from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { fxRate, fxValue, runFx } from '../../src/sim/fx';
import { newGame } from '../../src/sim/newGame';
import { portfolioBreakdown } from '../../src/sim/portfolio';

const game = () => newGame({ seed: 42, cityId: 'cal' });
const gap = (s: ReturnType<typeof game>) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

describe('currency levels', () => {
  it('starts every rate at 100 and keeps home at 100', () => {
    const s = game();
    expect(fxRate(s, 'US')).toBe(FX_START_INDEX);
    for (let i = 0; i < 52; i++) runFx(s);
    expect(fxRate(s, 'CA')).toBeCloseTo(FX_START_INDEX, 9);
    expect(s.fx.history.US).toHaveLength(53);
  });

  it('a recession weakens a currency against a booming one', () => {
    const s = game();
    const us = s.world.countries.US!;
    const uk = s.world.countries.UK!;
    Object.assign(us, { phase: 'expansion', gdp: 3, policyRate: 0.04 });
    Object.assign(uk, { phase: 'recession', gdp: -2, policyRate: 0.01 });
    for (let i = 0; i < 52; i++) runFx(s);
    expect(fxRate(s, 'US')).toBeGreaterThan(fxRate(s, 'UK'));
  });

  it('HK tracks the US peg and stays inside the clamp', () => {
    const s = game();
    for (let i = 0; i < 260; i++) runFx(s);
    expect(fxRate(s, 'HK') / fxRate(s, 'US')).toBeCloseTo(1, 2);
    for (const l of Object.values(s.fx.level)) {
      expect(l!).toBeGreaterThanOrEqual(FX.min * FX_START_INDEX);
      expect(l!).toBeLessThanOrEqual(FX.max * FX_START_INDEX);
    }
  });
});

describe('currency trades', () => {
  it('refuses the home currency and trades beyond cash', () => {
    const s = game();
    expect(tradeFx(s, 'company', 'CA', 1000).ok).toBe(false);
    expect(tradeFx(s, 'personal', 'US', s.personal.cash * 2).ok).toBe(false);
  });

  it('company positions tie out to the balance sheet, with the identity held', () => {
    const s = game();
    const cash = s.company.cash;
    expect(tradeFx(s, 'company', 'US', 100_000).ok).toBe(true);
    expect(tradeFx(s, 'personal', 'EA', 50_000).ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(cash - 100_000 * (1 + FX.spread), 6);
    for (let w = 0; w < 26; w++) {
      advanceWeeks(s, 1);
      const bs = balanceSheet(s);
      expect(bs.currencies).toBeCloseTo(fxValue(s, 'company'), 6);
      expect(portfolioBreakdown(s, 'personal').currencies).toBeCloseTo(fxValue(s, 'personal'), 6);
      expect(gap(s)).toBeLessThan(1);
    }
    expect(tradeFx(s, 'company', 'US', -1e12).ok).toBe(true);
    expect(s.fx.positions.company.US).toBeUndefined();
    expect(balanceSheet(s).currencies).toBe(0);
    expect(gap(s)).toBeLessThan(1);
  });
});
