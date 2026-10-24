// The Daily Ledger archive (menu → The Ledger). Stage 5 foundation placeholder; replaced by the full screen.
import { Panel } from '../components';
import { closePanel } from '../store';

export function LedgerArchivePanel(_p: { week?: number }) {
  return (
    <Panel title="The Daily Ledger" onClose={closePanel}>
      <p class="muted">Coming in Stage 5.</p>
    </Panel>
  );
}
