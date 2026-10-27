// Training runs (stage C6b, SIMULATION §16.12): the Products team trains the
// next generation of the lab's AI model. A run uses the development terms and
// star odds (§16.6) on its own budget scale, pays its budget as it progresses,
// and on finishing adds a lift to every radar value of the house model (more
// on the chosen focus axis). The result is a new trained model in Manage
// Models; using it takes the usual two-week switch. Tick step 7.
import { DEV_MAX_STARS, TRAINING } from '../config/balance';
import type { Pentagon } from '../data/types';
import { devScore, devSpeed, starOdds } from './development';
import { pushEvent } from './events';
import { newId } from './ids';
import { spend } from './ledger';
import { bestRivalModel } from './rivalModels';
import { stream } from './rng';
import { isPaused } from './safety';
import { cpoTrainingBonus, researchBonus } from './talent';
import type { GameState, TrainingRun, UnderwritingModel } from './state';
import { activeModel, customFigures, modelQuality, trainedRadar } from './underwriting';

/**
 * Star odds [1★..5★] for a run of `weeks` at `weeklyBudget` with today's team,
 * plus the CPO's and your researchers' lift (§16.13, C6c).
 */
export function trainingOdds(
  state: GameState,
  weeks: number,
  weeklyBudget: number,
  focus?: number,
): number[] {
  return starOdds(
    devScore(state, weeks, weeklyBudget, TRAINING.minWeekly, TRAINING.maxBudgetScoreAt) +
      cpoTrainingBonus(state) +
      researchBonus(state, focus),
  );
}

/** The lift a run of `stars` gives: starLift on every axis, plus focusLift on the focus axis. */
export function trainingLift(stars: number, focus: number): Pentagon {
  const i = Math.min(DEV_MAX_STARS, Math.max(1, stars)) - 1;
  const lift = Array.from({ length: 5 }, () => TRAINING.starLift[i]!) as Pentagon;
  lift[focus] = lift[focus]! + TRAINING.focusLift[i]!;
  return lift;
}

/** Calendar weeks left on the run at the current Products coverage. */
export function trainingWeeksLeft(state: GameState, run: TrainingRun): number {
  return Math.ceil((run.weeks - run.progress) / devSpeed(state));
}

/** Tick step 7: the run pays for the progress it makes and finishes at its term. Pauses without a Products floor. */
export function runTraining(state: GameState): void {
  const run = state.training.run;
  // No Products floor, or a mandated pause (C7a): the run waits.
  if (!run || !state.departments.products || isPaused(state)) return;
  const step = Math.min(devSpeed(state), run.weeks - run.progress);
  const cost = run.weeklyBudget * step;
  spend(state, 'development', cost);
  run.spent += cost;
  run.progress = Math.min(run.weeks, run.progress + step);
  if (run.progress >= run.weeks) finishTraining(state, run);
}

/** The run is done: a new trained model built on the house model, with the run's lift added. */
function finishTraining(state: GameState, run: TrainingRun): void {
  delete state.training.run;
  const items = run.odds.map((weight, i) => ({ item: i + 1, weight }));
  const stars = stream(state, 'training').pickWeighted(items);
  const house = activeModel(state);
  const lift = trainingLift(stars, run.focus);
  const prior = house.lift ?? [0, 0, 0, 0, 0];
  const id = newId(state, 'model');
  const model: UnderwritingModel = {
    id,
    name: run.name,
    source: 'trained',
    mix: { ...house.mix },
    radar: [0, 0, 0, 0, 0],
    costPerCustomer: customFigures(state, house.mix, 'custom').costPerCustomer,
    lift: prior.map((v, i) => v + lift[i]!) as Pentagon,
    generation: state.training.generation + 1,
    trainedWeek: state.clock.week,
  };
  model.radar = trainedRadar(state, model);
  state.underwriting.models[id] = model;
  state.training.generation += 1;
  const quality = modelQuality(model);
  pushEvent(
    state,
    'MODEL_TRAINED',
    { modelId: id, name: run.name, stars, quality, leads: quality > (bestRivalModel(state) ?? 0) },
    2,
  );
}
