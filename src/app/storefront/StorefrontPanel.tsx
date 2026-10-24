// STUB — to be built in Stage 2. See docs/SCREENS.md.
import { Panel } from '../components';
import { closePanel } from '../store';

export function StorefrontPanel(_p: { lotId: string }) {
  return (
    <Panel title="Storefront for lease" onClose={closePanel}>
      <p class="muted">Coming soon.</p>
    </Panel>
  );
}
