// Board meeting modal (SCREENS §10.2). Placeholder from the Stage 6 foundation.
import { modal } from '../store';

export function BoardMeetingModal() {
  return (
    <div class="modal-backdrop" role="dialog" aria-label="Board meeting">
      <button type="button" class="btn" onClick={() => (modal.value = null)}>
        Close
      </button>
    </div>
  );
}
