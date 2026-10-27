// The policy buffer (SIMULATION §15). The bank game's credit
// ratio (CET1 over risk-weighted assets) lived here until runway replaced it
// (runway.ts); the regulator's tier comes from the safety ratio (safety.ts),
// whose lines the policy buffer below still raises.
import type { GameState } from './state';
import { homeCountry } from './treasury';

/**
 * Policy buffer in force in your home country, in points: a passed buffer
 * policy adds, a won lobbying campaign subtracts. It raises the safety tier
 * lines by SAFETY.bufferPerPp a point.
 */
export function capitalBufferPp(state: GameState): number {
  const home = homeCountry(state);
  const week = state.clock.week;
  const b = home.capitalBuffer;
  const relief = state.lobbying?.bufferRelief; // absent mid-migration from older saves
  const plus = b && b.untilWeek > week ? b.pp : 0;
  const minus = relief && relief.country === home.id && relief.untilWeek > week ? relief.pp : 0;
  return plus - minus;
}
