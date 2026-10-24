// How a convention centre's map pin reads (SCREENS §17, DESIGN §5.12): whether
// it shows, the text added to its label and a small tag under the medallion.
// Read-only view of GameState.
import type { GameState, Site } from '../../sim/state';
import type { SitePinInfo } from '../map/sitePinInfo';

export function conventionPinInfo(_s: GameState, _site: Site): SitePinInfo {
  return { visible: true, suffix: ', convention centre' };
}
