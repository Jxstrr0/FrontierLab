// Available branch location (SCREENS §3): what a lot offers (rent, traffic, who lives
// and works nearby, the competition, an area map) and a Build branch button.
import { sizeName } from '../../sim/branch/officeSize';
import { CITIES } from '../../data/cities';
import { DEFAULT_DC_BUILD } from '../../data/dataCenters';
import { SEGMENTS } from '../../data/types';
import * as cmd from '../../sim/commands';
import { cheapestBuild } from '../build/builds';
import {
  cityCoverage,
  cityLots,
  districtName,
  incomeLabel,
  nearbyCompetition,
  segmentName,
  storefrontAdvice,
} from '../city/lotInfo';
import { Card, CoinRating, Panel, Row, SectionTitle, StatBar } from '../components';
import { count, moneyFull, pct } from '../format/format';
import { closePanel, openPanel, useGame } from '../store';
import { AreaMiniMap } from './AreaMiniMap';
import { StorefrontArt } from './StorefrontArt';
import './storefront.css';

export function StorefrontPanel(p: { lotId: string }) {
  const s = useGame();
  const lot = s.world.lots[p.lotId];
  if (!lot) {
    return (
      <Panel title="Available location" onClose={closePanel}>
        <p class="muted">That storefront no longer exists.</p>
      </Panel>
    );
  }
  const sym = s.settings.currency;
  const near = nearbyCompetition(s, lot);
  const cityName = CITIES[lot.cityId]?.name ?? 'this city';
  const cover = cityCoverage(s, lot.cityId);
  const advice =
    storefrontAdvice(lot, cityLots(s)) +
    (cover.full
      ? ` You already have your sales office in ${cityName}: grow it from its Finance tab, or open one in another city.`
      : '');
  // The cheapest build tells us whether any build is possible here right now.
  const blocker = cmd.buildBlocker(s, p.lotId, cheapestBuild());
  // Cash is checked on the build screen, where the parts are picked (C2c).
  const dcBlocker = cmd.dataCenterBlocker(s, { lotId: p.lotId }, DEFAULT_DC_BUILD);

  return (
    <Panel
      title="Available location"
      subtitle={`${lot.address} · ${districtName(lot)}`}
      onClose={closePanel}
      advisor={{ text: advice }}
      hero={<StorefrontArt />}
      footer={
        <div class="stack">
          {blocker && <p class="storefront-blocker small">{blocker}</p>}
          {dcBlocker && dcBlocker !== blocker && (
            <p class="storefront-blocker small">Data center: {dcBlocker}</p>
          )}
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!!blocker}
            onClick={() => openPanel({ type: 'build', lotId: lot.id })}
            data-tutorial="build-branch"
          >
            Build sales office
          </button>
          <button
            type="button"
            class="btn btn-block"
            disabled={!!dcBlocker}
            onClick={() => openPanel({ type: 'buildDataCenter', lotId: lot.id })}
          >
            Build data center
          </button>
        </div>
      }
    >
      <div class="stack">
        <Card>
          <Row label="Weekly rent" value={`${moneyFull(lot.weeklyRent, sym)} /week`} />
          <Row label="Security deposit" value={`${moneyFull(lot.deposit, sym)} upfront`} />
          <Row label="Foot traffic" value={`${count(lot.footTraffic)} /week`} />
          <Row label="District" value={districtName(lot)} />
        </Card>

        <SectionTitle>Demographics</SectionTitle>
        <div class="demo-bars">
          {SEGMENTS.map((id) => (
            <StatBar
              label={segmentName(id)}
              value={lot.mix[id] * 100}
              display={pct(lot.mix[id], 0)}
            />
          ))}
        </div>
        <Card>
          <Row
            label="Income level"
            value={
              <>
                {incomeLabel(lot.incomeIndex)}{' '}
                <span class="muted small">index {lot.incomeIndex.toFixed(2)}</span>
              </>
            }
          />
        </Card>

        <SectionTitle>Your lab in {cityName}</SectionTitle>
        <Card>
          <Row
            label="Your sales office here"
            value={cover.office ? sizeName(cover.office.size ?? 0) : 'None yet'}
          />
          <StatBar label="Market reached" value={cover.reach * 100} display={pct(cover.reach, 0)} />
        </Card>

        <SectionTitle>Nearby competition</SectionTitle>
        <Card>
          <Row
            label={`Rival sales offices within ${near.radius} tiles`}
            value={near.rivalCount === 0 ? 'None' : count(near.rivalCount)}
          />
          {near.rivalCount > 0 && (
            <Row label="Their average rating" value={<CoinRating value={near.rivalAverage} />} />
          )}
          <Row
            label="Your other sales offices nearby"
            value={near.ownCount === 0 ? 'None' : count(near.ownCount)}
          />
          {near.ownCount > 0 && (
            <Row label="Their average rating" value={<CoinRating value={near.ownAverage} />} />
          )}
        </Card>

        <SectionTitle>Area map</SectionTitle>
        <AreaMiniMap lot={lot} />
      </div>
    </Panel>
  );
}
