// Completing a building purchase (SIMULATION §21.1): pays for a listed building
// from corporate or personal cash, books it and takes it off the market. Shared
// by your own offers (commands/realEstate.ts) and the CREO's Buying switches
// (execBuying.ts). A company purchase pays investing cash and books the
// building at its estimated value; the difference is a property gain or loss.
import { pushEvent } from './events';
import { postCash, postPnl } from './ledger';
import { marketRentNow } from './propertyMath';
import type { GameState, Property } from './state';

/** Buys listing `siteId` for `price`. The caller has checked the listing and the cash. */
export function completePurchase(
  state: GameState,
  siteId: string,
  price: number,
  account: Property['owner'],
): void {
  const site = state.world.sites[siteId]!;
  const listing = state.realEstate.listings[siteId]!;
  const marketRent = marketRentNow(state, site);
  const value = listing.estimate;
  if (account === 'company') {
    postCash(state, -price, 'investing');
    // The building enters the books at its estimated value; paying more or less is a gain or loss.
    postPnl(state, 'propertyGains', value - price);
  } else {
    state.personal.cash -= price;
  }
  state.realEstate.properties[siteId] = {
    id: siteId,
    cityId: site.cityId,
    owner: account,
    sqm: site.property!.sqm,
    purchasePrice: price,
    boughtWeek: state.clock.week,
    value,
    rent: marketRent,
    marketRent,
    occupancy: listing.occupancy,
    forSale: false,
  };
  delete state.realEstate.listings[siteId];
  pushEvent(
    state,
    'PROPERTY_BOUGHT',
    { siteId, address: site.address, price, account, cityId: site.cityId },
    account === 'company' ? 3 : 5,
    siteId,
  );
}
