// Starts a new game from wizard options: builds the state, applies the player's
// saved preferences, opens the game screen and writes the first autosave.
import { setSettings } from '../../sim/commands';
import { newGame, type NewGameOptions } from '../../sim/newGame';
import { loadPrefs, saveToSlot } from '../saves';
import { screen, setGame, toast } from '../store';

export function startGame(opts: Omit<NewGameOptions, 'version'>): void {
  const state = newGame({ ...opts, version: __APP_VERSION__ });
  // Preferences were checked when saved, but storage can be edited by hand.
  // The wizard's currency choice wins over the saved preference.
  setSettings(state, { ...loadPrefs(), ...(opts.currency ? { currency: opts.currency } : {}) });
  setGame(state);
  screen.value = 'game';
  const err = saveToSlot('auto', state);
  if (err) toast(err, 'bad');
}
