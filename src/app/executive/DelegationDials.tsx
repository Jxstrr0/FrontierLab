// Delegation dials (SCREENS §10.1): the stepped sliders under some of the
// executives' switches, each with a tagline saying what the chosen stop would
// mean for the company right now (estimates from src/sim/execPolicy.ts):
//   COO · HR benefits   morale target 70 / 80 / 90
//   COO · Pay reviews   quarterly or annual, with the pay premium (PayPolicy.tsx)
//   CMO · Brand campaigns   awareness target 40–70%
//   CFO · Rents (the lab's, yours)   occupancy 80–100% (OccupancyDial.tsx)
//   CTO · Compute   share of GPU demand covered outside spot 60 / 75 / 90%
import { CTO_COMPUTE, EXEC_DELEGATION } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { computeCoverPlan } from '../../sim/execDelegationsCompute';
import { brandEstimate, cadenceEstimate, moraleEstimate } from '../../sim/execPolicy';
import type { ExecSeat, PayReviewCadence } from '../../sim/marketsTypes';
import type { GameState } from '../../sim/state';
import { StepSlider } from '../components';
import { money, pct, signedPct } from '../format/format';
import { act } from '../store';
import { OccupancyDial } from './OccupancyDial';
import { PayPolicy } from './PayPolicy';

/** "+$1.2K/wk", "−$400/wk" or "no change" for a weekly cost difference. */
function weeklyDelta(delta: number, sym: string): string {
  if (Math.abs(delta) < 1) return 'no change';
  return `${delta > 0 ? '+' : '−'}${money(Math.abs(delta), sym)}/wk`;
}

export function MoraleDial(p: { s: GameState }) {
  const sym = p.s.settings.currency;
  const e = moraleEstimate(p.s, p.s.executives.moraleTarget);
  const budget = Math.round(EXEC_DELEGATION.benefitsBudgetShare * 100);
  const hint = !e.active
    ? 'Needs an HR floor at HQ.'
    : `Benefits ${weeklyDelta(e.deltaCost, sym)} (${pct(e.payrollShare, 1)} of payroll, budget ${budget}%) · morale ${Math.round(e.now)} → about ${Math.round(e.morale)}` +
      (e.capped ? `, as far as the budget reaches` : '');
  return (
    <div class="exec-dial">
      <StepSlider
        label="Morale target"
        options={EXEC_DELEGATION.moraleTargets.map((t) => ({ value: t, label: String(t) }))}
        value={p.s.executives.moraleTarget}
        onChange={(v) => act(cmd.setMoraleTarget, v)}
        hint={hint}
      />
    </div>
  );
}

const CADENCES: { value: PayReviewCadence; label: string }[] = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

export function CadenceDial(p: { s: GameState }) {
  const sym = p.s.settings.currency;
  const e = cadenceEstimate(p.s, p.s.executives.payReviewCadence);
  const next =
    e.next.people === 0
      ? 'nobody to review yet'
      : `next review ${e.next.delta >= 0 ? '+' : '−'}${money(Math.abs(e.next.delta), sym)}/yr for ${e.next.people} ${e.next.people === 1 ? 'person' : 'people'}`;
  const hint = `${e.reviewsPerYear} ${e.reviewsPerYear === 1 ? 'review' : 'reviews'} a year · pay lags the market by up to ${pct(e.maxDrift, 1)} between reviews · ${next}`;
  return (
    <div class="exec-dial">
      <StepSlider
        label="Review cadence"
        options={CADENCES}
        value={p.s.executives.payReviewCadence}
        onChange={(v) => act(cmd.setPayReviewCadence, v)}
        hint={hint}
      />
      <PayPolicy s={p.s} />
    </div>
  );
}

export function BrandDial(p: { s: GameState }) {
  const sym = p.s.settings.currency;
  const e = brandEstimate(p.s, p.s.executives.brandTarget);
  const budget = Math.round(EXEC_DELEGATION.brandBudgetShare * 100);
  const hint = !e.active
    ? 'Needs a Marketing floor at HQ.'
    : e.cities === 0
      ? 'No open sales offices yet.'
      : `Campaigns ${weeklyDelta(e.deltaCost, sym)} (${pct(e.revenueShare, 1)} of revenue, budget ${budget}%) · pushes ${e.pushed} of ${e.cities} ${e.cities === 1 ? 'city' : 'cities'} · ${Math.abs(e.prospects) < 0.005 ? 'no change in' : signedPct(e.prospects, 0)} new customers` +
        (e.capped ? ' · held back by the budget' : '');
  return (
    <div class="exec-dial">
      <StepSlider
        label="Awareness target"
        options={EXEC_DELEGATION.brandTargets.map((t) => ({
          value: t,
          label: `${Math.round(t * 100)}%`,
        }))}
        value={p.s.executives.brandTarget}
        onChange={(v) => act(cmd.setBrandTarget, v)}
        hint={hint}
      />
    </div>
  );
}

export function ComputeCoverDial(p: { s: GameState }) {
  const sym = p.s.settings.currency;
  const plan = computeCoverPlan(p.s, p.s.executives.computeCover);
  const gpus = plan.takes.reduce((n, t) => n + t.gpus, 0);
  const bill = plan.takes.reduce((n, t) => n + t.gpus * t.price, 0);
  const now =
    plan.demand > 0 ? `Covered now ${pct(Math.min(1, plan.capacity / plan.demand), 0)}` : '';
  const hint = !plan.active
    ? 'Needs a Compute floor at HQ.'
    : plan.demand <= 0
      ? 'No GPU demand yet.'
      : gpus > 0
        ? `${now} · would reserve ${gpus.toLocaleString()} GPUs now, ${money(bill, sym)}/wk`
        : plan.capacity >= plan.target
          ? `${now} · nothing to reserve`
          : `${now} · no offer under spot fits; checks again next week`;
  return (
    <div class="exec-dial">
      <StepSlider
        label="Cover target"
        options={CTO_COMPUTE.coverTargets.map((t) => ({
          value: t,
          label: `${Math.round(t * 100)}%`,
        }))}
        value={p.s.executives.computeCover}
        onChange={(v) => act(cmd.setComputeCover, v)}
        hint={hint}
      />
    </div>
  );
}

/** The dial that belongs under a seat's delegation switch, if it has one. */
export function DelegationDial(p: { s: GameState; seat: ExecSeat; id: string }) {
  if (p.seat === 'coo' && p.id === 'hrBenefits') return <MoraleDial s={p.s} />;
  if (p.seat === 'coo' && p.id === 'payReviews') return <CadenceDial s={p.s} />;
  if (p.seat === 'cmo' && p.id === 'brand') return <BrandDial s={p.s} />;
  if (p.seat === 'cto' && p.id === 'compute') return <ComputeCoverDial s={p.s} />;
  if (p.seat === 'cfo' && p.id === 'bankRents') return <OccupancyDial s={p.s} owner="company" />;
  if (p.seat === 'cfo' && p.id === 'privateRents')
    return <OccupancyDial s={p.s} owner="personal" />;
  return null;
}
