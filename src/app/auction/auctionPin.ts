// Pin rule for auction houses (SCREENS §19): while the next sale's lots are on
// view (its preview window), the pin is tagged with the sale's week of the year,
// "Sale wk 12". Read-only view of GameState.
import { saleListed } from '../../sim/auctions';
import type { GameState, Site } from '../../sim/state';
import type { SitePinInfo } from '../map/sitePinInfo';
import { saleShortDate, saleWeekOfYear } from './auctionView';

export function auctionPinInfo(s: GameState, site: Site): SitePinInfo {
  const house = s.auctions[site.refId];
  if (!house || !saleListed(house)) return { visible: true, suffix: ', auction house' };
  return {
    visible: true,
    suffix: `, auction house, sale on ${saleShortDate(s, house.nextWeek)}`,
    tag: `Sale wk ${saleWeekOfYear(s, house.nextWeek)}`,
  };
}
