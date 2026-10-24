// SCREENS §20 sports franchise: for sale, then Club, Kit, Squad, Transfers, Finance. Owner: franchise engineer.
// (Stage 9 placeholder: filled in by its owner.)
import { Card, Panel } from '../components';
import { closePanel } from '../store';

export function FranchisePanel(_p: { siteId?: string; clubId?: string }) {
  return (
    <Panel title="Sports club" onClose={closePanel}>
      <Card>
        <p class="muted">Coming soon.</p>
      </Card>
    </Panel>
  );
}
