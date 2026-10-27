// Funding market (SCREENS §10 Treasury, SIMULATION §13.6): offer cards with
// counterparty, type, fixed rate, term and rosette, an amount slider up to
// the offer size, Borrow,
// and when the next set of offers arrives.
import { useState } from 'preact/hooks';
import { WEEKS_PER_YEAR } from '../../../config/balance';
import { FUNDING_TYPES } from '../../../data/fundingTypes';
import * as cmd from '../../../sim/commands';
import { maxBorrow } from '../../../sim/fundingMarket';
import type { FundingOffer } from '../../../sim/state';
import { Card } from '../../components';
import { dayOfWeek } from '../../branch/selectors';
import { money, pct, shortDate } from '../../format/format';
import { act, toast, useGame } from '../../store';
import { AmountSlider } from './AmountSlider';
import { FundFacts } from './FundFacts';
import { FundingRosette } from './FundingRosette';
import { termText } from './treasuryView';

export function FundingMarket() {
  const s = useGame();
  const t = s.treasury;
  const offers = t.offers.filter((o) => o.expiresWeek >= s.clock.week);
  const next = t.offersRefreshWeek;
  const refresh =
    next >= 0
      ? next <= s.clock.week
        ? 'New offers arrive at the next weekly close.'
        : `New offers on ${shortDate(s.meta.startDate, dayOfWeek(next))} (${termText(next - s.clock.week)}).`
      : 'Offers arrive at the next weekly close.';
  return (
    <div class="stack">
      {offers.length === 0 ? (
        <Card>
          <p class="muted small hq-note">No offers on the table right now. {refresh}</p>
        </Card>
      ) : (
        offers.map((o) => <OfferCard key={o.id} offer={o} />)
      )}
      {offers.length > 0 && (
        <p class="muted small">
          {refresh} A fuller Treasury team brings more offers and better rates.
        </p>
      )}
    </div>
  );
}

function OfferCard({ offer }: { offer: FundingOffer }) {
  const s = useGame();
  const sym = s.settings.currency;
  const spec = FUNDING_TYPES[offer.type];
  const max = maxBorrow(s, offer);
  const [amount, setAmount] = useState(max);
  const value = Math.min(amount, max);
  const borrow = () => {
    const r = act(cmd.borrowOffer, offer.id, value);
    if (r.ok) toast(`Borrowed ${money(value, sym)} from ${offer.counterparty}.`, 'good');
  };
  return (
    <Card class="tr-fund-card">
      <div class="tr-fund-head">
        <div>
          <div class="tr-fund-name">{offer.counterparty}</div>
          <div class="muted small">{spec?.name ?? offer.type}</div>
        </div>
        <span class="tr-fund-rate">{pct(offer.rate)}</span>
      </div>
      <div class="tr-fund-body">
        <FundFacts
          items={[
            ['Up to', money(offer.amount, sym)],
            ['Term', termText(offer.termWeeks)],
            ['Repay early', spec?.earlyRepay ? 'Allowed' : 'No'],
          ]}
        />
        <FundingRosette radar={offer.radar} />
      </div>
      <AmountSlider label="Borrow" value={value} max={max} onChange={setAmount} sym={sym} />
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={value <= 0}
        onClick={borrow}
      >
        Borrow {value > 0 ? money(value, sym) : ''}
      </button>
      <p class="muted small tr-under">
        About {money((value * offer.rate) / WEEKS_PER_YEAR, sym)} interest a week, fixed for the
        term.
      </p>
    </Card>
  );
}
