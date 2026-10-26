// HQ upkeep for scripted strategies (SIMULATION §25 "HQ floors staffed to 100%"):
// lease an office once requirements start phasing in, add a floor per
// department in priority order as cash allows (leasing another building when
// the first is full), and keep every department's staff target at what full
// coverage needs.
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
const CASH_BUFFER = 1.5;
/** Leasing the first office (deposit, rent and three fit-outs) needs more headroom. */
const LEASE_BUFFER = 3;
/** Staff a little over the requirement so quits don't dip coverage. */
const HEADROOM = 1.15;
/** Lease the first office once requirements are half phased in (4 branches). */
const LEASE_AT_RAMP = 0.5;
/** Staff each department for this coverage k′. */
const TARGET_K = 0.95;
/** Office buildings worth leasing have at least this many floors. */
const MIN_FLOORS = 7;

export function manageHq(state: GameState): void {
  const ramp = founderRamp(state);
  if (ramp < LEASE_AT_RAMP && Object.keys(state.offices).length === 0) return;
  // Only the uncovered share counts at a partial ramp: k needed for k′ = TARGET_K.
  const kNeeded = ramp > 0 ? Math.max(0, 1 - (1 - TARGET_K) / ramp) : 0;
  ensureFloors(state);
  for (const id of HQ_DEPTS) {
    const d = state.departments[id];
    if (!d) continue;
    const perHead =
      (HQ_COVERAGE.skillBase + (HQ_COVERAGE.skillSlope * d.skill) / 100) *
      (HQ_COVERAGE.moraleBase + (HQ_COVERAGE.moraleSlope * d.morale) / 100);
    const want = Math.ceil((requiredStaff(state, id) * kNeeded * HEADROOM) / perHead);
    if (want > deptDesks(state, id)) addFloorFor(state, id);
    cmd.setDeptTarget(state, id, want);
  }
}

/** The cheapest free office building in the city you're in with at least `floors` floors. */
function cheapestListing(state: GameState, floors: number) {
  return Object.values(state.world.officeListings)
    .filter((l) => !l.officeId && l.cityId === state.world.currentCityId && l.floors >= floors)
    .sort((a, b) => a.weeklyRent - b.weeklyRent)[0];
}

function ensureFloors(state: GameState): void {
  if (Object.keys(state.offices).length === 0) {
    const listing = cheapestListing(state, MIN_FLOORS);
    if (!listing) return;
    const first = PRIORITY.slice(0, 3);
    const quote = cmd.officeQuote(state, listing.id, first.length);
    if (state.company.cash > quote.total * LEASE_BUFFER)
      cmd.leaseOffice(state, listing.id, [...first]);
    return;
  }
  const missing = PRIORITY.find((id) => !state.departments[id]);
  if (missing) addFloorFor(state, missing);
}

/**
 * Fits out a floor for a department, in the first office with a free floor;
 * when every floor is in use (a big bank outgrows one building), leases
 * another office in the city you're in for it.
 */
function addFloorFor(state: GameState, id: HqDeptId): void {
  const office = Object.values(state.offices).find((o) => o.floors.includes(null));
  if (!office) {
    const listing = cheapestListing(state, MIN_FLOORS);
    if (!listing) return;
    if (state.company.cash > cmd.officeQuote(state, listing.id, 1).total * LEASE_BUFFER)
      cmd.leaseOffice(state, listing.id, [id]);
    return;
  }
  if (state.company.cash < cmd.floorFitout(state, office.cityId) * CASH_BUFFER) return;
  cmd.addFloor(state, office.id, id);
}

/** Expansion waits while requirements apply and any department is short of READY_K. */
const READY_K = 0.9;
/** Weeks of HQ costs kept in hand before opening another branch. */
const HQ_RESERVE_WEEKS = 13;

/** Last week's HQ payroll, benefits and office rent. */
function hqWeeklyCost(state: GameState): number {
  const pnl = state.history.weekly.at(-1)?.pnl;
  const rent = Object.values(state.offices).reduce((sum, o) => sum + o.weeklyRent, 0);
  return (pnl?.hqStaff ?? 0) + (pnl?.benefits ?? 0) + rent;
}

export function hqReady(state: GameState): boolean {
  // Keep a reserve for HQ payroll and rent before spending on branches.
  if (state.company.cash < HQ_RESERVE_WEEKS * hqWeeklyCost(state)) return false;
  if (founderRamp(state) < LEASE_AT_RAMP) return true;
  return Object.values(state.hq.coverage).every((c) => c.kPrime >= READY_K);
}
