// Pin rules for Stage 9 map buildings you buy from (SCREENS §19): vacation
// homes ("For sale" while unowned, your seal once yours) and car dealers (a
// seal while you hold a dealer financing deal). (Stage 9 stub: refined by the
// personal-assets engineer.) Never "For lease" (offices only) or the "$" coin.
import type { GameState, Site } from '../../sim/state';
import type { SitePinInfo } from '../map/sitePinInfo';

export function personalPinInfo(_s: GameState, site: Site): SitePinInfo | undefined {
  if (site.kind === 'vacationHome') return { visible: true, suffix: ', vacation home' };
  if (site.kind === 'autoDealer') return { visible: true, suffix: ', car dealer' };
  return undefined;
}
