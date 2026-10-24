// University panel (SCREENS §15). Stage 5 foundation placeholder; replaced by the full screen.
import { Panel } from '../components';
import { closePanel } from '../store';

export function UniversityPanel(_p: { siteId: string }) {
  return (
    <Panel title="University" onClose={closePanel}>
      <p class="muted">Coming in Stage 5.</p>
    </Panel>
  );
}
