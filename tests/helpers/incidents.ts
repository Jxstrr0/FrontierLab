// Test setup for incidents: a Calgary game with one branch opened by hand.
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import type { Branch, GameState } from '../../src/sim/state';
import { freeLot } from './scenario';

/** A Calgary game with one open mid branch (opened by hand for unit tests). */
export function openBank(district = 'midtown'): { s: GameState; b: Branch } {
  const s = newGame({ seed: 3, cityId: 'cal', bankName: 'Case Bank' });
  const r = cmd.buildBranch(s, { lotId: freeLot(s, district).id, build: REFERENCE_BUILDS.mid });
  if (!r.ok) throw new Error(r.reason);
  const b = s.branches[r.branchId]!;
  b.status = 'open';
  b.customers = 2_000;
  return { s, b };
}
