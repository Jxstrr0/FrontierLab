// Pure helpers behind the Products floor, data vendor and digital projects
// screens: the mix slider maths (always 100%), risk appetite and tier wording,
// the odds table rows, the company lineup's price and Offered state, digital
// project status and the line chart's point maths.
import { describe, expect, it } from 'vitest';
import { linePoints } from '../../src/app/components/LineChart';
import {
  apportion,
  fromPercents,
  percentTotal,
  rebalance,
  toPercents,
} from '../../src/app/hq/products/mixMath';
import {
  companyOffered,
  companyPrice,
  digitalStatus,
  INPUT_IDS,
  oddsRows,
  openInputs,
  productSubtitle,
  templateBlocker,
  tierHint,
  trendSeries,
} from '../../src/app/hq/products/productSelectors';
import { riskHint } from '../../src/app/hq/finance/riskSelectors';
import { DEV_TEMPLATES } from '../../src/data/devTemplates';
import { PRODUCTS } from '../../src/data/products';
import * as cmd from '../../src/sim/commands';
import { productSpec } from '../../src/sim/products';
import { mixProblem } from '../../src/sim/underwriting';
import { gameWithFloors } from '../helpers/productsFloor';

const OPEN = ['bureau', 'cashflow', 'altdata', 'fraud'];

describe('mix slider maths', () => {
  it('apportions whole units that add up exactly, by largest remainder', () => {
    expect(apportion([1, 1, 1], 100)).toEqual([34, 33, 33]);
    expect(apportion([0, 0], 10)).toEqual([5, 5]);
    expect(apportion([3, 1], 0)).toEqual([0, 0]);
    expect(apportion([2, 1, 1], 7).reduce((a, b) => a + b)).toBe(7);
  });

  it('turns a stored mix into whole percents and back', () => {
    const pcts = toPercents({ bureau: 0.4, altdata: 0.6 }, INPUT_IDS);
    expect(pcts).toEqual({ bureau: 40, cashflow: 0, altdata: 60, internal: 0, fraud: 0 });
    expect(fromPercents(pcts)).toEqual({ bureau: 0.4, altdata: 0.6 });
    const thirds = toPercents({ bureau: 1 / 3, cashflow: 1 / 3, fraud: 1 / 3 }, INPUT_IDS);
    expect(percentTotal(thirds)).toBe(100);
  });

  it('moving one slider rescales the others in proportion so the total stays 100', () => {
    const start = { bureau: 60, cashflow: 30, altdata: 10, internal: 0, fraud: 0 };
    const next = rebalance(start, 'bureau', 20, OPEN);
    expect(next.bureau).toBe(20);
    expect(next.cashflow).toBe(60);
    expect(next.altdata).toBe(20);
    expect(percentTotal(next)).toBe(100);
  });

  it('shares the rest equally when every other input is at zero, skipping locked ones', () => {
    const start = { bureau: 100, cashflow: 0, altdata: 0, internal: 0, fraud: 0 };
    const next = rebalance(start, 'bureau', 80, OPEN);
    expect(next).toEqual({ bureau: 80, cashflow: 7, altdata: 7, internal: 0, fraud: 6 });
  });

  it('clamps to 0–100 and gives the only open input the whole mix', () => {
    const start = { bureau: 50, cashflow: 50 };
    expect(rebalance(start, 'bureau', 140, ['bureau', 'cashflow'])).toEqual({
      bureau: 100,
      cashflow: 0,
    });
    expect(rebalance(start, 'bureau', 30, ['bureau'])).toEqual({ bureau: 100, cashflow: 0 });
  });

  it('always yields a mix the sim accepts', () => {
    const { s } = gameWithFloors();
    let pcts = toPercents({ bureau: 1 }, INPUT_IDS);
    for (const [id, v] of [
      ['cashflow', 37],
      ['fraud', 13],
      ['altdata', 71],
      ['bureau', 3],
    ] as const) {
      pcts = rebalance(pcts, id, v, openInputs(s));
      expect(mixProblem(s, fromPercents(pcts))).toBeNull();
    }
  });

  it('keeps Customer Feedback locked until the lab has 5,000 customers', () => {
    const { s, branchId } = gameWithFloors();
    expect(openInputs(s)).not.toContain('internal');
    const office = s.branches[branchId]!;
    office.status = 'open';
    office.customers = 5_000;
    expect(openInputs(s)).toContain('internal');
  });
});

describe('Finance floor risk appetite wording', () => {
  it('describes risk appetite from the balance table', () => {
    expect(riskHint(3)).toBe('Standard loan volumes and default rates.');
    expect(riskHint(1)).toBe('About 30% fewer loans, with defaults 30% lower.');
    expect(riskHint(5)).toBe('About 30% more loans, with defaults 45% higher.');
  });
});

describe('Products floor wording', () => {
  it('describes the price tier for priced products', () => {
    expect(tierHint(DEV_TEMPLATES.golden_years, 'low')).toBe('Price ×0.85');
    expect(tierHint(DEV_TEMPLATES.golden_years, 'medium')).toBe('Standard price');
    expect(tierHint(DEV_TEMPLATES.max_plan, 'premium')).toBe(
      'Price ×1.25 · Products rating +0.05 where offered',
    );
    expect(tierHint(DEV_TEMPLATES.mobile_app_v2, 'low')).toBe('');
  });

  it('lists odds 5★ first in whole percents', () => {
    const rows = oddsRows([0.29, 0.4, 0.27, 0.04, 0]);
    expect(rows.map((r) => r.stars)).toEqual([5, 4, 3, 2, 1]);
    expect(rows.map((r) => r.pct)).toEqual([0, 4, 27, 40, 29]);
    // Rounded shares still add up to 100 (plain rounding would give 99 here).
    const total = oddsRows([0.132, 0.362, 0.372, 0.122, 0.012]).reduce((a, r) => a + r.pct, 0);
    expect(total).toBe(100);
  });
});

describe('company lineup', () => {
  it('reads the first branch until Apply-to-all is on, then the HQ price', () => {
    const { s, branchId } = gameWithFloors();
    const plus = PRODUCTS.plus!;
    cmd.setPrice(s, branchId, 'plus', 24);
    expect(companyPrice(s, plus)).toBeCloseTo(24);
    cmd.setApplyRatesToAll(s, true);
    cmd.setCompanyPrice(s, 'plus', 18);
    expect(companyPrice(s, plus)).toBeCloseTo(18);
  });

  it('shows Offered from the HQ lineup, or from the branches until it is set', () => {
    const { s, branchId } = gameWithFloors();
    expect(companyOffered(s, 'plus')).toBe(true);
    expect(companyOffered(s, 'api')).toBe(false);
    cmd.setOffered(s, branchId, 'api', true);
    expect(companyOffered(s, 'api')).toBe(true);
    cmd.setCompanyOffered(s, 'api', false);
    expect(companyOffered(s, 'api')).toBe(false);
  });

  it('labels developed products with their template and tier', () => {
    const { s } = gameWithFloors();
    s.products.catalog.dev_x = {
      id: 'dev_x',
      stars: 4,
      developed: true,
      name: 'Golden Years',
      base: 'plus',
      templateId: 'golden_years',
      tier: 'premium',
    };
    expect(productSubtitle(s, productSpec(s, 'dev_x')!)).toBe('Golden Years Plan · Premium tier');
    expect(productSubtitle(s, PRODUCTS.plus!)).toBeUndefined();
  });
});

describe('digital projects', () => {
  it('goes from blocked to available, running and done', () => {
    const { s } = gameWithFloors(['products']);
    const app = DEV_TEMPLATES.mobile_app_v2!;
    expect(templateBlocker(s, app)).toBe('Needs an IT floor');
    const { s: t } = gameWithFloors(['products', 'it']);
    expect(templateBlocker(t, app)).toBeNull();
    expect(digitalStatus(t, app.id).status).toBe('available');
    const r = cmd.startDevelopment(t, {
      name: '',
      templateId: app.id,
      tier: 'medium',
      weeks: 4,
      weeklyBudget: 5_000,
    });
    expect(r.ok).toBe(true);
    expect(digitalStatus(t, app.id).status).toBe('running');
    expect(templateBlocker(t, app)).toBe('Under way');
    t.products.developments = [];
    t.products.digitalDone = [app.id];
    expect(digitalStatus(t, app.id).status).toBe('done');
  });
});

describe('charts', () => {
  it('trend series keeps the last weeks and the latest two snapshots', () => {
    const snap = (week: number, arr: number | undefined, loans: number) =>
      ({ week, totals: { arr, loans } }) as never;
    const t = trendSeries([snap(1, 10, 1), snap(2, undefined, 2), snap(3, 30, 3)], 2);
    // A week closed before ARR was recorded (schema 5) reads as 0.
    expect(t.arr).toEqual([0, 30]);
    expect(t.weeks).toEqual([2, 3]);
  });

  it('line points span the width and scale to the max', () => {
    expect(linePoints([0, 50, 100], 100, 3)).toBe('0.00,96.00 50.00,50.00 100.00,4.00');
  });
});
