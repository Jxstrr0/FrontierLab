// Public tenders on the Deal Desk (SCREENS §5.3, SIMULATION §11.7, owner's
// review A4). An open tender shows the public body, its yearly budget and term,
// the weeks until bids close, a discount stepper with the win chance (the AI
// model's Safety axis weighs most), and Seal bid / Withdraw. A tender you won
// shows as a public contract with its yearly value and end date.
import { useState } from 'preact/hooks';
import { DAYS_PER_WEEK, WEEKS_PER_YEAR } from '../../../config/balance';
import { PUBLIC_BODIES } from '../../../data/publicBodies';
import * as cmd from '../../../sim/commands';
import type { Tender } from '../../../sim/state';
import { tenderChance, tenderValueAt } from '../../../sim/tenders';
import { Card, Icon, Row } from '../../components';
import { money, monthYear } from '../../format/format';
import { act, toast, useGame } from '../../store';
import { play } from '../../sound/sound';
import { DiscountStepper, discountText } from './dealParts';

function TenderHead(p: { t: Tender; chip: preact.ComponentChildren }) {
  const body = PUBLIC_BODIES.find((b) => b.id === p.t.bodyId);
  return (
    <header class="deal-head">
      <span class="deal-icon">
        <Icon name="dome" size={22} />
      </span>
      <div class="deal-title">
        <h4 class="deal-name">{p.t.name}</h4>
        <div class="muted small">Public tender{body ? ` · ${body.scope}` : ''}</div>
      </div>
      {p.chip}
    </header>
  );
}

export function TenderCard(p: { t: Tender; startDiscount: number }) {
  // Subscribes here: a sealed bid changes the tender in place, so the props stay the same.
  const s = useGame();
  const { t } = p;
  const sym = s.settings.currency;
  const [discount, setDiscount] = useState(t.bid ?? p.startDiscount);
  const years = Math.round(t.termWeeks / WEEKS_PER_YEAR);
  const left = Math.max(1, t.closeWeek - s.clock.week);
  const chance = tenderChance(s, discount);

  const seal = () => {
    const r = act(cmd.bidOnTender, t.id, discount);
    if (!r.ok) return;
    play('stamp');
    toast(`Bid sealed: ${discountText(discount)} off. The award is made in ${left} weeks.`, 'info');
  };

  return (
    <Card class="deal-card">
      <TenderHead
        t={t}
        chip={
          <span class={`chip${left <= 1 ? ' chip-warn' : ''}`}>
            {left <= 1 ? 'Closes this week' : `Closes in ${left} weeks`}
          </span>
        }
      />
      <div class="deal-ask">
        <span class="deal-amount">{money(t.budget, sym)}</span>
        <span class="muted">a year for {years} years</span>
      </div>

      <DiscountStepper
        label="Your discount"
        value={discount}
        onChange={setDiscount}
        hint={`Chance you win: ${Math.round(chance * 100)}%`}
      />
      <div class="deal-value">
        Contract <strong>{money(tenderValueAt(t, discount), sym)}</strong> a year
      </div>
      {t.bid !== undefined && (
        <div class="deal-sub">
          Sealed bid: {discountText(t.bid)} off, {money(tenderValueAt(t, t.bid), sym)} a year.
        </div>
      )}

      <div class="btn-row deal-actions">
        {t.bid !== undefined && (
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => act(cmd.withdrawTenderBid, t.id)}
          >
            Withdraw
          </button>
        )}
        <button type="button" class="btn btn-primary" onClick={seal}>
          {t.bid === undefined ? 'Seal bid' : 'Update bid'}
        </button>
      </div>
    </Card>
  );
}

/** A tender you won, held as a public contract until its term ends. */
export function PublicContractCard(p: { t: Tender }) {
  const s = useGame();
  const { t } = p;
  const ends = monthYear(s.meta.startDate, (t.endWeek ?? s.clock.week) * DAYS_PER_WEEK);
  return (
    <Card class="deal-card">
      <TenderHead t={t} chip={<span class="chip chip-own">Yours</span>} />
      <div class="deal-rows">
        <Row label="Contract" value={`${money(t.value ?? 0, s.settings.currency)} a year`} />
        <Row label="Ends" value={ends} />
      </div>
    </Card>
  );
}

/** The note shown when public bodies won't deal with the lab. */
export const TENDER_TIER_NOTE =
  'Public bodies only deal with labs the AI regulator rates Adequate or better. Raise your safety rating to see their tenders again.';
