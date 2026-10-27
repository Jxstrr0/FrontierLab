// Office and department commands (SIMULATION §16.1–16.5): lease an office with
// its first floors, add or release floors, release a whole office, and set a
// department's staff target, salary or an HR benefit.
import {
  FEATURES,
  FLOOR_FITOUT,
  FLOOR_FITOUT_LIFE_WEEKS,
  MAIN_OFFICES_MAX,
  SEVERANCE_WEEKS,
  WEEKS_PER_YEAR,
} from '../../config/balance';
import { BENEFITS } from '../../data/benefits';
import { CITIES } from '../../data/cities';
import { DEPARTMENTS, HQ_DEPTS } from '../../data/departments';
import { EXEC_SEAT_ORDER } from '../../data/executives';
import type { DeptId } from '../../data/types';
import { assetBookValue } from '../balanceSheet';
import { refreshExecCandidates } from '../execCandidates';
import { deptDesks, deptMarketSalary, newDepartment } from '../hq';
import { newId } from '../ids';
import { listPrice } from '../nominal';
import { postCash, postPnl, spend } from '../ledger';
import { roundToStep } from '../math';
import type { GameState, Office } from '../state';
import { fireExec } from './executives';
import { fail, money, ok, type CommandResult } from './result';

/** Salary stepper: $1,000 steps between half and three times the market salary. */
export const DEPT_SALARY_STEP = 1_000;
export const DEPT_SALARY_RANGE: [number, number] = [0.5, 3];

/** Fit-out of one floor in a city (§16.1), at today's price list there (§4.6). */
export function floorFitout(state: GameState, cityId: string): number {
  return listPrice(state, FLOOR_FITOUT * (CITIES[cityId]?.costIndex ?? 1), cityId);
}

/**
 * Whether a department's floor can be added: the core departments always, the
 * Executive suite and Investment floor with their FEATURES flags.
 */
export function deptAvailable(id: DeptId): boolean {
  if (id === 'executive') return FEATURES.capitalMarkets;
  if (id === 'investment') return FEATURES.investments;
  return (HQ_DEPTS as readonly string[]).includes(id);
}

/** Cost of leasing an office with some floors fitted out: deposit, first week's rent and fit-out. */
export function officeQuote(state: GameState, listingId: string, depts: number) {
  const l = state.world.officeListings[listingId];
  const deposit = l?.deposit ?? 0;
  const rent = l?.weeklyRent ?? 0;
  const fitout = l ? depts * floorFitout(state, l.cityId) : 0;
  return { deposit, rent, fitout, total: deposit + rent + fitout };
}

function fitFloor(state: GameState, office: Office, floor: number, dept: DeptId): void {
  office.floors[floor] = dept;
  const cost = floorFitout(state, office.cityId);
  state.company.fixedAssets.push({
    id: newId(state, 'fa'),
    kind: 'fitout',
    slot: `floor${floor}`,
    cost,
    lifeWeeks: FLOOR_FITOUT_LIFE_WEEKS,
    ageWeeks: 0,
    ownerId: office.id,
  });
  postCash(state, -cost, 'investing');
  if (!state.departments[dept]) state.departments[dept] = newDepartment(state, dept);
  // A new Executive suite starts with candidates for every seat (§17.2).
  if (dept === 'executive') refreshExecCandidates(state, true);
}

/**
 * Why a new main office can't be leased in a city, or null (stage C2d2): at most
 * MAIN_OFFICES_MAX buildings, and a second one must be in another country from
 * the first. Saves from before the cap keep any extra offices they hold.
 */
export function mainOfficeBlocker(state: GameState, cityId: string): string | null {
  const held = Object.values(state.offices);
  if (held.length >= MAIN_OFFICES_MAX)
    return `You can run ${MAIN_OFFICES_MAX} main offices at most. Add floors to one you have, or release one first.`;
  const country = CITIES[cityId]?.country;
  if (held.some((o) => CITIES[o.cityId]?.country === country))
    return 'Your second main office has to be in another country.';
  return null;
}

/** Leases a whole office building and fits out a floor for each chosen department. */
export function leaseOffice(
  state: GameState,
  listingId: string,
  depts: DeptId[],
): CommandResult<{ officeId: string }> {
  const listing = state.world.officeListings[listingId];
  if (!listing) return fail('That office no longer exists.');
  if (listing.officeId) return fail('You already lease this office.');
  if (listing.cityId !== state.world.currentCityId)
    return fail("You can only lease offices in the city you're in.");
  const capped = mainOfficeBlocker(state, listing.cityId);
  if (capped) return fail(capped);
  if (new Set(depts).size !== depts.length) return fail('Pick each department once.');
  if (depts.length > listing.floors) return fail(`This building has ${listing.floors} floors.`);
  const unavailable = depts.find((d) => !DEPARTMENTS[d] || !deptAvailable(d));
  if (unavailable) return fail(`${DEPARTMENTS[unavailable]?.name ?? 'That'} floors arrive later.`);
  const quote = officeQuote(state, listingId, depts.length);
  if (state.company.cash < quote.total)
    return fail(`Not enough cash: you need ${money(quote.total)}.`);

  const office: Office = {
    id: newId(state, 'off'),
    listingId,
    cityId: listing.cityId,
    floors: Array.from({ length: listing.floors }, () => null),
    desksPerFloor: listing.desksPerFloor,
    weeklyRent: listing.weeklyRent,
    deposit: listing.deposit,
    sinceWeek: state.clock.week,
  };
  state.offices[office.id] = office;
  listing.officeId = office.id;
  postCash(state, -quote.deposit, 'investing');
  state.company.leaseDeposits += quote.deposit;
  spend(state, 'rent', quote.rent);
  depts.forEach((d, i) => fitFloor(state, office, i, d));
  return ok({ officeId: office.id });
}

/** Fits out the first empty floor of an office for a department. */
export function addFloor(state: GameState, officeId: string, dept: DeptId): CommandResult {
  const office = state.offices[officeId];
  if (!office) return fail('That office no longer exists.');
  if (!DEPARTMENTS[dept] || !deptAvailable(dept)) return fail('That floor arrives later.');
  const floor = office.floors.indexOf(null);
  if (floor < 0)
    return fail('Every floor in this office is in use. Release one or lease another office.');
  const cost = floorFitout(state, office.cityId);
  if (state.company.cash < cost) return fail(`Not enough cash: fit-out costs ${money(cost)}.`);
  fitFloor(state, office, floor, dept);
  return ok();
}

/** Lets staff above the department's desks go, paying severance. */
function trimToDesks(state: GameState, dept: DeptId): void {
  const d = state.departments[dept];
  if (!d) return;
  const desks = deptDesks(state, dept);
  if (desks === 0) {
    spend(state, 'hqStaff', (d.staff * d.salary * SEVERANCE_WEEKS) / WEEKS_PER_YEAR);
    delete state.departments[dept];
    // Without an Executive suite every executive leaves, with severance.
    if (dept === 'executive') for (const seat of EXEC_SEAT_ORDER) fireExec(state, seat);
    return;
  }
  const over = Math.max(0, d.staff - desks);
  spend(state, 'hqStaff', (over * d.salary * SEVERANCE_WEEKS) / WEEKS_PER_YEAR);
  d.staff -= over;
  d.target = Math.min(d.target, desks);
}

function writeOffFloor(state: GameState, office: Office, floor: number): void {
  const slot = `floor${floor}`;
  for (const a of state.company.fixedAssets) {
    if (a.ownerId === office.id && a.slot === slot)
      postPnl(state, 'depreciation', assetBookValue(a));
  }
  state.company.fixedAssets = state.company.fixedAssets.filter(
    (a) => !(a.ownerId === office.id && a.slot === slot),
  );
}

/** Empties one floor: its fit-out is written off and staff beyond the remaining desks leave. */
export function releaseFloor(state: GameState, officeId: string, floor: number): CommandResult {
  const office = state.offices[officeId];
  const dept = office?.floors[floor];
  if (!office || !dept) return fail('That floor is already empty.');
  office.floors[floor] = null;
  writeOffFloor(state, office, floor);
  trimToDesks(state, dept);
  return ok();
}

/** Gives up a whole office: every floor is released and the deposit comes back. */
export function releaseOffice(state: GameState, officeId: string): CommandResult {
  const office = state.offices[officeId];
  if (!office) return fail('That office no longer exists.');
  const depts = new Set(office.floors.filter((f): f is DeptId => f !== null));
  office.floors.forEach((_, i) => writeOffFloor(state, office, i));
  delete state.offices[officeId];
  for (const d of depts) trimToDesks(state, d);
  state.company.leaseDeposits -= office.deposit;
  postCash(state, office.deposit, 'investing');
  const listing = state.world.officeListings[office.listingId];
  if (listing) delete listing.officeId;
  return ok();
}

export function setDeptTarget(state: GameState, dept: DeptId, target: number): CommandResult {
  const d = state.departments[dept];
  if (!d) return fail('You have no floor for that department.');
  if (!Number.isFinite(target)) return fail('Enter a number.');
  const desks = deptDesks(state, dept);
  d.target = Math.max(0, Math.min(desks, Math.round(target)));
  if (d.staff > d.target) {
    spend(state, 'hqStaff', ((d.staff - d.target) * d.salary * SEVERANCE_WEEKS) / WEEKS_PER_YEAR);
    d.staff = d.target;
  }
  return ok();
}

export function setDeptSalary(state: GameState, dept: DeptId, salary: number): CommandResult {
  const d = state.departments[dept];
  if (!d) return fail('You have no floor for that department.');
  if (!Number.isFinite(salary)) return fail('Enter a number.');
  const market = deptMarketSalary(state, dept);
  d.salary = Math.max(
    market * DEPT_SALARY_RANGE[0],
    Math.min(market * DEPT_SALARY_RANGE[1], roundToStep(salary, DEPT_SALARY_STEP)),
  );
  return ok();
}

/** Switches HR's hiring of branch managers on or off (§16.11). */
export function setHrHiring(state: GameState, on: boolean): CommandResult {
  if (!state.departments.hr) return fail('Manager hiring is run from the HR floor.');
  state.people.hrHiring = on;
  return ok();
}

export function setBenefit(state: GameState, id: string, value: number): CommandResult {
  const spec = BENEFITS[id];
  if (!spec) return fail('Unknown benefit.');
  if (!state.departments.hr) return fail('Benefits are managed from the HR floor.');
  if (spec.publicOnly && state.stock.status !== 'public')
    return fail('Available once your lab is listed.');
  if (!Number.isFinite(value)) return fail('Enter a number.');
  const v = Math.max(spec.min, Math.min(spec.max, roundToStep(value, spec.step)));
  if (v === 0) delete state.people.benefits[id];
  else state.people.benefits[id] = v;
  return ok();
}
