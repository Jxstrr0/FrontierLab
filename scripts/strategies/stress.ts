// Recession stress: steady play with a recession forced at week 156 (SIMULATION §25).
import type { GameState } from '../../src/sim/state';

export const STRESS_RECESSION_WEEK = 156;

export function forceRecession(state: GameState): void {
  for (const c of Object.values(state.world.countries)) {
    if (c) c.forceRecessionAtWeek = STRESS_RECESSION_WEEK;
  }
}
