// Underwriting models (SIMULATION §16.7): the house model's radar and cost per
// application. Stage 1 uses packaged bureau models only; custom models and
// switching arrive with the Products floor (Stage 4).
import { BUREAU_PACKAGES, DATA_INPUTS } from '../data/bureaus';
import type { Pentagon } from '../data/types';
import { HQ_EFFECTS } from '../config/balance';
import { shortfall } from './hq';
import type { GameState, UnderwritingModel } from './state';

/** Radar index constants: Accuracy, Speed, Inclusion, FraudShield, Fairness. */
export const RADAR = { accuracy: 0, speed: 1, inclusion: 2, fraudShield: 3, fairness: 4 } as const;

/** Radar of a mix of data inputs: Σ weight × profile × qualityMult. */
export function mixRadar(mix: Record<string, number>, qualityMult = 1): Pentagon {
  const out: Pentagon = [0, 0, 0, 0, 0];
  for (const [inputId, w] of Object.entries(mix)) {
    const input = DATA_INPUTS[inputId];
    if (!input) continue;
    for (let i = 0; i < 5; i++) out[i] = (out[i] ?? 0) + w * (input.profile[i] ?? 0) * qualityMult;
  }
  return out;
}

export function packagedModel(packageId: string): UnderwritingModel {
  const pkg = BUREAU_PACKAGES[packageId];
  if (!pkg) throw new Error(`Unknown bureau package ${packageId}`);
  return {
    id: pkg.id,
    name: pkg.name,
    source: 'bureau',
    mix: { ...pkg.mix },
    radar: mixRadar(pkg.mix),
    costPerApp: pkg.costPerApp,
  };
}

export function activeModel(state: GameState): UnderwritingModel {
  const m = state.underwriting.models[state.underwriting.activeModelId];
  if (!m) throw new Error('No active underwriting model');
  return m;
}

/** Mean of the five radar values (1–10), used by the Products rating (§8). */
export function modelQuality(m: UnderwritingModel): number {
  return m.radar.reduce((a, b) => a + b, 0) / m.radar.length;
}

/** Cost per application paid this week: + (1 − k′) × 30% when the Products team is short (CONTENT §9). */
export function appCost(state: GameState): number {
  return (
    activeModel(state).costPerApp * (1 + HQ_EFFECTS.modelCostPenalty * shortfall(state, 'products'))
  );
}
