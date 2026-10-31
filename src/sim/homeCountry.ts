// The player's home country: the country of the home city, whose central bank
// sets the policy rate the lab borrows against and whose market phase moves
// valuations, ventures and news.
import { CITIES } from '../data/cities';
import type { CountryState, GameState } from './state';

/** The home city's country (always simulated). */
export function homeCountry(state: GameState): CountryState {
  const c = state.world.countries[CITIES[state.meta.homeCityId]!.country];
  if (!c) throw new Error('Home country not simulated');
  return c;
}
