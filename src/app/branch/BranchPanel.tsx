// STUB — to be built in Stage 2. See docs/SCREENS.md §5.
import { Panel } from '../components';
import { closePanel, type BranchTab } from '../store';

export function BranchPanel(_p: { branchId: string; tab: BranchTab }) {
  return (
    <Panel title="Branch" onClose={closePanel}>
      <p class="muted">Coming soon.</p>
    </Panel>
  );
}
