// SCREENS §19 car dealer: Showroom and Dealer financing tabs. Owner: personal-assets engineer.
// (Stage 9 placeholder: filled in by its owner.)
import { Card, Panel } from '../components';
import { closePanel } from '../store';

export function CarDealerPanel(_p: { siteId?: string; clubId?: string }) {
  return (
    <Panel title="Car dealer" onClose={closePanel}>
      <Card>
        <p class="muted">Coming soon.</p>
      </Card>
    </Panel>
  );
}
