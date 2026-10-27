// Save migration 8 → 9 (stage C4a): the compute pool. Saves start in a normal
// chip market at an index of 1 with an empty history; the first weekly close
// fills in demand and running GPUs.
import { newComputeState, ownedGpus } from '../compute';
import type { GameState } from '../state';

export function migrateCompute(state: GameState): void {
  state.compute ??= newComputeState();
  state.compute.ownedGpus = ownedGpus(state);
}
