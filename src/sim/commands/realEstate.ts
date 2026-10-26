// Real estate commands (SIMULATION §21, SCREENS §16): offer on a listed
// building as the company or privately, set an owned building's rent, put it
// up for sale or take it off, and choose Rent / Sell all for a city's
// foreclosed homes. A company purchase pays investing cash and books the
// building at its estimated value; the difference is a property gain or loss.
import { REAL_ESTATE, REO } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { pushEvent } from '../events';
import { postCash, postPnl } from '../ledger';
import { marketRentFor, offerAcceptance, rentBounds } from '../propertyMath';
import { stream } from '../rng';
import type { GameState, ReoPool } from '../state';
import { fail, money, ok, type CommandResult } from './result';
import { ventureTierBlock } from './ventures';

export type PropertyAccount = 'company' | 'personal';

/** Offers on a listed building. The seller answers at once; a refusal stands until the listings refresh. */
export function offerProperty(
  state: GameState,
  siteId: string,
  offer: number,
  account: PropertyAccount,
): CommandResult<{ accepted: boolean }> {
  const site = state.world.sites[siteId];
  const listing = state.realEstate.listings[siteId];
  if (!site?.property || !listing) return fail('This building is not for sale right now.');
  if (state.realEstate.properties[siteId]) return fail('You already own this building.');
  if (site.cityId !== state.world.currentCityId)
    return fail('You need to be in this city to buy here.');
  if (!Number.isFinite(offer) || offer <= 0) return fail('Enter an offer above zero.');
  if (listing.rejectedOffer !== undefined)
    return fail(
      `The seller turned down ${money(listing.rejectedOffer)}. Try again when the listings refresh.`,
    );
  if (account === 'company') {
    const block = ventureTierBlock(state);
    if (block) return fail(block);
  }
  const cash = account === 'company' ? state.company.cash : state.personal.cash;
  if (offer > cash)
    return fail(
      `You need ${money(offer)} in ${account === 'company' ? 'corporate' : 'personal'} cash.`,
    );

  const accepted = stream(state, 'realEstate').chance(offerAcceptance(offer, listing.asking));
  if (!accepted) {
    listing.rejectedOffer = offer;
    pushEvent(
      state,
      'PROPERTY_OFFER_REJECTED',
      { siteId, address: site.address, offer },
      6,
      siteId,
    );
    return ok({ accepted: false });
  }

  const marketRent = marketRentFor(site);
  const value = listing.estimate;
  if (account === 'company') {
    postCash(state, -offer, 'investing');
    // The building enters the books at its estimated value; paying more or less is a gain or loss.
    postPnl(state, 'propertyGains', value - offer);
  } else {
    state.personal.cash -= offer;
  }
  state.realEstate.properties[siteId] = {
    id: siteId,
    cityId: site.cityId,
    owner: account,
    sqm: site.property.sqm,
    purchasePrice: offer,
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
    { siteId, address: site.address, price: offer, account, cityId: site.cityId },
    account === 'company' ? 3 : 5,
    siteId,
  );
  return ok({ accepted: true });
}

/** Sets an owned building's annual rent per m², within REAL_ESTATE.rentRange of market rent. */
export function setPropertyRent(
  state: GameState,
  siteId: string,
  rentPerSqm: number,
): CommandResult {
  const p = state.realEstate.properties[siteId];
  if (!p) return fail("You don't own this building.");
  const { min, max } = rentBounds(p.marketRent);
  if (!Number.isFinite(rentPerSqm) || rentPerSqm < min - 1e-6 || rentPerSqm > max + 1e-6)
    return fail(`Rent must be between ${money(min)} and ${money(max)} per m² a year.`);
  p.rent = rentPerSqm;
  return ok();
}

/** Lists an owned building for sale (it sells within 2–8 weeks) or takes it off the market. */
export function setPropertyForSale(state: GameState, siteId: string, on: boolean): CommandResult {
  const p = state.realEstate.properties[siteId];
  if (!p) return fail("You don't own this building.");
  if (on === p.forSale) return ok();
  p.forSale = on;
  if (on) {
    const [lo, hi] = REAL_ESTATE.saleWeeks;
    p.saleWeek = state.clock.week + stream(state, 'realEstate').int(lo, hi);
  } else {
    delete p.saleWeek;
  }
  return ok();
}

/**
 * Rent or Sell all for a city's foreclosed homes (§21.3). Sell all settles in
 * 1–4 weeks and can't be called off once started.
 */
export function setReoMode(state: GameState, cityId: string, mode: ReoPool['mode']): CommandResult {
  const pool = state.reo[cityId];
  if (!pool || pool.value <= 0)
    return fail(`No foreclosed homes in ${CITIES[cityId]?.name ?? 'this city'}.`);
  if (pool.mode === 'selling') return fail('The sale is already under way.');
  if (mode === pool.mode) return ok();
  pool.mode = mode;
  if (mode === 'selling') {
    const [lo, hi] = REO.sellWeeks;
    pool.sellWeek = state.clock.week + stream(state, 'reo').int(lo, hi);
  }
  return ok();
}
