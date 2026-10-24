// The fixed street and shoreline layout of a city's tile grid (ART_DIRECTION §2,
// DESIGN §5.2). Pure functions of the city spec, with no randomness, so the sim
// (lot placement) and the map art (streets, water) always agree.
// Streets run along every CITY_LAYOUT.block-th row and column, leaving square
// blocks of buildings between them. Storefront lots sit on block tiles that face
// a street; the inner tile of each block is left for the map art.
import { CITY_LAYOUT } from '../config/balance';
import type { CitySpec } from '../data/cities';
import { dcos } from './detmath';

const TWO_PI = 6.283185307179586;

/** A stable 0–1 number from the city id, used to vary each city's shoreline. */
function cityPhase(cityId: string): number {
  let h = 0;
  for (let i = 0; i < cityId.length; i++) h = (h * 31 + cityId.charCodeAt(i)) % 3600;
  return h / 3600;
}

/** First water row in column x (the grid's y runs toward the shore), or Infinity. */
export function shoreRow(city: CitySpec, x: number): number {
  if (!city.water) return Infinity;
  const s = CITY_LAYOUT.shore;
  const wave = dcos(TWO_PI * (s.waves * (x / city.tiles) + cityPhase(city.id)));
  return Math.round(city.tiles * (s.base + s.amplitude * wave));
}

export function isWater(city: CitySpec, x: number, y: number): boolean {
  return y >= shoreRow(city, x);
}

export function isStreet(city: CitySpec, x: number, y: number): boolean {
  if (isWater(city, x, y)) return false;
  return x % CITY_LAYOUT.block === 0 || y % CITY_LAYOUT.block === 0;
}

export function inGrid(city: CitySpec, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < city.tiles && y < city.tiles;
}

/** A building tile with a street on at least one side, inside the edge margin. */
export function isFrontage(city: CitySpec, x: number, y: number): boolean {
  const m = CITY_LAYOUT.edgeTiles;
  if (x < m || y < m || x >= city.tiles - m || y >= city.tiles - m) return false;
  if (isWater(city, x, y) || isStreet(city, x, y)) return false;
  const near = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ] as const;
  return near.some(([nx, ny]) => inGrid(city, nx, ny) && isStreet(city, nx, ny));
}

/**
 * The closest free frontage tile to (x, y), searching outward ring by ring.
 * Ties go to the first tile found, so the result is deterministic.
 */
export function nearestFrontage(
  city: CitySpec,
  x: number,
  y: number,
  used: Set<string>,
): { x: number; y: number } | undefined {
  let best: { x: number; y: number } | undefined;
  let bestD = Infinity;
  for (let r = 0; r < city.tiles; r++) {
    // A tile on ring r is at least r away; stop once no closer tile can appear.
    if (best && r > bestD) break;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = x + dx;
        const ty = y + dy;
        if (!inGrid(city, tx, ty) || used.has(`${tx},${ty}`)) continue;
        if (!isFrontage(city, tx, ty)) continue;
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
