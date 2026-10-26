// The nominal index by city (SIMULATION §4.6): the price-and-wealth level of
// the city's country, 1 at the start of a game. Balances per account, market
// wages and rival branch books are all quoted at today's level, so a full world
// keeps growing with its economies.
import { CITIES } from '../data/cities';
import type { GameState } from './state';

/** The nominal index of a city's country (1 for an unknown city). */
export function nominalIndex(state: GameState, cityId: string): number {
  const country = CITIES[cityId]?.country;
  return (country && state.world.countries[country]?.nominal) || 1;
}
