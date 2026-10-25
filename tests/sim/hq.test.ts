// HQ formulas (SIMULATION §16.1–16.5) and office/department commands.
import { describe, expect, it } from 'vitest';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { balanceSheet } from '../../src/sim/balanceSheet';
import {
  benefitWeeklyCost,
  computeCoverage,
  deptDesks,
  employeeCount,
  scaledEffect,
  staffMods,
} from '../../src/sim/hq';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';
import { openScriptedBranch } from '../helpers/scenario';

function withOffice(depts: Parameters<typeof cmd.leaseOffice>[2] = ['finance', 'hr']) {
  const s = newGame({ seed: 7, cityId: 'cal', startCash: 1_500_000 });
  const listing = Object.values(s.world.officeListings).sort((a, b) =>
    a.id.localeCompare(b.id),
  )[0]!;
  const r = cmd.leaseOffice(s, listing.id, depts);
  if (!r.ok) throw new Error(r.reason);
  return { s, officeId: r.officeId, listing };
}

const identityGap = (s: GameState) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

describe('office listings', () => {
  it('every city start has offices for lease and map sites on free tiles', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const listings = Object.values(s.world.officeListings);
    expect(listings.length).toBeGreaterThanOrEqual(3);
    const tiles = new Set(Object.values(s.world.lots).map((l) => `${l.tile.x},${l.tile.y}`));
    for (const l of [...listings, ...Object.values(s.world.sites)]) {
      const key = `${l.tile.x},${l.tile.y}`;
      expect(tiles.has(key)).toBe(false);
      tiles.add(key);
    }
    // Calgary hosts a Northscore bureau office (CONTENT §13).
    expect(Object.values(s.world.sites).some((x) => x.refId === 'Northscore')).toBe(true);
    for (const l of listings) expect(l.deposit).toBe(l.weeklyRent * 8);
  });
});

describe('coverage (§16.4)', () => {
  it('is full in founder mode and follows k^0.7 when requirements apply', () => {
    const { s } = withOffice();
    const d = s.departments.finance!;
    d.staff = 0;
    expect(computeCoverage(s, 'finance', 0).eff).toBe(1);
    expect(computeCoverage(s, 'finance', 1).eff).toBe(0);
    // Half the required effective staff at ramp 1 → k′ 0.5 → 0.5^0.7.
    d.skill = 100;
    d.morale = 100;
    const req = computeCoverage(s, 'finance', 1).required;
    d.staff = req / 2;
    const c = computeCoverage(s, 'finance', 1);
    expect(c.kPrime).toBeCloseTo(0.5, 6);
    expect(c.eff).toBeCloseTo(Math.pow(0.5, 0.7), 6);
    // Half way through the ramp only half the shortfall counts.
    expect(computeCoverage(s, 'finance', 0.5).kPrime).toBeCloseTo(0.75, 6);
    // Overstaffing caps at +5%.
    d.staff = req * 3;
    expect(computeCoverage(s, 'finance', 1).eff).toBeCloseTo(1.05, 6);
  });
});

describe('benefits (CONTENT §10)', () => {
  it('scale linearly to the stated amount, then flatten to 1.5×', () => {
    expect(scaledEffect(30, 60, 4)).toBe(2);
    expect(scaledEffect(60, 60, 4)).toBe(4);
    expect(scaledEffect(90, 60, 4)).toBe(5);
    expect(scaledEffect(1000, 60, 4)).toBe(6);
  });

  it('cost what their cards say and lift morale', () => {
    const { s } = withOffice();
    openScriptedBranch(s, 'midtown');
    expect(cmd.setBenefit(s, 'lunch', 60).ok).toBe(true);
    expect(benefitWeeklyCost(s, 'lunch', 60)).toBe(60 * employeeCount(s));
    expect(staffMods(s).morale).toBeCloseTo(4, 6);
    expect(cmd.setBenefit(s, 'espp', 0.1).ok).toBe(false);
  });
});

describe('office commands', () => {
  it('lease, add and release floors keep the books balanced', () => {
    const { s, officeId, listing } = withOffice(['finance']);
    expect(deptDesks(s, 'finance')).toBe(listing.desksPerFloor);
    expect(cmd.addFloor(s, officeId, 'hr').ok).toBe(true);
    expect(cmd.addFloor(s, officeId, 'finance').ok).toBe(true);
    expect(deptDesks(s, 'finance')).toBe(2 * listing.desksPerFloor);
    advanceWeeks(s, 6);
    expect(s.departments.finance!.staff).toBeGreaterThan(0);
    expect(s.history.weekly.at(-1)!.pnl.hqStaff).toBeGreaterThan(0);
    expect(cmd.releaseFloor(s, officeId, 0).ok).toBe(true);
    expect(deptDesks(s, 'finance')).toBe(listing.desksPerFloor);
    expect(cmd.releaseOffice(s, officeId).ok).toBe(true);
    expect(s.departments.finance).toBeUndefined();
    expect(s.world.officeListings[listing.id]!.officeId).toBeUndefined();
    advanceWeeks(s, 1);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('rejects too many floors, later-stage floors and short cash', () => {
    const s = newGame({ seed: 7, cityId: 'cal', startCash: 600_000 });
    const l = Object.values(s.world.officeListings)[0]!;
    // Every floor is available once Stage 7 enables the Investment floor; unknown ones still fail.
    expect(cmd.leaseOffice(s, l.id, ['vault' as never]).ok).toBe(false);
    const all = ['finance', 'hr', 'products', 'treasury', 'marketing', 'it', 'risk'] as const;
    expect(cmd.leaseOffice(s, l.id, [...all, 'finance']).ok).toBe(false);
    s.company.cash = 1000;
    expect(cmd.leaseOffice(s, l.id, ['finance']).ok).toBe(false);
  });

  it('caps staff targets at the desks', () => {
    const { s, listing } = withOffice(['it']);
    cmd.setDeptTarget(s, 'it', 500);
    expect(s.departments.it!.target).toBe(listing.desksPerFloor);
  });
});
