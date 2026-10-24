// Product developments list (SCREENS §10 Products floor): one card per
// development with its template, a progress bar, weeks left at the team's
// current pace, the weekly budget and money spent, and Cancel (asks first;
// money spent is gone). New product opens the form.
import { useState } from 'preact/hooks';
import { DEV_TEMPLATES } from '../../../data/devTemplates';
import * as cmd from '../../../sim/commands';
import { devWeeksLeft } from '../../../sim/development';
import type { Development } from '../../../sim/state';
import { Card, Confirm, Row } from '../../components';
import { money } from '../../format/format';
import { act, useGame } from '../../store';
import { NewProductSheet } from './NewProductSheet';
import { devSubtitle } from './productSelectors';
import { TemplateIcon } from './TemplateIcon';

export function Developments() {
  const s = useGame();
  const [creating, setCreating] = useState(false);
  const list = s.products.developments;
  return (
    <div class="stack">
      {list.length === 0 && (
        <p class="muted small">
          No developments under way. A longer time, a bigger budget and a skilled team all raise the
          odds of a five-star product.
        </p>
      )}
      {list.map((d) => (
        <DevCard dev={d} />
      ))}
      <button type="button" class="btn btn-primary btn-block" onClick={() => setCreating(true)}>
        New product
      </button>
      {creating && <NewProductSheet onClose={() => setCreating(false)} />}
    </div>
  );
}

export function DevCard(p: { dev: Development }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [cancelling, setCancelling] = useState(false);
  const d = p.dev;
  const template = DEV_TEMPLATES[d.templateId];
  const share = d.weeks > 0 ? d.progress / d.weeks : 0;
  const left = devWeeksLeft(s, d);
  const paused = !s.departments.products;
  return (
    <Card class="pf-dev">
      <div class="pf-dev-head">
        <TemplateIcon templateId={d.templateId} />
        <div class="pf-dev-title">
          <span class="pf-dev-name">{d.name}</span>
          <span class="muted small">
            {template?.digital ? 'Digital project' : devSubtitle(d.name, d.templateId, d.tier)}
          </span>
        </div>
      </div>
      <div
        class="pf-progress"
        role="progressbar"
        aria-label={`${d.name} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
      >
        <span class="pf-progress-fill" style={{ width: `${share * 100}%` }} />
      </div>
      <div class="pf-dev-meta small">
        <span>{Math.round(share * 100)}% done</span>
        <span class={paused ? 'tone-bad' : ''}>
          {paused ? 'Paused: no Products floor' : `${left} ${left === 1 ? 'week' : 'weeks'} left`}
        </span>
      </div>
      <Row label="Weekly budget" value={money(d.weeklyBudget, sym)} />
      <Row label="Spent so far" value={money(d.spent, sym)} tone="dim" />
      <button
        type="button"
        class="btn btn-secondary btn-block pf-dev-cancel"
        onClick={() => setCancelling(true)}
      >
        Cancel development
      </button>
      {cancelling && (
        <Confirm
          title={`Stop work on ${d.name}?`}
          body={`The ${money(d.spent, sym)} spent so far is gone, and the work stops for good.`}
          confirmLabel="Stop development"
          danger
          onConfirm={() => {
            setCancelling(false);
            act(cmd.cancelDevelopment, d.id);
          }}
          onCancel={() => setCancelling(false)}
        />
      )}
    </Card>
  );
}
