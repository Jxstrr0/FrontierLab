// STUB — to be built in Stage 2. See docs/SCREENS.md.
import { Panel } from '../components';
import { closePanel } from '../store';

export function BuildPanel(_p: { lotId: string }) {
  return (
    <Panel title="Build branch" onClose={closePanel}>
      <p class="muted">Coming soon.</p>
    </Panel>
  );
}
