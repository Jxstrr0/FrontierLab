// STUB — to be built in Stage 2. See docs/SCREENS.md §26.
import { Panel } from '../components';
import { closePanel, screen } from '../store';

export function SavesScreen(p: { inGame?: boolean }) {
  return (
    <Panel
      title={p.inGame ? 'Save game' : 'Load game'}
      onClose={p.inGame ? closePanel : () => (screen.value = 'title')}
    >
      <p class="muted">Coming soon.</p>
    </Panel>
  );
}
