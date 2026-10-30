// The AI model (SIMULATION §16.7, stage C6a; the file keeps its bank-era name):
// packaged data-vendor models, custom data mixes built on the Products floor or
// hosted by a vendor, the house model's radar (Reasoning, Speed, Breadth,
// Safety, Efficiency) and data licence per customer, the two-week blend while
// switching, and what the model does: Efficiency sets the compute behind each
// customer, and quality sets price headroom and helps win contracts.
import {
  BUREAU_HOSTED,
  HQ_EFFECTS,
  INTERNAL_HISTORY,
  MODEL_MIX_TOLERANCE,
  MODEL_EFFECTS,
  MODEL_QUALITY,
  MODEL_RADAR_MAX,
  MODEL_SWITCH_WEEKS,
} from '../config/balance';
import { BUREAU_PACKAGES, DATA_INPUTS } from '../data/bureaus';
import type { Pentagon } from '../data/types';
import { shortfall } from './hq';
import { digitalBonus } from './products';
import { modelCeiling } from './projects';
import { frontierRise } from './rivalModels';
import type { Business, GameState, UnderwritingModel } from './state';
import { launchHeadroom, openWeightsDrag } from './modelLaunch';

/** Radar index constants: Reasoning, Speed, Breadth, Safety, Efficiency. */
export const RADAR = { reasoning: 0, speed: 1, breadth: 2, safety: 3, efficiency: 4 } as const;

/** Where a custom mix is built: the Products floor, or hosted by a data vendor. */
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
    costPerCustomer: pkg.costPerCustomer,
  };
}

// ─── Custom models ────────────────────────────────────────────────────────────

/** Customers across every sales office. */
export function labCustomers(state: GameState): number {
  let n = 0;
  for (const b of Object.values(state.branches)) n += b.customers;
  return n;
}

/** An input's profile now: Customer Feedback Reasoning = 4 + min(5, customers/50,000 × 5). */
export function inputProfile(state: GameState, inputId: string): Pentagon | undefined {
  const input = DATA_INPUTS[inputId];
  if (!input) return undefined;
  if (inputId !== 'internal') return input.profile;
  const h = INTERNAL_HISTORY;
  const reasoning =
    h.accuracyBase +
    Math.min(h.accuracyGain, (labCustomers(state) / h.fullCustomers) * h.accuracyGain);
  const p: Pentagon = [...input.profile];
  p[RADAR.reasoning] = reasoning;
  return p;
}

/** qualityMult = 0.9 + 0.2 × productsCoverage′ × avgSkill/100, or the vendor's fixed 0.95. */
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
    if (w > 0 && input.minCustomers && labCustomers(state) < input.minCustomers)
      return `${input.name} needs ${input.minCustomers.toLocaleString('en-US')} customers first.`;
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
): { radar: Pentagon; costPerCustomer: number } {
  const q = modelQualityMult(state, source);
  const radar: Pentagon = [0, 0, 0, 0, 0];
  let cost = 0;
  for (const [id, w] of Object.entries(mix)) {
    const profile = inputProfile(state, id);
    if (!profile) continue;
    for (let i = 0; i < 5; i++) radar[i] = radar[i]! + w * profile[i]! * q;
    cost += w * DATA_INPUTS[id]!.costPerCustomer;
  }
  for (let i = 0; i < 5; i++) radar[i] = Math.min(MODEL_RADAR_MAX, radar[i]!);
  return {
    radar,
    costPerCustomer: source === 'hosted' ? cost * BUREAU_HOSTED.costMult : cost,
  };
}

/** Live preview for the model sliders: the radar and cost this mix would give as house model. */
export function previewModel(
  state: GameState,
  mix: Record<string, number>,
  source: ModelSource,
): { radar: Pentagon; costPerCustomer: number; quality: number; problem: string | null } {
  const figures = customFigures(state, normalizeMix(mix), source);
  const radar: Pentagon = [...figures.radar];
  radar[RADAR.speed] = Math.min(
    MODEL_RADAR_MAX,
    radar[RADAR.speed] + digitalBonus(state, 'modelSpeed'),
  );
  return {
    radar,
    costPerCustomer: figures.costPerCustomer,
    quality: modelQuality({ radar }),
    problem: mixProblem(state, mix),
  };
}

/** Radar of a trained model now (C6b): its mix at today's Products team plus its lift, capped at 10. */
export function trainedRadar(state: GameState, m: UnderwritingModel): Pentagon {
  const base = customFigures(state, m.mix, 'custom').radar;
  const lift = m.lift ?? [0, 0, 0, 0, 0];
  // The ceiling rises with finished breakthroughs (§16.14).
  const ceiling = modelCeiling(state);
  return base.map((v, i) => Math.min(ceiling, v + lift[i]!)) as Pentagon;
}

/** Weekly: custom and trained models track the Products team and Customer Feedback; a switch counts down. */
export function updateModels(state: GameState): void {
  const u = state.underwriting;
  for (const m of Object.values(u.models)) {
    if (m.source === 'trained') m.radar = trainedRadar(state, m);
    else if (m.source === 'custom')
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
  if (!target) throw new Error('No active AI model');
  const from = u.switching ? u.models[u.switching.fromId] : undefined;
  const speedBonus = digitalBonus(state, 'modelSpeed');
  if (!from && speedBonus === 0) return target;
  const radar: Pentagon = [...target.radar];
  let costPerCustomer = target.costPerCustomer;
  if (from && u.switching) {
    const w = u.switching.weeksLeft / (MODEL_SWITCH_WEEKS + 1);
    for (let i = 0; i < 5; i++) radar[i] = radar[i]! * (1 - w) + from.radar[i]! * w;
    costPerCustomer = costPerCustomer * (1 - w) + from.costPerCustomer * w;
  }
  radar[RADAR.speed] = Math.min(MODEL_RADAR_MAX, radar[RADAR.speed] + speedBonus);
  return { ...target, radar, costPerCustomer };
}

/** Mean of the five radar values (1–10), used by the Model rating (§8). */
export function modelQuality(m: { radar: Pentagon }): number {
  return m.radar.reduce((a, b) => a + b, 0) / m.radar.length;
}

/** Data licence per customer a year: + (1 − k′) × 30% when the Products team is short (CONTENT §9). */
export function modelCostPerCustomer(state: GameState): number {
  return (
    activeModel(state).costPerCustomer *
    (1 + HQ_EFFECTS.modelCostPenalty * shortfall(state, 'products'))
  );
}

// ─── What the model does (C6a) ────────────────────────────────────────────────

/** §16.7: compute behind each customer, 1 − 0.05 × (Efficiency − 7) (0.85–1.35 over the radar). */
export function inferenceMult(state: GameState): number {
  const e = MODEL_EFFECTS;
  const eff = activeModel(state).radar[RADAR.efficiency];
  return 1 - e.efficiencySlope * (eff - e.efficiencyRef);
}

/**
 * §16.12 (C6b): the quality bar a model is judged against, 5.8 plus 0.6 of
 * how far the frontier (the best rival model) has risen since the game began.
 */
export function qualityBar(state: GameState): number {
  return MODEL_EFFECTS.qualityRef + MODEL_EFFECTS.frontierWeight * frontierRise(state);
}

/**
 * §16.7: price headroom, the market price multiplier customers accept,
 * 1 + 0.04 × (quality − bar), plus a launch's fading hype (§16.15). Usage
 * products also lose the open-weights drag (§16.16); pass the product kind.
 */
export function priceHeadroom(state: GameState, kind?: string): number {
  const q = modelQuality(activeModel(state));
  const drag = kind === 'usage' ? openWeightsDrag(state, q) : 0;
  return 1 + MODEL_EFFECTS.headroomSlope * (q - qualityBar(state)) + launchHeadroom(state) - drag;
}

/**
 * §11.3: the model's pull on a contract, added to win and keep chances:
 * 0.05 × (quality − bar) + 0.03 × (Safety − 5) × (Data sensitivity − 5) / 5.
 */
export function modelDealEdge(state: GameState, b: Business): number {
  const e = MODEL_EFFECTS;
  const m = activeModel(state);
  return (
    e.dealQuality * (modelQuality(m) - qualityBar(state)) +
    (e.dealSafety * (m.radar[RADAR.safety] - 5) * (b.pentagon[2] - 5)) / 5
  );
}
