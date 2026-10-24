// How a property building's map pin reads (SCREENS §16): it shows only while
// the building is listed (tag "For sale") or owned by you, company or private
// (your brand-ink seal; "Selling" while its For Sale toggle is on). Unlisted
// buildings nobody in the game owns show no pin. Read-only view of GameState.
import type { GameState, Site } from '../../sim/state';
import type { SitePinInfo } from '../map/sitePinInfo';

export function propertyPinInfo(s: GameState, site: Site): SitePinInfo {
  const sqm = `${(site.property?.sqm ?? 0).toLocaleString('en-US')} m² building`;
  const owned = s.realEstate.properties[site.id];
  if (owned) {
    const who = owned.owner === 'company' ? 'owned by your bank' : 'owned by you';
    return {
      visible: true,
      suffix: `, ${sqm}, ${who}${owned.forSale ? ', for sale' : ''}`,
      owned: true,
      ...(owned.forSale ? { tag: 'Selling' } : {}),
    };
  }
  if (s.realEstate.listings[site.id]) {
    return { visible: true, suffix: `, ${sqm} for sale`, tag: 'For sale' };
  }
  return { visible: false, suffix: `, ${sqm}` };
}
