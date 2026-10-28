// The CPO's Routine training runs delegation (SIMULATION §17.2/§16.13, the
// Chief Scientist's until schema 22): when no run is under way start a run on
// the model's weakest axis, its length and budget set by the training style
// dial (executives.trainingStyle, CPO_TRAINING.styles): Quantity ships often on
// lean budgets, Quality runs long and well funded. The budget is cashShare ×
// budgetMult of cash a week (its cap × frontierCostMult, §16.12), while
// cashFloorRuns weeks of it stay in cash. At the radar's ceiling there is
// nothing left to train, so no run starts.
// Switching to the trained result is the CPO's Models routine's job
// (execDelegationsFinance.ts). Runs from executives.ts each week; the dial's
// tagline reads cpoTrainingPlan without changing anything.
//
// Also the CPO's Research talent delegation (§16.13): every
// EXEC_DELEGATION.talentEveryWeeks weeks, hire the best researcher on the open
// market (most stars, then the cheapest) while researcher pay stays within
// talentBudgetShare of annual revenue and expansionReserveWeeks of costs stay
// in cash. It never poaches from a rival lab: the premium, the signing bonus
// and the counter-offers when rivals bid for yours stay your call.
import { CPO_TRAINING, EXEC_DELEGATION as X, TRAINING, WEEKS_PER_YEAR } from '../config/balance';
import { RESEARCHERS } from '../config/balance';
import { weeklyCosts } from './cashCover';
import { hireResearcher } from './commands/talent';
import { startTrainingRun } from './commands/training';
import { weeklyRevenue } from './execDelegationsFinance';
import { atModelCeiling, frontierCostMult } from './frontier';
import { clamp, roundToStep } from './math';
import type { TrainingStyle } from './marketsTypes';
import type { GameState, Researcher } from './state';
import { allResearchers, hireTerms, yourResearchers } from './talent';
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
  /** Every radar axis is at the ceiling: no run would lift the model. */
  atCeiling: boolean;
}

/** The run the CPO would start now under `style`. */
export function cpoTrainingPlan(state: GameState, style: TrainingStyle): TrainingPlan {
  const c = CPO_TRAINING;
  const { runWeeks, budgetMult } = c.styles[style];
  const weeklyBudget = roundToStep(
    clamp(
      state.company.cash * c.cashShare * budgetMult,
      TRAINING.minWeekly,
      c.maxWeekly * budgetMult * frontierCostMult(state),
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
    atCeiling: atModelCeiling(state),
  };
}

export function cpoTraining(state: GameState): void {
  if (!state.departments.products || state.training.run) return;
  const plan = cpoTrainingPlan(state, state.executives.trainingStyle);
  if (!plan.affordable || plan.atCeiling) return;
  startTrainingRun(state, {
    name: `Gen ${state.training.generation + 1}`,
    focus: plan.focus,
    weeks: plan.weeks,
    weeklyBudget: plan.weeklyBudget,
  });
}

export interface TalentPlan {
  /** A Products floor is in place. */
  active: boolean;
  /** The researcher the CPO would hire next, and their salary. */
  pick?: Researcher;
  salary: number;
  /** Why nobody is hired right now. */
  blocker?: string;
  /** Annual researcher pay now, and the budget the dial allows. */
  payroll: number;
  budget: number;
  /** Weeks until the next hiring check (talentEveryWeeks when it ran this week). */
  weeksTo: number;
}

/** Free researchers in the order the CPO takes them: most stars, then cheapest, then id. */
function freeAgents(state: GameState): Researcher[] {
  return allResearchers(state)
    .filter((r) => !r.employer)
    .sort(
      (a, b) =>
        b.stars - a.stars ||
        hireTerms(state, a).salary - hireTerms(state, b).salary ||
        (a.id < b.id ? -1 : 1),
    );
}

/** The hire Research talent would make now, or what holds it back. Changes nothing. */
export function talentPlan(state: GameState): TalentPlan {
  const mine = yourResearchers(state);
  const payroll = mine.reduce((sum, r) => sum + r.salary, 0);
  const budget = X.talentBudgetShare * weeklyRevenue(state) * WEEKS_PER_YEAR;
  const rem = state.clock.week % X.talentEveryWeeks;
  const plan: TalentPlan = {
    active: !!state.departments.products,
    salary: 0,
    payroll,
    budget,
    weeksTo: rem === 0 ? X.talentEveryWeeks : X.talentEveryWeeks - rem,
  };
  if (!plan.active) return { ...plan, blocker: 'Needs a Products floor at HQ.' };
  if (mine.length >= RESEARCHERS.maxTeam)
    return { ...plan, blocker: `The research team is full (${RESEARCHERS.maxTeam}).` };
  const free = freeAgents(state);
  if (free.length === 0) return { ...plan, blocker: 'Nobody is on the open market right now.' };
  const spare = state.company.cash - X.expansionReserveWeeks * weeklyCosts(state);
  for (const r of free) {
    const { salary } = hireTerms(state, r);
    if (payroll + salary > budget) continue;
    if (salary / WEEKS_PER_YEAR > spare) continue;
    return { ...plan, pick: r, salary };
  }
  const cheapest = hireTerms(state, free[free.length - 1]!).salary;
  return {
    ...plan,
    blocker:
      payroll + cheapest > budget
        ? `Researcher pay would pass ${Math.round(X.talentBudgetShare * 100)}% of revenue.`
        : `Waiting for spare cash: ${X.expansionReserveWeeks} weeks of costs stay in reserve.`,
  };
}

/** Research talent: every talentEveryWeeks weeks, the hire the plan names. */
export function cpoTalent(state: GameState): void {
  if (state.clock.week % X.talentEveryWeeks !== 0) return;
  const plan = talentPlan(state);
  if (plan.pick) hireResearcher(state, plan.pick.id);
}
