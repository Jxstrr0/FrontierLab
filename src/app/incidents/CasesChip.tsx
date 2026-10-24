// HUD chip under the date pill (SCREENS §0.2): how many incidents are open,
// with an oxblood dot. Tapping reopens the incident modal.
import { modal, useGame } from '../store';
import './incidents.css';

export function CasesChip() {
  const s = useGame();
  const n = s.incidents.active.length;
  if (n === 0 || s.flags.gameOver) return null;
  return (
    <button
      type="button"
      class="hud-chip hud-cases"
      aria-label={`${n} open ${n === 1 ? 'case' : 'cases'}. Open incidents`}
      onClick={() => (modal.value = { type: 'incident' })}
    >
      <span class="hud-cases-dot" aria-hidden="true" />
      {n} {n === 1 ? 'case' : 'cases'}
    </button>
  );
}
