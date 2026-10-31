// Stage 9 map buildings (CONTENT §16, §20): a car dealer in every M/L/XL city
// (Auto Dealers layer), the auction house in its two cities (Auction Houses
// layer) and each vacation home in its city (Real Estate layer). Seeded from
// the `sites9:{cityId}` stream so earlier buildings never move, and placed on
// free street-facing tiles like the other site generators.
import { CITYGEN } from '../config/balance';
import { DEALER_NAMES } from '../data/cars';
import { CITIES } from '../data/cities';
import { auctionHouseIn } from '../data/collectibles';
import { homesIn } from '../data/homes';
import type { DistrictId } from '../data/types';
import { geometryFor, placeNear } from './cityPlacement';
import { stream } from './rng';
import type { GameState, Site, SiteKind } from './state';
import { streetAddress } from './streets';

/** Adds the city's car dealer, auction house and vacation homes. Safe to call once per city. */
export function generatePersonalSites(state: GameState, cityId: string): void {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  if (city.regional) return;
  const rng = stream(state, `sites9:${cityId}`);
  const used = new Set<string>();
  const mark = (t: { x: number; y: number }) => used.add(`${t.x},${t.y}`);
  for (const lot of Object.values(state.world.lots)) if (lot.cityId === cityId) mark(lot.tile);
  for (const o of Object.values(state.world.officeListings)) if (o.cityId === cityId) mark(o.tile);
  for (const s of Object.values(state.world.sites)) if (s.cityId === cityId) mark(s.tile);

  const geo = geometryFor(state, cityId);
  const add = (kind: SiteKind, key: string, refId: string, district: DistrictId): void => {
    const id = `site_${cityId}_${kind}_${key}`;
    if (state.world.sites[id]) return;
    const d = district === 'waterfront' && !city.water ? 'suburbs' : district;
    const tile = placeNear(city, geo, d, rng, used);
    const site: Site = {
      id,
      cityId,
      kind,
      refId,
      tile,
      district: d,
      address: streetAddress(rng, cityId),
      buildingSeed: rng.int(0, CITYGEN.maxSeed),
    };
    state.world.sites[id] = site;
  };

  if (city.size !== 'S') add('autoDealer', 'dealer', rng.pick(DEALER_NAMES), 'midtown');
  const house = auctionHouseIn(cityId);
  if (house) add('auctionHouse', house.id, house.id, 'downtown');
  for (const home of homesIn(cityId)) add('vacationHome', home.id, home.id, 'waterfront');
}
