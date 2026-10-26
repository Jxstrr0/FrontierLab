// Office for lease (SCREENS §9): the building's floors, area and desks, one
// Add toggle per department (no more than there are floors), the costs
// (weekly rent, security deposit, fit-out total) and "Rent office" with your
// available cash under it. An office you already lease opens as your HQ.
import { useState } from 'preact/hooks';
import { DEPARTMENTS } from '../../data/departments';
import { DISTRICT_SPECS } from '../../data/districts';
import * as cmd from '../../sim/commands';
import type { DeptId, OfficeListing } from '../../sim/state';
import { Card, Panel, Row, SectionTitle, Toggle } from '../components';
import { count, money, moneyFull } from '../format/format';
import { HqPanel } from '../hq/HqPanel';
import { addableDepts, floorDesks } from '../hq/officeSelectors';
import { LayerMedallion } from '../map/LayerIcon';
import { act, closePanel, openPanel, useGame } from '../store';
import { OfficeArt } from './OfficeArt';
import './office.css';

/** The teams the tutorial suggests moving in first (SCREENS §27.2). */
const STARTER_DEPTS: readonly DeptId[] = ['finance', 'hr'];

export function OfficePanel(p: { listingId: string }) {
  const s = useGame();
  const listing = s.world.officeListings[p.listingId];
  if (listing?.officeId) return <HqPanel officeId={listing.officeId} />;
  if (!listing) {
    return (
      <Panel title="Office for lease" onClose={closePanel}>
        <p class="muted">That office is no longer available.</p>
      </Panel>
    );
  }
  return <Listing listing={listing} />;
}

function Listing({ listing }: { listing: OfficeListing }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [picked, setPicked] = useState<DeptId[]>([]);
  const quote = cmd.officeQuote(s, listing.id, picked.length);
  const full = picked.length >= listing.floors;
  const district = DISTRICT_SPECS[listing.district]?.name;
  const blocker =
    listing.cityId !== s.world.currentCityId
      ? "You can only lease offices in the city you're in."
      : picked.length === 0
        ? 'Choose at least one department to move in.'
        : s.company.cash < quote.total
          ? `Not enough cash: you need ${money(quote.total, sym)}.`
          : null;
  const toggle = (d: DeptId, on: boolean) =>
    setPicked(on ? [...picked, d] : picked.filter((x) => x !== d));
  const rent = () => {
    const r = act(cmd.leaseOffice, listing.id, picked);
    if (r.ok) openPanel({ type: 'hq', officeId: r.officeId, dept: picked[0] });
  };

  return (
    <Panel
      title="Office for lease"
      subtitle={[listing.address, district].filter(Boolean).join(' · ')}
      icon={<LayerMedallion id="offices" size={32} />}
      onClose={closePanel}
      advisor={{
        text: [
          'Plenty of desks here. We can bring more teams in-house.',
          `${listing.desksPerFloor} desks a floor across ${listing.floors} floors: room for ${count(listing.desksPerFloor * listing.floors)} people.`,
          `Rent works out to ${money(listing.weeklyRent / listing.floors, sym)} a week per floor.`,
        ],
      }}
      hero={<OfficeArt floors={listing.floors} desksPerFloor={listing.desksPerFloor} vacant />}
      footer={
        <div class="stack office-footer">
          {blocker && <p class="office-blocker small">{blocker}</p>}
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!!blocker}
            data-tutorial={blocker ? undefined : 'office-rent'}
            onClick={rent}
          >
            Rent office · {money(quote.total, sym)}
          </button>
          <p class="muted small office-cash">Available cash {money(s.company.cash, sym)}</p>
        </div>
      }
    >
      <div class="stack">
        <Card>
          <Row label="Floors" value={count(listing.floors)} />
          <Row label="Area" value={`${count(listing.area)} m²`} />
          <Row label="Desks per floor" value={count(listing.desksPerFloor)} />
        </Card>

        <SectionTitle>Departments</SectionTitle>
        <p class="muted small office-intro">
          Each department takes one floor. Pick up to {listing.floors}; you can add more floors from
          HQ later.
        </p>
        <Card class="office-depts">
          {addableDepts().map((d) => {
            const spec = DEPARTMENTS[d];
            const on = picked.includes(d);
            return (
              <div
                class="office-dept"
                data-tutorial={!on && STARTER_DEPTS.includes(d) ? 'office-dept' : undefined}
              >
                <Toggle
                  label={`Add ${spec.name}`}
                  hint={`${spec.description} ${floorDesks(listing, d)} desks.`}
                  checked={on}
                  disabled={!on && full}
                  onChange={(v) => toggle(d, v)}
                />
              </div>
            );
          })}
          {full && (
            <p class="muted small office-full">
              Every floor is spoken for. Untick one to swap departments.
            </p>
          )}
        </Card>

        <SectionTitle>Costs</SectionTitle>
        <Card>
          <Row label="Weekly rent" value={`${moneyFull(listing.weeklyRent, sym)} /week`} />
          <Row label="Security deposit" value={`${moneyFull(quote.deposit, sym)} upfront`} />
          <Row
            label={`Fit-out (${picked.length} ${picked.length === 1 ? 'floor' : 'floors'})`}
            value={moneyFull(quote.fitout, sym)}
          />
          <Row label="Due today" value={moneyFull(quote.total, sym)} strong />
          <p class="muted small office-note">
            Due today includes the first week's rent. The deposit comes back if you give the office
            up.
          </p>
        </Card>
      </div>
    </Panel>
  );
}
