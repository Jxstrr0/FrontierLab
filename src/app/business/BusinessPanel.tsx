// Business panel (stage C5a, SCREENS §14b): a customer business on a storefront,
// its sector and size, the advisor's line on who serves it, and its facts.
// The Deal Desk (C5b) brings its requests for proposals to your sales office.
import { DAYS_PER_WEEK } from '../../config/balance';
import { DISTRICT_SPECS } from '../../data/districts';
import { sectorOf } from '../../sim/businesses';
import type { Business, GameState } from '../../sim/state';
import { Panel } from '../components';
import { money, monthYear } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { closePanel, useGame } from '../store';
import { BusinessCard } from './BusinessCard';
import { SIZE_LABEL, vendorName } from './businessView';

function advice(s: GameState, b: Business): string {
  const sym = s.settings.currency;
  if (!b.vendor)
    return `${b.name} spends about ${money(b.budget, sym)} a year on AI and has no vendor yet.`;
  const when =
    b.renewalWeek !== undefined
      ? ` The contract comes up for renewal in ${monthYear(s.meta.startDate, b.renewalWeek * DAYS_PER_WEEK)}.`
      : '';
  if (b.vendor.type === 'player') return `${b.name} runs on our models.${when}`;
  return `${vendorName(s, b)} serves ${b.name} today.${when}`;
}

export function BusinessPanel(p: { businessId: string }) {
  const s = useGame();
  const b = s.businesses[p.businessId];
  const lot = b?.lotId ? s.world.lots[b.lotId] : undefined;
  if (!b) {
    return (
      <Panel title="Business" onClose={closePanel}>
        <p class="muted">That business is no longer on the map.</p>
      </Panel>
    );
  }
  const district = lot ? DISTRICT_SPECS[lot.district]?.name : undefined;
  return (
    <Panel
      title={b.name}
      subtitle={[sectorOf(b).name, SIZE_LABEL[b.size], lot?.address, district]
        .filter(Boolean)
        .join(' · ')}
      icon={<LayerMedallion id="businesses" size={32} />}
      onClose={closePanel}
      advisor={{ text: advice(s, b) }}
    >
      <BusinessCard s={s} b={b} />
    </Panel>
  );
}
