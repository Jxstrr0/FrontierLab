// Price wars (SIMULATION §18.6). Tracks how many weeks in a row your average
// Rates rating across a city's open branches has been ≥ 4.0. After 8 weeks,
// each month every active rival there has a 30% chance to cut its plan prices
// by 5% (capped); once your streak ends the cuts fade slowly.
import { PRICE_WAR } from '../config/balance';
import { PRODUCTS } from '../data/products';
import { pushEvent } from './events';
import { raiseIncident } from './incidents';
import { clamp } from './math';
import { rivalPriceInCity } from './rivalPrices';
import { stream } from './rng';
import type { GameState } from './state';

/** Your average Rates rating per city, over open branches. */
function ratesByCity(state: GameState): Record<string, number> {
  const sums: Record<string, { total: number; n: number }> = {};
  for (const b of Object.values(state.branches)) {
    if (b.status !== 'open') continue;
    const s = (sums[b.cityId] ??= { total: 0, n: 0 });
    s.total += b.ratings.rates;
    s.n += 1;
  }
  const out: Record<string, number> = {};
  for (const [city, s] of Object.entries(sums)) out[city] = s.total / s.n;
  return out;
}

/** Updates the streaks, rolls monthly bumps and decays bumps in calm cities. */
export function runPriceWars(state: GameState): void {
  const streaks = state.competition.ratesStreak;
  const rates = ratesByCity(state);
  for (const city of new Set([...Object.keys(streaks), ...Object.keys(rates)])) {
    const r = rates[city];
    if (r !== undefined && r >= PRICE_WAR.minRating) streaks[city] = (streaks[city] ?? 0) + 1;
    else delete streaks[city];
  }

  const monthly = state.clock.week % PRICE_WAR.everyWeeks === 0;
  const rng = stream(state, 'rivalsAi');
  const banks = Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const bank of banks) {
    if (bank.status !== 'active') continue;
    // Fade bumps in cities where your streak has ended.
    for (const [city, bump] of Object.entries(bank.priceWar)) {
      if ((streaks[city] ?? 0) >= PRICE_WAR.streakWeeks) continue;
      const next = bump - PRICE_WAR.decay;
      if (next <= 0) delete bank.priceWar[city];
      else bank.priceWar[city] = next;
    }
    if (!monthly) continue;
    for (const city of bank.cities) {
      if ((streaks[city] ?? 0) < PRICE_WAR.streakWeeks) continue;
      if (!bank.branches.some((b) => b.cityId === city)) continue;
      if (!rng.chance(PRICE_WAR.chance)) continue;
      const before = bank.priceWar[city] ?? 0;
      const after = Math.min(PRICE_WAR.cap, before + PRICE_WAR.bump);
      const bump = after - before;
      if (bump <= 0) continue;
      bank.priceWar[city] = after;
      // The sheet moves now; the target (rivalTargetPrice) carries the bump from here on.
      for (const spec of Object.values(PRODUCTS)) {
        const price = bank.prices[spec.id];
        if (spec.kind !== 'plan' || spec.category !== 'deposits' || price === undefined) continue;
        bank.prices[spec.id] = clamp(price * (1 - bump), spec.min, spec.max);
      }
      pushEvent(
        state,
        'PRICE_WAR',
        {
          rivalId: bank.id,
          bank: bank.name,
          city,
          bump,
          plusPrice: rivalPriceInCity(state, bank, 'plus', city) ?? 0,
        },
        4,
        city,
      );
      raiseIncident(state, 'PRICE_WAR', 'city', city, { rivalId: bank.id, bank: bank.name, bump });
    }
  }
}
