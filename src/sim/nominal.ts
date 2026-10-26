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

/**
 * The price-list level of a city's country, or of your home country when no
 * city is given (SIMULATION §4.6): catalogue prices (builds, campaigns, cars,
 * jets, lobbying, office fit-outs, flights) are written in start-of-game money
 * and charged × this level. It steps to the nominal index once a year, at the
 * year end, so a price list holds still for the year like a real one.
 */
export function listLevel(state: GameState, cityId?: string): number {
  const country = CITIES[cityId ?? state.meta.homeCityId]?.country;
  return (country && state.world.countries[country]?.listIndex) || 1;
}

/** A catalogue price at today's list level, in whole money. */
export function listPrice(state: GameState, amount: number, cityId?: string): number {
  return Math.round(amount * listLevel(state, cityId));
}
