// Where a building sits in its block (ART_DIRECTION §2.1). Terrace, canal,
// mansard and other row-house styles build along the street: each tile's row
// hugs the street sides of the tile and runs edge to edge into its neighbours,
// so a block reads as one continuous terrace around an open court. Pure: no
// canvas, so it is unit tested.
import { TILE_KINDS, type CityMap } from './citygen';
import type { Face } from './faceMarks';
import type { Rect } from './roofs';

/** Which sides of a tile open onto a street or water (or the map edge). */
export interface Frontage {
  a0: boolean;
  a1: boolean;
  b0: boolean;
  b1: boolean;
}

export interface RowPlan {
  /** The building footprint in tile-local coords. */
  rect: Rect;
  /** True when the street runs along a (units are split along a). */
  alongA: boolean;
  /** The visible face that looks onto the street, if any. */
  face: Face | null;
  /** No street on any side: the inner court of a block. */
  court: boolean;
}

const KIND_STREET = TILE_KINDS.indexOf('street');
const KIND_WATER = TILE_KINDS.indexOf('water');

export function frontageAt(map: CityMap, x: number, y: number): Frontage {
  const n = map.tiles;
  const open = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= n || j >= n) return true;
    const k = map.kind[j * n + i];
    return k === KIND_STREET || k === KIND_WATER;
  };
  return { a0: open(x - 1, y), a1: open(x + 1, y), b0: open(x, y - 1), b1: open(x, y + 1) };
}

/**
 * The footprint of a street-hugging row: `depth` deep from a single street
 * side, the whole tile (less `inset` on street sides) at corners, and closed
 * sides run to the tile edge so neighbouring rows join up.
 */
export function rowPlan(f: Frontage, depth: number, inset: number): RowPlan {
  const fronts = [f.a0, f.a1, f.b0, f.b1].filter(Boolean).length;
  if (fronts === 0) {
    return { rect: [0.3, 0.3, 0.7, 0.7], alongA: true, face: null, court: true };
  }
  let a0 = f.a0 ? inset : 0;
  let a1 = f.a1 ? 1 - inset : 1;
  let b0 = f.b0 ? inset : 0;
  let b1 = f.b1 ? 1 - inset : 1;
  const aOpen = f.a0 || f.a1;
  const bOpen = f.b0 || f.b1;
  if (fronts === 1) {
    if (f.b1) b0 = b1 - depth;
    else if (f.b0) b1 = b0 + depth;
    else if (f.a1) a0 = a1 - depth;
    else a1 = a0 + depth;
  }
  // Prefer to show the units along the street face we can see.
  const alongA = f.b1 ? true : f.a1 ? false : bOpen || !aOpen;
  const face: Face | null = alongA ? (f.b1 ? 'left' : null) : f.a1 ? 'right' : null;
  return { rect: [a0, b0, a1, b1], alongA, face, court: false };
}

/** Splits a row footprint into `units` equal houses along the street. */
export function splitUnits(r: Rect, alongA: boolean, units: number): Rect[] {
  const [a0, b0, a1, b1] = r;
  const out: Rect[] = [];
  for (let k = 0; k < units; k++) {
    if (alongA) {
      const w = (a1 - a0) / units;
      out.push([a0 + k * w, b0, a0 + (k + 1) * w, b1]);
    } else {
      const w = (b1 - b0) / units;
      out.push([a0, b0 + k * w, a1, b0 + (k + 1) * w]);
    }
  }
  return out;
}
