// The city being shown on the map: its generated CityMap (memoised per city and
// save seed, since generating an XL city takes a moment), a renderer factory,
// where the camera starts, and the remembered camera for each city. App-side
// memory only; none of this is game state or saved.
import { generateCityMap, type CityMap, type MapPlaces } from '../../art/citygen';
import { tileCenter } from '../../art/iso';
import { createMapRenderer } from '../../art/isoRenderer';
import type { MapRenderer } from '../../art/mapRenderer';
import { FEATURES } from '../../config/balance';
import { BRANCH_ZOOM, OVERVIEW_ZOOM } from '../../config/mapView';
import type { CitySpec } from '../../data/cities';
import type { GameState, Lot } from '../../sim/state';
import type { ViewCamera } from './camera';
import { landmarkCentre } from './landmarkPins';
import { siteEnabled } from './pins';

/** Fallback for the map paper if the --paper token can't be read (ART_DIRECTION §1.1). */
const PAPER_FALLBACK = '#E3E9DF';

export interface Scene {
  key: string;
  /** Storefront count the scene was built with. */
  lots: number;
  city: CitySpec;
  map: CityMap;
  createRenderer(): MapRenderer;
}

let cached: Scene | null = null;
const cameras = new Map<string, ViewCamera>();

/** The map paper colour from the --paper token. */
export function paperColour(): string {
  if (typeof getComputedStyle !== 'function') return PAPER_FALLBACK;
  const v = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
  return v || PAPER_FALLBACK;
}

/** The city's layout version, plus office buildings and sites (Stage 4, behind FEATURES.hq). */
export function mapPlaces(s: GameState, cityId: string): MapPlaces {
  const layout = s.world.cities[cityId]?.layout;
  if (!FEATURES.hq) return { layout };
  return {
    layout,
    offices: Object.values(s.world.officeListings).filter((o) => o.cityId === cityId),
    sites: Object.values(s.world.sites).filter((x) => x.cityId === cityId && siteEnabled(x.kind)),
  };
}

/**
 * The scene for a city and seed; lots, offices and sites only matter on first
 * build (they never move; who leases them is drawn from the occupants). A city
 * that grows new storefronts (cityGrowth.ts) gets a fresh scene.
 */
export function sceneFor(city: CitySpec, seed: number, lots: Lot[], places: MapPlaces = {}): Scene {
  // `key` names the camera's place; the cache also rebuilds when the city grows new lots.
  const key = `${city.id}:${seed}:${places.layout ?? ''}`;
  if (cached?.key === key && cached.lots === lots.length) return cached;
  const map = generateCityMap(city, seed, lots, places);
  cached = {
    key,
    lots: lots.length,
    city,
    map,
    createRenderer: () =>
      createMapRenderer(map, { ink: city.ink, paper: paperColour(), cityName: city.name }),
  };
  return cached;
}

export function rememberCamera(key: string, cam: ViewCamera): void {
  if (key) cameras.set(key, { ...cam });
}

/**
 * Where the camera starts: where you last looked in this city; else on your
 * first branch here at BRANCH_ZOOM; at a regional site (Stage 8), between its
 * airport and employers, so both are on screen when you land; else over the
 * financial district (nudged toward the water, cityGeo.ts) at OVERVIEW_ZOOM,
 * which shows a good chunk of the city.
 */
export function initialCamera(s: GameState, scene: Scene): ViewCamera {
  const saved = cameras.get(scene.key);
  if (saved) return { ...saved };
  const tiles = scene.map.tiles;
  const branch = Object.values(s.branches).find(
    (b) => b.cityId === scene.city.id && b.status !== 'closed',
  );
  const lot = branch ? s.world.lots[branch.lotId] : undefined;
  if (lot) {
    const c = tileCenter(tiles, lot.tile.x, lot.tile.y);
    return { cx: c.x, cy: c.y, zoom: BRANCH_ZOOM };
  }
  if (scene.city.regional) {
    const airport = landmarkCentre(scene.map, 'airport');
    const sites = Object.values(s.world.sites)
      .filter((x) => x.cityId === scene.city.id)
      .map((x) => tileCenter(tiles, x.tile.x, x.tile.y));
    const pts = airport ? [airport, ...sites] : sites;
    if (pts.length) {
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      return { cx, cy, zoom: OVERVIEW_ZOOM };
    }
  }
  const f = scene.map.geo.focus;
  const c = tileCenter(tiles, f.x, f.y);
  return { cx: c.x, cy: c.y, zoom: OVERVIEW_ZOOM };
}
