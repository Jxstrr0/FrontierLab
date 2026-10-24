// SCREENS §23 Personal Wealth: total assets, donut, holdings, rich list rank. Owner: personal-assets engineer.
// (Stage 9 placeholder: filled in by its owner.)
import { Card, Panel } from '../components';
import { closePanel } from '../store';

export function WealthPanel(_p: { siteId?: string; clubId?: string }) {
  return (
    <Panel title="Personal wealth" onClose={closePanel}>
      <Card>
        <p class="muted">Coming soon.</p>
      </Card>
    </Panel>
  );
}
