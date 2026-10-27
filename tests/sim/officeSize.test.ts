// Sales offices (stage C2a, SIMULATION §6.4, §9.1): one office per city, grown
// in place a size at a time, with reach that grows with size up to the city's
// guide, and the schema 1 → 2 migration that gives old branches a size.
import { describe, expect, it } from 'vitest';
import { CITY_BRANCH_GUIDE, OFFICE_SIZES } from '../../src/config/balance';
import { sizeFor } from '../../src/sim/branch/officeMerge';
import {
  MAX_OFFICE_SIZE,
  nextSizeAddsReach,
  officeInCity,
  officeTraffic,
  sizeMultOf,
} from '../../src/sim/branch/officeSize';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { migrations } from '../../src/sim/save/migrations';
import { freeLot, openScriptedBranch } from '../helpers/scenario';
import { addCapital, identityGap } from '../helpers/mergers';
import { newGame } from '../../src/sim/newGame';
import { REFERENCE_BUILDS } from '../../src/data/equipment';

function openOffice() {
  const s = newGame({ seed: 11, cityId: 'cal', startCash: 2_500_000 });
  const id = openScriptedBranch(s, 'midtown');
  addCapital(s, 20_000_000);
  while (s.branches[id]!.status !== 'open') advanceWeeks(s, 1);
  return { s, id };
}

describe('sales offices', () => {
  it('allows one office per city', () => {
    const { s } = openOffice();
    const r = cmd.buildBranch(s, { lotId: freeLot(s).id, build: REFERENCE_BUILDS.mid });
    expect(r.ok).toBe(false);
    expect(officeInCity(s, 'cal')).toBeDefined();
    expect(officeInCity(s, 'sas')).toBeUndefined();
  });

  it('grows a size at a time, paying fit-out and deposit, raising rent and staff', () => {
    const { s, id } = openOffice();
    const b = s.branches[id]!;
    const rent = b.lease.weeklyRent;
    const target = b.staff.target;
    const quote = cmd.upgradeQuote(s, id)!;
    expect(quote.name).toBe(OFFICE_SIZES[1].name);
    const cash = s.company.cash;
    expect(cmd.upgradeOffice(s, id).ok).toBe(true);
    expect(b.size).toBe(1);
    expect(s.company.cash).toBeCloseTo(cash - quote.total, 0);
    expect(b.lease.weeklyRent).toBeCloseTo(rent * sizeMultOf(1), 6);
    expect(b.staff.target).toBeGreaterThan(target);
    expect(identityGap(s)).toBeLessThan(1);
    advanceWeeks(s, 2);
    expect(identityGap(s)).toBeLessThan(1);
    while (cmd.upgradeQuote(s, id)) expect(cmd.upgradeOffice(s, id).ok).toBe(true);
    expect(b.size).toBe(MAX_OFFICE_SIZE);
    expect(cmd.upgradeBlocker(s, id)).toMatch(/largest/);
  });

  it('reaches more of the city as it grows, up to the guide', () => {
    const { s, id } = openOffice();
    const b = s.branches[id]!;
    const starter = officeTraffic(s, b);
    b.size = 1;
    expect(officeTraffic(s, b)).toBeCloseTo(starter * sizeMultOf(1), 6);
    // Calgary is an M city: reach stops at its guide.
    b.size = MAX_OFFICE_SIZE;
    expect(officeTraffic(s, b)).toBeCloseTo(starter * CITY_BRANCH_GUIDE.M, 6);
    expect(nextSizeAddsReach(b)).toBe(false);
    b.size = 0;
    expect(nextSizeAddsReach(b)).toBe(true);
  });

  it('sizes a merged office to hold both', () => {
    expect(sizeFor(1)).toBe(0);
    expect(sizeFor(2)).toBe(1);
    expect(sizeFor(3.5)).toBe(2);
    expect(sizeFor(100)).toBe(MAX_OFFICE_SIZE);
  });

  it('migrates schema 1 saves to Starter offices', () => {
    const branches: Record<string, { size?: number }> = { a: {}, b: { size: 2 } };
    const out = migrations[1]!({ schemaVersion: 1, branches }) as unknown as {
      branches: Record<string, { size?: number }>;
    };
    expect(out.branches.a!.size).toBe(0);
    expect(out.branches.b!.size).toBe(2);
  });
});
