// Small numeric helpers shared by the simulation (SIMULATION §1).
import { WEEKS_PER_YEAR } from '../config/balance';
import type { Rng } from './rng';

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Exponential moving step: x + k × (target − x). */
export const ema = (x: number, target: number, k: number) => x + k * (target - x);

/** Multiplicative noise: ×(1 + U(−spread, spread)). */
export const noise = (rng: Rng, spread: number) => 1 + rng.range(-spread, spread);

export const sum = (xs: Iterable<number>) => {
  let total = 0;
  for (const x of xs) total += x;
  return total;
};

/** Rounds to the nearest multiple of `step`, avoiding float dust. */
export const roundToStep = (x: number, step: number) =>
  Math.round(Math.round(x / step) * step * 1e8) / 1e8;

/** Weekly accrual of an annual amount. */
export const weekly = (annual: number) => annual / WEEKS_PER_YEAR;
