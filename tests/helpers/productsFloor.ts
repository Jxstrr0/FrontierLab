// Test setup for the Products floor: a Calgary game with one branch and an HQ
// office holding the given floors, staffed so the team counts.
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import type { DeptId, GameState } from '../../src/sim/state';
import { freeLot } from './scenario';

export function gameWithFloors(depts: DeptId[] = ['products']): {
  s: GameState;
  branchId: string;
} {
  const s = newGame({ seed: 7, cityId: 'cal', bankName: 'Floor Bank' });
  const r = cmd.buildBranch(s, { lotId: freeLot(s, 'midtown').id, build: REFERENCE_BUILDS.mid });
  if (!r.ok) throw new Error(r.reason);
  // Extra paid-in capital so HQ is affordable (keeps the balance identity).
  s.company.paidInCapital += 5_000_000;
  s.company.cash += 5_000_000;
  if (depts.length > 0) {
    const listing = Object.values(s.world.officeListings)
      .filter((l) => !l.officeId && l.cityId === s.world.currentCityId)
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    const lease = cmd.leaseOffice(s, listing.id, depts);
    if (!lease.ok) throw new Error(lease.reason);
    for (const d of depts) {
      const dept = s.departments[d]!;
      dept.staff = 6;
      dept.skill = 80;
    }
  }
  return { s, branchId: r.branchId };
}
