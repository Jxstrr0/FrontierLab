// Delegation dials (SIMULATION §17.2, SCREENS §10.1): the COO's morale target
// and review cadence and the CMO's awareness target are settings the routines
// read, the commands only accept the dial's stops, v20 saves keep the old
// fixed values, and the tagline estimates are pure and move the right way.
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION, PAY_REVIEW } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { averageMorale, cmoBrand, cooBenefits } from '../../src/sim/execDelegationsPeople';
import { brandEstimate, cadenceEstimate, moraleEstimate } from '../../src/sim/execPolicy';
import { newGame } from '../../src/sim/newGame';
import { cooPayReviews } from '../../src/sim/payReviews';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { execGame } from '../helpers/executives';

const openFirst = (s: GameState) => {
  const b = Object.values(s.branches)[0]!;
  b.status = 'open';
  b.customers = 2_000;
  return b;
};

const withRevenue = (s: GameState, weekly: number) => {
  s.history.weekly.push({
    ...(s.history.weekly.at(-1) ?? ({} as never)),
    week: 0,
    revenue: weekly,
  } as never);
};

describe('dial commands', () => {
  it('accept only the stops', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    expect(cmd.setMoraleTarget(s, 80).ok).toBe(true);
    expect(s.executives.moraleTarget).toBe(80);
    expect(cmd.setMoraleTarget(s, 75).ok).toBe(false);
    expect(cmd.setBrandTarget(s, 0.6).ok).toBe(true);
    expect(s.executives.brandTarget).toBe(0.6);
    expect(cmd.setBrandTarget(s, 0.55).ok).toBe(false);
    expect(cmd.setPayReviewCadence(s, 'annual').ok).toBe(true);
    expect(s.executives.payReviewCadence).toBe('annual');
    expect(cmd.setPayReviewCadence(s, 'monthly' as never).ok).toBe(false);
  });

  it('start at the values the switches always used', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    expect(s.executives.moraleTarget).toBe(EXEC_DELEGATION.moraleTarget);
    expect(s.executives.brandTarget).toBe(EXEC_DELEGATION.brandTarget);
    expect(s.executives.payReviewCadence).toBe(PAY_REVIEW.defaultCadence);
  });
});

describe('routines read the dials', () => {
  it('HR benefits buys more only when morale is under the dialled target', () => {
    const s = execGame(['hr']);
    const b = openFirst(s);
    b.staff.morale = 75;
    const { morale } = averageMorale(s);
    expect(morale).toBeGreaterThan(70);
    expect(morale).toBeLessThan(80);
    cooBenefits(s);
    expect(Object.keys(s.people.benefits)).toHaveLength(0);
    cmd.setMoraleTarget(s, 80);
    cooBenefits(s);
    expect(Object.keys(s.people.benefits).length).toBeGreaterThan(0);
  });

  it('Brand campaigns push a city only when it is under the dialled target', () => {
    const s = execGame(['marketing']);
    const b = openFirst(s);
    withRevenue(s, 10_000_000);
    s.world.cities[b.cityId]!.brandAwareness = 0.6;
    cmoBrand(s);
    expect(s.marketing.campaigns).toHaveLength(0);
    cmd.setBrandTarget(s, 0.7);
    cmoBrand(s);
    expect(s.marketing.campaigns.filter((c) => c.targetId === b.cityId)).toHaveLength(1);
  });

  it('Pay reviews run every 13 weeks quarterly and every 52 annually', () => {
    const s = execGame();
    s.executives.lastPayReviewWeek = 0;
    s.clock.week = 13;
    cooPayReviews(s);
    expect(s.executives.lastPayReviewWeek).toBe(13);
    cmd.setPayReviewCadence(s, 'annual');
    s.clock.week = 26;
    cooPayReviews(s);
    expect(s.executives.lastPayReviewWeek).toBe(13);
    s.clock.week = 65;
    cooPayReviews(s);
    expect(s.executives.lastPayReviewWeek).toBe(65);
  });
});

describe('estimates', () => {
  it('change nothing and cost more for a higher morale target', () => {
    const s = execGame(['hr']);
    const b = openFirst(s);
    b.staff.morale = 60;
    const before = JSON.stringify(s);
    const low = moraleEstimate(s, 70);
    const high = moraleEstimate(s, 90);
    expect(JSON.stringify(s)).toBe(before);
    expect(low.active).toBe(true);
    expect(high.weeklyCost).toBeGreaterThanOrEqual(low.weeklyCost);
    expect(high.morale).toBeGreaterThanOrEqual(low.morale);
    expect(low.morale).toBeGreaterThan(low.now);
    expect(Number.isFinite(high.payrollShare)).toBe(true);
  });

  it('cost more and bring more customers for a higher awareness target', () => {
    const s = execGame(['marketing']);
    const b = openFirst(s);
    withRevenue(s, 10_000_000);
    s.world.cities[b.cityId]!.brandAwareness = 0.5;
    const before = JSON.stringify(s);
    const low = brandEstimate(s, 0.4);
    const high = brandEstimate(s, 0.7);
    expect(JSON.stringify(s)).toBe(before);
    expect(high.pushed).toBe(1);
    expect(low.pushed).toBe(0);
    expect(high.weeklyCost).toBeGreaterThan(low.weeklyCost);
    expect(high.prospects).toBeGreaterThan(0);
    expect(low.prospects).toBeLessThanOrEqual(0);
  });

  it('let pay drift further between annual reviews', () => {
    const s = execGame();
    const q = cadenceEstimate(s, 'quarterly');
    const a = cadenceEstimate(s, 'annual');
    expect(q.reviewsPerYear).toBe(4);
    expect(a.reviewsPerYear).toBe(1);
    expect(a.maxDrift).toBeGreaterThan(q.maxDrift);
  });
});

describe('migration 20 → 21', () => {
  it('keeps the old fixed targets and quarterly reviews', () => {
    const s = newGame({ seed: 7, cityId: 'cal' });
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    const ex = raw.executives as Partial<GameState['executives']>;
    delete ex.moraleTarget;
    delete ex.brandTarget;
    delete ex.payReviewCadence;
    raw.schemaVersion = 20;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.executives.moraleTarget).toBe(70);
    expect(up.executives.brandTarget).toBe(0.5);
    expect(up.executives.payReviewCadence).toBe('quarterly');
  });
});
