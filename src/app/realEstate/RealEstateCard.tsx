// The Company panel's Real estate section (SCREENS §16, §24): the lab's
// buildings with value and weekly net (tap to open one).
import { Badge, Card, Row, SectionTitle } from '../components';
import { money } from '../format/format';
import { openPanel, useGame } from '../store';
import { ownedBuildings } from './realEstateView';
import './realEstate.css';

export function RealEstateCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const buildings = ownedBuildings(s, 'company');
  return (
    <div class="stack re-company">
      <SectionTitle>Real estate</SectionTitle>
      {buildings.length === 0 ? (
        <Card>
          <p class="muted small re-note">
            The lab owns no buildings yet. Buildings for sale show on the map under Real Estate.
          </p>
        </Card>
      ) : (
        buildings.map((b) => (
          <Card key={b.siteId} onClick={() => openPanel({ type: 'property', siteId: b.siteId })}>
            <div class="re-row-head">
              <span class="re-row-name">{b.address}</span>
              {b.forSale && <Badge tone="warn">Selling</Badge>}
            </div>
            <Row label={b.city} value={money(b.value, sym)} />
            <Row
              label="Weekly net rent"
              value={money(b.net, sym)}
              tone={b.net >= 0 ? 'good' : 'bad'}
            />
          </Card>
        ))
      )}
    </div>
  );
}
