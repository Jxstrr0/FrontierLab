// The CPO's training style dial (SCREENS §10.1), under Routine training runs:
// Quantity ships a new model every few weeks on lean budgets, Quality runs long
// and well funded for better star odds. The tagline reads the run the CPO would
// start now (cpoTrainingPlan) without changing anything.
import { DEV_MAX_STARS } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { cpoTrainingPlan } from '../../sim/execDelegationsResearch';
import type { TrainingStyle } from '../../sim/marketsTypes';
import type { GameState } from '../../sim/state';
import { StepSlider } from '../components';
import { money, pct } from '../format/format';
import { MODEL_AXES } from '../hq/products/productSelectors';
import { act } from '../store';

const STYLES: { value: TrainingStyle; label: string }[] = [
  { value: 'quantity', label: 'Quantity' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'quality', label: 'Quality' },
];

/** Stars counted as a strong release in the tagline (4★ and 5★). */
const STRONG_FROM = DEV_MAX_STARS - 1;

export function TrainingStyleDial(p: { s: GameState }) {
  const sym = p.s.settings.currency;
  const plan = cpoTrainingPlan(p.s, p.s.executives.trainingStyle);
  const strong = plan.odds.slice(STRONG_FROM - 1).reduce((a, b) => a + b, 0);
  const axis = MODEL_AXES[plan.focus]?.[0] ?? '';
  const hint = !plan.active
    ? 'Needs a Products floor at HQ.'
    : `${plan.weeks}-week runs at ${money(plan.weeklyBudget, sym)}/wk on ${axis} · ${pct(strong, 0)} chance of ${STRONG_FROM}★ or better` +
      (plan.affordable ? '' : ' · waits for more cash');
  return (
    <div class="exec-dial">
      <StepSlider
        label="Training style"
        options={STYLES}
        value={p.s.executives.trainingStyle}
        onChange={(v) => act(cmd.setTrainingStyle, v)}
        hint={hint}
      />
    </div>
  );
}
