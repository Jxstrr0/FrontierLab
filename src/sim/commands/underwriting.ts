// Underwriting model commands (SIMULATION §16.7, DATA_MODEL §11): buy a bureau
// package, commission a bureau-hosted custom mix, save a Products-floor custom
// model, and switch the house model (a two-week blend).
import { MODEL_NAME_MAX, MODEL_SWITCH_WEEKS } from '../../config/balance';
import { BUREAU_PACKAGES, bureausIn } from '../../data/bureaus';
import { newId } from '../ids';
import type { GameState, UnderwritingModel } from '../state';
import {
  customFigures,
  mixProblem,
  normalizeMix,
  packagedModel,
  type ModelSource,
} from '../underwriting';
import { fail, ok, type CommandResult } from './result';

/** Makes a stored model the house model, blending out the old one over two weeks. */
export function activateModel(state: GameState, modelId: string): CommandResult {
  const u = state.underwriting;
  if (!u.models[modelId]) return fail('Unknown model.');
  if (u.activeModelId === modelId) return fail("That's already your AI model.");
  u.switching = { fromId: u.activeModelId, weeksLeft: MODEL_SWITCH_WEEKS };
  u.activeModelId = modelId;
  return ok();
}

/**
 * Data vendors the lab can deal with: those in the current city; for the CPO's
 * Models delegation (SIMULATION §17.2), who travels for you, also those in any
 * city with an open sales office.
 */
export function reachableBureaus(state: GameState, via: 'player' | 'cpo' = 'player'): string[] {
  const cities = new Set([state.world.currentCityId]);
  if (via === 'cpo')
    for (const b of Object.values(state.branches)) if (b.status === 'open') cities.add(b.cityId);
  const out = new Set<string>();
  for (const cityId of cities) for (const id of bureausIn(cityId)) out.add(id);
  return [...out].sort();
}

/** "Use as house model" on a packaged model at a bureau in the current city (or, via the CPO, in any office city). */
export function buyBureauModel(
  state: GameState,
  packageId: string,
  via: 'player' | 'cpo' = 'player',
): CommandResult<{ modelId: string }> {
  const pkg = BUREAU_PACKAGES[packageId];
  if (!pkg) return fail('Unknown data package.');
  if (!reachableBureaus(state, via).includes(pkg.bureau))
    return fail(`${pkg.bureau} has no office in this city.`);
  const u = state.underwriting;
  if (u.activeModelId === pkg.id) return fail("That's already your AI model.");
  u.models[pkg.id] ??= packagedModel(pkg.id);
  const r = activateModel(state, pkg.id);
  return r.ok ? ok({ modelId: pkg.id }) : r;
}

function checkName(name: string): string | null {
  if (!name.trim()) return 'Give the model a name.';
  if (name.trim().length > MODEL_NAME_MAX)
    return `Names can be up to ${MODEL_NAME_MAX} characters.`;
  return null;
}

function buildModel(
  state: GameState,
  id: string,
  name: string,
  mix: Record<string, number>,
  source: ModelSource,
  bureau?: string,
): UnderwritingModel {
  const clean = normalizeMix(mix);
  const model: UnderwritingModel = {
    id,
    name: name.trim(),
    source: 'custom',
    mix: clean,
    ...customFigures(state, clean, source),
  };
  if (bureau) model.hostedBy = bureau;
  return model;
}

/**
 * Commissions a custom mix hosted by a bureau in the current city (no Products
 * floor needed; quality 0.95, cost × 1.15) and makes it the house model.
 */
export function commissionBureauModel(
  state: GameState,
  input: { bureau: string; name: string; mix: Record<string, number> },
): CommandResult<{ modelId: string }> {
  if (!bureausIn(state.world.currentCityId).includes(input.bureau))
    return fail(`${input.bureau} has no office in this city.`);
  const problem = checkName(input.name) ?? mixProblem(state, input.mix);
  if (problem) return fail(problem);
  const id = newId(state, 'model');
  state.underwriting.models[id] = buildModel(
    state,
    id,
    input.name,
    input.mix,
    'hosted',
    input.bureau,
  );
  const r = activateModel(state, id);
  return r.ok ? ok({ modelId: id }) : r;
}

/**
 * Saves a custom model built on the Products floor. Pass `modelId` to overwrite
 * one of your custom models that isn't in use; activate it with activateModel.
 */
export function saveCustomModel(
  state: GameState,
  input: { name: string; mix: Record<string, number>; modelId?: string },
): CommandResult<{ modelId: string }> {
  if (!state.departments.products) return fail('Custom models need a Products floor at HQ.');
  const problem = checkName(input.name) ?? mixProblem(state, input.mix);
  if (problem) return fail(problem);
  const u = state.underwriting;
  let id = input.modelId;
  if (id !== undefined) {
    const existing = u.models[id];
    if (!existing || existing.source !== 'custom' || existing.hostedBy)
      return fail('Only your own custom models can be edited.');
    if (id === u.activeModelId || id === u.switching?.fromId)
      return fail('That model is in use. Save it as a new model instead.');
  } else id = newId(state, 'model');
  u.models[id] = buildModel(state, id, input.name, input.mix, 'custom');
  return ok({ modelId: id });
}
