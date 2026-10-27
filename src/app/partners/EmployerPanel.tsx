// Employer panel (SCREENS §14): header with the employer's name and type, the
// advisor's line, an engraved vignette, stats (employees, average income, who
// banks their payroll today) and the payroll deal, or your partnership.
import { isRegional } from '../../data/cities';
import { DISTRICT_SPECS } from '../../data/districts';
import { EnergySiteCard } from '../dataCenter/EnergySiteCard';
import { PowerDealCard } from '../dataCenter/PowerDealCard';
import * as cmd from '../../sim/commands';
import { Card, Panel, Row, SectionTitle } from '../components';
import { count, money } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { closePanel, useGame } from '../store';
import { businessAtSite } from '../../sim/businesses';
import { BusinessCard } from '../business/BusinessCard';
import { DealCard } from './DealCard';
import { PartnerArt } from './PartnerArt';
import { averageIncome, currentPartner, typeLabel } from './partnerView';
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
  const mine = !!cmd.activePartnership(s, site.id, 'payroll');
  const district = DISTRICT_SPECS[site.district]?.name;
  const anchor = businessAtSite(s, site.id);
  const energy = isRegional(site.cityId);
  return (
    <Panel
      title={e.name}
      subtitle={[typeLabel(site), site.address, district].filter(Boolean).join(' · ')}
      icon={<LayerMedallion id="employers" size={32} />}
      onClose={closePanel}
      advisor={{ text: energy
            ? `${count(e.employees)} people work here, on a site with power to spare for a data center.`
            : `${count(e.employees)} people work here, and their team could use our plans.` }}
      hero={<PartnerArt type={e.type} />}
    >
      <div class="stack">
        <Card>
          <Row label="Employees" value={count(e.employees)} />
          <Row label="Average income" value={`${money(averageIncome(site), sym)} a year`} />
          <Row
            label="Plans partner"
            value={currentPartner(s, site, mine)}
            tone={mine ? 'good' : undefined}
          />
        </Card>
        {anchor && (
          <>
            <SectionTitle>Anchor account</SectionTitle>
            <BusinessCard s={s} b={anchor} />
          </>
        )}
        {/* Energy sites sign power deals; a payroll deal signed before C8a runs on. */}
        {(!energy || mine) && (
          <>
            <SectionTitle>{mine ? 'Yours' : 'Payroll deal'}</SectionTitle>
            <DealCard site={site} kind="payroll" people={e.employees} />
          </>
        )}
        {energy && <PowerDealCard site={site} />}
        {energy && <EnergySiteCard siteId={site.id} />}
      </div>
    </Panel>
  );
}
