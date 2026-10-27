// The frontier cost curve (post-C8, SIMULATION §16.12): the closer the house
// model gets to the top of the radar, the dearer each further step. Training
// budgets count for less past FRONTIER_COST.fromQuality, and researchers ask
// more as the best model anywhere climbs. Read by training runs, the CPO's
// routine, the training card and the talent market.
import { FRONTIER_COST, MODEL_RADAR_MAX } from '../config/balance';
import { dpow } from './detmath';
import { bestRivalModel } from './rivalModels';
import type { GameState } from './state';
import { activeModel, modelQuality } from './underwriting';

/** Points of quality past where training starts to get dearer (never below 0). */
const pastFrom = (quality: number) => Math.max(0, quality - FRONTIER_COST.fromQuality);

/** How many times dearer training is at the house model's quality: perPoint ^ points past fromQuality. */
export function frontierCostMult(state: GameState): number {
  return dpow(FRONTIER_COST.perPoint, pastFrom(modelQuality(activeModel(state))));
}

/** Points the frontier (the best model, yours or a rival's) stands past fromQuality. */
export function frontierPoints(state: GameState): number {
  const best = Math.max(modelQuality(activeModel(state)), bestRivalModel(state) ?? 0);
  return pastFrom(best);
}

/** The house model has every axis at the radar's ceiling: training can't lift it further. */
export function atModelCeiling(state: GameState): boolean {
  return activeModel(state).radar.every((v) => v >= MODEL_RADAR_MAX);
}
