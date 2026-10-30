// Model launches and open weights (SIMULATION §16.15–16.16, owner's review A3,
// B3). The first switch to a trained model is a launch: a story in the paper,
// an awareness bump at every open sales office and extra price headroom that
// fades over a quarter, held at full strength while an agency launch campaign
// runs. A launch that tops every rival model makes the rivals cut plan prices
// where you sell. Publishing a trained model's weights (once per model) wins
// awareness and API sign-ups but costs usage headroom while that model stays
// close to your AI model.
import { MODEL_LAUNCH, OPEN_WEIGHTS } from '../config/balance';
import { pushEvent } from './events';
import { addEffect } from './incident/effects';
import { clamp } from './math';
import { cutRivalPlans } from './priceWar';
import { bestRivalModel } from './rivalModels';
import type { GameState, UnderwritingModel } from './state';

/** Mean of the radar (the same score as underwriting.modelQuality, kept local to avoid a cycle). */
const quality = (m: UnderwritingModel | undefined): number =>
  m ? m.radar.reduce((a, b) => a + b, 0) / m.radar.length : 0;

/** Awareness at every open sales office moves by `delta` (0–1 scale). */
function bumpAwareness(state: GameState, delta: number): void {
  for (const b of Object.values(state.branches))
    if (b.status === 'open') b.awareness = clamp(b.awareness + delta, 0, 1);
}

/** §16.15: base + perPoint × quality gained, capped. */
const hypeSize = (base: number, perPoint: number, max: number, gain: number) =>
  Math.min(max, base + perPoint * Math.max(0, gain));

/**
 * Called when `model` becomes the AI model in place of `prevId`. A trained model
 * that has never launched launches now; anything else is a plain switch.
 */
export function maybeLaunch(state: GameState, model: UnderwritingModel, prevId: string): void {
  if (model.source !== 'trained' || model.launchedWeek !== undefined) return;
  const L = MODEL_LAUNCH;
  const q = quality(model);
  const gain = q - quality(state.underwriting.models[prevId]);
  const headroom = hypeSize(L.headroomBase, L.headroomPerPoint, L.headroomMax, gain);
  const awareness = hypeSize(L.awarenessBase, L.awarenessPerPoint, L.awarenessMax, gain);
  model.launchedWeek = state.clock.week;
  state.underwriting.launch = { modelId: model.id, week: state.clock.week, headroom, awareness };
  bumpAwareness(state, awareness);

  // Topping every rival model makes them answer with plan price cuts where you sell.
  const best = bestRivalModel(state);
  const leads = best !== undefined && q > best;
  let rivalsCut = 0;
  if (leads) {
    const yours = new Set(
      Object.values(state.branches)
        .filter((b) => b.status === 'open')
        .map((b) => b.cityId),
    );
    const rivals = Object.values(state.rivals)
      .filter((r) => r.status === 'active')
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    for (const r of rivals) {
      let cut = false;
      for (const city of r.cities)
        if (yours.has(city) && cutRivalPlans(r, city, L.rivalCut) > 0) cut = true;
      if (cut) rivalsCut += 1;
    }
  }
  pushEvent(
    state,
    'MODEL_LAUNCHED',
    { modelId: model.id, name: model.name, quality: q, leads, rivalsCut, headroom },
    2,
  );
}

/** §16.15: the launch hype's price headroom this week (0 once faded or after a switch away). */
export function launchHeadroom(state: GameState): number {
  const l = state.underwriting.launch;
  if (!l || state.underwriting.activeModelId !== l.modelId) return 0;
  const from = Math.max(l.week, l.holdUntil ?? l.week);
  const fade = 1 - Math.max(0, state.clock.week - from) / MODEL_LAUNCH.hypeWeeks;
  return l.headroom * Math.max(0, fade);
}

/** B3: agencies sell launch campaigns for windowWeeks after a launch. */
export function launchWindowOpen(state: GameState): boolean {
  const l = state.underwriting.launch;
  return !!l && state.clock.week - l.week < MODEL_LAUNCH.windowWeeks;
}

/** Weeks left to book a launch campaign (0 when the window is shut). */
export function launchWindowLeft(state: GameState): number {
  const l = state.underwriting.launch;
  return l ? Math.max(0, l.week + MODEL_LAUNCH.windowWeeks - state.clock.week) : 0;
}

/** B3: a launch campaign of `weeks` holds the hype at full strength until it ends. */
export function holdHype(state: GameState, weeks: number): void {
  const l = state.underwriting.launch;
  if (l) l.holdUntil = Math.max(l.holdUntil ?? 0, state.clock.week + weeks);
}

/**
 * §16.16: usage headroom lost to open weights, for an AI model of quality
 * `activeQuality`: maxDrag × (1 − gap / nearGap) for the closest open model.
 */
export function openWeightsDrag(state: GameState, activeQuality: number): number {
  const O = OPEN_WEIGHTS;
  let drag = 0;
  for (const m of Object.values(state.underwriting.models)) {
    if (m.openWeek === undefined) continue;
    const gap = Math.max(0, activeQuality - quality(m));
    if (gap < O.nearGap) drag = Math.max(drag, O.maxDrag * (1 - gap / O.nearGap));
  }
  return drag;
}

/** §16.16: publish a trained model's weights. Validation lives in the command. */
export function publishWeights(state: GameState, model: UnderwritingModel): void {
  const O = OPEN_WEIGHTS;
  model.openWeek = state.clock.week;
  bumpAwareness(state, O.awareness);
  addEffect(state, 'takeup', 'company', O.apiTakeup, O.takeupWeeks, O.apiProduct);
  pushEvent(state, 'WEIGHTS_OPENED', { modelId: model.id, name: model.name }, 3);
}
