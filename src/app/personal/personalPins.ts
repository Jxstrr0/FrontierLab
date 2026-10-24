// Pin rules for Stage 9 map buildings you buy from (SCREENS §19): vacation
// homes ("For sale" while unowned, your seal once yours, "Rebuilding" while a
// rebuild runs) and car dealers (a seal while you hold a dealer financing
// deal). Never "For lease" (offices only) or the "$" coin.
import { activeDealerDeal, ownedHome } from '../../sim/personalValues';
import type { GameState, Site } from '../../sim/state';
import type { SitePinInfo } from '../map/sitePinInfo';

export function personalPinInfo(s: GameState, site: Site): SitePinInfo | undefined {
  if (site.kind === 'vacationHome') {
    const home = ownedHome(s, site.refId);
    if (!home) return { visible: true, suffix: ', vacation home for sale', tag: 'For sale' };
    const rebuilding = home.rebuildDoneWeek !== undefined;
    return {
      visible: true,
      suffix: `, your vacation home${rebuilding ? ', rebuilding' : ''}`,
      owned: true,
      ...(rebuilding ? { tag: 'Rebuilding' } : {}),
    };
  }
  if (site.kind === 'autoDealer') {
    return activeDealerDeal(s, site.id)
      ? { visible: true, suffix: ', car dealer, your financing partner', owned: true }
      : { visible: true, suffix: ', car dealer' };
  }
  return undefined;
}
