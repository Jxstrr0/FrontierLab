// Where a city's lots and buildings go (CONTENT §3): a seeded point near a
// district centre, snapped to the nearest free street-facing tile of the city's
// geometry at its layout version (CityState.layout; saves from before layout
// versions are layout 1). Shared by citygen.ts and every site generator so they
// draw from their streams exactly as they always have.
import { CITYGEN } from '../config/balance';
import type { LayoutVersion } from '../config/cityGeo';
import { CITIES, type CitySpec } from '../data/cities';
import type { DistrictId } from '../data/types';
import { cityGeometry, type CityGeometry } from './cityGeo';
import { nearestFrontage } from './cityLayout';
import { clamp } from './math';
import { turnOffset } from './waterForms';
import type { Rng } from './rng';
import type { GameState } from './state';

/** The layout version a city was generated at; 1 for cities from older saves mid-migration. */
export function layoutOf(state: GameState, cityId: string): LayoutVersion {
  const city = state.world.cities[cityId] as { layout?: LayoutVersion } | undefined;
  return city?.layout ?? 1;
}

/** The geometry lots and sites in this city are placed on. */
export function geometryFor(state: GameState, cityId: string): CityGeometry {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  return cityGeometry(city, layoutOf(state, cityId));
}

/**
 * Two normal draws around a district centre, clamped off the edge, in tiles.
 * The offset turns and mirrors with the city's arrangement (layout 1 has none),
 * so a turned city is the same scatter turned, not a fresh one.
 */
export function scatterPoint(
  city: CitySpec,
  geo: CityGeometry,
  district: DistrictId,
  rng: Rng,
): { x: number; y: number } {
  const at = geo.centres[district];
  const [dx, dy] = turnOffset(geo.arrange, rng.normal(0, at.spread), rng.normal(0, at.spread));
  const tile = (c: number) =>
    Math.round(clamp(c, CITYGEN.edge, 1 - CITYGEN.edge) * (city.tiles - 1));
  return { x: tile(at.cx + dx), y: tile(at.cy + dy) };
}

/**
 * A free frontage tile near a district centre, marked used. Throws when the
 * city has no room left (`what` names the thing being placed).
 */
export function placeNear(
  city: CitySpec,
  geo: CityGeometry,
  district: DistrictId,
  rng: Rng,
  used: Set<string>,
  what = 'building',
): { x: number; y: number } {
  const p = scatterPoint(city, geo, district, rng);
  const spot = nearestFrontage(geo, p.x, p.y, used);
  if (!spot) throw new Error(`No room for another ${what} in ${city.name}`);
  used.add(`${spot.x},${spot.y}`);
  return spot;
}
