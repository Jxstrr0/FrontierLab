// View helpers behind the Treasury, Marketing and Risk floors (Stage 4 UI):
// liquidity gauge maths, term text and slider steps, campaign targets and
// awareness rows, the next regulator review and the model verdict.
import { describe, expect, it } from 'vitest';
import {
  awarenessRows,
  pointsText,
  runningAt,
  scopeTarget,
  targetCities,
  targetName,
} from '../../src/app/hq/marketing/marketingView';
import {
  lossProductName,
  modelVerdict,
  nextReviewWeek,
  pairBars,
} from '../../src/app/hq/risk/riskView';
import {
  GAUGE_MAX,
  gainTone,
  liquidityGauge,
  niceStep,
  snapAmount,
  termText,
} from '../../src/app/hq/treasury/treasuryView';
import { DAYS_PER_WEEK, LIQ_MIN, LIQ_REPAY_BUFFER } from '../../src/config/balance';
import { isQuarterStart } from '../../src/sim/calendar';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';

describe('liquidity gauge', () => {
  const g = (lr: number | null, target = 0.15) =>
    liquidityGauge(lr, LIQ_MIN, target, LIQ_REPAY_BUFFER);

  it('classifies the ratio against the minimum, target and repay buffer', () => {
    expect(g(null).status).toBe('none');
    expect(g(0.08).status).toBe('below');
    expect(g(0.12).status).toBe('low');
    expect(g(0.15).status).toBe('ok');
    expect(g(0.2).status).toBe('ok');
    expect(g(0.21).status).toBe('high');
  });

  it('places marker, minimum and target along the bar and pins off-scale ratios', () => {
    const x = g(0.25, 0.2);
    expect(x.marker).toBeCloseTo(0.25 / GAUGE_MAX);
    expect(x.min).toBeCloseTo(LIQ_MIN / GAUGE_MAX);
    expect(x.target).toBeCloseTo(0.2 / GAUGE_MAX);
    expect(x.offScale).toBe(false);
    const far = g(3);
    expect(far.marker).toBe(1);
    expect(far.offScale).toBe(true);
  });
});

describe('treasury formatting', () => {
  it('writes terms in weeks or whole years', () => {
    expect(termText(1)).toBe('1 week');
    expect(termText(26)).toBe('26 weeks');
    expect(termText(52)).toBe('1 year');
    expect(termText(78)).toBe('78 weeks');
    expect(termText(260)).toBe('5 years');
  });

  it('picks round slider steps of 1, 2 or 5 × 10ⁿ', () => {
    expect(niceStep(48_000_000)).toBe(500_000);
    expect(niceStep(150_000_000)).toBe(2_000_000);
    expect(niceStep(10_000)).toBe(1_000);
    expect(niceStep(5_000, 100_000)).toBe(100_000);
  });

  it('snaps amounts to the step but keeps the maximum reachable', () => {
    expect(snapAmount(1_234_567, 48_300_000, 500_000)).toBe(1_000_000);
    expect(snapAmount(48_500_000, 48_300_000, 500_000)).toBe(48_300_000);
    expect(snapAmount(-5, 100, 10)).toBe(0);
    expect(snapAmount(50, 0, 10)).toBe(0);
  });

  it('tones gains, losses and rounding noise', () => {
    expect(gainTone(1200)).toBe('good');
    expect(gainTone(-40)).toBe('bad');
    expect(gainTone(0.2)).toBe('flat');
  });
});

describe('marketing view', () => {
  it('targets a picked city or its country, by name', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    expect(targetCities(s)).toEqual({ ids: ['cal'], initial: 'cal' });
    expect(scopeTarget('cal', 'city')).toBe('cal');
    expect(scopeTarget('cal', 'country')).toBe('CA');
    expect(targetName('city', 'cal')).toBe('Calgary');
    expect(targetName('country', 'CA')).toBe('Canada');
    expect(pointsText(0.012)).toBe('+1.2 pts');
  });

  it('finds running campaigns and shows their saturated gain by city', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    s.company.cash = 50_000_000;
    const listing = Object.values(s.world.officeListings).find((l) => l.cityId === 'cal')!;
    const lease = cmd.leaseOffice(s, listing.id, ['marketing']);
    if (!lease.ok) throw new Error(lease.reason);
    expect(awarenessRows(s)[0]!.rise).toBe(0);
    const r = cmd.startBrandCampaign(s, { campaignId: 'tv', scope: 'city', targetId: 'cal' });
    if (!r.ok) throw new Error(r.reason);
    expect(runningAt(s, 'tv', 'city', 'cal')?.id).toBe(r.id);
    expect(runningAt(s, 'tv', 'country', 'CA')).toBeUndefined();
    const row = awarenessRows(s).find((x) => x.cityId === 'cal')!;
    expect(row.name).toBe('Calgary');
    expect(row.rise).toBeGreaterThan(0);
    expect(row.rise).toBeLessThanOrEqual(0.02 * (1 - row.awareness) + 1e-12);
  });
});

describe('risk view', () => {
  it('finds the next quarter-start weekly close', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const next = nextReviewWeek(s.meta.startDate, 0);
    expect(isQuarterStart(s.meta.startDate, next * DAYS_PER_WEEK)).toBe(true);
    for (let w = 1; w < next; w++) {
      expect(isQuarterStart(s.meta.startDate, w * DAYS_PER_WEEK)).toBe(false);
    }
    expect(nextReviewWeek(s.meta.startDate, next)).toBeGreaterThan(next);
  });

  it('names loss-table products, with Loan Desk lending spelled out', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    expect(lossProductName(s, 'sbl')).toMatch(/Loan Desk/);
    expect(lossProductName(s, 'mortgage')).not.toBe('mortgage');
    expect(lossProductName(s, 'nope')).toBe('nope');
  });

  it('compares actual defaults with the prediction', () => {
    expect(modelVerdict(0, 0)).toBe('none');
    expect(modelVerdict(0.02, 0.025)).toBe('under');
    expect(modelVerdict(0.02, 0.015)).toBe('over');
    expect(modelVerdict(0.02, 0.021)).toBe('close');
    expect(pairBars(0.02, 0.01)).toEqual([1, 0.5]);
    expect(pairBars(0, 0)).toEqual([0, 0]);
  });
});
