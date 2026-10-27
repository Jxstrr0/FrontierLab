// Compute buying for the scripted strategies (stage C4c, SIMULATION §25): keep
// spot for growth by reserving GPU lots once demand runs past most of the spot
// limit. Rents from the cheapest offer per GPU-week first.
import { GPU_MARKET } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { allocation } from '../../src/sim/compute';
import type { GameState } from '../../src/sim/state';

/** Share of the spot limit the strategies leave for growth. */
const SPOT_USE = 0.6;

export function manageCompute(state: GameState): void {
  const a = allocation(state);
  let need = a.demand - a.capacity - SPOT_USE * a.spotLimit;
  const offers = [...state.compute.offers].sort((x, y) => x.price - y.price);
  for (const o of offers) {
    if (need < GPU_MARKET.sizeStep) return;
    const gpus = Math.min(o.gpus, Math.ceil(need / GPU_MARKET.sizeStep) * GPU_MARKET.sizeStep);
    if (cmd.rentGpus(state, o.id, gpus).ok) need -= gpus;
  }
}
