// The CPO's Routine training runs delegation (SIMULATION §17.2/§16.13, the
// Chief Scientist's until schema 22): when no run is under way start a run on
// the model's weakest axis, its length and budget set by the training style
// dial (executives.trainingStyle, CPO_TRAINING.styles): Quantity ships often on
// lean budgets, Quality runs long and well funded. The budget is cashShare ×
// budgetMult of cash a week, while cashFloorRuns weeks of it stay in cash.
// Switching to the trained result is the CPO's Models routine's job
// (execDelegationsFinance.ts). Runs from executives.ts each week; the dial's
// tagline reads cpoTrainingPlan without changing anything.
import { CPO_TRAINING, TRAINING } from '../config/balance';
import { startTrainingRun } from './commands/training';
import { clamp, roundToStep } from './math';
import type { TrainingStyle } from './marketsTypes';
import type { GameState } from './state';
import { trainingOdds } from './training';
import { activeModel } from './underwriting';

export interface TrainingPlan {
  /** A Products floor is in place. */
  active: boolean;
  weeks: number;
  weeklyBudget: number;
  focus: number;
  /** Star odds [1★..5★] of a run started now. */
  odds: number[];
  /** Cash covers cashFloorRuns weeks of the budget, so a run would start. */
  affordable: boolean;
}

/** The run the CPO would start now under `style`. */
export function cpoTrainingPlan(state: GameState, style: TrainingStyle): TrainingPlan {
  const c = CPO_TRAINING;
  const { runWeeks, budgetMult } = c.styles[style];
  const weeklyBudget = roundToStep(
    clamp(
      state.company.cash * c.cashShare * budgetMult,
      TRAINING.minWeekly,
      c.maxWeekly * budgetMult,
    ),
    TRAINING.budgetStep,
  );
  const radar = activeModel(state).radar;
  const focus = radar.indexOf(Math.min(...radar));
  return {
    active: !!state.departments.products,
    weeks: runWeeks,
    weeklyBudget,
    focus,
    odds: trainingOdds(state, runWeeks, weeklyBudget, focus),
    affordable: state.company.cash >= c.cashFloorRuns * weeklyBudget,
  };
}

export function cpoTraining(state: GameState): void {
  if (!state.departments.products || state.training.run) return;
  const plan = cpoTrainingPlan(state, state.executives.trainingStyle);
  if (!plan.affordable) return;
  startTrainingRun(state, {
    name: `Gen ${state.training.generation + 1}`,
    focus: plan.focus,
    weeks: plan.weeks,
    weeklyBudget: plan.weeklyBudget,
  });
}
