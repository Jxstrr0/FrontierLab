// One new request for proposal on the Deal Desk (SCREENS §5.3, SIMULATION §11):
// the business, its AI budget, a small rosette, a discount stepper with the
// yearly contract value and win chance it gives, the weeks left, and Bid /
// Decline. A bid is won or lost at once.
import { useState } from 'preact/hooks';
import { contractValueAt, rfpChance } from '../../../sim/branch/dealDesk';
import * as cmd from '../../../sim/commands';
import type { Business, GameState, Rfp } from '../../../sim/state';
import { PentagonRosette } from '../../business/PentagonRosette';
import { Card } from '../../components';
import { money } from '../../format/format';
import { act, toast } from '../../store';
import { play } from '../../sound/sound';
import { DealHead, DiscountStepper } from './dealParts';

/** Weeks until the weekly tick drops the request: 1 = this week. */
const weeksLeft = (rfp: Rfp, week: number) => Math.max(1, rfp.dueWeek - week);

export function RfpCard(p: { s: GameState; rfp: Rfp; b: Business; startDiscount: number }) {
  const { s, rfp, b } = p;
  const sym = s.settings.currency;
  const [discount, setDiscount] = useState(p.startDiscount);
  const chance = rfpChance(s, rfp, discount);
  const value = contractValueAt(b, discount);
  const left = weeksLeft(rfp, s.clock.week);

  const bid = () => {
    const r = act(cmd.bidOnRfp, rfp.id, discount);
    if (!r.ok) return;
    play('stamp');
    if (r.won) toast(`${b.name} signed: ${money(value, sym)} a year.`, 'good');
    else toast(`${b.name} went with another lab.`, 'info');
  };

  return (
    <Card class="deal-card">
      <DealHead
        b={b}
        chip={
          <span class={`chip${left <= 1 ? ' chip-warn' : ''}`}>
            {left <= 1 ? 'Expires this week' : `${left} weeks left`}
          </span>
        }
      />
      <div class="deal-ask">
        <span class="deal-amount">{money(b.budget, sym)}</span>
        <span class="muted">AI budget a year</span>
      </div>

      <PentagonRosette scores={b.pentagon} size="compact" label={`${b.name} profile`} />

      <DiscountStepper
        label="Your discount"
        value={discount}
        onChange={setDiscount}
        hint={`Chance you win: ${Math.round(chance * 100)}%`}
      />
      <div class="deal-value">
        Contract <strong>{money(value, sym)}</strong> a year
      </div>

      <div class="btn-row deal-actions">
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => act(cmd.declineApplication, rfp.id)}
        >
          Decline
        </button>
        <button type="button" class="btn btn-primary" onClick={bid} data-tutorial="loan-approve">
          Bid
        </button>
      </div>
    </Card>
  );
}
