// Rival bank HQ panel (SCREENS §7). Stage 5 foundation placeholder; replaced by the full screen.
import { Panel } from '../components';
import { closePanel } from '../store';

export function RivalHqPanel(_p: { siteId: string; tab: 'overview' | 'loans' | 'credit' }) {
  return (
    <Panel title="Rival head office" onClose={closePanel}>
      <p class="muted">Coming in Stage 5.</p>
    </Panel>
  );
}
