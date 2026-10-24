// Rival branch panel (SCREENS §6). Stage 5 foundation placeholder; replaced by the full screen.
import { Panel } from '../components';
import { closePanel } from '../store';

export function RivalBranchPanel(_p: { lotId: string }) {
  return (
    <Panel title="Rival branch" onClose={closePanel}>
      <p class="muted">Coming in Stage 5.</p>
    </Panel>
  );
}
