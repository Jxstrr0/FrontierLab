// Isometric projection for the city map (ART_DIRECTION §2): 2:1 tiles, with
// "world" pixels measured at zoom 1. Tile (0, 0) is the top corner of the city
// diamond; x runs down-right and y runs down-left.
import { MAP_MARGIN, STOREY_PX, TILE_H, TILE_W } from '../config/map';

export interface Point {
  x: number;
  y: number;
}

/** Size of the whole map image (city diamond plus paper margin) at zoom 1. */
export function worldSize(tiles: number): { width: number; height: number } {
  return {
    width: tiles * TILE_W + 2 * MAP_MARGIN.x,
    height: tiles * TILE_H + MAP_MARGIN.top + MAP_MARGIN.bottom,
  };
}

/** The top vertex of a tile's diamond. */
export function tileTop(tiles: number, x: number, y: number): Point {
  return {
    x: MAP_MARGIN.x + (tiles * TILE_W) / 2 + ((x - y) * TILE_W) / 2,
    y: MAP_MARGIN.top + ((x + y) * TILE_H) / 2,
  };
}

/** The centre of a tile's diamond (ground level). */
export function tileCenter(tiles: number, x: number, y: number): Point {
  const t = tileTop(tiles, x, y);
  return { x: t.x, y: t.y + TILE_H / 2 };
}

/** Where a map pin sits: above the roof of a building with this many storeys. */
export function roofAnchor(tiles: number, x: number, y: number, floors: number): Point {
  const c = tileCenter(tiles, x, y);
  return { x: c.x, y: c.y - floors * STOREY_PX };
}

/** Inverse projection: the (fractional) tile under a world point at ground level. */
export function worldToTile(tiles: number, p: Point): Point {
  const dx = (p.x - MAP_MARGIN.x - (tiles * TILE_W) / 2) / (TILE_W / 2);
  const dy = (p.y - MAP_MARGIN.top) / (TILE_H / 2);
  return { x: (dy + dx) / 2, y: (dy - dx) / 2 };
}
