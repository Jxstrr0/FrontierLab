// The street and shoreline layout of a city's tile grid (ART_DIRECTION §2,
// DESIGN §5.2), shared by the sim (lot placement) and the map art (streets,
// water). Streets run along every CITY_LAYOUT.block-th row and column, leaving
// square blocks of buildings between them; storefront lots sit on block tiles
// that face a street. Each city's resolved geometry (water form, bridges, big
// park, district centres) comes from cityGeo.ts at the city's layout version;
// the helpers here read it. shoreRow is layout 1's original shoreline.
import { CITY_LAYOUT } from '../config/balance';
import type { CitySpec } from '../data/cities';
import type { CityGeometry } from './cityGeo';
import { dcos } from './detmath';

const TWO_PI = 6.283185307179586;

/** A stable 0–1 number from the city id, used to vary each city's shoreline. */
function cityPhase(cityId: string): number {
  let h = 0;
  for (let i = 0; i < cityId.length; i++) h = (h * 31 + cityId.charCodeAt(i)) % 3600;
  return h / 3600;
}

/** Layout 1: first water row in column x (the grid's y runs toward the shore), or Infinity. */
export function shoreRow(city: CitySpec, x: number): number {
  if (!city.water) return Infinity;
  const s = CITY_LAYOUT.shore;
  const wave = dcos(TWO_PI * (s.waves * (x / city.tiles) + cityPhase(city.id)));
  return Math.round(city.tiles * (s.base + s.amplitude * wave));
}

export function inGrid(geo: { tiles: number }, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < geo.tiles && y < geo.tiles;
}

export function isWater(geo: CityGeometry, x: number, y: number): boolean {
  return inGrid(geo, x, y) && geo.water[y * geo.tiles + x] === 1;
}

/** A land street tile (bridges over water are not streets). */
export function isStreet(geo: CityGeometry, x: number, y: number): boolean {
  return inGrid(geo, x, y) && geo.street[y * geo.tiles + x] === 1;
}

/** A building tile with a land street on at least one side, inside the edge margin. */
export function isFrontage(geo: CityGeometry, x: number, y: number): boolean {
  return inGrid(geo, x, y) && geo.frontage[y * geo.tiles + x] === 1;
}

/**
 * The closest free frontage tile to (x, y), searching outward ring by ring.
 * Ties go to the first tile found, so the result is deterministic.
 */
export function nearestFrontage(
  geo: CityGeometry,
  x: number,
  y: number,
  used: Set<string>,
): { x: number; y: number } | undefined {
  const n = geo.tiles;
  let best: { x: number; y: number } | undefined;
  let bestD = Infinity;
  for (let r = 0; r < n; r++) {
    // A tile on ring r is at least r away; stop once no closer tile can appear.
    if (best && r > bestD) break;
    for (let dy = -r; dy <= r; dy++) {
      const ty = y + dy;
      if (ty < 0 || ty >= n) continue;
      // Only the ring's edge: every column on the top and bottom rows, else the two sides.
      const step = Math.abs(dy) === r ? 1 : 2 * r;
      for (let dx = -r; dx <= r; dx += Math.max(step, 1)) {
        const tx = x + dx;
        if (tx < 0 || tx >= n || geo.frontage[ty * n + tx] !== 1) continue;
        if (used.has(`${tx},${ty}`)) continue;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) {
          bestD = d;
          best = { x: tx, y: ty };
        }
      }
    }
  }
  return best;
}
