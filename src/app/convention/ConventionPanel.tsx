// Convention panel (SCREENS §17): event name and dates, the exhibition hall
// vignette, the exclusive ventures carousel and networking cards. Ventures
// shown here can only be bought here, during the event week.
import { LayerMedallion } from '../map/LayerIcon';
import { Card, Carousel, Panel, Row, SectionTitle } from '../components';
import { VentureCard } from '../startup/VentureCard';
import { closePanel, openPanel, useGame } from '../store';
import { ConventionArt } from './ConventionArt';
import { conventionAdvisor, conventionView, employerLead } from './conventionView';
import { conventionTag } from './conventionPin';
import './convention.css';

export function ConventionPanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  const v = conventionView(s, site);
  const icon = <LayerMedallion id="conventions" size={32} />;
  if (!v) {
    return (
      <Panel title="Conference" icon={icon} onClose={closePanel}>
        <p class="muted">No events are booked here.</p>
      </Panel>
    );
  }
  const open = v.phase === 'open';
  return (
    <Panel
      title={v.spec.name}
      subtitle={`${v.dates} · ${v.spec.venue}`}
      icon={icon}
      advisor={{ text: conventionAdvisor(v) }}
      hero={<ConventionArt />}
      onClose={closePanel}
    >
      <div class="stack">
        <Card>
          <Row label="Status" value={conventionTag(v.weeksToGo)} strong />
          <Row label="Exhibitors raising" value={String(v.startups.length)} />
          {!open && (
            <p class="muted small cv-note">
              Exclusive deals are signed on the floor while the doors are open. Come back when they
              do.
            </p>
          )}
        </Card>
        <SectionTitle>Exclusive ventures</SectionTitle>
        {v.startups.length > 0 ? (
          <Carousel label="Exclusive ventures" class="st-carousel">
            {v.startups.map((st) => (
              <VentureCard startup={st} />
            ))}
          </Carousel>
        ) : (
          <Card>
            <p class="muted">The exhibitor list is announced four weeks before the event.</p>
          </Card>
        )}
        <Networking cityId={v.run.cityId} />
      </div>
    </Panel>
  );
}

/** Two flavour leads: an executive candidate and an employer to court. */
function Networking(p: { cityId: string }) {
  const s = useGame();
  const candidate = Object.values(s.executives.candidates).flat()[0];
  const employer = employerLead(s, p.cityId);
  const hasExec = !!s.departments.executive;
  return (
    <>
      <SectionTitle>Networking</SectionTitle>
      <Card class="cv-lead">
        <p class="cv-lead-text">
          {candidate
            ? `${candidate.name} is working the room and open to a senior role.`
            : 'A few seasoned executives are here, open to a senior role.'}
        </p>
        <button
          type="button"
          class="btn btn-secondary"
          disabled={!hasExec}
          onClick={() => openPanel({ type: 'hq', dept: 'executive' })}
        >
          {hasExec ? 'Executive floor' : 'Needs an Executive floor'}
        </button>
      </Card>
      {employer && (
        <Card class="cv-lead">
          <p class="cv-lead-text">
            HR leads from {employer.employer!.name} are asking about staff AI plans.
          </p>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => openPanel({ type: 'employer', siteId: employer.id })}
          >
            Meet them
          </button>
        </Card>
      )}
    </>
  );
}
