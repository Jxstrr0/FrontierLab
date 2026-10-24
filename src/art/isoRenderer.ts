// The engraved city renderer (ART_DIRECTION §2), behind the MapRenderer contract.
// The world is cut into screen-space chunks per zoom stop (chunkGrid.ts); each
// chunk is painted once into an offscreen canvas at stop × devicePixelRatio and
// then only blitted while panning. Missing chunks are painted a few ms per frame
// (RENDER_SLICE_MS) while a cached chunk from another stop, scaled, stands in.
// Canvases live in a pixel-budgeted LRU (CHUNK_CACHE_BUDGET_PX) for iOS memory.
import {
  CHUNK_CACHE_BUDGET_PX,
  CHUNK_CSS_PX,
  PREFETCH_RING,
  RENDER_SLICE_MS,
  ZOOM_STOPS,
} from '../config/map';
import { context2d, createCanvas, freeCanvas, type AnyCanvas } from './canvasKit';
import { startChunk, runChunk, type ChunkJob, type PaintContext } from './chunkPainter';
import {
  chunkDest,
  chunkKey,
  chunkRect,
  chunksInRect,
  growRange,
  makeChunkGrid,
  pickStop,
  rangeByDistance,
  rectsOverlap,
  viewRect,
  type ChunkGrid,
  type Rect,
} from './chunkGrid';
import { maxItemHeight, tileBounds } from './drawList';
import { makeInkSet, type InkSet } from './engraver';
import { worldSize } from './iso';
import type { CreateMapRenderer, LotOccupant, MapRenderer } from './mapRenderer';
import { PixelLru } from './pixelLru';

interface Entry {
  key: string;
  stop: number;
  i: number;
  j: number;
  rect: Rect;
  /** The finished picture, once painted. */
  img?: AnyCanvas;
  /** Painting in progress (into a separate canvas, swapped in when done). */
  job?: ChunkJob;
  /** The picture is out of date (occupants changed) and is being repainted. */
  stale: boolean;
}

interface Task {
  grid: ChunkGrid;
  i: number;
  j: number;
}

const now = () => performance.now();

export const createMapRenderer: CreateMapRenderer = (map, style) => {
  const { width, height } = worldSize(map.tiles);
  const pc: PaintContext = {
    map,
    cityName: style.cityName,
    maxHeight: maxItemHeight(map),
    occupants: {},
    rasterRatio: 1,
    flushTarget: context2d(createCanvas(1, 1)),
  };
  const tileOfLot = new Map<string, number>();
  for (const [index, lotId] of map.lotAt) tileOfLot.set(lotId, index);
  const lru = new PixelLru<Entry>(CHUNK_CACHE_BUDGET_PX);
  let dpr = 0;
  let grids = new Map<number, ChunkGrid>();
  let inks = new Map<number, InkSet>();

  const freeEntry = (e: Entry) => {
    if (e.img) freeCanvas(e.img);
    if (e.job) freeCanvas(e.job.canvas);
    e.img = undefined;
    e.job = undefined;
  };
  const freeAll = (list: Entry[]) => list.forEach(freeEntry);

  const setDpr = (next: number) => {
    freeAll(lru.clear());
    dpr = next;
    grids = new Map(ZOOM_STOPS.map((s) => [s, makeChunkGrid(s, dpr, CHUNK_CSS_PX, width, height)]));
    const probe = context2d(createCanvas(1, 1));
    inks = new Map(
      ZOOM_STOPS.map((s, k) => [s, makeInkSet(probe, style.ink, style.paper, k, s, dpr)]),
    );
  };

  const entryPx = (e: Entry) =>
    (e.img ? e.img.width * e.img.height : 0) +
    (e.job ? e.job.canvas.width * e.job.canvas.height : 0);

  /** Paints a little more of one chunk; returns true when it finished. */
  const work = (t: Task, deadline: number): boolean => {
    const key = chunkKey(t.grid.stop, t.i, t.j);
    let e = lru.touch(key);
    if (!e) {
      e = {
        key,
        stop: t.grid.stop,
        i: t.i,
        j: t.j,
        rect: chunkRect(t.grid, t.i, t.j),
        stale: false,
      };
    }
    if (!e.job) {
      e.job = startChunk(t.grid, t.i, t.j, pc);
      freeAll(lru.set(key, e, entryPx(e)));
    }
    const done = runChunk(e.job, pc, inks.get(t.grid.stop)!, deadline, now);
    if (!done) return false;
    if (e.img) freeCanvas(e.img);
    e.img = e.job.canvas;
    e.job = undefined;
    e.stale = false;
    freeAll(lru.resize(key, entryPx(e)));
    return true;
  };

  const needsWork = (grid: ChunkGrid, i: number, j: number) => {
    const e = lru.peek(chunkKey(grid.stop, i, j));
    return !e?.img || e.stale;
  };

  const blit = (
    ctx: CanvasRenderingContext2D,
    grid: ChunkGrid,
    i: number,
    j: number,
    cam: { x: number; y: number; zoom: number },
  ): boolean => {
    const e = lru.touch(chunkKey(grid.stop, i, j));
    if (!e?.img) return false;
    const d = chunkDest(grid, i, j, cam);
    ctx.drawImage(e.img as CanvasImageSource, d.x, d.y, d.w, d.h);
    return true;
  };

  /** Stands in for a missing chunk with whatever other stops have cached. */
  const fallback = (
    ctx: CanvasRenderingContext2D,
    grid: ChunkGrid,
    i: number,
    j: number,
    cam: { x: number; y: number; zoom: number },
  ) => {
    const area = chunkRect(grid, i, j);
    const others = [...grids.values()]
      .filter((g) => g.stop !== grid.stop)
      .sort(
        (a, b) => Math.abs(Math.log(a.stop / grid.stop)) - Math.abs(Math.log(b.stop / grid.stop)),
      );
    for (const g of others) {
      const r = chunksInRect(g, area);
      if (!r) continue;
      for (let jj = r.j0; jj <= r.j1; jj++)
        for (let ii = r.i0; ii <= r.i1; ii++) blit(ctx, g, ii, jj, cam);
    }
  };

  const renderer: MapRenderer = {
    width,
    height,
    setOccupants(next: Record<string, LotOccupant>) {
      const prev = pc.occupants;
      const changed: Rect[] = [];
      for (const id of new Set([...Object.keys(prev), ...Object.keys(next)])) {
        const a = prev[id];
        const b = next[id];
        if (a?.type === b?.type && a?.ink === b?.ink) continue;
        const index = tileOfLot.get(id);
        if (index === undefined) continue;
        changed.push(tileBounds(map, index % map.tiles, Math.floor(index / map.tiles)));
      }
      pc.occupants = { ...next };
      if (changed.length === 0) return;
      for (const key of [...lru.keys()]) {
        const e = lru.peek(key)!;
        if (!changed.some((r) => rectsOverlap(r, e.rect))) continue;
        e.stale = true;
        if (e.job) {
          freeCanvas(e.job.canvas);
          e.job = undefined;
          lru.resize(key, entryPx(e));
        }
      }
    },

    render(ctx, cam, view) {
      if (view.devicePixelRatio !== dpr) setDpr(view.devicePixelRatio);
      lru.nextFrame();
      const deadline = now() + RENDER_SLICE_MS;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = style.paper;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const stop = pickStop(cam.zoom);
      const grid = grids.get(stop)!;
      const view0 = viewRect(cam, view.width, view.height);
      const range = chunksInRect(grid, view0);
      if (!range) return false;
      const visible = rangeByDistance(range);
      const missing = visible.filter(({ i, j }) => !lru.peek(chunkKey(stop, i, j))?.img);
      for (const { i, j } of missing) fallback(ctx, grid, i, j, cam);
      for (const { i, j } of visible) blit(ctx, grid, i, j, cam);

      // Work queue: visible chunks first, then a ring around them, then the
      // next stop down so zooming out has something to show at once.
      const tasks: Task[] = visible
        .filter(({ i, j }) => needsWork(grid, i, j))
        .map((c) => ({ grid, ...c }));
      const ring = rangeByDistance(growRange(grid, range, PREFETCH_RING));
      for (const c of ring) if (needsWork(grid, c.i, c.j)) tasks.push({ grid, ...c });
      const lower = [...grids.values()].filter((g) => g.stop < stop).pop();
      const lowerRange = lower && chunksInRect(lower, view0);
      if (lower && lowerRange) {
        for (const c of rangeByDistance(lowerRange))
          if (needsWork(lower, c.i, c.j)) tasks.push({ grid: lower, ...c });
      }
      const seen = new Set<string>();
      let pending = 0;
      for (const t of tasks) {
        const key = chunkKey(t.grid.stop, t.i, t.j);
        if (seen.has(key)) continue;
        seen.add(key);
        if (now() >= deadline) {
          pending++;
          continue;
        }
        if (work(t, deadline)) {
          if (
            t.grid === grid &&
            t.i >= range.i0 &&
            t.i <= range.i1 &&
            t.j >= range.j0 &&
            t.j <= range.j1
          ) {
            blit(ctx, grid, t.i, t.j, cam);
          }
        } else pending++;
      }
      return pending > 0;
    },

    dispose() {
      freeAll(lru.clear());
      dpr = 0;
    },
  };
  return renderer;
};
