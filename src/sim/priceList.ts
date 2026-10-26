// The yearly price-list review (SIMULATION §4.6). At each year end every
// country's list index steps to its nominal index, and every rent in that
// country moves by the same step: free storefronts, your branch leases, office
// listings and the offices you lease. Catalogue prices read the list index
// through listPrice (nominal.ts), so they move together with the rents.
import { CITIES } from '../data/cities';
import type { GameState } from './state';

/** The step each country's list moves at this review: nominal ÷ list, by country id. */
function stepsByCountry(state: GameState): Map<string, number> {
  const steps = new Map<string, number>();
  for (const c of Object.values(state.world.countries)) {
    if (!c) continue;
    const list = c.listIndex || 1;
    steps.set(c.id, c.nominal / list);
    c.listIndex = c.nominal;
  }
  return steps;
}

/** Year end (tick step 14): price lists step to the nominal index and rents follow. */
export function reviewPriceLists(state: GameState): void {
  const steps = stepsByCountry(state);
  const stepOf = (cityId: string) => steps.get(CITIES[cityId]?.country ?? '') ?? 1;
  const review = (rent: number, cityId: string) => Math.round(rent * stepOf(cityId));
  for (const lot of Object.values(state.world.lots)) {
    lot.weeklyRent = review(lot.weeklyRent, lot.cityId);
    lot.deposit = review(lot.deposit, lot.cityId);
  }
  for (const listing of Object.values(state.world.officeListings)) {
    listing.weeklyRent = review(listing.weeklyRent, listing.cityId);
    listing.deposit = review(listing.deposit, listing.cityId);
  }
  // A lease's deposit was paid at signing and comes back as paid; only the rent moves.
  for (const b of Object.values(state.branches)) {
    b.lease.weeklyRent = review(b.lease.weeklyRent, b.cityId);
  }
  for (const o of Object.values(state.offices)) {
    o.weeklyRent = review(o.weeklyRent, o.cityId);
  }
}
