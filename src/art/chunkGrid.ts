// Screen-space chunk grid for the map renderer (ART_DIRECTION §2, Performance).
// At each zoom stop the world is cut into square chunks that are CHUNK_CSS_PX on
// screen, rendered once at stop × devicePixelRatio. Pure math, no canvas, so it
// is unit-tested in tests/art/chunkGrid.test.ts.
import { STOP_UPSCALE_TOLERANCE, ZOOM_STOPS } from '../config/map';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One zoom stop's chunk layout for a given world size and device pixel ratio. */
export interface ChunkGrid {
  stop: number;
  dpr: number;
  /** Device pixels per chunk side (an integer). */
  devicePx: number;
  /** Device pixels per world pixel when rendering this stop. */
  scale: number;
  /** World pixels per chunk side. */
  worldPx: number;
  cols: number;
  rows: number;
}

export interface ChunkRange {
  i0: number;
  j0: number;
  i1: number;
  j1: number;
}

export function makeChunkGrid(
  stop: number,
  dpr: number,
  chunkCss: number,
  worldW: number,
  worldH: number,
): ChunkGrid {
  const devicePx = Math.max(1, Math.round(chunkCss * dpr));
  const scale = stop * dpr;
  const worldPx = devicePx / scale;
  return {
    stop,
    dpr,
    devicePx,
    scale,
    worldPx,
    cols: Math.max(1, Math.ceil(worldW / worldPx)),
    rows: Math.max(1, Math.ceil(worldH / worldPx)),
  };
}

/**
 * The zoom stop to render at: the smallest stop that is not scaled up by more
 * than STOP_UPSCALE_TOLERANCE, or the largest stop when zoomed past it.
 */
export function pickStop(zoom: number, stops: readonly number[] = ZOOM_STOPS): number {
  const sorted = [...stops].sort((a, b) => a - b);
  for (const s of sorted) if (s * STOP_UPSCALE_TOLERANCE >= zoom) return s;
  return sorted[sorted.length - 1]!;
}

export function chunkKey(stop: number, i: number, j: number): string {
  return `${stop}:${i}:${j}`;
}

export function chunkRect(grid: ChunkGrid, i: number, j: number): Rect {
  return { x: i * grid.worldPx, y: j * grid.worldPx, w: grid.worldPx, h: grid.worldPx };
}

/** Chunks overlapping a world rect (clamped to the grid), or null if none. */
export function chunksInRect(grid: ChunkGrid, r: Rect): ChunkRange | null {
  const i0 = Math.max(0, Math.floor(r.x / grid.worldPx));
  const j0 = Math.max(0, Math.floor(r.y / grid.worldPx));
  const i1 = Math.min(grid.cols - 1, Math.ceil((r.x + r.w) / grid.worldPx) - 1);
  const j1 = Math.min(grid.rows - 1, Math.ceil((r.y + r.h) / grid.worldPx) - 1);
  if (i0 > i1 || j0 > j1) return null;
  return { i0, j0, i1, j1 };
}

/** The world rect a camera shows in a viewport of CSS size w × h. */
export function viewRect(cam: { x: number; y: number; zoom: number }, w: number, h: number): Rect {
  return { x: cam.x, y: cam.y, w: w / cam.zoom, h: h / cam.zoom };
}

/** A range grown by `ring` chunks on every side, clamped to the grid. */
export function growRange(grid: ChunkGrid, r: ChunkRange, ring: number): ChunkRange {
  return {
    i0: Math.max(0, r.i0 - ring),
    j0: Math.max(0, r.j0 - ring),
    i1: Math.min(grid.cols - 1, r.i1 + ring),
    j1: Math.min(grid.rows - 1, r.j1 + ring),
  };
}

/** Every chunk of a range, nearest to the range's centre first. */
export function rangeByDistance(r: ChunkRange): { i: number; j: number }[] {
  const ci = (r.i0 + r.i1) / 2;
  const cj = (r.j0 + r.j1) / 2;
  const out: { i: number; j: number; d: number }[] = [];
  for (let j = r.j0; j <= r.j1; j++) {
    for (let i = r.i0; i <= r.i1; i++) out.push({ i, j, d: (i - ci) ** 2 + (j - cj) ** 2 });
  }
  out.sort((a, b) => a.d - b.d || a.j - b.j || a.i - b.i);
  return out.map(({ i, j }) => ({ i, j }));
}

/**
 * Where a chunk lands on the view canvas, in whole device pixels. Neighbouring
 * chunks share their rounded edges, so there are never seams between them.
 */
export function chunkDest(
  grid: ChunkGrid,
  i: number,
  j: number,
  cam: { x: number; y: number; zoom: number },
): Rect {
  const k = cam.zoom * grid.dpr;
  const x0 = Math.round((i * grid.worldPx - cam.x) * k);
  const y0 = Math.round((j * grid.worldPx - cam.y) * k);
  const x1 = Math.round(((i + 1) * grid.worldPx - cam.x) * k);
  const y1 = Math.round(((j + 1) * grid.worldPx - cam.y) * k);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
