// Research talent readout on the CPO's profile (SCREENS §10.1): with the
// switch on, the researcher the CPO would hire next and when, or what holds
// the hire back, and where researcher pay sits against the budget
// (SIMULATION §17.2, §16.13).
import { EXEC_DELEGATION } from '../../config/balance';
import { talentPlan } from '../../sim/execDelegationsResearch';
import type { GameState } from '../../sim/state';
import { money, pct } from '../format/format';

export function TalentNote(p: { s: GameState }) {
  const { s } = p;
  if (!s.executives.seats.cpo?.delegations.talent) return null;
  const sym = s.settings.currency;
  const plan = talentPlan(s);
  const share = plan.budget > 0 ? pct(plan.payroll / plan.budget, 0) : '—';
  const when =
    plan.weeksTo === 0
      ? 'this week'
      : `in ${plan.weeksTo} ${plan.weeksTo === 1 ? 'week' : 'weeks'}`;
  const line = plan.pick
    ? `Next hire: ${plan.pick.name} (${plan.pick.stars}★) at ${money(plan.salary, sym)}/yr, ${when}.`
    : `Research talent: ${plan.blocker}`;
  return (
    <>
      <p class="muted small exec-note">{line}</p>
      <p class="muted small exec-note">
        Researcher pay {money(plan.payroll, sym)}/yr, {share} of the{' '}
        {Math.round(EXEC_DELEGATION.talentBudgetShare * 100)}%-of-revenue budget. Hires from the
        open market only; poaching from rivals stays with you.
      </p>
    </>
  );
}
