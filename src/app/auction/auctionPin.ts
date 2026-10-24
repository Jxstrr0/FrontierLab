// Pin rule for auction houses (SCREENS §19): a short tag when a sale is near.
// (Stage 9 stub: refined by the auctions engineer.)
import type { GameState, Site } from '../../sim/state';
import type { SitePinInfo } from '../map/sitePinInfo';

export function auctionPinInfo(_s: GameState, _site: Site): SitePinInfo {
  return { visible: true, suffix: ', auction house' };
}
