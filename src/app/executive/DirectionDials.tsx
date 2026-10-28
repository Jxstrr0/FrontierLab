// Direction dials (SCREENS §10.1), the second set of stepped sliders under the
// executives' switches, each with a tagline from the routine's own plan:
//   CSO · Launch posture   posture ceiling 3 Balanced / 4 Bold / 5 Very bold
//   COO · Expansion        cash reserve 8 / 13 / 26 weeks of costs
//   CPO · Developments     product focus Plans / API / Apps / Any
// The first set (morale, cadence, awareness, cover, training style, occupancy)
// is in DelegationDials.tsx, which picks the dial for a switch.
import { EXEC_DELEGATION } from '../../config/balance';
import { CATEGORY_NAMES } from '../../data/products';
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import { nextDevelopment } from '../../sim/execDelegationsFinance';
import { expansionNext } from '../../sim/execDelegationsGrowth';
import { posturePlan } from '../../sim/execDelegationsPeople';
import type { DevFocus } from '../../sim/marketsTypes';
import type { GameState } from '../../sim/state';
import { StepSlider } from '../components';
import { money } from '../format/format';
import { RISK_LABELS } from '../hq/finance/riskSelectors';
import { act } from '../store';

const TIER_NAMES: Record<string, string> = {
  strong: 'Strong',
  adequate: 'Adequate',
  watch: 'Watch',
  restricted: 'Restricted',
  critical: 'Critical',
};

const inWeeks = (n: number) => (n === 0 ? 'this week' : `in ${n} ${n === 1 ? 'week' : 'weeks'}`);

export function PostureCeilingDial(p: { s: GameState }) {
  const plan = posturePlan(p.s, p.s.executives.postureCeiling);
  const name = (level: number) => RISK_LABELS[level - 1] ?? String(level);
  const move =
    plan.next === 'up'
      ? `steps up to ${name(plan.level + 1)} ${inWeeks(plan.weeksTo)}`
      : plan.next === 'down'
        ? `steps down to ${name(plan.level - 1)} ${inWeeks(plan.weeksTo)}`
        : plan.level >= plan.ceiling && plan.tier === 'strong'
          ? 'at the ceiling, holds'
          : 'holds';
  const hint = `Posture now ${name(plan.level)} · safety tier ${TIER_NAMES[plan.tier] ?? plan.tier} · ${move}`;
  return (
    <div class="exec-dial">
      <StepSlider
        label="Posture ceiling"
        options={EXEC_DELEGATION.croCeilings.map((t) => ({ value: t, label: name(t) }))}
        value={p.s.executives.postureCeiling}
        onChange={(v) => act(cmd.setPostureCeiling, v)}
        hint={hint}
      />
    </div>
  );
}

export function ExpansionReserveDial(p: { s: GameState }) {
  const sym = p.s.settings.currency;
  const e = expansionNext(p.s);
  const keep = `Keeps ${money(e.reserve, sym)} in cash`;
  let next: string;
  if (e.plan) {
    const city = CITIES[e.plan.cityId]?.name ?? e.plan.cityId;
    const what = e.plan.growId ? `grows the ${city} office` : `opens in ${city}`;
    next = `next ${what} for ${money(e.plan.total, sym)} ${inWeeks(e.weeksTo)}`;
  } else next = e.blocker ?? 'nothing to build';
  return (
    <div class="exec-dial">
      <StepSlider
        label="Cash reserve"
        options={EXEC_DELEGATION.expansionReserves.map((w) => ({ value: w, label: `${w} wk` }))}
        value={p.s.executives.expansionReserveWeeks}
        onChange={(v) => act(cmd.setExpansionReserve, v)}
        hint={`${keep} · ${next}`}
      />
    </div>
  );
}

const FOCUS: { value: DevFocus; label: string }[] = [
  ...CATEGORY_NAMES.map((c) => ({ value: c.value as DevFocus, label: c.label })),
  { value: 'any', label: 'Any' },
];

export function DevFocusDial(p: { s: GameState }) {
  const sym = p.s.settings.currency;
  const focus = p.s.executives.devFocus;
  const plan = nextDevelopment(p.s, focus);
  const focusName = CATEGORY_NAMES.find((c) => c.value === focus)?.label ?? '';
  const hint = !plan.active
    ? 'Needs a Products floor at HQ.'
    : !plan.template
      ? 'Every product is developed.'
      : `${plan.inFocus ? 'Next' : `Every ${focusName} product is developed; next`}: ${plan.template.name}, ${EXEC_DELEGATION.devWeeks} weeks at ${money(plan.budget, sym)}/wk` +
        (plan.running ? ' · once the current development ends' : '');
  return (
    <div class="exec-dial">
      <StepSlider
        label="Product focus"
        options={FOCUS}
        value={focus}
        onChange={(v) => act(cmd.setDevFocus, v)}
        hint={hint}
      />
    </div>
  );
}
