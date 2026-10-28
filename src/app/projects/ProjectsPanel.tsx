// Menu → Frontier projects (SCREENS §28a, SIMULATION §16.14): the late game's
// big builds. The project under way sits on top with its progress, weekly
// payment and a Cancel (asks first); below, every project with its price,
// length, reward and why it can't start yet. Finished ones are stamped.
import { useState } from 'preact/hooks';
import { FRONTIER_PROJECTS } from '../../config/balance';
import { FRONTIER_PROJECT_LIST, FRONTIER_PROJECTS_BY_ID } from '../../data/frontierProjects';
import * as cmd from '../../sim/commands';
import { projectBlock, projectWeekly } from '../../sim/projects';
import type { ActiveProject } from '../../sim/state';
import { Badge, Card, Confirm, Panel, Row, StatBar } from '../components';
import { money } from '../format/format';
import { act, closePanel, toast, useGame } from '../store';
import './projects.css';

export function ProjectsPanel() {
  const s = useGame();
  const active = s.projects.active;
  const done = s.projects.done.length;
  return (
    <Panel
      title="Frontier projects"
      subtitle={`${done} of ${FRONTIER_PROJECT_LIST.length} finished`}
      onClose={closePanel}
    >
      <p class="muted small fp-intro">
        Years-long builds for a lab with money to spare. One at a time, paid weekly; projects can
        run late.
      </p>
      {active && <ActiveCard active={active} />}
      {FRONTIER_PROJECT_LIST.filter((p) => p.id !== active?.id).map((p) => (
        <ProjectCard key={p.id} id={p.id} />
      ))}
    </Panel>
  );
}

function ActiveCard(p: { active: ActiveProject }) {
  const s = useGame();
  const sym = s.settings.currency;
  const spec = FRONTIER_PROJECTS_BY_ID[p.active.id]!;
  const [asking, setAsking] = useState(false);
  const left = p.active.weeks - p.active.weeksDone;
  return (
    <Card class="fp-card fp-active">
      <div class="fp-head">
        <span class="fp-name">{spec.name}</span>
        {p.active.stalled ? (
          <Badge tone="bad">Stalled</Badge>
        ) : (
          <Badge tone="info">Under way</Badge>
        )}
      </div>
      <StatBar
        label="Progress"
        value={p.active.weeksDone}
        max={p.active.weeks}
        display={`${Math.round((100 * p.active.weeksDone) / p.active.weeks)}%`}
      />
      <Row label="Weekly payment" value={money(projectWeekly(p.active), sym)} />
      <Row label="Spent so far" value={money(p.active.spent, sym)} />
      <Row label="Total cost" value={money(p.active.cost, sym)} />
      <Row label="Weeks left" value={String(left)} />
      <p class="small fp-reward">{spec.rewardText}</p>
      <button type="button" class="btn btn-secondary btn-block" onClick={() => setAsking(true)}>
        Cancel project
      </button>
      {asking && (
        <Confirm
          title={`Cancel ${spec.name}?`}
          body={`The ${money(p.active.spent, sym)} spent so far is lost.`}
          confirmLabel="Cancel project"
          danger
          onConfirm={() => {
            setAsking(false);
            if (act(cmd.cancelProject).ok) toast(`${spec.name} cancelled.`, 'info');
          }}
          onCancel={() => setAsking(false)}
        />
      )}
    </Card>
  );
}

function ProjectCard(p: { id: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const spec = FRONTIER_PROJECTS_BY_ID[p.id]!;
  const finished = s.projects.done.includes(spec.id);
  const block = projectBlock(s, spec);
  const price = cmd.projectPrice(s, spec.id);
  const upfront = (price / spec.weeks) * FRONTIER_PROJECTS.startWeeks;
  const why =
    block === 'ARR too low.' ? `Needs ${money(spec.minArr, sym)} of ARR.` : (block ?? undefined);
  return (
    <Card class={`fp-card${finished ? ' is-done' : ''}`}>
      <div class="fp-head">
        <span class="fp-name">{spec.name}</span>
        {finished && <Badge tone="good">Finished</Badge>}
      </div>
      <p class="small muted">{spec.blurb}</p>
      <p class="small fp-reward">{spec.rewardText}</p>
      {!finished && (
        <>
          <Row label="Cost" value={money(price, sym)} />
          <Row label="Takes" value={`${spec.weeks} weeks`} />
          <Row label="Weekly payment" value={money(price / spec.weeks, sym)} />
          {why ? (
            <p class="small muted fp-why">{why}</p>
          ) : (
            <button
              type="button"
              class="btn btn-primary btn-block"
              onClick={() => {
                if (act(cmd.startProject, spec.id).ok) toast(`${spec.name} is under way.`, 'info');
              }}
            >
              Start · keep {money(upfront, sym)} in cash
            </button>
          )}
        </>
      )}
    </Card>
  );
}
