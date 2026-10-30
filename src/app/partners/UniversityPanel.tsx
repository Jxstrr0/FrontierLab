// University panel (SCREENS §15, DESIGN §5.8.10): staff and student counts,
// the student partnership (the Campus Plan deal card, or yours once signed)
// and the graduate program card.
import { DISTRICT_SPECS } from '../../data/districts';
import { headcount } from '../../sim/partnerships';
import { Card, Panel, Row, SectionTitle } from '../components';
import { count } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { closePanel, useGame } from '../store';
import { DealCard } from './DealCard';
import { GradProgramCard } from './GradProgramCard';
import { PartnerArt } from './PartnerArt';
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
        </Card>
        <SectionTitle>Student partnership</SectionTitle>
        <DealCard site={site} kind="student" people={students} />
        <SectionTitle>Graduate program</SectionTitle>
        <GradProgramCard site={site} />
      </div>
    </Panel>
  );
}
