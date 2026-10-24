// The drawable city (ART_DIRECTION §2, ROADMAP Stage 3): every tile of the grid
// classified as street, water, park, landmark, storefront lot, office building
// for lease, other site (credit bureau, marketing agency) or filler building,
// with its district, height and art seed. Pure and seeded from the save seed and
// city id, so a city looks the same in every session. Streets and shoreline come
// from the simulation's cityLayout so lots always face a street. Offices and
// sites are claimed before landmarks and parks, so those never cover them.
import { CITYGEN, CITY_LAYOUT } from '../config/balance';
import {
  FLOORS,
  LANDMARKS,
  OFFICE_ART_EXTRA_STOREYS,
  PARK_SHARE,
  SITE_STOREYS,
  type LandmarkId,
} from '../config/map';
import type { CitySpec } from '../data/cities';
import { DISTRICTS, type DistrictId } from '../data/types';
import { isStreet, isWater } from '../sim/cityLayout';
import type { Lot, OfficeListing, Site, SiteKind } from '../sim/state';
import { artRng, hashString, mixSeed } from './prng';

export const TILE_KINDS = [
  'street',
  'water',
  'park',
  'landmark',
  'lot',
  'building',
  'office',
  'site',
] as const;
export type TileKind = (typeof TILE_KINDS)[number];

export interface LandmarkSite {
  id: LandmarkId;
  /** Top-left building tile of its 3×3 block. */
  x: number;
  y: number;
  size: number;
}

export interface CityMap {
  cityId: string;
  /** Tiles per side. */
  tiles: number;
  ink: string;
  /** Per tile, indexed y × tiles + x. `kind` indexes TILE_KINDS, `district` indexes DISTRICTS. */
  kind: Uint8Array;
  district: Uint8Array;
  floors: Uint8Array;
  seed: Uint32Array;
  /** Storefront lot id by tile index. */
  lotAt: Map<number, string>;
  /** Office listing id by tile index (Stage 4). */
  officeAt: Map<number, string>;
  /** Credit bureau or marketing agency by tile index (Stage 4). */
  siteAt: Map<number, { id: string; kind: SiteKind }>;
  landmarks: LandmarkSite[];
}

/** Non-storefront buildings to place on the map (Stage 4); omitted while FEATURES.hq is off. */
export interface MapPlaces {
  offices?: Pick<OfficeListing, 'id' | 'tile' | 'district' | 'floors' | 'buildingSeed'>[];
  sites?: Pick<Site, 'id' | 'kind' | 'tile' | 'district' | 'buildingSeed'>[];
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

const KIND = Object.fromEntries(TILE_KINDS.map((k, i) => [k, i])) as Record<TileKind, number>;
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

/** The district whose centre (scaled by its spread) is nearest, like the lot scatter. */
export function districtAt(city: CitySpec, x: number, y: number): DistrictId {
  let best: DistrictId = 'midtown';
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    if (d === 'waterfront' && !city.water) continue;
    const p = CITYGEN.layout[d];
    const dx = x / city.tiles - p.cx;
    const dy = y / city.tiles - p.cy;
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
  const map: CityMap = {
    cityId: city.id,
    tiles: n,
    ink: city.ink,
    kind: new Uint8Array(n * n),
    district: new Uint8Array(n * n),
    floors: new Uint8Array(n * n),
    seed: new Uint32Array(n * n),
    lotAt: new Map(),
    officeAt: new Map(),
    siteAt: new Map(),
    landmarks: [],
  };

  const floorsFor = (d: DistrictId, seed: number) => {
    const [lo, hi] = FLOORS[d];
    return lo + (seed % (hi - lo + 1));
  };

  // Base pass: water, streets and filler buildings.
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const d = districtAt(city, x, y);
      map.district[i] = DISTRICT_INDEX[d];
      map.seed[i] = mixSeed(saveSeed, x, y, hashString(city.id));
      if (isWater(city, x, y)) map.kind[i] = KIND.water;
      else if (isStreet(city, x, y)) map.kind[i] = KIND.street;
      else {
        map.kind[i] = KIND.building;
        map.floors[i] = floorsFor(d, map.seed[i]!);
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
    map.floors[i] = SITE_STOREYS[site.kind];
    map.siteAt.set(i, { id: site.id, kind: site.kind });
  }

  // Whole land blocks without lots can hold a landmark or a park.
  const free = freeBlocks(map);
  for (const lm of LANDMARKS) {
    const centre = CITYGEN.layout[lm.district];
    let best = -1;
    let bestD = Infinity;
    free.forEach((b, k) => {
      const dx = (b.x + 1) / n - centre.cx;
      const dy = (b.y + 1) / n - centre.cy;
      const dist = dx * dx + dy * dy;
      if (dist < bestD) {
        bestD = dist;
        best = k;
      }
    });
    if (best < 0) continue;
    const b = free.splice(best, 1)[0]!;
    map.landmarks.push({ id: lm.id, x: b.x, y: b.y, size: CITY_LAYOUT.block - 1 });
    fillBlock(map, b, KIND.landmark);
  }
  for (const b of free) {
    const d = DISTRICTS[map.district[(b.y + 1) * n + b.x + 1]!]!;
    if (rng.chance(PARK_SHARE[d])) fillBlock(map, b, KIND.park);
  }
  return map;
}

/** Top-left tiles of 3×3 blocks that are all filler buildings (no lots, offices, sites or water). */
function freeBlocks(map: CityMap): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const step = CITY_LAYOUT.block;
  const inner = step - 1;
  for (let by = 1; by + inner <= map.tiles; by += step) {
    for (let bx = 1; bx + inner <= map.tiles; bx += step) {
      let ok = true;
      for (let y = by; y < by + inner && ok; y++) {
        for (let x = bx; x < bx + inner && ok; x++) {
          ok = map.kind[y * map.tiles + x] === KIND.building;
        }
      }
      if (ok) out.push({ x: bx, y: by });
    }
  }
  return out;
}

function fillBlock(map: CityMap, b: { x: number; y: number }, kind: number): void {
  const inner = CITY_LAYOUT.block - 1;
  for (let y = b.y; y < b.y + inner; y++) {
    for (let x = b.x; x < b.x + inner; x++) {
      const i = y * map.tiles + x;
      map.kind[i] = kind;
      map.floors[i] = 0;
    }
  }
}
