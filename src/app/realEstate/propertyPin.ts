// How a property building's map pin reads (SCREENS §16): whether it shows,
// the text added to its label, a small tag under the medallion and whether you
// own it (a brand-ink seal). Read-only view of GameState.
import type { GameState, Site } from '../../sim/state';
import type { SitePinInfo } from '../map/sitePinInfo';

export function propertyPinInfo(_s: GameState, site: Site): SitePinInfo {
  return { visible: true, suffix: `, ${site.property?.sqm ?? 0} m² building` };
}
