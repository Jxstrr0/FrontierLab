// Save migration 9 → 10 (stage C4b): GPU lots on the Compute floor. Saves start
// with no rented GPUs and no offers; the next weekly close fills the market.
import type { GameState } from '../state';

export function migrateGpuLots(state: GameState): void {
  const c = state.compute;
  c.rentedGpus ??= 0;
  c.lots ??= [];
  c.offers ??= [];
  c.offersRefreshWeek ??= -1;
}
