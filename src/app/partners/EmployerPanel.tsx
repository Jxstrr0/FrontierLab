// Employer panel (SCREENS §14). Stage 5 foundation placeholder; replaced by the full screen.
import { Panel } from '../components';
import { closePanel } from '../store';

export function EmployerPanel(_p: { siteId: string }) {
  return (
    <Panel title="Employer" onClose={closePanel}>
      <p class="muted">Coming in Stage 5.</p>
    </Panel>
  );
}
