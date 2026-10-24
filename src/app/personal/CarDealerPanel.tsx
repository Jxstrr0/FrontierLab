// SCREENS §19 car dealer, tabs Showroom | Dealer financing. Showroom: a
// carousel of cars (name, price, flavour line, Buy with personal cash, in this
// city). Dealer financing: the bank pays the dealer a yearly fee to refer
// auto-loan customers to its branches in this city (fee, term, expected
// volume, Sign / End deal).
import { useState } from 'preact/hooks';
import { CARS_CFG, DEALER_FINANCING, WEEKS_PER_YEAR } from '../../config/balance';
import { CARS, type CarSpec } from '../../data/cars';
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import {
  activeDealerDeal,
  carUpkeepWeekly,
  dealerExpectedVolume,
  openBranchesIn,
} from '../../sim/personalValues';
import type { Site } from '../../sim/state';
import { Badge, Card, Carousel, Confirm, Panel, Row } from '../components';
import { money, pct } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { act, closePanel, toast, useGame } from '../store';
import { CarArt } from './CarArt';
import './personal.css';

type DealerTab = 'showroom' | 'financing';

export function CarDealerPanel(p: { siteId: string; tab?: DealerTab }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  // Local tab state: the route's `tab` only picks the first one shown.
  const [tab, setTab] = useState<DealerTab>(p.tab ?? 'showroom');
  if (site?.kind !== 'autoDealer') {
    return (
      <Panel title="Car dealer" onClose={closePanel}>
        <p class="muted">That dealer is no longer on the map.</p>
      </Panel>
    );
  }
  return (
    <Panel
      title={site.refId}
      subtitle={`${site.address} · ${CITIES[site.cityId]?.name ?? ''}`}
      icon={<LayerMedallion id="autoDealers" size={32} />}
      onClose={closePanel}
      advisor={{ text: 'Our finest machines. Something for the weekend?' }}
      tabs={[
        { id: 'showroom', label: 'Showroom' },
        { id: 'financing', label: 'Dealer financing' },
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === 'showroom' ? <Showroom site={site} /> : <Financing site={site} />}
    </Panel>
  );
}

function Showroom(p: { site: Site }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [buying, setBuying] = useState<CarSpec | null>(null);
  const here = p.site.cityId === s.world.currentCityId;
  const owned = (id: string) => s.personal.empire.cars.filter((c) => c.carId === id).length;
  return (
    <div class="stack">
      <p class="muted small">
        Bought with personal cash ({money(s.personal.cash, sym)}). Cars lose{' '}
        {pct(CARS_CFG.depreciation, 0)} of their value a year; classics gain{' '}
        {pct(CARS_CFG.classicGain, 0)}. Upkeep {pct(CARS_CFG.upkeepRate, 0)} a year.
      </p>
      <Carousel label="Cars in the showroom" class="pw-carousel">
        {Object.values(CARS).map((car) => {
          const n = owned(car.id);
          const blocker = !here
            ? 'Visit this city to buy.'
            : car.limited && n > 0
              ? 'One per owner.'
              : car.price > s.personal.cash
                ? 'Not enough personal cash.'
                : null;
          return (
            <Card class="pw-car">
              <CarArt classic={car.classic} />
              <div class="pw-card-head">
                <span class="pw-card-name">{car.name}</span>
                {car.classic && <Badge tone="good">Classic</Badge>}
                {car.limited && <Badge tone="warn">Limited</Badge>}
              </div>
              <p class="muted small pw-car-blurb">{car.blurb}</p>
              <Row label="Price" value={money(car.price, sym)} strong />
              <Row
                label="Upkeep"
                value={`${money(carUpkeepWeekly(car.price), sym)} / week`}
                tone="dim"
              />
              {n > 0 && <Row label="In your garage" value={String(n)} tone="dim" />}
              <button
                type="button"
                class="btn btn-primary btn-block"
                disabled={!!blocker}
                onClick={() => setBuying(car)}
              >
                Buy
              </button>
              {blocker && <p class="small muted pw-center">{blocker}</p>}
            </Card>
          );
        })}
      </Carousel>
      <p class="muted small">Sell cars from Personal wealth in the menu.</p>
      {buying && (
        <Confirm
          title={`Buy the ${buying.name}?`}
          body={<p>{money(buying.price, sym)} from your personal cash.</p>}
          confirmLabel={`Buy for ${money(buying.price, sym)}`}
          onCancel={() => setBuying(null)}
          onConfirm={() => {
            const r = act(cmd.buyCar, p.site.id, buying.id);
            setBuying(null);
            if (r.ok) toast(`The ${buying.name} is yours.`, 'good');
          }}
        />
      )}
    </div>
  );
}

function Financing(p: { site: Site }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [ending, setEnding] = useState(false);
  const city = CITIES[p.site.cityId]?.name ?? 'this city';
  const deal = activeDealerDeal(s, p.site.id);
  const branches = openBranchesIn(s, p.site.cityId);
  const volume = dealerExpectedVolume(s, p.site.cityId);
  const weeklyFee = DEALER_FINANCING.feePerYear / WEEKS_PER_YEAR;
  const blocker =
    p.site.cityId !== s.world.currentCityId
      ? 'You need to be in this city to sign.'
      : branches === 0
        ? `Open a branch in ${city} first: the dealer refers customers to it.`
        : null;
  return (
    <div class="stack">
      <p class="muted small">
        {p.site.refId} sends its car buyers to your branches in {city} for an auto loan. The bank
        pays the referral fee.
      </p>
      <Card>
        <Row label="Fee" value={`${money(DEALER_FINANCING.feePerYear, sym)} a year`} />
        <Row label="Paid weekly" value={money(weeklyFee, sym)} tone="dim" />
        <Row
          label="Term"
          value={`${Math.round(DEALER_FINANCING.termWeeks / WEEKS_PER_YEAR)} years`}
        />
        <Row
          label="Auto-loan demand"
          value={`+${pct(DEALER_FINANCING.demandBoost, 0)}`}
          tone="good"
        />
        <Row label={`Your branches in ${city}`} value={String(branches)} />
        <Row
          label="Expected volume"
          value={
            volume > 0
              ? `+${money(volume, sym)} new loans / week`
              : branches > 0
                ? 'Offer auto loans first'
                : '—'
          }
        />
      </Card>
      {deal ? (
        <Card>
          <Row label="Status" value="Signed" tone="good" />
          <Row label="Ends in" value={`${Math.max(1, deal.endWeek - s.clock.week)} weeks`} />
          <button type="button" class="btn btn-secondary btn-block" onClick={() => setEnding(true)}>
            End deal
          </button>
        </Card>
      ) : (
        <>
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!!blocker}
            onClick={() => {
              if (act(cmd.signDealerDeal, p.site.id).ok)
                toast(`Signed with ${p.site.refId}.`, 'good');
            }}
          >
            Sign
          </button>
          {blocker && <p class="small tone-bad pw-center">{blocker}</p>}
        </>
      )}
      {ending && (
        <Confirm
          title="End the deal?"
          body={<p>Referrals stop and so does the fee, from next week.</p>}
          confirmLabel="End deal"
          danger
          onCancel={() => setEnding(false)}
          onConfirm={() => {
            setEnding(false);
            act(cmd.endDealerDeal, p.site.id);
          }}
        />
      )}
    </div>
  );
}
