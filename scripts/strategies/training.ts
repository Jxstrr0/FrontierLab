// Training runs for scripted strategies (stage C6b): once there is a Products
// floor and enough cash, train the next model generation on a slice of cash,
// focused on the model's weakest axis, and switch to each new model that beats
// the current one.
import { TRAINING } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import type { GameState } from '../../src/sim/state';
import { activeModel, modelQuality } from '../../src/sim/underwriting';

/** Training term in weeks. */
const RUN_WEEKS = 24;
/** Start a run only with this many minimum weekly budgets in cash. */
const CASH_FLOOR_RUNS = 40;
/** The most a strategy spends on training a week. */
const MAX_WEEKLY = 150_000;

export function manageTraining(state: GameState, cashShare: number): void {
  const current = activeModel(state);
  const best = Object.values(state.underwriting.models)
    .filter((m) => m.source === 'trained')
    .sort((a, b) => modelQuality(b) - modelQuality(a))[0];
  if (best && best.id !== current.id && modelQuality(best) > modelQuality(current))
    cmd.activateModel(state, best.id);
  if (!state.departments.products || state.training.run) return;
  if (state.company.cash < CASH_FLOOR_RUNS * TRAINING.minWeekly) return;
  const weeklyBudget = Math.min(
    MAX_WEEKLY,
    Math.max(TRAINING.minWeekly, state.company.cash * cashShare),
  );
  const radar = current.radar;
  const focus = radar.indexOf(Math.min(...radar));
  cmd.startTrainingRun(state, {
    name: `Gen ${state.training.generation + 1}`,
    focus,
    weeks: RUN_WEEKS,
    weeklyBudget,
  });
}
