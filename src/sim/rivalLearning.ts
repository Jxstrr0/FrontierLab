// Rivals learn (SIMULATION §18.3): at each year end, a rival branch in a city
// where you run open branches moves each quality coin a step toward your
// average overall rating there when it's behind, and a rival's app rating does
// the same toward yours. A rival you out-serve closes the gap over the years
// instead of standing still, so competition stays alive late in a game.
import { RIVAL_LEARNING } from '../config/balance';
import { clamp } from './math';
import { overallOf } from './rivals';
import type { GameState, RivalBank } from './state';

/** Your average overall rating by city, over open branches. */
export function yourRatingByCity(state: GameState): Map<string, number> {
  const sum = new Map<string, { total: number; n: number }>();
  for (const b of Object.values(state.branches)) {
    if (b.status !== 'open') continue;
    const e = sum.get(b.cityId) ?? { total: 0, n: 0 };
    e.total += b.ratings.overall;
    e.n += 1;
    sum.set(b.cityId, e);
  }
  const out = new Map<string, number>();
  for (const [cityId, e] of sum) out.set(cityId, e.total / e.n);
  return out;
}

/** One year's learning for one bank; returns how many branches improved. */
export function learn(state: GameState, bank: RivalBank, yours: Map<string, number>): number {
  const { step, maxQuality } = RIVAL_LEARNING;
  let improved = 0;
  for (const branch of bank.branches) {
    const target = yours.get(branch.cityId);
    if (target === undefined || branch.overall >= target) continue;
    branch.quality = branch.quality.map((q) =>
      clamp(q + step, 1, maxQuality),
    ) as typeof branch.quality;
    branch.overall = overallOf(branch.quality);
    improved += 1;
  }
  const inYourCities = bank.cities.some((c) => yours.has(c));
  if (inYourCities && bank.appRating < state.company.appRating) {
    bank.appRating = Math.min(state.company.appRating, bank.appRating + step);
  }
  return improved;
}

/** Year end (tick step 14): every active rival learns from the cities you share. */
export function rivalsLearn(state: GameState): void {
  const yours = yourRatingByCity(state);
  if (yours.size === 0) return;
  for (const bank of Object.values(state.rivals)) {
    if (bank.status !== 'active') continue;
    learn(state, bank, yours);
  }
}
