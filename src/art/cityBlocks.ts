// Tile kinds of the drawable city and its 3×3 building blocks (citygen.ts):
// finding blocks with nothing but filler on them, and filling a block with a
// park, plaza or landmark. Kept apart so citygen.ts and cityDecor.ts share it.
import { CITY_LAYOUT } from '../config/balance';
import type { CityMap } from './citygen';

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

/** Tile kind → its index in TILE_KINDS (the value stored in CityMap.kind). */
export const KIND = Object.fromEntries(TILE_KINDS.map((k, i) => [k, i])) as Record<
  TileKind,
  number
>;
/** Top-left tiles of 3×3 blocks that are all filler buildings (no lots, offices, sites or water). */
export function freeBlocks(map: CityMap): { x: number; y: number }[] {
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

export function fillBlock(map: CityMap, b: { x: number; y: number }, kind: number): void {
  const inner = CITY_LAYOUT.block - 1;
  for (let y = b.y; y < b.y + inner; y++) {
    for (let x = b.x; x < b.x + inner; x++) {
      const i = y * map.tiles + x;
      map.kind[i] = kind;
      map.floors[i] = 0;
    }
  }
}
