// Stage 7 map buildings (CONTENT §16, SIMULATION §21.1): property buildings
// you can buy (Real Estate layer), the convention centre in host cities and L/XL
// cities (Conventions layer) and the country's lobbying firm (Lobbying Firms
// layer). Seeded from the `sites7:{cityId}` stream so lots, offices and earlier
// sites never move, and placed on free street-facing tiles like hqSites.ts.
import { CITYGEN, REAL_ESTATE } from '../config/balance';
import { CITIES } from '../data/cities';
import { conventionIn } from '../data/conventions';
import { lobbyFirmFor } from '../data/lobbying';
import { STREET_KINDS, STREET_NAMES } from '../data/names';
import type { DistrictId } from '../data/types';
import { nearestFrontage } from './cityLayout';
import { clamp } from './math';
import { stream } from './rng';
import type { GameState, Site, SiteKind } from './state';

/** Districts a property building can stand in. */
const PROPERTY_DISTRICTS: DistrictId[] = [
  'financial',
  'downtown',
  'midtown',
  'university',
  'suburbs',
  'industrial',
  'waterfront',
];

/** Adds the city's property buildings, convention centre and lobbying firm. Safe to call once per city. */
export function generateInvestmentSites(state: GameState, cityId: string): void {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  const rng = stream(state, `sites7:${cityId}`);
  const used = new Set<string>();
  const mark = (t: { x: number; y: number }) => used.add(`${t.x},${t.y}`);
  for (const lot of Object.values(state.world.lots)) if (lot.cityId === cityId) mark(lot.tile);
  for (const o of Object.values(state.world.officeListings)) if (o.cityId === cityId) mark(o.tile);
  for (const s of Object.values(state.world.sites)) if (s.cityId === cityId) mark(s.tile);

  const add = (kind: SiteKind, key: string, refId: string, district: DistrictId): Site => {
    const d = district === 'waterfront' && !city.water ? 'industrial' : district;
    const at = CITYGEN.layout[d];
    const px = Math.round(
      clamp(rng.normal(at.cx, at.spread), CITYGEN.edge, 1 - CITYGEN.edge) * (city.tiles - 1),
    );
    const py = Math.round(
      clamp(rng.normal(at.cy, at.spread), CITYGEN.edge, 1 - CITYGEN.edge) * (city.tiles - 1),
    );
    const tile = nearestFrontage(city, px, py, used);
    if (!tile) throw new Error(`No room for another building in ${city.name}`);
    mark(tile);
    const site: Site = {
      id: `site_${cityId}_${kind}_${key}`,
      cityId,
      kind,
      refId,
      tile,
      district: d,
      address: `${rng.int(1, CITYGEN.maxStreetNumber)} ${rng.pick(STREET_NAMES)} ${rng.pick(STREET_KINDS)}`,
      buildingSeed: rng.int(0, CITYGEN.maxSeed),
    };
    state.world.sites[site.id] = site;
    return site;
  };

  const count = REAL_ESTATE.buildingsPerCity[city.size];
  const [lo, hi] = REAL_ESTATE.sqmRange;
  for (let i = 0; i < count; i++) {
    const key = `p${i + 1}`;
    if (state.world.sites[`site_${cityId}_property_${key}`]) continue;
    const site = add('property', key, '', rng.pick(PROPERTY_DISTRICTS));
    site.refId = site.id;
    const sqm = Math.round(rng.range(lo, hi) / 100) * 100;
    site.property = { sqm, floors: Math.max(1, Math.round(sqm / REAL_ESTATE.sqmPerFloor)) };
  }

  const convention = conventionIn(cityId);
  if (convention || city.size === 'L' || city.size === 'XL') {
    if (!state.world.sites[`site_${cityId}_conventionCenter_venue`])
      add('conventionCenter', 'venue', convention?.id ?? '', 'downtown');
  }

  const firm = lobbyFirmFor(city.country);
  if (firm && !state.world.sites[`site_${cityId}_lobbyingFirm_${firm.id}`]) {
    add('lobbyingFirm', firm.id, firm.id, 'financial');
  }
}
