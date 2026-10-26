// Menu → Milestones (DESIGN §5.18, SCREENS §28): every goal in data order, reached
// ones stamped with their date in brass, the rest showing how to get there.
import { Card, Panel } from '../components';
import { closePanel, useGame } from '../store';
import { milestoneRows } from './milestonesView';
import './milestones.css';

export function MilestonesPanel() {
  const s = useGame();
  const rows = milestoneRows(s);
  const done = rows.filter((r) => r.reached).length;
  return (
    <Panel title="Milestones" subtitle={`${done} of ${rows.length} reached`} onClose={closePanel}>
      <Card>
        <ol class="ms-list">
          {rows.map((r) => (
            <li
              class={`ms-row${r.reached ? ' is-reached' : ''}`}
              key={r.id}
              aria-label={`${r.title}: ${r.reached ? r.detail : `not yet. ${r.detail}`}`}
            >
              <span class="ms-mark" aria-hidden="true">
                {r.reached ? '◆' : '◇'}
              </span>
              <span class="ms-text">
                <span class="ms-title">{r.title}</span>
                <span class="ms-detail">{r.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </Panel>
  );
}
