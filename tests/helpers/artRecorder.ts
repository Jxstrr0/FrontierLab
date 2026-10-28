// Test stand-ins for drawing map art without a canvas: a context that records
// the extent of every point drawn, and an ink set for a zoom stop's level of
// detail. Used to prove art stays inside the bounds the chunk renderer gives it.
import type { InkSet } from '../../src/art/engraver';

/** A canvas stand-in that records the extent of every point drawn. */
export function recorder() {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x: number, y: number, rx = 0, ry = 0) => {
    box.x0 = Math.min(box.x0, x - rx);
    box.x1 = Math.max(box.x1, x + rx);
    box.y0 = Math.min(box.y0, y - ry);
    box.y1 = Math.max(box.y1, y + ry);
  };
  const methods: Record<string, (...a: number[]) => void> = {
    moveTo: (x, y) => add(x!, y!),
    lineTo: (x, y) => add(x!, y!),
    ellipse: (x, y, rx, ry) => add(x!, y!, rx, ry),
  };
  const ctx = new Proxy(
    {},
    { get: (_t, k: string) => methods[k] ?? (() => undefined), set: () => true },
  );
  const reset = () => {
    box.x0 = box.y0 = Infinity;
    box.x1 = box.y1 = -Infinity;
  };
  return { ctx, box, reset };
}

export function inks(lod: number): InkSet {
  const pattern = {} as CanvasPattern;
  const stop = [0.5, 1, 2][lod]!;
  return {
    ink: '#333333',
    paper: '#eeeeee',
    lod,
    stop,
    patterns: { light: pattern, medium: pattern, dense: pattern, shadow: pattern },
    roofPatterns: { roofLight: pattern, roofMedium: pattern, roofDense: pattern },
    tint: '#aabbcc',
    roof: '#cccccc',
    crown: '#cccccc',
    lawn: 'rgba(0,0,0,0.3)',
    paperPrint: pattern,
    waterPrint: pattern,
    outline: 1.15 / stop,
    detail: 0.65 / stop,
    inkA: () => '#333333',
  };
}
