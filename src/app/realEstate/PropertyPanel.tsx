// Property building panel (SCREENS §16): For sale (estimate, market rent,
// occupancy, asking price, Company | Private, offer stepper, Offer purchase) or
// Owned (OwnedProperty.tsx: rent stepper, occupancy, weekly income and costs,
// ROI, For Sale toggle). Neither listed nor yours: a note on when listings
// refresh.
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { DISTRICT_SPECS } from '../../data/districts';
import * as cmd from '../../sim/commands';
import type { PropertyListing, Site } from '../../sim/state';
import { Card, Panel, Row, SectionTitle, Segmented, Stepper } from '../components';
import { count, money, moneyFull, pct } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { act, closePanel, toast, useGame } from '../store';
import { OwnedProperty } from './OwnedProperty';
import { offerBounds, propertyView } from './realEstateView';
import './realEstate.css';

export function PropertyPanel(p: { siteId: string }) {
  const s = useGame();
  const view = propertyView(s, p.siteId);
  if (!view) {
    return (
      <Panel title="Building" onClose={closePanel}>
        <p class="muted">That building is no longer on the map.</p>
      </Panel>
    );
  }
  const { site } = view;
  const district = DISTRICT_SPECS[site.district]?.name;
  const city = CITIES[site.cityId]?.name;
  return (
    <Panel
      title={`Building at ${site.address}`}
      subtitle={[district, city].filter(Boolean).join(' · ')}
      icon={<LayerMedallion id="realEstate" size={32} />}
      onClose={closePanel}
      advisor={{
        text:
          view.kind === 'owned'
            ? 'Price the rent right: too high and tenants leave, too low and you leave money on the table.'
            : 'Buildings pay rent every week and their value moves with the property market.',
      }}
    >
      {view.kind === 'owned' && <OwnedProperty property={view.property} site={site} />}
      {view.kind === 'listed' && (
        <ForSale site={site} listing={view.listing} marketRent={view.marketRent} />
      )}
      {view.kind === 'none' && (
        <div class="stack">
          <Card>
            <Row label="Address" value={site.address} />
            <Row label="Building space" value={`${count(site.property!.sqm)} m²`} />
          </Card>
          <p class="muted re-note">
            Not for sale right now; listings refresh every 4 weeks. Next refresh in{' '}
            {view.refreshIn === 1 ? '1 week' : `${view.refreshIn} weeks`}.
          </p>
        </div>
      )}
    </Panel>
  );
}

function ForSale(p: { site: Site; listing: PropertyListing; marketRent: number }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { listing, site } = p;
  const bounds = offerBounds(listing.asking);
  const [account, setAccount] = useState<cmd.PropertyAccount>('company');
  const [offer, setOffer] = useState(listing.asking);
  const cash = account === 'company' ? s.company.cash : s.personal.cash;
  const blocker =
    site.cityId !== s.world.currentCityId
      ? 'You need to be in this city to buy here.'
      : listing.rejectedOffer !== undefined
        ? `The seller turned down ${money(listing.rejectedOffer, sym)}. Listings refresh soon.`
        : offer > cash
          ? `Not enough ${account === 'company' ? 'corporate' : 'personal'} cash.`
          : null;
  const submit = () => {
    const r = act(cmd.offerProperty, site.id, offer, account);
    if (!r.ok) return;
    if (r.accepted) toast(`Offer accepted: ${site.address} is yours.`, 'good');
    else toast('The seller turned down your offer.', 'bad');
  };
  return (
    <div class="stack">
      <Card>
        <Row label="Address" value={site.address} />
        <Row label="Building space" value={`${count(site.property!.sqm)} m²`} />
        <Row label="Estimated value" value={money(listing.estimate, sym)} />
        <Row label="Market rent" value={`${money(p.marketRent, sym)} /m²/yr`} />
        <Row label="Occupancy" value={pct(listing.occupancy, 1)} />
        <Row label="Asking price" value={moneyFull(listing.asking, sym)} strong />
      </Card>
      <SectionTitle>Make an offer</SectionTitle>
      <Card>
        <div class="stack re-offer">
          <Segmented
            label="Buy as"
            options={[
              { value: 'company', label: 'Company' },
              { value: 'personal', label: 'Private' },
            ]}
            value={account}
            onChange={setAccount}
          />
          <p class="muted small re-center">
            {account === 'company' ? 'Corporate cash' : 'Personal cash'} {money(cash, sym)}
          </p>
          <Stepper
            label="Offer price"
            value={offer}
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            onChange={setOffer}
            format={(v) => moneyFull(v, sym)}
            hint={`${pct(offer / listing.asking, 0)} of asking`}
          />
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!!blocker}
            onClick={submit}
          >
            Offer purchase
          </button>
          {blocker && <p class="small tone-bad re-center">{blocker}</p>}
          <p class="muted small re-center">
            {account === 'company'
              ? 'Owned by the bank: rent and costs go through the company books.'
              : 'Owned by you: rent and costs go through your personal cash.'}
          </p>
        </div>
      </Card>
    </div>
  );
}
