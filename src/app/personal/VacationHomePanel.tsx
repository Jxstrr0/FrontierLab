// SCREENS §19 vacation home: name, address and city, the blurb, "Personal
// purchase — not a rental property", the asking price (list price moved by the
// country's house prices) and an offer stepper paid from personal cash (you
// must be in the city). Once yours: value, gain, upkeep, Rebuild and Sell.
import { useState } from 'preact/hooks';
import { HOMES_CFG } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { HOMES, type HomeSpec } from '../../data/homes';
import * as cmd from '../../sim/commands';
import {
  homeAsking,
  homeLockWeeks,
  homeOfferBounds,
  homeSalePrice,
  homeUpkeepWeekly,
  ownedHome,
  rebuildCost,
} from '../../sim/personalValues';
import type { OwnedHome, Site } from '../../sim/state';
import { Card, Confirm, Panel, Row, SectionTitle, Stepper } from '../components';
import { money, moneyFull, pct } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { act, closePanel, toast, useGame } from '../store';
import './personal.css';
import { VacationHomeArt } from './VacationHomeArt';

export function VacationHomePanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  const spec = site?.kind === 'vacationHome' ? HOMES[site.refId] : undefined;
  if (!site || !spec) {
    return (
      <Panel title="Vacation home" onClose={closePanel}>
        <p class="muted">That home is no longer on the map.</p>
      </Panel>
    );
  }
  const home = ownedHome(s, spec.id);
  return (
    <Panel
      title={spec.name}
      subtitle={`${site.address} · ${CITIES[spec.cityId]?.name ?? ''}`}
      icon={<LayerMedallion id="vacationHomes" size={32} />}
      onClose={closePanel}
      advisor={{ text: 'A place to get away from it all — bought with your own money.' }}
      hero={<VacationHomeArt rebuilt={(home?.rebuilds ?? 0) > 0} />}
    >
      <div class="stack">
        <Card>
          <p class="pw-blurb">{spec.blurb}</p>
          <p class="muted small pw-personal">Personal purchase — not a rental property</p>
        </Card>
        {home ? <Owned home={home} /> : <ForSale site={site} spec={spec} />}
      </div>
    </Panel>
  );
}

function ForSale(p: { site: Site; spec: HomeSpec }) {
  const s = useGame();
  const sym = s.settings.currency;
  const asking = homeAsking(s, p.spec.id);
  const bounds = homeOfferBounds(asking);
  const [picked, setOffer] = useState(asking);
  // Asking moves with house prices each week; never offer above today's.
  const offer = Math.min(picked, bounds.max);
  const lock = homeLockWeeks(s, p.spec.id);
  const blocker =
    p.site.cityId !== s.world.currentCityId
      ? 'You need to be in this city to buy here.'
      : lock > 0
        ? `The seller turned down your last offer. Try again in ${lock} week${lock === 1 ? '' : 's'}.`
        : offer > s.personal.cash
          ? 'Not enough personal cash.'
          : null;
  const submit = () => {
    const r = act(cmd.offerHome, p.site.id, offer);
    if (!r.ok) return;
    if (r.accepted) toast(`Offer accepted: ${p.spec.name} is yours.`, 'good');
    else toast('The seller turned down your offer.', 'bad');
  };
  return (
    <>
      <Card>
        <Row label="List price" value={money(p.spec.price, sym)} tone="dim" />
        <Row label="Asking price" value={moneyFull(asking, sym)} strong />
        <Row label="Upkeep" value={`${money(homeUpkeepWeekly(asking), sym)} / week`} tone="dim" />
      </Card>
      <SectionTitle>Make an offer</SectionTitle>
      <Card>
        <div class="stack">
          <p class="muted small pw-center">Personal cash {money(s.personal.cash, sym)}</p>
          <Stepper
            label="Offer price"
            value={offer}
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            onChange={setOffer}
            format={(v) => moneyFull(v, sym)}
            hint={`${pct(offer / asking, 0)} of asking`}
          />
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!!blocker}
            onClick={submit}
          >
            Offer purchase
          </button>
          {blocker && <p class="small tone-bad pw-center">{blocker}</p>}
          <p class="muted small pw-center">
            The lower the offer, the likelier a refusal; a refused buyer waits{' '}
            {HOMES_CFG.refusalWeeks} weeks.
          </p>
        </div>
      </Card>
    </>
  );
}

function Owned(p: { home: OwnedHome }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { home } = p;
  const [selling, setSelling] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const gain = home.value - home.price;
  const cost = rebuildCost(home.value);
  const sale = homeSalePrice(home.value);
  const busy = home.rebuildDoneWeek !== undefined;
  const name = HOMES[home.homeId]?.name ?? 'this home';
  return (
    <>
      <Card>
        <Row label="Value" value={money(home.value, sym)} strong />
        <Row label="You paid" value={money(home.price, sym)} tone="dim" />
        <Row
          label="Gain / loss"
          value={`${gain >= 0 ? '+' : ''}${money(gain, sym)}`}
          tone={gain > 0 ? 'good' : gain < 0 ? 'bad' : 'flat'}
        />
        <Row
          label="Upkeep"
          value={`${money(homeUpkeepWeekly(home.value), sym)} / week`}
          tone="dim"
        />
        {(home.rebuilds ?? 0) > 0 && (
          <Row label="Rebuilds" value={String(home.rebuilds)} tone="dim" />
        )}
      </Card>
      <SectionTitle>Rebuild</SectionTitle>
      <Card>
        {busy ? (
          <Row
            label="Rebuilding"
            value={`Done in ${Math.max(1, home.rebuildDoneWeek! - s.clock.week)} wk`}
          />
        ) : (
          <>
            <Row label="Cost" value={money(cost, sym)} />
            <Row label="Takes" value={`${HOMES_CFG.rebuildWeeks} weeks`} />
            <Row
              label="Value after"
              value={`+${pct(HOMES_CFG.rebuildGain, 0)} (${money(home.value * HOMES_CFG.rebuildGain, sym)})`}
              tone="good"
            />
            <button
              type="button"
              class="btn btn-primary btn-block"
              disabled={cost > s.personal.cash}
              onClick={() => setRebuilding(true)}
            >
              Rebuild
            </button>
            {cost > s.personal.cash && (
              <p class="small tone-bad pw-center">Not enough personal cash.</p>
            )}
          </>
        )}
      </Card>
      <button type="button" class="btn btn-secondary btn-block" onClick={() => setSelling(true)}>
        Sell for {money(sale, sym)}
      </button>
      {rebuilding && (
        <Confirm
          title={`Rebuild ${name}?`}
          body={
            <p>
              {money(cost, sym)} from your personal cash now. In {HOMES_CFG.rebuildWeeks} weeks its
              value rises {pct(HOMES_CFG.rebuildGain, 0)}.
            </p>
          }
          confirmLabel={`Rebuild for ${money(cost, sym)}`}
          onCancel={() => setRebuilding(false)}
          onConfirm={() => {
            setRebuilding(false);
            const r = act(cmd.rebuildHome, home.homeId);
            if (r.ok) toast('The builders are in.', 'good');
          }}
        />
      )}
      {selling && (
        <Confirm
          title={`Sell ${name}?`}
          body={
            <p>
              A buyer pays its value less the agent’s {pct(HOMES_CFG.sellFee, 0)} fee:{' '}
              {money(sale, sym)} into your personal cash.
              {busy ? ' The rebuild under way is lost.' : ''}
            </p>
          }
          confirmLabel={`Sell for ${money(sale, sym)}`}
          danger
          onCancel={() => setSelling(false)}
          onConfirm={() => {
            setSelling(false);
            const r = act(cmd.sellHome, home.homeId);
            if (r.ok) toast(`Sold for ${money(r.price, sym)}`, 'good');
          }}
        />
      )}
    </>
  );
}
