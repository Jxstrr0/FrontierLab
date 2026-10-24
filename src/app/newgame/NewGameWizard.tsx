// STUB — to be built in Stage 2. See docs/SCREENS.md §1 (5-step wizard).
// Temporary: starts a default game so the rest of the UI can be exercised.
import { newGame } from '../../sim/newGame';
import { screen, setGame } from '../store';

export function NewGameWizard() {
  const start = () => {
    setGame(
      newGame({ seed: (Math.random() * 2 ** 31) >>> 0, cityId: 'cal', version: __APP_VERSION__ }),
    );
    screen.value = 'game';
  };
  return (
    <main style={{ padding: '24px' }}>
      <button type="button" class="btn btn-primary" onClick={start}>
        Quick start (Calgary)
      </button>
    </main>
  );
}
