// SCREENS §19 car dealer: the showroom, a carousel of cars (name, price,
// flavour line, Buy with personal cash, in this city).
import { useState } from 'preact/hooks';
import { CARS_CFG } from '../../config/balance';
import { CARS, type CarSpec } from '../../data/cars';
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import { carUpkeepWeekly } from '../../sim/personalValues';
import type { Site } from '../../sim/state';
import { Badge, Card, Carousel, Confirm, Panel, Row } from '../components';
import { money, pct } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { act, closePanel, toast, useGame } from '../store';
import { CarArt } from './CarArt';
import './personal.css';
import { ShowroomArt } from './ShowroomArt';

export function CarDealerPanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
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
      hero={<ShowroomArt />}
    >
      <Showroom site={site} />
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
