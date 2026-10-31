// The drawable city (ART_DIRECTION §2, ROADMAP Stage 3): every tile of the grid
// classified as street, water, park, landmark, storefront lot, office building
// for lease, other site (credit bureau, marketing agency) or filler building,
// with its district, height and art seed. Pure and seeded from the save seed and
// city id, so a city looks the same in every session. Streets and shoreline come
// from the simulation's cityLayout so lots always face a street. Offices and
// sites are claimed before landmarks and parks, so those never cover them.
// Regional sites (CONTENT §2) are low small towns with only the airport landmark.
// The geometry (water form, bridges, big park, district centres) depends on the
// city's layout version (cityGeo.ts); layout 2 adds a skyline, plazas, avenue
// trees and boats (cityDecor.ts).
import { GEO, LATEST_LAYOUT, type LayoutVersion } from '../config/cityGeo';
import {
  FLOORS,
  OFFICE_ART_EXTRA_STOREYS,
  PARK_SHARE,
  REGIONAL_MAX_FLOORS,
  SITE_STOREYS,
  SKYLINE_DISTRICTS,
  type LandmarkId,
} from '../config/map';
import type { CitySpec } from '../data/cities';
import { cityLook, type Signature } from '../data/cityLooks';
import { DISTRICTS, type DistrictId } from '../data/types';
import { cityGeometry, type CityGeometry } from '../sim/cityGeo';
import type { Lot, OfficeListing, Site, SiteKind } from '../sim/state';
import { fillBlock, freeBlocks, KIND, TILE_KINDS, type TileKind } from './cityBlocks';
import { markStreetLife, placeLandmarks, placePlazas } from './cityDecor';
import { artRng, hashString, mixSeed } from './prng';

export { TILE_KINDS, type TileKind } from './cityBlocks';

export interface LandmarkSite {
  id: LandmarkId;
  /** Top-left building tile of its 3×3 block. */
  x: number;
  y: number;
  size: number;
  /** For the 'signature' landmark: which one-of-a-kind building stands here. */
  signature?: Signature;
  /**
   * Layout 2, for landmarks placed by the water: the grid direction from the
   * block toward the open water (one of ±x, ±y), e.g. for a bridge span.
   */
  waterSide?: { dx: number; dy: number };
}

export interface CityMap {
  cityId: string;
  /** Tiles per side. */
  tiles: number;
  ink: string;
  /** The city's layout version and its resolved geometry (water, bridges, park). */
  layout: LayoutVersion;
  geo: CityGeometry;
  /** Per tile, indexed y × tiles + x. `kind` indexes TILE_KINDS, `district` indexes DISTRICTS. */
  kind: Uint8Array;
  district: Uint8Array;
  floors: Uint8Array;
  seed: Uint32Array;
  /** Street life flags per tile (cityDecor.ts DECOR): avenue trees, plaza, fountain, boat. */
  decor: Uint8Array;
  /** Storefront lot id by tile index. */
  lotAt: Map<number, string>;
  /** Office listing id by tile index (Stage 4). */
  officeAt: Map<number, string>;
  /** Credit bureau or marketing agency by tile index (Stage 4). */
  siteAt: Map<number, { id: string; kind: SiteKind }>;
  landmarks: LandmarkSite[];
}

/** Non-storefront buildings to place on the map (Stage 4). */
export interface MapPlaces {
  offices?: Pick<OfficeListing, 'id' | 'tile' | 'district' | 'floors' | 'buildingSeed'>[];
  sites?: Pick<Site, 'id' | 'kind' | 'tile' | 'district' | 'buildingSeed' | 'property'>[];
  /** The city's layout version (CityState.layout); the latest when omitted. */
  layout?: LayoutVersion;
}

export interface TileInfo {
  x: number;
  y: number;
  kind: TileKind;
  district: DistrictId;
  floors: number;
  seed: number;
  lotId?: string;
  officeId?: string;
  siteId?: string;
  siteKind?: SiteKind;
}

const DISTRICT_INDEX = Object.fromEntries(DISTRICTS.map((d, i) => [d, i])) as Record<
  DistrictId,
  number
>;

export function tileAt(map: CityMap, x: number, y: number): TileInfo | undefined {
  if (x < 0 || y < 0 || x >= map.tiles || y >= map.tiles) return undefined;
  const i = y * map.tiles + x;
  return {
    x,
    y,
    kind: TILE_KINDS[map.kind[i]!]!,
    district: DISTRICTS[map.district[i]!]!,
    floors: map.floors[i]!,
    seed: map.seed[i]!,
    lotId: map.lotAt.get(i),
    officeId: map.officeAt.get(i),
    siteId: map.siteAt.get(i)?.id,
    siteKind: map.siteAt.get(i)?.kind,
  };
}

/**
 * The district whose centre (scaled by its spread) is nearest, like the lot
 * scatter. In layout 2 filler only counts as waterfront near the water.
 */
export function districtAt(geo: CityGeometry, x: number, y: number): DistrictId {
  let best: DistrictId = 'midtown';
  let bestD = Infinity;
  const shore = geo.shoreDist[y * geo.tiles + x]!;
  for (const d of DISTRICTS) {
    if (d === 'waterfront' && geo.form === 'none') continue;
    if (d === 'waterfront' && geo.version > 1 && shore > GEO.waterfrontReach) continue;
    const p = geo.centres[d];
    const dx = x / geo.tiles - p.cx;
    const dy = y / geo.tiles - p.cy;
    const dist = (dx * dx + dy * dy) / (p.spread * p.spread);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

export function generateCityMap(
  city: CitySpec,
  saveSeed: number,
  lots: Lot[],
  places: MapPlaces = {},
): CityMap {
  const n = city.tiles;
  const rng = artRng(mixSeed(saveSeed, hashString(`citymap:${city.id}`)));
  const layout = places.layout ?? LATEST_LAYOUT;
  const geo = cityGeometry(city, layout);
  const map: CityMap = {
    cityId: city.id,
    tiles: n,
    ink: city.ink,
    layout,
    geo,
    kind: new Uint8Array(n * n),
    district: new Uint8Array(n * n),
    floors: new Uint8Array(n * n),
    seed: new Uint32Array(n * n),
    decor: new Uint8Array(n * n),
    lotAt: new Map(),
    officeAt: new Map(),
    siteAt: new Map(),
    landmarks: [],
  };

  const regional = !!city.regional;
  const floorsFor = (d: DistrictId, seed: number) => {
    const [lo, top] = FLOORS[d];
    const hi = regional ? Math.max(1, Math.min(top, REGIONAL_MAX_FLOORS)) : top;
    const base = Math.min(lo, hi);
    return base + (seed % (hi - base + 1));
  };
  // Layout 2: the look's skyline raises (or lowers) the tall districts' filler.
  const skyline = layout > 1 && !regional ? cityLook(city.id).skyline : 1;
  const fillerFloors = (d: DistrictId, seed: number) => {
    const f = floorsFor(d, seed);
    return SKYLINE_DISTRICTS.includes(d) ? Math.max(1, Math.round(f * skyline)) : f;
  };

  // Base pass: water, streets, the big park and filler buildings.
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const d = districtAt(geo, x, y);
      map.district[i] = DISTRICT_INDEX[d];
      map.seed[i] = mixSeed(saveSeed, x, y, hashString(city.id));
      if (geo.water[i]) map.kind[i] = KIND.water;
      else if (geo.street[i]) map.kind[i] = KIND.street;
      else if (geo.park[i]) map.kind[i] = KIND.park;
      else {
        map.kind[i] = KIND.building;
        map.floors[i] = fillerFloors(d, map.seed[i]!);
      }
    }
  }

  // Storefront lots keep their own district and building seed.
  for (const lot of lots) {
    const i = lot.tile.y * n + lot.tile.x;
    map.kind[i] = KIND.lot;
    map.district[i] = DISTRICT_INDEX[lot.district];
    map.seed[i] = lot.buildingSeed >>> 0;
    map.floors[i] = floorsFor(lot.district, map.seed[i]!);
    map.lotAt.set(i, lot.id);
  }

  // Office buildings stand taller than the floors you can lease (lobby and crown).
  for (const o of places.offices ?? []) {
    const i = o.tile.y * n + o.tile.x;
    map.kind[i] = KIND.office;
    map.district[i] = DISTRICT_INDEX[o.district];
    map.seed[i] = o.buildingSeed >>> 0;
    map.floors[i] = Math.max(FLOORS[o.district][0], o.floors + OFFICE_ART_EXTRA_STOREYS);
    map.officeAt.set(i, o.id);
  }
  for (const site of places.sites ?? []) {
    const i = site.tile.y * n + site.tile.x;
    map.kind[i] = KIND.site;
    map.district[i] = DISTRICT_INDEX[site.district];
    map.seed[i] = site.buildingSeed >>> 0;
    map.floors[i] = site.property?.floors ?? SITE_STOREYS[site.kind];
    map.siteAt.set(i, { id: site.id, kind: site.kind });
  }

  // Whole land blocks without lots can hold a landmark, a plaza or a park.
  const free = freeBlocks(map);
  placeLandmarks(map, city, free);
  if (layout > 1 && !regional) placePlazas(map, city, free);
  for (const b of free) {
    const d = DISTRICTS[map.district[(b.y + 1) * n + b.x + 1]!]!;
    if (rng.chance(PARK_SHARE[d])) fillBlock(map, b, KIND.park);
  }
  if (layout > 1) markStreetLife(map, saveSeed);
  return map;
}
