// HQ upkeep for scripted strategies (SIMULATION §25 "HQ floors staffed to 100%"):
// lease an office once requirements start phasing in, add a floor per
// department in priority order as cash allows, and keep every department's
// staff target at what full coverage needs.
import { HQ_COVERAGE } from '../../src/config/balance';
import { HQ_DEPTS } from '../../src/data/departments';
import type { HqDeptId } from '../../src/data/types';
import * as cmd from '../../src/sim/commands';
import { deptDesks, founderRamp, requiredStaff } from '../../src/sim/hq';
import type { GameState } from '../../src/sim/state';

/** Departments whose shortfall hurts most come first. */
const PRIORITY: readonly HqDeptId[] = [
  'hr',
  'risk',
  'finance',
  'treasury',
  'it',
  'products',
  'marketing',
];
/** Keep this many weeks of costs in hand before fitting out another floor. */
const CASH_BUFFER = 3;
/** Staff a little over the requirement so quits don't dip coverage. */
const HEADROOM = 1.15;

export function manageHq(state: GameState): void {
  if (founderRamp(state) <= 0 && Object.keys(state.offices).length === 0) return;
  ensureFloors(state);
  for (const id of HQ_DEPTS) {
    const d = state.departments[id];
    if (!d) continue;
    const perHead =
      (HQ_COVERAGE.skillBase + (HQ_COVERAGE.skillSlope * d.skill) / 100) *
      (HQ_COVERAGE.moraleBase + (HQ_COVERAGE.moraleSlope * d.morale) / 100);
    const want = Math.ceil((requiredStaff(state, id) * HEADROOM) / perHead);
    if (want > deptDesks(state, id)) addFloorFor(state, id);
    cmd.setDeptTarget(state, id, want);
  }
}

function ensureFloors(state: GameState): void {
  if (Object.keys(state.offices).length === 0) {
    const listing = Object.values(state.world.officeListings)
      .filter((l) => !l.officeId && l.cityId === state.world.currentCityId && l.floors >= 7)
      .sort((a, b) => a.weeklyRent - b.weeklyRent)[0];
    if (!listing) return;
    const first = PRIORITY.slice(0, 3);
    const quote = cmd.officeQuote(state, listing.id, first.length);
    if (state.company.cash > quote.total * CASH_BUFFER)
      cmd.leaseOffice(state, listing.id, [...first]);
    return;
  }
  const missing = PRIORITY.find((id) => !state.departments[id]);
  if (missing) addFloorFor(state, missing);
}

function addFloorFor(state: GameState, id: HqDeptId): void {
  const office = Object.values(state.offices).find((o) => o.floors.includes(null));
  if (!office) return;
  if (state.company.cash < cmd.floorFitout(office.cityId) * CASH_BUFFER) return;
  cmd.addFloor(state, office.id, id);
}
