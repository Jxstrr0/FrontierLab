// Products floor commands for training runs (stage C6b, SIMULATION §16.12):
// start a run on the next model generation, or cancel it. One run at a time.
import { DEV_TERMS, MODEL_NAME_MAX, TRAINING } from '../../config/balance';
import type { DevTerm } from '../development';
import { newId } from '../ids';
import { roundToStep } from '../math';
import { pauseBlock } from '../safety';
import type { GameState } from '../state';
import { trainingOdds } from '../training';
import { fail, money, ok, type CommandResult } from './result';

export interface StartTrainingInput {
  name: string;
  /** Radar axis to favour (0 Reasoning … 4 Efficiency). */
  focus: number;
  weeks: number;
  weeklyBudget: number;
}

export function startTrainingRun(
  state: GameState,
  input: StartTrainingInput,
): CommandResult<{ runId: string; odds: number[] }> {
  if (!state.departments.products) return fail('Training runs need a Products floor at HQ.');
  if (state.training.run) return fail('A training run is already under way.');
  const paused = pauseBlock(state);
  if (paused) return fail(paused);
  const name = input.name.trim();
  if (!name) return fail('Give the new model a name.');
  if (name.length > MODEL_NAME_MAX) return fail(`Names can be up to ${MODEL_NAME_MAX} characters.`);
  if (!Number.isInteger(input.focus) || input.focus < 0 || input.focus > 4)
    return fail('Pick what to focus on.');
  if (!(DEV_TERMS as readonly number[]).includes(input.weeks))
    return fail(`Training time is ${DEV_TERMS.join(', ')} weeks.`);
  if (!Number.isFinite(input.weeklyBudget)) return fail('Enter a weekly budget.');
  const weeklyBudget = roundToStep(input.weeklyBudget, TRAINING.budgetStep);
  if (weeklyBudget < TRAINING.minWeekly)
    return fail(`The weekly budget starts at ${money(TRAINING.minWeekly)}.`);
  if (state.company.cash < weeklyBudget)
    return fail(`You need ${money(weeklyBudget)} in cash for the first week.`);
  const odds = trainingOdds(state, input.weeks, weeklyBudget, input.focus);
  const id = newId(state, 'train');
  state.training.run = {
    id,
    name,
    focus: input.focus,
    weeks: input.weeks as DevTerm,
    weeklyBudget,
    spent: 0,
    progress: 0,
    odds,
    startWeek: state.clock.week,
  };
  return ok({ runId: id, odds });
}

/** Stops the training run. Money already spent is gone. */
export function cancelTrainingRun(state: GameState): CommandResult {
  if (!state.training.run) return fail('No training run is under way.');
  delete state.training.run;
  return ok();
}
