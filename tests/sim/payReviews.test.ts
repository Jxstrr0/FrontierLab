// Pay reviews and poaching (SIMULATION §17.1, §17.2): manager market pay rises
// with tenure, underpaid managers are poached more often, and the COO's Pay
// reviews set everyone to market × (1 + the pay premium).
import { describe, expect, it } from 'vitest';
import { EXECUTIVES, MANAGER_PAY, WEEKS_PER_YEAR } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { execMarketSalary, resignChance } from '../../src/sim/execSeats';
import {
  managerMarketSalary,
  managerPoachChance,
  reviewedManagerSalary,
  runManagerPoaching,
} from '../../src/sim/payReviews';
import { refreshManagerPool } from '../../src/sim/people';
import type { GameState } from '../../src/sim/state';
import { execGame, hire, identityGap } from '../helpers/executives';

/** The game's first branch, open with a hired manager. */
function withManager(s: GameState) {
  const b = Object.values(s.branches)[0]!;
  b.status = 'open';
  refreshManagerPool(s, b.cityId, true);
  const c = s.people.managerCandidates[b.cityId]![0]!;
  expect(cmd.hireManager(s, b.id, c.id).ok).toBe(true);
  return { b, m: s.people.managers[b.managerId!]! };
}

describe('manager pay market', () => {
  it('starts at the hiring ask and rises with years at the bank', () => {
    const s = execGame();
    const { m } = withManager(s);
    const start = managerMarketSalary(s, m);
    expect(Math.abs(start - m.salary)).toBeLessThan(100);
    s.clock.week += 2 * WEEKS_PER_YEAR;
    expect(managerMarketSalary(s, m)).toBeCloseTo(start * (1 + 2 * MANAGER_PAY.tenureGrowth));
  });

  it('poaches the underpaid more often and the well paid less', () => {
    const p = MANAGER_PAY;
    expect(managerPoachChance(100, 100)).toBe(p.poachBase);
    expect(managerPoachChance(80, 100)).toBe(p.poachBase * p.underpaidMult);
    expect(managerPoachChance(115, 100)).toBe(p.poachBase * p.wellPaidMult);
  });

  it('hands delegation back when a manager is poached', () => {
    const s = execGame();
    const { b } = withManager(s);
    b.delegation.products = true;
    s.people.managers[b.managerId!]!.salary = 1;
    // A near-certain poach: underpaid for a century.
    s.clock.week += 100 * WEEKS_PER_YEAR;
    for (let i = 0; i < 2000 && b.managerId; i++) runManagerPoaching(s);
    expect(b.managerId).toBeUndefined();
    expect(b.delegation.products).toBe(false);
    expect(s.events.log.some((e) => e.type === 'MANAGER_POACHED')).toBe(true);
  });
});

describe('COO pay reviews', () => {
  it('sets executives and managers to market plus the premium when switched on', () => {
    const s = execGame();
    const coo = hire(s, 'coo');
    const { m } = withManager(s);
    expect(cmd.setExecDelegation(s, 'coo', 'payReviews', false).ok).toBe(true);
    expect(cmd.setPayPremium(s, 0.1).ok).toBe(true);
    m.salary = 10_000;
    expect(cmd.setExecDelegation(s, 'coo', 'payReviews', true).ok).toBe(true);
    expect(m.salary).toBe(reviewedManagerSalary(s, m));
    expect(m.salary).toBeGreaterThan(managerMarketSalary(s, m));
    expect(coo.salary).toBeGreaterThanOrEqual(execMarketSalary(s) * 1.1 - 5_000);
    expect(s.executives.lastPayReviewWeek).toBe(s.clock.week);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('refuses premiums off the range', () => {
    const s = execGame();
    expect(cmd.setPayPremium(s, 0.9).ok).toBe(false);
    expect(cmd.setPayPremium(s, -0.5).ok).toBe(false);
    expect(cmd.setPayPremium(s, 0.15).ok).toBe(true);
    expect(s.executives.payPremium).toBe(0.15);
  });

  it('halves an executive’s resignation chance when well paid', () => {
    const s = execGame();
    const cfo = hire(s, 'cfo');
    const market = 200_000;
    cfo.grants = [];
    cfo.salary = market;
    const base = resignChance(cfo, market);
    cfo.salary = market * EXECUTIVES.wellPaidRatio;
    expect(resignChance(cfo, market)).toBeCloseTo(base * EXECUTIVES.wellPaidMult);
  });
});
