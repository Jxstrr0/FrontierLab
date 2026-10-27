// Read-only views of GameState for the real estate screens (SCREENS §16, §24):
// what a building's panel shows (for sale, owned or neither), the Company
// panel's list of company buildings.
import { REAL_ESTATE } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { marketRentNow, propertyWeek } from '../../sim/propertyMath';
import type { GameState, Property, PropertyListing, Site } from '../../sim/state';

export type PropertyView =
  | { kind: 'listed'; site: Site; listing: PropertyListing; marketRent: number; refreshIn: number }
  | { kind: 'owned'; site: Site; property: Property }
  | { kind: 'none'; site: Site; refreshIn: number };

/** Weeks until the city's listings refresh (at least 1). */
export function weeksToRefresh(s: GameState, cityId: string): number {
  const due = s.realEstate.listingsRefreshWeek[cityId] ?? s.clock.week + REAL_ESTATE.refreshWeeks;
  return Math.max(1, due - s.clock.week);
}

export function propertyView(s: GameState, siteId: string): PropertyView | undefined {
  const site = s.world.sites[siteId];
  if (!site?.property) return undefined;
  const property = s.realEstate.properties[siteId];
  if (property) return { kind: 'owned', site, property };
  const listing = s.realEstate.listings[siteId];
  const refreshIn = weeksToRefresh(s, site.cityId);
  if (listing)
    return { kind: 'listed', site, listing, marketRent: marketRentNow(s, site), refreshIn };
  return { kind: 'none', site, refreshIn };
}

/** Offer stepper bounds and step for a listing (REAL_ESTATE.offerMin to asking). */
export function offerBounds(asking: number): { min: number; max: number; step: number } {
  const step = Math.max(1000, Math.round((asking * REAL_ESTATE.offerStep) / 1000) * 1000);
  return { min: Math.round((asking * REAL_ESTATE.offerMin) / step) * step, max: asking, step };
}

export interface OwnedRow {
  siteId: string;
  address: string;
  city: string;
  value: number;
  net: number;
  forSale: boolean;
}

/** Buildings an account owns, largest first, with value and weekly net. */
export function ownedBuildings(s: GameState, owner: Property['owner']): OwnedRow[] {
  return Object.values(s.realEstate.properties)
    .filter((p) => p.owner === owner)
    .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))
    .map((p) => ({
      siteId: p.id,
      address: s.world.sites[p.id]?.address ?? p.id,
      city: CITIES[p.cityId]?.name ?? p.cityId,
      value: p.value,
      net: propertyWeek(p).net,
      forSale: p.forSale,
    }));
}
