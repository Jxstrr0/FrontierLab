// The Chief Scientist's delegation (stage C6c, SIMULATION §17.2/§16.13),
// Routine training runs: switch to a trained model that beats the one in use,
// and when no run is under way start a runWeeks run on the model's weakest
// axis at cashShare of cash a week, while cashFloorRuns weeks of it stay in
// cash. Runs from executives.ts each week.
import { CHIEF_SCIENTIST, TRAINING } from '../config/balance';
import { startTrainingRun } from './commands/training';
import { activateModel } from './commands/underwriting';
import { clamp, roundToStep } from './math';
import type { GameState } from './state';
import { activeModel, modelQuality } from './underwriting';

export function csciTraining(state: GameState): void {
  const current = activeModel(state);
  const best = Object.values(state.underwriting.models)
    .filter((m) => m.source === 'trained')
    .sort((a, b) => modelQuality(b) - modelQuality(a) || (a.id < b.id ? -1 : 1))[0];
  if (best && best.id !== current.id && modelQuality(best) > modelQuality(current))
    activateModel(state, best.id);
  if (!state.departments.products || state.training.run) return;
  const c = CHIEF_SCIENTIST;
  const weeklyBudget = roundToStep(
    clamp(state.company.cash * c.cashShare, TRAINING.minWeekly, c.maxWeekly),
    TRAINING.budgetStep,
  );
  if (state.company.cash < c.cashFloorRuns * weeklyBudget) return;
  const radar = activeModel(state).radar;
  startTrainingRun(state, {
    name: `Gen ${state.training.generation + 1}`,
    focus: radar.indexOf(Math.min(...radar)),
    weeks: c.runWeeks,
    weeklyBudget,
  });
}
