// GPU market (stage C4b, SCREENS §10 Compute, SIMULATION §13.0): offer cards
// with provider, reservation type, fixed price per GPU-week against today's
// spot, term and rosette, a GPU slider up to the offer size, Rent, and when
// the next set of offers arrives.
import { useState } from 'preact/hooks';
import { GPU_MARKET } from '../../../config/balance';
import { GPU_LOT_TYPES } from '../../../data/gpuLots';
import * as cmd from '../../../sim/commands';
import { spotPrice } from '../../../sim/compute';
import type { GpuOffer } from '../../../sim/state';
import { Card } from '../../components';
import { dayOfWeek } from '../../branch/selectors';
import { count, money, pct, shortDate } from '../../format/format';
import { act, toast, useGame } from '../../store';
import { AmountSlider } from '../treasury/AmountSlider';
import { FundFacts } from '../treasury/FundFacts';
import { termText } from '../treasury/treasuryView';
import { GpuRosette } from './GpuRosette';

const gpuText = (n: number) => `${count(n)} GPUs`;

export function GpuMarket() {
  const s = useGame();
  const c = s.compute;
  const offers = c.offers.filter((o) => o.expiresWeek >= s.clock.week);
  const next = c.offersRefreshWeek;
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
          {refresh} A fuller Compute team brings more offers and better prices.
        </p>
      )}
    </div>
  );
}

function OfferCard({ offer }: { offer: GpuOffer }) {
  const s = useGame();
  const sym = s.settings.currency;
  const spec = GPU_LOT_TYPES[offer.type];
  const [gpus, setGpus] = useState(offer.gpus);
  const value = Math.min(gpus, offer.gpus);
  const ok = value >= GPU_MARKET.sizeStep;
  const vsSpot = offer.price / spotPrice(s) - 1;
  const rent = () => {
    const r = act(cmd.rentGpus, offer.id, value);
    if (r.ok) toast(`Rented ${gpuText(value)} from ${offer.provider}.`, 'good');
  };
  return (
    <Card class="tr-fund-card">
      <div class="tr-fund-head">
        <div>
          <div class="tr-fund-name">{offer.provider}</div>
          <div class="muted small">{spec?.name ?? offer.type}</div>
        </div>
        <span class="tr-fund-rate">{money(offer.price, sym)}</span>
      </div>
      <div class="tr-fund-body">
        <FundFacts
          items={[
            ['Up to', gpuText(offer.gpus)],
            ['Term', termText(offer.termWeeks)],
            ['Vs spot', `${vsSpot <= 0 ? '−' : '+'}${pct(Math.abs(vsSpot), 0)}`],
          ]}
        />
        <GpuRosette radar={offer.radar} />
      </div>
      <AmountSlider
        label="Rent"
        value={value}
        max={offer.gpus}
        onChange={setGpus}
        sym={sym}
        floor={GPU_MARKET.sizeStep}
        format={gpuText}
      />
      <button type="button" class="btn btn-primary btn-block" disabled={!ok} onClick={rent}>
        Rent {ok ? gpuText(value) : ''}
      </button>
      <p class="muted small tr-under">
        {money(value * offer.price, sym)} a week for {termText(offer.termWeeks)}, whether you use
        them or not. Price per GPU-week, fixed for the term.
      </p>
    </Card>
  );
}
