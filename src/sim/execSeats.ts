// Read-only views of the executive seats (SIMULATION §17.2) that other systems
// consult: who sits where, whether a delegation is on, the department
// multiplier execMult, the CTO's expertise, the executive market salary and the
// weekly resignation chance. No mutation here, and no imports of the systems
// that read it (HQ, incidents, the app rating), so there are no import cycles.
import { EXECUTIVES } from '../config/balance';
import { CITIES } from '../data/cities';
import { EXEC_SEATS, EXEC_SEAT_ORDER } from '../data/executives';
import type { DeptId } from '../data/types';
import type { EquityGrant, ExecSeat, Executive, GameState } from './state';

/** True when the company has an Executive floor (hiring and the board need one). */
export function hasExecFloor(state: GameState): boolean {
  return !!state.departments.executive;
}

/** The executive in a seat, if any. */
export function seated(state: GameState, seat: ExecSeat): Executive | undefined {
  return state.executives.seats[seat];
}

/** Every seated executive in grid order. */
export function seatedExecs(state: GameState): Executive[] {
  return EXEC_SEAT_ORDER.map((s) => state.executives.seats[s]).filter((e): e is Executive => !!e);
}

/** True when the seat is filled and that executive's delegation `id` is on. */
export function delegationOn(state: GameState, seat: ExecSeat, id: string): boolean {
  return !!state.executives.seats[seat]?.delegations[id];
}

/** §17.2: execMult = 0.9 + 0.25 × expertise/100 for a seated executive. */
export function execMultOf(expertise: number): number {
  return EXECUTIVES.multBase + (EXECUTIVES.multSlope * expertise) / 100;
}

/** The multiplier on a department's effective staff: its executive's execMult, else 1. */
export function execMult(state: GameState, dept: DeptId): number {
  for (const seat of EXEC_SEAT_ORDER) {
    if (!EXEC_SEATS[seat].depts.includes(dept as never)) continue;
    const exec = state.executives.seats[seat];
    return exec ? execMultOf(exec.expertise) : 1;
  }
  return 1;
}

/** The CTO's expertise, or EXECUTIVES.vacantCtoExpertise while the seat is empty. */
export function ctoExpertise(state: GameState): number {
  return state.executives.seats.cto?.expertise ?? EXECUTIVES.vacantCtoExpertise;
}

/** Total assets at the last weekly close. */
export function lastAssets(state: GameState): number {
  return state.history.weekly.at(-1)?.totals.assets ?? 0;
}

/**
 * Executive market salary: (salaryBase + salaryPerBillion × assets in $B) × the
 * HQ city's wageIndex, capped at salaryMax (assumption, decision log).
 */
export function execMarketSalary(state: GameState): number {
  const cityId = Object.values(state.offices)[0]?.cityId ?? state.world.currentCityId;
  const wage = CITIES[cityId]?.wageIndex ?? 1;
  const e = EXECUTIVES;
  const raw = (e.salaryBase + (e.salaryPerBillion * Math.max(0, lastAssets(state))) / 1e9) * wage;
  return Math.min(e.salaryMax, raw);
}

/** Shares of a grant not yet vested. */
export function unvestedShares(g: EquityGrant): number {
  return Math.max(0, g.shares - g.vested);
}

export function hasUnvested(exec: Executive): boolean {
  return exec.grants.some((g) => unvestedShares(g) > 0);
}

/**
 * §17.2 weekly resignation probability:
 * 0.002 × (1.5 − loyalty/100) × (pay/market < 0.9 ? 2 : 1) × (unvested grants ? 0.5 : 1).
 * `loyaltyBonus` adds the Employee Stock Plan's +5 (CONTENT §10).
 */
export function resignChance(exec: Executive, market: number, loyaltyBonus = 0): number {
  const e = EXECUTIVES;
  const loyalty = Math.min(100, exec.loyalty + loyaltyBonus);
  const underpaid = exec.salary / Math.max(1, market) < e.underpaidRatio ? e.underpaidMult : 1;
  const grants = hasUnvested(exec) ? e.grantMult : 1;
  return Math.max(0, e.resignBase * (e.resignLoyalty - loyalty / 100) * underpaid * grants);
}

/** Seat title and short code (CEO for the founder). */
export function seatTitle(seat: ExecSeat): string {
  return EXEC_SEATS[seat].title;
}
