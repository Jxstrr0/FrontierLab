// STUB — to be built in Stage 2. See docs/SCREENS.md §21.
import { Modal } from '../components';
import { modal } from '../store';

export function WeeklyResults(p: { week: number }) {
  return (
    <Modal title="Weekly results" onClose={() => (modal.value = null)}>
      <p class="muted">Week {p.week + 1}. Coming soon.</p>
    </Modal>
  );
}
