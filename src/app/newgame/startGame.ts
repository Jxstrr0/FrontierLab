// Starts a new game from wizard options: builds the state, applies the player's
// saved preferences and the tutorial, opens the game screen and writes the
// first autosave.
import { setSettings, setTutorialStep } from '../../sim/commands';
import { initialTutorialStep } from '../tutorial/controller';
import { newGame, type NewGameOptions } from '../../sim/newGame';
import { loadPrefs, saveToSlot } from '../saves';
import { screen, setGame } from '../store';
import { reportSaveError } from '../saves/saveError';

export function startGame(opts: Omit<NewGameOptions, 'version'>): void {
  const state = newGame({ ...opts, version: __APP_VERSION__ });
  // Preferences were checked when saved, but storage can be edited by hand.
  // The wizard's currency choice wins over the saved preference.
  setSettings(state, { ...loadPrefs(), ...(opts.currency ? { currency: opts.currency } : {}) });
  // SCREENS §27: first-timers start the tutorial, returning players are asked.
  setTutorialStep(state, initialTutorialStep());
  setGame(state);
  screen.value = 'game';
  void saveToSlot('auto', state).then((err) => err && reportSaveError(err));
}
