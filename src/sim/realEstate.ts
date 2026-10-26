// Owned buildings and listings, tick step 8 (SIMULATION §21.1–21.2, §21.4).
// Each week: values follow the country's cre (company revaluations post to
// propertyGains through withAssetMarks), each building's market rent eases
// toward today's (base × cre/100), occupancy eases toward the level the rent
// supports (a managing CREO's pricing power counted), rent revenue, maintenance
// and vacancy cost are booked (company buildings in the P&L, private ones in
// personal cash), For Sale buildings that reach their sale week are sold, and
// due cities refresh their listings.
import { REAL_ESTATE } from '../config/balance';
import { pushEvent } from './events';
import { rentPricingPower } from './execSeats';
import { earn, postCash, postPnl, spend } from './ledger';
import { clamp, ema } from './math';
import { withAssetMarks } from './portfolio';
import { markListings, refreshListings } from './propertyListings';
import {
  baseRentFor,
  cityCre,
  estimateValue,
  marketRentNow,
  occupancyTarget,
  propertyWeek,
  rentBounds,
} from './propertyMath';
import { stream } from './rng';
import type { GameState, Property } from './state';

const byId = (state: GameState): Property[] =>
  Object.values(state.realEstate.properties).sort((a, b) => a.id.localeCompare(b.id));

/** Tick step 8 for real estate. */
export function runRealEstate(state: GameState): void {
  withAssetMarks(state, () => {
    for (const p of byId(state)) {
      const site = state.world.sites[p.id];
      const base = site ? baseRentFor(site) : p.marketRent;
      p.value = estimateValue(p.sqm, base, cityCre(state, p.cityId));
    }
  });
  for (const p of byId(state)) runProperty(state, p);
  for (const p of byId(state)) {
    if (p.forSale && p.saleWeek !== undefined && state.clock.week >= p.saleWeek) sell(state, p);
  }
  for (const cityId of Object.keys(state.world.cities).sort()) {
    const due = state.realEstate.listingsRefreshWeek[cityId];
    if (due === undefined || state.clock.week >= due) refreshListings(state, cityId);
  }
  markListings(state);
}

/**
 * §21.2: market rent eases toward today's, the owner's rent stays inside its
 * range of the new market, occupancy eases toward what the rent supports, then
 * this week's rent, maintenance and vacancy cost.
 */
function runProperty(state: GameState, p: Property): void {
  const site = state.world.sites[p.id];
  if (site) p.marketRent = ema(p.marketRent, marketRentNow(state, site), REAL_ESTATE.rentEma);
  const { min, max } = rentBounds(p.marketRent);
  p.rent = clamp(p.rent, min, max);
  const target = occupancyTarget(p.rent, p.marketRent, rentPricingPower(state, p.owner));
  p.occupancy = ema(p.occupancy, target, REAL_ESTATE.occEma);
  const wk = propertyWeek(p);
  if (p.owner === 'company') {
    earn(state, 'rentalIncome', wk.revenue);
    spend(state, 'propertyCosts', wk.maintenance + wk.vacancy);
  } else {
    state.personal.cash += wk.net;
  }
}

/**
 * Completes a For Sale listing at value × normal(1, 0.04). The company's
 * proceeds are investing cash and the difference from value is a property
 * gain or loss, so equity moves only by that difference.
 */
function sell(state: GameState, p: Property): void {
  const price = Math.max(0, p.value * stream(state, 'realEstate').normal(1, REAL_ESTATE.saleSigma));
  if (p.owner === 'company') {
    postCash(state, price, 'investing');
    postPnl(state, 'propertyGains', price - p.value);
  } else {
    state.personal.cash += price;
  }
  delete state.realEstate.properties[p.id];
  const site = state.world.sites[p.id];
  if (site?.property) site.property.occupancy = p.occupancy;
  pushEvent(
    state,
    'PROPERTY_SOLD',
    { siteId: p.id, address: site?.address ?? '', price, account: p.owner, cityId: p.cityId },
    p.owner === 'company' ? 3 : 5,
    p.id,
  );
}
