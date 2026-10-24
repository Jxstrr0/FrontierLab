// Available branch location (SCREENS §3): what a lot offers (rent, traffic, who lives
// and works nearby, the competition) and a Build branch button.
import { SEGMENTS } from '../../data/types';
import * as cmd from '../../sim/commands';
import { cheapestBuild } from '../build/builds';
import {
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
  // The cheapest build tells us whether any build is possible here right now.
  const blocker = cmd.buildBlocker(s, p.lotId, cheapestBuild());

  return (
    <Panel
      title="Available location"
      subtitle={`${lot.address} · ${districtName(lot)}`}
      onClose={closePanel}
      advisor={{ text: storefrontAdvice(lot, cityLots(s)) }}
      hero={<StorefrontArt />}
      footer={
        <div class="stack">
          {blocker && <p class="storefront-blocker small">{blocker}</p>}
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!!blocker}
            onClick={() => openPanel({ type: 'build', lotId: lot.id })}
          >
            Build branch
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
          <Row label="Homeowners" value={pct(lot.homeownerShare, 0)} />
        </Card>

        <SectionTitle>Nearby competition</SectionTitle>
        <Card>
          <Row
            label={`Rival branches within ${near.radius} tiles`}
            value={near.rivalCount === 0 ? 'None' : count(near.rivalCount)}
          />
          {near.rivalCount > 0 && (
            <Row label="Their average rating" value={<CoinRating value={near.rivalAverage} />} />
          )}
          <Row
            label="Your other branches nearby"
            value={near.ownCount === 0 ? 'None' : count(near.ownCount)}
          />
          {near.ownCount > 0 && (
            <Row label="Their average rating" value={<CoinRating value={near.ownAverage} />} />
          )}
        </Card>
      </div>
    </Panel>
  );
}
