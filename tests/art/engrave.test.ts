import { describe, expect, it } from 'vitest';
import {
  ellipsePts,
  hatch,
  HATCH,
  poly,
  rect,
  shade,
  waveLine,
  waveOval,
} from '../../src/art/engrave';

/** Parse "M x y L x y" hatch segments into [x1, y1, x2, y2] tuples. */
function segments(d: string): number[][] {
  return [...d.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)].map((m) =>
    m.slice(1, 5).map(Number),
  );
}

describe('engraving geometry', () => {
  it('writes polygons as closed paths', () => {
    expect(poly(rect(0, 0, 10, 5))).toBe('M0 0L10 0L10 5L0 5Z');
    expect(poly([], true)).toBe('');
    expect(poly(rect(1, 1, 2, 2), false).endsWith('Z')).toBe(false);
  });

  it('rules horizontal hatching across a rectangle at the given spacing', () => {
    const segs = segments(hatch(rect(0, 0, 20, 10), 2, 0));
    // Lines at y = 0, 2, … 8 span the full width (the bottom edge is half-open).
    expect(segs.length).toBe(5);
    for (const [x1, , x2] of segs) {
      expect(Math.min(x1!, x2!)).toBeCloseTo(0, 5);
      expect(Math.max(x1!, x2!)).toBeCloseTo(20, 5);
    }
  });

  it('keeps 45° hatching inside the shape', () => {
    const tri = [
      [0, 0],
      [40, 0],
      [0, 40],
    ] as const;
    const segs = segments(hatch(tri, 3));
    expect(segs.length).toBeGreaterThan(5);
    for (const seg of segs) {
      const pts = [seg.slice(0, 2), seg.slice(2, 4)] as [number, number][];
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(-0.1);
        expect(y).toBeGreaterThanOrEqual(-0.1);
        expect(x + y).toBeLessThanOrEqual(40.2);
      }
    }
  });

  it('clips even-odd, so a concave shape gets two runs per line', () => {
    // A "U": the middle notch splits each line near the top.
    const u = [
      [0, 0],
      [10, 0],
      [10, 20],
      [20, 20],
      [20, 0],
      [30, 0],
      [30, 30],
      [0, 30],
    ] as const;
    const top = segments(hatch(u, 5, 0)).filter(([, y]) => y! > 1 && y! < 19);
    expect(top.length % 2).toBe(0);
    expect(top.length).toBeGreaterThan(0);
  });

  it('draws denser hatching at denser settings and is memoised', () => {
    const r = rect(0, 0, 60, 60);
    const light = segments(shade(r, 'light')).length;
    const dense = segments(shade(r, 'dense')).length;
    expect(dense).toBeGreaterThan(light);
    expect(HATCH.dense).toBeLessThan(HATCH.medium);
    expect(shade(r, 'medium')).toBe(shade(r, 'medium'));
    expect(hatch(r, 0)).toBe('');
    expect(hatch([[0, 0]], 2)).toBe('');
  });

  it('draws guilloche waves and rippled ovals deterministically', () => {
    const w = waveLine(0, 100, 10, 2, 20);
    expect(w.startsWith('M0 10')).toBe(true);
    expect(waveLine(0, 100, 10, 2, 20)).toBe(w);
    const o = waveOval(50, 50, 30, 20, 12, 1);
    expect(o.endsWith('Z')).toBe(true);
    expect(ellipsePts(0, 0, 10, 5, 8)).toHaveLength(8);
  });
});
