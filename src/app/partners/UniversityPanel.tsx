// University panel (SCREENS §15, DESIGN §5.8.10): the staff payroll deal (the
// same deal card as an employer), the student partnership (student accounts)
// and the graduate program card.
import { DISTRICT_SPECS } from '../../data/districts';
import * as cmd from '../../sim/commands';
import { headcount } from '../../sim/partnerships';
import { Card, Panel, Row, SectionTitle } from '../components';
import { count } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { closePanel, useGame } from '../store';
import { DealCard } from './DealCard';
import { GradProgramCard } from './GradProgramCard';
import { PartnerArt } from './PartnerArt';
import { currentPartner } from './partnerView';
import './partners.css';

export function UniversityPanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  if (!site?.employer) {
    return (
      <Panel title="University" onClose={closePanel}>
        <p class="muted">That building is no longer on the map.</p>
      </Panel>
    );
  }
  const students = headcount(site, 'student');
  const mine = !!cmd.activePartnership(s, site.id, 'payroll');
  const district = DISTRICT_SPECS[site.district]?.name;
  return (
    <Panel
      title={site.employer.name}
      subtitle={['University', site.address, district].filter(Boolean).join(' · ')}
      icon={<LayerMedallion id="universities" size={32} />}
      onClose={closePanel}
      advisor={{ text: 'Our graduates would love to join a growing lab.' }}
      hero={<PartnerArt type="university" />}
    >
      <div class="stack">
        <Card>
          <Row label="Staff" value={count(site.employer.employees)} />
          <Row label="Students" value={count(students)} />
          <Row
            label="Payroll partner"
            value={currentPartner(s, site, mine)}
            tone={mine ? 'good' : undefined}
          />
        </Card>
        <SectionTitle>Staff plans</SectionTitle>
        <DealCard site={site} kind="payroll" people={site.employer.employees} />
        <SectionTitle>Student partnership</SectionTitle>
        <DealCard site={site} kind="student" people={students} />
        <SectionTitle>Graduate program</SectionTitle>
        <GradProgramCard site={site} />
      </div>
    </Panel>
  );
}
