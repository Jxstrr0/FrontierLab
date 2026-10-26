// An owned building (SCREENS §16): address, space, estimated value and price
// paid; Real estate income (annual rent per m² stepper with where market rent
// is heading, who manages the rent, occupancy, weekly rent revenue,
// maintenance, vacancy cost, net and ROI); Real estate sale (the For Sale
// toggle with its status).
import { EXEC_DELEGATION, REAL_ESTATE } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { rentPricingPower, rentsManaged } from '../../sim/execSeats';
import {
  marketRentNow,
  occupancyTarget,
  propertyRoi,
  propertyWeek,
  rentBounds,
} from '../../sim/propertyMath';
import type { Property, Site } from '../../sim/state';
import { Card, Row, SectionTitle, Stepper, Toggle } from '../components';
import { count, money, moneyFull, moneyStepper, pct } from '../format/format';
import { act, useGame } from '../store';

export function OwnedProperty(p: { property: Property; site: Site }) {
  const s = useGame();
  const sym = s.settings.currency;
  const prop = p.property;
  const wk = propertyWeek(prop);
  const roi = propertyRoi(prop);
  const bounds = rentBounds(prop.marketRent);
  const managed = rentsManaged(s, prop.owner);
  const power = rentPricingPower(s, prop.owner);
  const target = occupancyTarget(prop.rent, prop.marketRent, power);
  const heading = marketRentNow(s, p.site);
  const drifting = Math.abs(heading - prop.marketRent) / Math.max(1, prop.marketRent) > 0.005;
  const chief = s.executives.seats.creo;
  const weeksLeft = prop.saleWeek !== undefined ? Math.max(1, prop.saleWeek - s.clock.week) : 0;
  const [lo, hi] = REAL_ESTATE.saleWeeks;
  return (
    <div class="stack">
      <Card>
        <Row label="Address" value={p.site.address} />
        <Row label="Space" value={`${count(prop.sqm)} m²`} />
        <Row label="Estimated value" value={money(prop.value, sym)} strong />
        <Row label="Purchase price" value={money(prop.purchasePrice, sym)} />
        <Row label="Owner" value={prop.owner === 'company' ? 'Your lab' : 'You, privately'} />
      </Card>

      <SectionTitle>Real estate income</SectionTitle>
      <Card>
        <Stepper
          label="Annual rent per m²"
          value={prop.rent}
          min={bounds.min}
          max={bounds.max}
          step={REAL_ESTATE.rentStep}
          onChange={(v) => act(cmd.setPropertyRent, prop.id, v)}
          {...moneyStepper(sym, money)}
          hint={
            `Market rent ${money(prop.marketRent, sym)} /m²/yr` +
            (drifting ? `, heading to ${money(heading, sym)}` : '')
          }
        />
        {managed && chief && (
          <p class="muted small">
            {chief.name} (CREO) reviews this rent every {EXEC_DELEGATION.rentEveryWeeks} weeks;
            tenants here pay up to {pct(power, 0)} over market.
          </p>
        )}
        <Row label="Occupancy" value={pct(prop.occupancy, 1)} />
        {Math.abs(target - prop.occupancy) > 0.005 && (
          <Row label="Heading toward" value={pct(target, 1)} tone="dim" />
        )}
        <Row label="Weekly rent revenue" value={moneyFull(wk.revenue, sym)} tone="good" />
        <Row label="Weekly maintenance" value={moneyFull(-wk.maintenance, sym)} tone="bad" />
        <Row label="Weekly vacancy cost" value={moneyFull(-wk.vacancy, sym)} tone="bad" />
        <Row
          label="Weekly net rent income"
          value={moneyFull(wk.net, sym)}
          tone={wk.net >= 0 ? 'good' : 'bad'}
          strong
        />
        <Row label="ROI" value={pct(roi, 2)} tone={roi >= 0 ? 'good' : 'bad'} />
      </Card>

      <SectionTitle>Real estate sale</SectionTitle>
      <Card>
        <Toggle
          label="For Sale"
          checked={prop.forSale}
          onChange={(on) => act(cmd.setPropertyForSale, prop.id, on)}
          hint={
            prop.forSale
              ? `Sells in about ${weeksLeft === 1 ? '1 week' : `${weeksLeft} weeks`}, near its estimated value.`
              : `Sells within ${lo}–${hi} weeks, near its estimated value.`
          }
        />
      </Card>
    </div>
  );
}
