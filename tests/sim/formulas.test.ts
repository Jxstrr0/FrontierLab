// Formula checks against the worked examples in SIMULATION.md.
import { describe, expect, it } from 'vitest';
import { shareFormula } from '../../src/sim/branch/demand';
import { acceptanceProb, pdFromScore, pentagonScore } from '../../src/sim/branch/loanDesk';
import { competitiveness, priceFactor } from '../../src/sim/branch/pricing';
import { PRODUCTS } from '../../src/data/products';
import { isQuarterStart, isYearStart, weekOfYear } from '../../src/sim/calendar';
import { tierFor } from '../../src/sim/capital';
import type { LoanApplication } from '../../src/sim/state';

describe('share of prospects (§9.3)', () => {
  it('matches the calibration example', () => {
    expect(shareFormula(3.0, [{ overall: 3.5, distance: 6 }], 0.35)).toBeCloseTo(0.36, 1);
    expect(shareFormula(4.3, [{ overall: 3.5, distance: 6 }], 0.35)).toBeCloseTo(0.55, 1);
  });

  it('ignores branches beyond the radius', () => {
    const alone = shareFormula(3.0, [], 0.35);
    expect(shareFormula(3.0, [{ overall: 5, distance: 20 }], 0.35)).toBe(alone);
  });
});

describe('pricing (§8, §9.7)', () => {
  const plus = PRODUCTS.plus!;
  const sbl = PRODUCTS.sbl!;
  const api = PRODUCTS.api!;

  it('compares plan fees against a quarter of the market fee', () => {
    expect(competitiveness(plus, 15, 20)).toBeCloseTo(1);
    expect(competitiveness(plus, 25, 20)).toBeCloseTo(-1);
  });

  it('scores Loan Desk rates below market as competitive and clamps to ±2', () => {
    expect(competitiveness(sbl, 0.09, 0.095)).toBeCloseTo(1);
    expect(competitiveness(sbl, 0.2, 0.1)).toBe(-2);
  });

  it('compares API prices per unit, with a $0.10 floor on the step', () => {
    expect(competitiveness(api, 3, 4)).toBeCloseTo(1);
    // A quarter of $0.20 is under the floor, so the step is $0.10.
    expect(competitiveness(api, 0.05, 0.2)).toBeCloseTo(1.5);
  });

  it('raises take-up when the price beats the market', () => {
    expect(priceFactor(plus, 'RET', 15, 20)).toBeGreaterThan(1);
    expect(priceFactor(sbl, 'FAM', 0.12, 0.1)).toBeLessThan(1);
    expect(priceFactor(plus, 'STU', 60, 20)).toBeCloseTo(0.2);
  });
});

describe('Loan Desk (§11)', () => {
  it('weights the pentagon with financial health heaviest', () => {
    expect(pentagonScore([5, 5, 5, 5, 5])).toBeCloseTo(5);
    expect(pentagonScore([5, 5, 5, 5, 10])).toBeCloseTo(6.5);
  });

  it('sets PD from score and collateral', () => {
    expect(pdFromScore(5, 'partial')).toBeCloseTo(0.025);
    expect(pdFromScore(5, 'none')).toBeCloseTo(0.03);
    expect(pdFromScore(7, 'partial')).toBeLessThan(0.025);
  });

  it('accepts offers at or under the max rate 97% of the time, less above it', () => {
    const app = { maxRate: 0.09 } as LoanApplication;
    expect(acceptanceProb(app, 0.08)).toBeCloseTo(0.97);
    expect(acceptanceProb(app, 0.1)).toBeCloseTo(0.37);
    expect(acceptanceProb(app, 0.2)).toBe(0);
  });
});

describe('calendar and tiers', () => {
  it('detects quarter and year starts on weekly ticks', () => {
    // Start 2027-01-04; day 91 = 2027-04-05, the first tick after Mar 31.
    expect(isQuarterStart('2027-01-04', 84)).toBe(false);
    expect(isQuarterStart('2027-01-04', 91)).toBe(true);
    expect(isYearStart('2027-01-04', 364)).toBe(true);
    expect(weekOfYear(new Date(Date.UTC(2027, 0, 4)))).toBe(1);
  });

  it('maps capital ratios to tiers (§15)', () => {
    expect(tierFor(0.15)).toBe('strong');
    expect(tierFor(0.12)).toBe('adequate');
    expect(tierFor(0.09)).toBe('watch');
    expect(tierFor(0.07)).toBe('restricted');
    expect(tierFor(0.05)).toBe('critical');
  });
});
