// SCREENS §19 vacation home: asking price, offer, rebuild, sell. Owner: personal-assets engineer.
// (Stage 9 placeholder: filled in by its owner.)
import { Card, Panel } from '../components';
import { closePanel } from '../store';

export function VacationHomePanel(_p: { siteId?: string; clubId?: string }) {
  return (
    <Panel title="Vacation home" onClose={closePanel}>
      <Card>
        <p class="muted">Coming soon.</p>
      </Card>
    </Panel>
  );
}
