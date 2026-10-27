// Test setup for executives and governance: a Calgary game with one open
// branch and an HQ office holding an Executive suite (plus any other floors),
// and a helper to seat an executive from the candidate pool.
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import * as cmd from '../../src/sim/commands';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { newGame } from '../../src/sim/newGame';
import type { DeptId, ExecSeat, Executive, GameState } from '../../src/sim/state';
import { freeLot } from './scenario';

export function execGame(extra: DeptId[] = []): GameState {
  const s = newGame({ seed: 11, cityId: 'cal', bankName: 'Board Bank' });
  const r = cmd.buildBranch(s, { lotId: freeLot(s, 'midtown').id, build: REFERENCE_BUILDS.mid });
  if (!r.ok) throw new Error(r.reason);
  // Extra paid-in capital so HQ is affordable (keeps the balance identity).
  s.company.paidInCapital += 5_000_000;
  s.company.cash += 5_000_000;
  const listing = Object.values(s.world.officeListings)
    .filter((l) => !l.officeId && l.cityId === s.world.currentCityId)
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const lease = cmd.leaseOffice(s, listing.id, ['executive', ...extra]);
  if (!lease.ok) throw new Error(lease.reason);
  return s;
}

/**
 * Adds a well-staffed Safety & Alignment floor, so a lab funded past founder
 * mode keeps a good safety tier and the regulator doesn't block it (C7a).
 */
export function staffSafety(s: GameState): void {
  const office = Object.values(s.offices).find((o) => o.floors.includes(null))!;
  const r = cmd.addFloor(s, office.id, 'risk');
  if (!r.ok) throw new Error(r.reason);
  const d = s.departments.risk!;
  d.staff = 10;
  d.skill = 80;
  cmd.setDeptTarget(s, 'risk', 10);
}

/** Hires the first candidate for a seat and returns them. */
export function hire(s: GameState, seat: ExecSeat): Executive {
  const c = s.executives.candidates[seat]![0]!;
  const r = cmd.hireExec(s, seat, c.id);
  if (!r.ok) throw new Error(r.reason);
  return s.executives.seats[seat]!;
}

export const identityGap = (s: GameState) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

export const holderTotal = (s: GameState) => s.stock.holders.reduce((n, h) => n + h.shares, 0);
