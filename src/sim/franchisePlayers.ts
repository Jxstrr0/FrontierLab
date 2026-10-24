// Sports club people (SCREENS §20): star players with original names from the
// name pools, positions per sport, ratings and salaries; transfer-market
// players with fees; and outside owners' names. Draws come from the caller's
// `franchise` stream.
import { FRANCHISE } from '../config/balance';
import { OWNER_NAME_SHAPES, SPORT_POSITIONS, type FranchiseSpec } from '../data/franchises';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { baseStarSalary, salaryWeight } from './franchiseMath';
import { newId } from './ids';
import type { Rng } from './rng';
import type { GameState, Player } from './state';

const F = FRANCHISE;

/** An outside owner: "the Okafor family", "Mei Lindqvist", "Ruiz Sports Holdings" … */
export function ownerName(rng: Rng): string {
  return rng
    .pick(OWNER_NAME_SHAPES)
    .replace('{first}', rng.pick(FIRST_NAMES))
    .replace('{last}', rng.pick(LAST_NAMES));
}

/** One player of this sport rated in [lo, hi], paid by rating for a club worth `value`. */
export function makePlayer(
  state: GameState,
  rng: Rng,
  spec: FranchiseSpec,
  value: number,
  [lo, hi]: readonly [number, number],
): Player {
  const rating = rng.int(lo, hi);
  return {
    id: newId(state, 'pl'),
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    position: rng.pick(SPORT_POSITIONS[spec.sport]),
    rating,
    salary: Math.round(baseStarSalary(value) * salaryWeight(rating)),
    years: rng.int(F.contractYears[0], F.contractYears[1]),
  };
}

/**
 * The five stars at seeding, scaled so they earn starShare of a payroll of
 * payrollShare × yearly revenue; the rest of that payroll is `otherPayroll`.
 */
export function seedSquad(
  state: GameState,
  rng: Rng,
  spec: FranchiseSpec,
): { stars: Player[]; otherPayroll: number } {
  const stars: Player[] = [];
  for (let i = 0; i < F.maxStars; i++)
    stars.push(makePlayer(state, rng, spec, spec.value, F.starRating));
  const total = F.revenueYield * spec.value * F.payrollShare;
  const starTarget = total * F.starShare;
  const raw = stars.reduce((s, p) => s + p.salary, 0);
  for (const p of stars) p.salary = Math.round((p.salary * starTarget) / raw);
  const paid = stars.reduce((s, p) => s + p.salary, 0);
  return { stars, otherPayroll: Math.round(total - paid) };
}

/** A window's transfer market: marketSize players with fees of feeYears × salary. */
export function makeMarket(
  state: GameState,
  rng: Rng,
  spec: FranchiseSpec,
  value: number,
): Player[] {
  const n = rng.int(F.marketSize[0], F.marketSize[1]);
  const out: Player[] = [];
  for (let i = 0; i < n; i++) {
    const p = makePlayer(state, rng, spec, value, F.marketRating);
    p.fee = Math.round(p.salary * rng.range(F.feeYears[0], F.feeYears[1]));
    out.push(p);
  }
  return out.sort((a, b) => b.rating - a.rating);
}
