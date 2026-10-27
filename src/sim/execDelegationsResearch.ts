// The CPO's Routine training runs delegation (SIMULATION §17.2/§16.13, the
// Chief Scientist's until schema 22): when no run is under way start a runWeeks
// run on the model's weakest axis at cashShare of cash a week, while
// cashFloorRuns weeks of it stay in cash. Switching to the trained result is the
// CPO's Models routine's job (execDelegationsFinance.ts). Runs from
// executives.ts each week.
import { CPO_TRAINING, TRAINING } from '../config/balance';
import { startTrainingRun } from './commands/training';
import { clamp, roundToStep } from './math';
import type { GameState } from './state';
import { activeModel } from './underwriting';

export function cpoTraining(state: GameState): void {
  if (!state.departments.products || state.training.run) return;
  const c = CPO_TRAINING;
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
