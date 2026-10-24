// Incident modal (SCREENS §22). Stage 5 foundation placeholder; replaced by the full modal.
import { modal } from '../store';

export function IncidentModal() {
  return (
    <div class="modal" role="dialog" aria-label="Incident">
      <button type="button" onClick={() => (modal.value = null)}>
        Close
      </button>
    </div>
  );
}
