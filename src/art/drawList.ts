// Which things to draw into a chunk, and in what order (ART_DIRECTION §2).
// Raised things (buildings, park trees, landmarks) are "items" with conservative
// world-space bounds that include their height, crowns, flags and cast shadow.
// A chunk draws every item whose bounds touch it, back to front, so overlaps
// across chunk borders come out identical on both sides. Pure: no canvas.
import {
  FLAG_PX,
  LANDMARK_MAX_PX,
  LANDMARK_SIDE_TILES,
  SIGNATURE_HEIGHT_PX,
  ROOF_EXTRA_STOREYS,
  SHADOW_TILES_PER_PX,
  STOREY_PX,
  TILE_H,
  TILE_W,
} from '../config/map';
import type { CityMap, LandmarkSite } from './citygen';
import { TILE_KINDS } from './citygen';
import { tileTop, worldToTile } from './iso';
import type { Rect } from './chunkGrid';
import { rectsOverlap } from './chunkGrid';

export type DrawItem =
  | { type: 'tile'; x: number; y: number; bounds: Rect; order: number }
  | { type: 'landmark'; site: LandmarkSite; bounds: Rect; order: number };

const KIND_PARK = TILE_KINDS.indexOf('park');
const KIND_LOT = TILE_KINDS.indexOf('lot');
const KIND_BUILDING = TILE_KINDS.indexOf('building');
const KIND_OFFICE = TILE_KINDS.indexOf('office');
const KIND_SITE = TILE_KINDS.indexOf('site');

export interface TileRange {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Inclusive tile range whose diamonds could touch a world rect (clamped to the map). */
export function tileRangeForRect(tiles: number, r: Rect): TileRange | null {
  const corners = [
    worldToTile(tiles, { x: r.x, y: r.y }),
    worldToTile(tiles, { x: r.x + r.w, y: r.y }),
    worldToTile(tiles, { x: r.x, y: r.y + r.h }),
    worldToTile(tiles, { x: r.x + r.w, y: r.y + r.h }),
  ];
  const x0 = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.x))) - 1);
  const y0 = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.y))) - 1);
  const x1 = Math.min(tiles - 1, Math.ceil(Math.max(...corners.map((c) => c.x))));
  const y1 = Math.min(tiles - 1, Math.ceil(Math.max(...corners.map((c) => c.y))));
  if (x0 > x1 || y0 > y1) return null;
  return { x0, y0, x1, y1 };
}

/** Length of a cast shadow along +x, in tiles, for something this tall. */
export function shadowTiles(heightPx: number): number {
  return heightPx * SHADOW_TILES_PER_PX;
}

/** World bounds of a footprint `size` tiles square at (x, y), reaching `heightPx` up. */
export function footprintBounds(
  tiles: number,
  x: number,
  y: number,
  size: number,
  heightPx: number,
): Rect {
  const top = tileTop(tiles, x, y);
  const shadow = shadowTiles(heightPx) * size;
  const halfW = (size * TILE_W) / 2;
  return {
    x: top.x - halfW,
    y: top.y - heightPx,
    w: 2 * halfW + (shadow * TILE_W) / 2,
    h: heightPx + size * TILE_H + (shadow * TILE_H) / 2,
  };
}

/** The tallest a tile's drawing may reach, in world px (0 for flat ground). */
export function tileHeightPx(map: CityMap, index: number): number {
  const kind = map.kind[index];
  if (kind === KIND_PARK) return ROOF_EXTRA_STOREYS * STOREY_PX;
  if (kind !== KIND_BUILDING && kind !== KIND_LOT && kind !== KIND_OFFICE && kind !== KIND_SITE)
    return 0;
  // Storefronts and offices can fly your roof flag.
  const flag = kind === KIND_LOT || kind === KIND_OFFICE ? FLAG_PX : 0;
  return (map.floors[index]! + ROOF_EXTRA_STOREYS) * STOREY_PX + flag;
}

/** How tall a landmark's art reaches above its block, in world px. */
export function landmarkHeightPx(site: LandmarkSite): number {
  return site.signature ? SIGNATURE_HEIGHT_PX[site.signature] : LANDMARK_MAX_PX;
}

/** World bounds of a landmark: its block, its height and (for signatures) a side margin. */
export function landmarkBounds(tiles: number, site: LandmarkSite): Rect {
  const b = footprintBounds(tiles, site.x, site.y, site.size, landmarkHeightPx(site));
  if (!site.signature) return b;
  const pad = (LANDMARK_SIDE_TILES * TILE_W) / 2;
  return { x: b.x - pad, y: b.y - pad / 2, w: b.w + 2 * pad, h: b.h + pad };
}

/** Painter's order key: the footprint's front corner (x + y), then x. */
export function orderKey(x: number, y: number, size: number, tiles: number): number {
  return (x + y + 2 * size) * (tiles + 1) + x;
}

/** The tallest anything on this map may draw, for padding chunk queries. */
export function maxItemHeight(map: CityMap): number {
  let max = 0;
  for (const site of map.landmarks) max = Math.max(max, landmarkHeightPx(site));
  for (let i = 0; i < map.kind.length; i++) max = Math.max(max, tileHeightPx(map, i));
  return max;
}

/**
 * Every raised item whose bounds touch `rect`, sorted back to front.
 * `maxHeight` is maxItemHeight(map), passed in so it is computed once per map.
 */
export function itemsInRect(map: CityMap, rect: Rect, maxHeight: number): DrawItem[] {
  const n = map.tiles;
  // Items rise above (and shadows fall right of) their footprint, so look for
  // footprints below and to the left of the rect too.
  const shadowPad = (shadowTiles(maxHeight) * TILE_W) / 2;
  const search: Rect = {
    x: rect.x - shadowPad,
    y: rect.y,
    w: rect.w + shadowPad,
    h: rect.h + maxHeight,
  };
  const out: DrawItem[] = [];
  const range = tileRangeForRect(n, search);
  if (range) {
    for (let y = range.y0; y <= range.y1; y++) {
      for (let x = range.x0; x <= range.x1; x++) {
        const h = tileHeightPx(map, y * n + x);
        if (h === 0) continue;
        const bounds = footprintBounds(n, x, y, 1, h);
        if (rectsOverlap(bounds, rect)) {
          out.push({ type: 'tile', x, y, bounds, order: orderKey(x, y, 1, n) });
        }
      }
    }
  }
  for (const site of map.landmarks) {
    const bounds = landmarkBounds(n, site);
    if (rectsOverlap(bounds, rect)) {
      out.push({ type: 'landmark', site, bounds, order: orderKey(site.x, site.y, site.size, n) });
    }
  }
  return sortBackToFront(out);
}

export function sortBackToFront<T extends { order: number }>(items: T[]): T[] {
  return items.sort((a, b) => a.order - b.order);
}

/** World bounds of everything drawn for one tile (for invalidating chunks). */
export function tileBounds(map: CityMap, x: number, y: number): Rect {
  return footprintBounds(map.tiles, x, y, 1, Math.max(tileHeightPx(map, y * map.tiles + x), 1));
}
