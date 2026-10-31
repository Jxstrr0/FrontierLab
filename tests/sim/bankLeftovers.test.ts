// Stage C8f: the last bank leftovers reworked — seed money folded into cash
// (and the 18 → 19 migration), the $1B ARR milestone, the launch posture's
// pull on deal odds and safety exposure, and refunds priced on ARR.
import { describe, expect, it, vi } from 'vitest';
import { LAUNCH_POSTURE, MILESTONE_GOALS, START_CASH } from '../../src/config/balance';
import { safetyExposure, postureDealEdge } from '../../src/sim/safety';
import { checkMilestones } from '../../src/sim/milestones';
import { newGame } from '../../src/sim/newGame';
import { legacyTreasury } from '../../src/sim/save/legacyTreasury';
import { migrations } from '../../src/sim/save/migrations';
import * as arr from '../../src/sim/arr';

describe('seed money', () => {
  it('is all spendable: no locked reserve', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    expect(s.company.cash).toBe(START_CASH);
    expect('treasury' in s).toBe(false);
    expect(s.company.paidInCapital).toBe(START_CASH);
  });

  it('migration 18 → 19 moves an old save’s reserves into cash', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    legacyTreasury(s).reserves = 2_000_000;
    const cash = s.company.cash;
    migrations[18]!(s as never);
    expect(s.company.cash).toBe(cash + 2_000_000);
    expect(legacyTreasury(s).reserves).toBe(0);
  });

  it('leaves reserves alone while bank-era borrowing remains', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const t = legacyTreasury(s);
    t.reserves = 2_000_000;
    t.overnight = 500_000;
    migrations[18]!(s as never);
    expect(t.reserves).toBe(2_000_000);
  });
});

describe('the billion milestone', () => {
  it('is reached on ARR, under its old id', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const spy = vi.spyOn(arr, 'companyArr').mockReturnValue(MILESTONE_GOALS.arr);
    checkMilestones(s, true);
    spy.mockRestore();
    expect(s.milestones.deposits_1b).toBe(s.clock.week);
  });
});

describe('launch posture', () => {
  it('trades deal odds for safety exposure', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    s.company.riskAppetite = 3;
    const base = safetyExposure(s);
    expect(postureDealEdge(s)).toBe(0);
    s.company.riskAppetite = 5;
    expect(postureDealEdge(s)).toBe(LAUNCH_POSTURE.dealEdge[4]);
    expect(safetyExposure(s)).toBeCloseTo(base + LAUNCH_POSTURE.exposure[4]!);
    s.company.riskAppetite = 1;
    expect(postureDealEdge(s)).toBeLessThan(0);
    expect(safetyExposure(s)).toBeLessThan(base);
  });
});
