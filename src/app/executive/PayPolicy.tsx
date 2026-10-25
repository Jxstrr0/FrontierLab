// Pay policy on the COO's profile (SCREENS §10.1): the pay premium over market
// that the Pay reviews delegation sets every executive and branch manager to,
// and when the last review ran.
import { PAY_REVIEW } from '../../config/balance';
import * as cmd from '../../sim/commands';
import type { GameState } from '../../sim/state';
import { Stepper } from '../components';
import { gameDate, signedPct } from '../format/format';
import { act } from '../store';
import { dayOf } from './execSelectors';

export function PayPolicy(p: { s: GameState }) {
  const ex = p.s.executives;
  const [min, max] = PAY_REVIEW.premiumRange;
  const on = !!ex.seats.coo?.delegations.payReviews;
  const last =
    ex.lastPayReviewWeek >= 0
      ? `Last review ${gameDate(p.s.meta.startDate, dayOf(ex.lastPayReviewWeek))}.`
      : 'No review yet.';
  return (
    <div class="pay-policy">
      <Stepper
        label="Pay premium over market"
        value={ex.payPremium}
        min={min}
        max={max}
        step={PAY_REVIEW.premiumStep}
        format={(v) => (v === 0 ? 'Market' : signedPct(v, 0))}
        editText={(v) => String(Math.round(v * 100))}
        parse={(t) => Number(t.replace(/[^0-9.-]/g, '')) / 100}
        onChange={(v) => act(cmd.setPayPremium, v)}
        hint="Paid 10% or more over market, people are half as likely to be poached; under 90%, far more likely."
      />
      <p class="muted small exec-note">
        {on
          ? `Pay reviews set every executive and branch manager to market ${ex.payPremium === 0 ? '' : signedPct(ex.payPremium, 0) + ' '}once a year, and at once when you change the premium. ${last}`
          : 'Switch on Pay reviews to have the COO apply this every year.'}
      </p>
    </div>
  );
}
