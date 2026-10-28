// Rival AI models and the frontier (stage C6b, SIMULATION §16.12): every rival
// lab carries a model; each quarter some ship a new generation. The best
// rival model is the frontier, and how far it has risen since the game began
// raises the bar your own model is judged against (price headroom, the Model
// rating, contract chances). The benchmark leaderboard ranks every lab.
import { RIVAL_MODEL } from '../config/balance';
import { MODEL_FAMILIES, RIVAL_START_GENERATION } from '../data/modelNames';
import { pushEvent } from './events';
import { modelCeiling } from './projects';
import { stream, type Rng } from './rng';
import { rivalResearchGain } from './talent';
import type { GameState, RivalBank } from './state';

const byId = (a: RivalBank, b: RivalBank) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function activeRivals(state: GameState): RivalBank[] {
  return Object.values(state.rivals)
    .filter((r) => r.status === 'active')
    .sort(byId);
}

/** The best active rival model's quality, or undefined with no rivals left. */
export function bestRivalModel(state: GameState): number | undefined {
  let best: number | undefined;
  for (const r of activeRivals(state))
    if (r.model && (best === undefined || r.model.quality > best)) best = r.model.quality;
  return best;
}

/** §16.12: how far the frontier has risen since the game began (never below 0). */
export function frontierRise(state: GameState): number {
  const best = bestRivalModel(state);
  return best === undefined ? 0 : Math.max(0, best - state.training.frontierBase);
}

function freeFamily(state: GameState): string {
  const used = new Set(Object.values(state.rivals).map((r) => r.model?.name.replace(/ \d+$/, '')));
  return MODEL_FAMILIES.find((f) => !used.has(f)) ?? MODEL_FAMILIES[0];
}

/**
 * Gives a rival its first model: startQuality + U(startSpread) at the start of
 * a game, or lateGap under the best rival model for a lab founded later.
 */
export function seedRivalModel(state: GameState, rng: Rng, rival: RivalBank, late: boolean): void {
  if (rival.model) return;
  const best = bestRivalModel(state);
  const quality =
    late && best !== undefined
      ? best - RIVAL_MODEL.lateGap
      : RIVAL_MODEL.startQuality + rng.range(...RIVAL_MODEL.startSpread);
  rival.model = {
    name: `${freeFamily(state)} ${RIVAL_START_GENERATION}`,
    generation: RIVAL_START_GENERATION,
    quality,
    releasedWeek: state.clock.week,
  };
}

/** New game (and migration 14 → 15): every rival's model, then the frontier's base. */
export function seedRivalModels(state: GameState): void {
  const rng = stream(state, 'rivalModels');
  for (const r of Object.values(state.rivals).sort(byId)) seedRivalModel(state, rng, r, false);
  state.training.frontierBase = bestRivalModel(state) ?? RIVAL_MODEL.startQuality;
}

/** Tick step 13, a quarter start: rivals without a model get one; some release a new generation. */
export function rivalModelsQuarter(state: GameState): void {
  const rng = stream(state, 'rivalModels');
  for (const r of activeRivals(state)) {
    if (!r.model) {
      seedRivalModel(state, rng, r, true);
      continue;
    }
    if (!rng.chance(RIVAL_MODEL.releaseQuarterly)) continue;
    const before = bestRivalModel(state) ?? 0;
    // §16.13 (C6c): the rival's researchers make each release bigger.
    const gain =
      Math.max(RIVAL_MODEL.minGain, rng.normal(RIVAL_MODEL.gainMean, RIVAL_MODEL.gainSigma)) +
      rivalResearchGain(state, r.id);
    const m = r.model;
    m.generation += 1;
    m.name = `${m.name.replace(/ \d+$/, '')} ${m.generation}`;
    // Your breakthroughs (§16.14) raise every lab's ceiling: the ideas spread.
    m.quality = Math.min(modelCeiling(state), m.quality + gain);
    m.releasedWeek = state.clock.week;
    pushEvent(
      state,
      'RIVAL_MODEL_RELEASED',
      {
        rivalId: r.id,
        rival: r.name,
        model: m.name,
        quality: m.quality,
        leads: m.quality > before,
      },
      m.quality > before ? 2 : 3,
    );
  }
}
