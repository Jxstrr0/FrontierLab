// Stage 9 personal commands (SIMULATION §22, SCREENS §19): offer on a vacation
// home, rebuild or sell one you own; buy a car at a dealer and sell it. Homes
// and cars are bought with personal cash and only in the city where they stand
// (DESIGN §5.17); managing what you own works from anywhere.
import { HOMES_CFG } from '../../config/balance';
import { CARS } from '../../data/cars';
import { HOMES } from '../../data/homes';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { listPrice } from '../nominal';
import {
  carResale,
  homeAsking,
  homeHpi,
  homeLockWeeks,
  homeOfferAcceptance,
  homeSalePrice,
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
 * HOMES_CFG.refusalWeeks. The home is booked at the price paid, so buying
 * and selling at once only loses the sale fee.
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
  if (offer > state.personal.cash) return fail(`You need ${money(state, offer)} in personal cash.`);

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
    value: offer,
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
  if (cost > state.personal.cash) return fail(`You need ${money(state, cost)} in personal cash.`);
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
  // Dealer prices follow today's price list in the dealer's country (§4.6).
  const price = listPrice(state, spec.price, site.cityId);
  if (price > state.personal.cash) return fail(`You need ${money(state, price)} in personal cash.`);
  state.personal.cash -= price;
  e.cars.push({
    id: newId(state, 'car'),
    carId,
    price,
    value: price,
    boughtWeek: state.clock.week,
  });
  pushEvent(state, 'CAR_BOUGHT', { carId, name: spec.name, price });
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
