import { describe, expect, it } from 'vitest';
import {
  chunkDest,
  chunkRect,
  chunksInRect,
  growRange,
  makeChunkGrid,
  pickStop,
  rangeByDistance,
  rectsOverlap,
  viewRect,
} from '../../src/art/chunkGrid';

describe('chunk grid', () => {
  it('keeps chunks a constant on-screen size at every stop', () => {
    for (const dpr of [1, 2, 3, 2.625]) {
      for (const stop of [0.5, 1, 2]) {
        const g = makeChunkGrid(stop, dpr, 256, 5000, 3000);
        expect(Number.isInteger(g.devicePx)).toBe(true);
        expect(g.devicePx).toBe(Math.round(256 * dpr));
        // One chunk of world spans devicePx device pixels at this stop.
        expect(g.worldPx * g.scale).toBeCloseTo(g.devicePx, 9);
        expect(g.cols * g.worldPx).toBeGreaterThanOrEqual(5000);
        expect((g.cols - 1) * g.worldPx).toBeLessThan(5000);
      }
    }
  });

  it('covers the world with fewer, larger chunks at lower stops', () => {
    const lo = makeChunkGrid(0.5, 2, 256, 4000, 2000);
    const hi = makeChunkGrid(2, 2, 256, 4000, 2000);
    expect(lo.worldPx).toBe(hi.worldPx * 4);
    expect(lo.cols).toBeLessThan(hi.cols);
  });

  it('picks the sharpest stop needed, allowing a small upscale', () => {
    expect(pickStop(0.35)).toBe(0.5);
    expect(pickStop(0.5)).toBe(0.5);
    expect(pickStop(0.55)).toBe(0.5);
    expect(pickStop(0.6)).toBe(1);
    expect(pickStop(1)).toBe(1);
    expect(pickStop(1.5)).toBe(2);
    expect(pickStop(2.5)).toBe(2);
  });

  it('finds exactly the chunks a view overlaps, clamped to the grid', () => {
    const g = makeChunkGrid(1, 1, 256, 1000, 1000); // 4 × 4 chunks of 256
    expect(chunksInRect(g, { x: 0, y: 0, w: 256, h: 256 })).toEqual({ i0: 0, j0: 0, i1: 0, j1: 0 });
    expect(chunksInRect(g, { x: 100, y: 300, w: 200, h: 10 })).toEqual({
      i0: 0,
      j0: 1,
      i1: 1,
      j1: 1,
    });
    expect(chunksInRect(g, { x: -500, y: -500, w: 5000, h: 5000 })).toEqual({
      i0: 0,
      j0: 0,
      i1: 3,
      j1: 3,
    });
    expect(chunksInRect(g, { x: 2000, y: 0, w: 10, h: 10 })).toBeNull();
    const view = viewRect({ x: 300, y: 300, zoom: 2 }, 390, 844);
    expect(view).toEqual({ x: 300, y: 300, w: 195, h: 422 });
  });

  it('grows ranges inside the grid and orders chunks centre-out', () => {
    const g = makeChunkGrid(1, 1, 256, 1000, 1000);
    expect(growRange(g, { i0: 0, j0: 1, i1: 0, j1: 1 }, 1)).toEqual({ i0: 0, j0: 0, i1: 1, j1: 2 });
    const order = rangeByDistance({ i0: 0, j0: 0, i1: 2, j1: 2 });
    expect(order).toHaveLength(9);
    expect(order[0]).toEqual({ i: 1, j: 1 });
  });

  it('places neighbouring chunks edge to edge in whole device pixels', () => {
    const g = makeChunkGrid(1, 3, 256, 5000, 5000);
    const cam = { x: 123.37, y: 45.91, zoom: 1.23 };
    const a = chunkDest(g, 2, 3, cam);
    const b = chunkDest(g, 3, 3, cam);
    const c = chunkDest(g, 2, 4, cam);
    for (const v of [a.x, a.y, a.w, a.h]) expect(Number.isInteger(v)).toBe(true);
    expect(a.x + a.w).toBe(b.x);
    expect(a.y + a.h).toBe(c.y);
    // At exactly the stop's zoom a chunk is blitted 1:1.
    const exact = chunkDest(g, 1, 1, { x: 10.2, y: 7.7, zoom: 1 });
    expect(exact.w).toBe(g.devicePx);
    expect(exact.h).toBe(g.devicePx);
  });

  it('reports rect overlap with touching edges as separate', () => {
    const g = makeChunkGrid(1, 1, 256, 1000, 1000);
    expect(rectsOverlap(chunkRect(g, 0, 0), chunkRect(g, 1, 0))).toBe(false);
    expect(rectsOverlap(chunkRect(g, 0, 0), { x: 255, y: 255, w: 2, h: 2 })).toBe(true);
  });
});
