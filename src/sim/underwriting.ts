// Underwriting models (SIMULATION §16.7): packaged bureau models, custom models
// built on the Products floor or hosted by a bureau, the house model's radar
// and cost per application, and the two-week linear blend while switching.
import {
  BUREAU_HOSTED,
  HQ_EFFECTS,
  INTERNAL_HISTORY,
  MODEL_MIX_TOLERANCE,
  MODEL_QUALITY,
  MODEL_RADAR_MAX,
  MODEL_SWITCH_WEEKS,
} from '../config/balance';
import { BUREAU_PACKAGES, DATA_INPUTS } from '../data/bureaus';
import type { Pentagon } from '../data/types';
import { shortfall } from './hq';
import { digitalBonus } from './products';
import type { GameState, UnderwritingModel } from './state';

/** Radar index constants: Accuracy, Speed, Inclusion, FraudShield, Fairness. */
export const RADAR = { accuracy: 0, speed: 1, inclusion: 2, fraudShield: 3, fairness: 4 } as const;

/** Where a custom mix is built: the Products floor, or hosted by a credit bureau. */
export type ModelSource = 'custom' | 'hosted';

/** Radar of a mix of data inputs at their table profiles: Σ weight × profile × qualityMult. */
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

// ─── Custom models ────────────────────────────────────────────────────────────

/** An input's profile now: Internal History accuracy = 4 + min(5, loansBooked/20,000 × 5). */
export function inputProfile(state: GameState, inputId: string): Pentagon | undefined {
  const input = DATA_INPUTS[inputId];
  if (!input) return undefined;
  if (inputId !== 'internal') return input.profile;
  const h = INTERNAL_HISTORY;
  const accuracy =
    h.accuracyBase +
    Math.min(h.accuracyGain, (state.underwriting.loansBooked / h.fullLoans) * h.accuracyGain);
  const p: Pentagon = [...input.profile];
  p[RADAR.accuracy] = accuracy;
  return p;
}

/** qualityMult = 0.9 + 0.2 × productsCoverage′ × avgSkill/100, or the bureau's fixed 0.95. */
export function modelQualityMult(state: GameState, source: ModelSource): number {
  if (source === 'hosted') return BUREAU_HOSTED.qualityMult;
  const dept = state.departments.products;
  const skill = dept && dept.staff > 0 ? dept.skill : 0;
  const k = state.hq.coverage.products?.kPrime ?? 1;
  return MODEL_QUALITY.base + (MODEL_QUALITY.slope * k * skill) / 100;
}

/** Why a mix can't be used, or null when it's valid (weights ≥ 0 summing to 100%). */
export function mixProblem(state: GameState, mix: Record<string, number>): string | null {
  let sum = 0;
  for (const [id, w] of Object.entries(mix)) {
    const input = DATA_INPUTS[id];
    if (!input) return 'Unknown data input.';
    if (!Number.isFinite(w) || w < 0) return 'Weights must be zero or more.';
    if (w > 0 && input.minLoansBooked && state.underwriting.loansBooked < input.minLoansBooked)
      return `${input.name} needs ${input.minLoansBooked.toLocaleString('en-US')} loans booked first.`;
    sum += w;
  }
  if (Math.abs(sum - 1) > MODEL_MIX_TOLERANCE) return 'The data inputs must add up to 100%.';
  return null;
}

/** Drops zero weights and rescales the rest to sum to exactly 1. */
export function normalizeMix(mix: Record<string, number>): Record<string, number> {
  const sum = Object.values(mix).reduce((a, b) => a + Math.max(0, b), 0);
  const out: Record<string, number> = {};
  if (sum <= 0) return out;
  for (const [id, w] of Object.entries(mix)) if (w > 0) out[id] = w / sum;
  return out;
}

/** Radar and cost of a custom mix (§16.7): Σ w × profile × qualityMult; cost Σ w × cost. */
export function customFigures(
  state: GameState,
  mix: Record<string, number>,
  source: ModelSource,
): { radar: Pentagon; costPerApp: number } {
  const q = modelQualityMult(state, source);
  const radar: Pentagon = [0, 0, 0, 0, 0];
  let cost = 0;
  for (const [id, w] of Object.entries(mix)) {
    const profile = inputProfile(state, id);
    if (!profile) continue;
    for (let i = 0; i < 5; i++) radar[i] = radar[i]! + w * profile[i]! * q;
    cost += w * DATA_INPUTS[id]!.costPerApp;
  }
  for (let i = 0; i < 5; i++) radar[i] = Math.min(MODEL_RADAR_MAX, radar[i]!);
  return {
    radar,
    costPerApp: source === 'hosted' ? cost * BUREAU_HOSTED.costMult : cost,
  };
}

/** Live preview for the model sliders: the radar and cost this mix would give as house model. */
export function previewModel(
  state: GameState,
  mix: Record<string, number>,
  source: ModelSource,
): { radar: Pentagon; costPerApp: number; quality: number; problem: string | null } {
  const figures = customFigures(state, normalizeMix(mix), source);
  const radar: Pentagon = [...figures.radar];
  radar[RADAR.speed] = Math.min(
    MODEL_RADAR_MAX,
    radar[RADAR.speed] + digitalBonus(state, 'modelSpeed'),
  );
  return {
    radar,
    costPerApp: figures.costPerApp,
    quality: modelQuality({ radar }),
    problem: mixProblem(state, mix),
  };
}

/** Weekly: custom models track the Products team and Internal History; a switch counts down. */
export function updateModels(state: GameState): void {
  const u = state.underwriting;
  for (const m of Object.values(u.models)) {
    if (m.source !== 'custom') continue;
    m.radar = customFigures(state, m.mix, m.hostedBy ? 'hosted' : 'custom').radar;
  }
  if (u.switching) {
    u.switching.weeksLeft -= 1;
    if (u.switching.weeksLeft <= 0) delete u.switching;
  }
}

// ─── The house model ──────────────────────────────────────────────────────────

/**
 * The house model as branches feel it this week: while switching, old and new
 * blend linearly (old weight weeksLeft / (MODEL_SWITCH_WEEKS + 1)); digital
 * projects add to Speed.
 */
export function activeModel(state: GameState): UnderwritingModel {
  const u = state.underwriting;
  const target = u.models[u.activeModelId];
  if (!target) throw new Error('No active underwriting model');
  const from = u.switching ? u.models[u.switching.fromId] : undefined;
  const speedBonus = digitalBonus(state, 'modelSpeed');
  if (!from && speedBonus === 0) return target;
  const radar: Pentagon = [...target.radar];
  let costPerApp = target.costPerApp;
  if (from && u.switching) {
    const w = u.switching.weeksLeft / (MODEL_SWITCH_WEEKS + 1);
    for (let i = 0; i < 5; i++) radar[i] = radar[i]! * (1 - w) + from.radar[i]! * w;
    costPerApp = costPerApp * (1 - w) + from.costPerApp * w;
  }
  radar[RADAR.speed] = Math.min(MODEL_RADAR_MAX, radar[RADAR.speed] + speedBonus);
  return { ...target, radar, costPerApp };
}

/** Mean of the five radar values (1–10), used by the Products rating (§8). */
export function modelQuality(m: { radar: Pentagon }): number {
  return m.radar.reduce((a, b) => a + b, 0) / m.radar.length;
}

/** Cost per application paid this week: + (1 − k′) × 30% when the Products team is short (CONTENT §9). */
export function appCost(state: GameState): number {
  return (
    activeModel(state).costPerApp * (1 + HQ_EFFECTS.modelCostPenalty * shortfall(state, 'products'))
  );
}
