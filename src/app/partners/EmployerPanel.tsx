// Employer panel (SCREENS §14): header with the employer's name and type, the
// advisor's line, an engraved vignette, stats (employees, average income) and
// the employer's one deal: its anchor account on the Deal Desk. An energy site
// shows its power deal and site card instead.
import { isRegional } from '../../data/cities';
import { DISTRICT_SPECS } from '../../data/districts';
import { EnergySiteCard } from '../dataCenter/EnergySiteCard';
import { PowerDealCard } from '../dataCenter/PowerDealCard';
import { Card, Panel, Row, SectionTitle } from '../components';
import { count, money } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { closePanel, useGame } from '../store';
import { businessAtSite } from '../../sim/businesses';
import { BusinessCard } from '../business/BusinessCard';
import { PartnerArt } from './PartnerArt';
import { averageIncome, typeLabel } from './partnerView';
import './partners.css';

export function EmployerPanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  if (!site?.employer) {
    return (
      <Panel title="Employer" onClose={closePanel}>
        <p class="muted">That building is no longer on the map.</p>
      </Panel>
    );
  }
  const e = site.employer;
  const sym = s.settings.currency;
  const district = DISTRICT_SPECS[site.district]?.name;
  const anchor = businessAtSite(s, site.id);
  const energy = isRegional(site.cityId);
  return (
    <Panel
      title={e.name}
      subtitle={[typeLabel(site), site.address, district].filter(Boolean).join(' · ')}
      icon={<LayerMedallion id="employers" size={32} />}
      onClose={closePanel}
      advisor={{
        text: energy
          ? `${count(e.employees)} people work here, on a site with power to spare for a data center.`
          : `${count(e.employees)} people work here. Their AI budget is on the Deal Desk.`,
      }}
      hero={<PartnerArt type={e.type} />}
    >
      <div class="stack">
        <Card>
          <Row label="Employees" value={count(e.employees)} />
          <Row label="Average income" value={`${money(averageIncome(site), sym)} a year`} />
        </Card>
        {anchor && (
          <>
            <SectionTitle>Anchor account</SectionTitle>
            <BusinessCard s={s} b={anchor} />
          </>
        )}
        {energy && <PowerDealCard site={site} />}
        {energy && <EnergySiteCard siteId={site.id} />}
      </div>
    </Panel>
  );
}
