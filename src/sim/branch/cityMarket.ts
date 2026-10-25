// The city-wide customer pool (SIMULATION §9.2): every branch you run in a
// city draws on the same pool of people willing to bank with you, so new
// branches add less and less once the city is well covered.
import { CITY_BRANCH_GUIDE, CITY_MARKET, CITY_SATURATION_EXP } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { dpow } from '../detmath';
import { clamp } from '../math';
import type { GameState } from '../state';

/** Customers your bank can win in this city (CITY_MARKET by city size). */
export function cityMarket(cityId: string): number {
  const city = CITIES[cityId];
  return city ? CITY_MARKET[city.size] : 0;
}

/** Your customers across every branch in the city. */
export function cityCustomers(state: GameState, cityId: string): number {
  let total = 0;
  for (const b of Object.values(state.branches)) {
    if (b.cityId === cityId && b.status !== 'closed') total += b.customers;
  }
  return total;
}

/** Share of the city's pool you already bank, 0..1. */
export function cityReach(state: GameState, cityId: string): number {
  const market = cityMarket(cityId);
  return market > 0 ? clamp(cityCustomers(state, cityId) / market, 0, 1) : 1;
}

/** §9.2: the prospect multiplier 1 − reach^CITY_SATURATION_EXP. */
export function cityRoom(state: GameState, cityId: string): number {
  return 1 - dpow(cityReach(state, cityId), CITY_SATURATION_EXP);
}

/** About how many branches a city supports (advice, CITY_BRANCH_GUIDE). */
export function cityBranchGuide(cityId: string): number {
  const city = CITIES[cityId];
  return city ? CITY_BRANCH_GUIDE[city.size] : 0;
}
