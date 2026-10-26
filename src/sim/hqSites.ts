// Office buildings for lease and other non-bank sites (credit bureaus, marketing
// agencies) on a city's street grid (Stage 4). Seeded from the `sites:{cityId}`
// stream so storefront lots are unchanged, and placed on free tiles facing a
// street near their district centres, like storefront lots (citygen.ts).
import {
  CITYGEN,
  OFFICE_DEPOSIT_WEEKS,
  OFFICE_LISTINGS,
  OFFICE_RENT_PER_FLOOR,
} from '../config/balance';
import { agenciesIn } from '../data/brandCampaigns';
import { bureausIn } from '../data/bureaus';
import { CITIES } from '../data/cities';
import { STREET_KINDS, STREET_NAMES } from '../data/names';
import type { DistrictId } from '../data/types';
import { geometryFor, placeNear } from './cityPlacement';
import { listPrice } from './nominal';
import { stream, type Rng } from './rng';
import type { GameState, OfficeListing, Site, SiteKind } from './state';

/** Weekly rent of a whole office building (§16.1), at today's price list (§4.6). */
export function officeRent(state: GameState, floors: number, cityId: string): number {
  return listPrice(
    state,
    floors * OFFICE_RENT_PER_FLOOR * (CITIES[cityId]?.rentIndex ?? 1),
    cityId,
  );
}

/** Adds the city's office listings and sites to the world. Safe to call once per city. */
export function generateSites(state: GameState, cityId: string): void {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  const rng = stream(state, `sites:${cityId}`);
  const used = new Set<string>();
  for (const lot of Object.values(state.world.lots)) {
    if (lot.cityId === cityId) used.add(`${lot.tile.x},${lot.tile.y}`);
  }
  const geo = geometryFor(state, cityId);
  const place = (district: DistrictId) => placeNear(city, geo, district, rng, used);

  let index = 0;
  for (const [district, count] of listingsByDistrict(OFFICE_LISTINGS.countBySize[city.size])) {
    for (let i = 0; i < count; i++) {
      const tile = place(district);
      const floors = rng.int(...OFFICE_LISTINGS.floors);
      const desksPerFloor = rng.chance(OFFICE_LISTINGS.wideFloorChance) ? 32 : 24;
      const weeklyRent = officeRent(state, floors, cityId);
      index += 1;
      const listing: OfficeListing = {
        id: `office_${cityId}_${String(index).padStart(2, '0')}`,
        cityId,
        tile,
        district,
        address: address(rng),
        floors,
        desksPerFloor,
        area: floors * desksPerFloor * OFFICE_LISTINGS.areaPerDesk,
        weeklyRent,
        deposit: weeklyRent * OFFICE_DEPOSIT_WEEKS,
        buildingSeed: rng.int(0, CITYGEN.maxSeed),
      };
      state.world.officeListings[listing.id] = listing;
    }
  }

  const cityIndex = Object.keys(CITIES).indexOf(cityId);
  const sites: [SiteKind, string, DistrictId][] = [
    ...bureausIn(cityId).map((b): [SiteKind, string, DistrictId] => ['bureau', b, 'financial']),
    ...agenciesIn(city, cityIndex).map((a): [SiteKind, string, DistrictId] => [
      'agency',
      a,
      'midtown',
    ]),
  ];
  for (const [kind, refId, district] of sites) {
    const tile = place(district);
    const site: Site = {
      id: `site_${cityId}_${kind}_${refId.toLowerCase().replace(/[^a-z]+/g, '_')}`,
      cityId,
      kind,
      refId,
      tile,
      district,
      address: address(rng),
      buildingSeed: rng.int(0, CITYGEN.maxSeed),
    };
    state.world.sites[site.id] = site;
  }
}

/**
 * Splits a city's office listings across districts by OFFICE_LISTINGS.districts
 * shares, largest remainder first, so the total is exact even for 2 listings.
 */
export function listingsByDistrict(total: number): [DistrictId, number][] {
  const shares = Object.entries(OFFICE_LISTINGS.districts) as [DistrictId, number][];
  const counts = shares.map(([district, share]) => ({
    district,
    count: Math.floor(total * share),
    remainder: total * share - Math.floor(total * share),
  }));
  let left = total - counts.reduce((sum, c) => sum + c.count, 0);
  for (const c of [...counts].sort((a, b) => b.remainder - a.remainder)) {
    if (left <= 0) break;
    c.count += 1;
    left -= 1;
  }
  return counts.map((c) => [c.district, c.count]);
}

function address(rng: Rng): string {
  return `${rng.int(1, CITYGEN.maxStreetNumber)} ${rng.pick(STREET_NAMES)} ${rng.pick(STREET_KINDS)}`;
}
