// Stage 9 personal commands (SIMULATION §22, SCREENS §19): offer on a vacation
// home, rebuild or sell one you own; buy a car at a dealer and sell it; sign or
// end a dealer financing deal. Homes and cars are bought with personal cash and
// only in the city where they stand (DESIGN §5.17); managing what you own works
// from anywhere. Dealer financing is the bank's deal: its fee is a company expense.
import { DEALER_FINANCING, HOMES_CFG } from '../../config/balance';
import { CARS } from '../../data/cars';
import { HOMES } from '../../data/homes';
import { pushEvent } from '../events';
import { newId } from '../ids';
import {
  activeDealerDeal,
  carResale,
  homeAsking,
  homeHpi,
  homeLockWeeks,
  homeOfferAcceptance,
  homeSalePrice,
  openBranchesIn,
  ownedHome,
  rebuildCost,
} from '../personalValues';
import { stream } from '../rng';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

const NOT_HERE = 'You need to be in this city to buy here.';

/**
 * Offers on the vacation home at a map building, with personal cash. The seller
 * answers at once (§21.1-style ramp); a refusal shuts the door for
 * HOMES_CFG.refusalWeeks. The home is worth its asking price, so a bargain
 * shows as a gain.
 */
export function offerHome(
  state: GameState,
  siteId: string,
  offer: number,
): CommandResult<{ accepted: boolean }> {
  const site = state.world.sites[siteId];
  const spec = site?.kind === 'vacationHome' ? HOMES[site.refId] : undefined;
  if (!site || !spec) return fail('That home is not on the market.');
  if (ownedHome(state, spec.id)) return fail('You already own this home.');
  if (site.cityId !== state.world.currentCityId) return fail(NOT_HERE);
  if (!Number.isFinite(offer) || offer <= 0) return fail('Enter an offer above zero.');
  const lock = homeLockWeeks(state, spec.id);
  if (lock > 0)
    return fail(`The seller won't hear another offer for ${lock} week${lock === 1 ? '' : 's'}.`);
  const asking = homeAsking(state, spec.id);
  if (offer > asking) return fail('Offer the asking price at most.');
  if (offer > state.personal.cash) return fail(`You need ${money(offer)} in personal cash.`);

  const e = state.personal.empire;
  if (!stream(state, 'personal').chance(homeOfferAcceptance(offer, asking))) {
    (e.offerLocks ??= {})[spec.id] = state.clock.week + HOMES_CFG.refusalWeeks;
    return ok({ accepted: false });
  }
  if (e.offerLocks) delete e.offerLocks[spec.id];
  state.personal.cash -= offer;
  e.homes.push({
    id: newId(state, 'home'),
    homeId: spec.id,
    price: offer,
    value: asking,
    boughtWeek: state.clock.week,
    hpiRef: homeHpi(state, spec.id),
  });
  pushEvent(state, 'HOME_BOUGHT', { homeId: spec.id, name: spec.name, price: offer });
  return ok({ accepted: true });
}

/** Starts a rebuild: costs HOMES_CFG.rebuildCost of value now, adds rebuildGain after rebuildWeeks. */
export function rebuildHome(state: GameState, homeId: string): CommandResult<{ cost: number }> {
  const home = ownedHome(state, homeId);
  if (!home) return fail("You don't own this home.");
  if (home.rebuildDoneWeek !== undefined) return fail('A rebuild is already under way.');
  const cost = rebuildCost(home.value);
  if (cost > state.personal.cash) return fail(`You need ${money(cost)} in personal cash.`);
  state.personal.cash -= cost;
  home.rebuildDoneWeek = state.clock.week + HOMES_CFG.rebuildWeeks;
  return ok({ cost });
}

/** Sells a home for its value less HOMES_CFG.sellFee, from anywhere. */
export function sellHome(state: GameState, homeId: string): CommandResult<{ price: number }> {
  const e = state.personal.empire;
  const home = ownedHome(state, homeId);
  if (!home) return fail("You don't own this home.");
  const price = homeSalePrice(home.value);
  state.personal.cash += price;
  e.homes = e.homes.filter((h) => h !== home);
  pushEvent(state, 'HOME_SOLD', { homeId, name: HOMES[homeId]?.name ?? homeId, price });
  return ok({ price });
}

/** Buys a car at the dealer on this map building with personal cash. Limited cars: one each. */
export function buyCar(state: GameState, siteId: string, carId: string): CommandResult {
  const site = state.world.sites[siteId];
  const spec = CARS[carId];
  if (site?.kind !== 'autoDealer') return fail('That dealer is not on the map.');
  if (!spec) return fail('Unknown car.');
  if (site.cityId !== state.world.currentCityId) return fail(NOT_HERE);
  const e = state.personal.empire;
  if (spec.limited && e.cars.some((c) => c.carId === carId))
    return fail(`Only one ${spec.name} per owner.`);
  if (spec.price > state.personal.cash)
    return fail(`You need ${money(spec.price)} in personal cash.`);
  state.personal.cash -= spec.price;
  e.cars.push({
    id: newId(state, 'car'),
    carId,
    price: spec.price,
    value: spec.price,
    boughtWeek: state.clock.week,
  });
  pushEvent(state, 'CAR_BOUGHT', { carId, name: spec.name, price: spec.price });
  return ok();
}

/** Sells a car you own (by its owned id) for its value less the resale haircut. */
export function sellCar(state: GameState, ownedId: string): CommandResult<{ price: number }> {
  const e = state.personal.empire;
  const car = e.cars.find((c) => c.id === ownedId);
  if (!car) return fail("You don't own that car.");
  const price = carResale(car);
  state.personal.cash += price;
  e.cars = e.cars.filter((c) => c !== car);
  pushEvent(state, 'CAR_SOLD', {
    carId: car.carId,
    name: CARS[car.carId]?.name ?? car.carId,
    price,
  });
  return ok({ price });
}

/**
 * Signs dealer financing at this dealer (SCREENS §19): the bank pays
 * DEALER_FINANCING.feePerYear (weekly, P&L dealerFees) for termWeeks, and
 * auto-loan demand at its branches in the city rises × (1 + demandBoost).
 */
export function signDealerDeal(state: GameState, siteId: string): CommandResult {
  const site = state.world.sites[siteId];
  if (site?.kind !== 'autoDealer') return fail('That dealer is not on the map.');
  if (activeDealerDeal(state, siteId)) return fail('You already have a deal with this dealer.');
  if (site.cityId !== state.world.currentCityId)
    return fail('You need to be in this city to sign.');
  if (openBranchesIn(state, site.cityId) === 0)
    return fail('Open a branch in this city first: the dealer refers customers to it.');
  const week = state.clock.week;
  state.dealerDeals[siteId] = {
    siteId,
    cityId: site.cityId,
    signedWeek: week,
    endWeek: week + DEALER_FINANCING.termWeeks,
    feePerYear: DEALER_FINANCING.feePerYear,
  };
  pushEvent(state, 'DEALER_SIGNED', { siteId, city: site.cityId, dealer: site.refId });
  return ok();
}

/** Ends a dealer financing deal early (no fee after this week). */
export function endDealerDeal(state: GameState, siteId: string): CommandResult {
  const deal = state.dealerDeals[siteId];
  if (!deal) return fail('There is no deal with this dealer.');
  delete state.dealerDeals[siteId];
  pushEvent(state, 'DEALER_ENDED', {
    siteId,
    city: deal.cityId,
    dealer: state.world.sites[siteId]?.refId ?? 'The dealer',
    expired: false,
  });
  return ok();
}
