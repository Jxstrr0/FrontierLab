// Engraving geometry for the SVG vignettes, portraits and spot art
// (ART_DIRECTION §2–§4): 45° hatching clipped to any polygon at three
// densities, guilloche wave lines and rings, and stipple dots. Pure functions
// returning SVG path data; results are memoised because the same faces are
// drawn on every render.
import { artRng } from './prng';

export type Pt = readonly [number, number];

/** Hatch spacing in SVG units: light faces (toward the light), medium and dense. */
export const HATCH = { light: 4.2, medium: 2.8, dense: 1.9 } as const;
export type HatchDensity = keyof typeof HATCH;

/** Faces are shaded with 45° hatching (ART_DIRECTION §2, Linework). */
const DEFAULT_ANGLE = 45;
const MAX_CACHE = 2000;
const cache = new Map<string, string>();

function memo(key: string, make: () => string): string {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const v = make();
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, v);
  return v;
}

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** "M…L…Z" path for a polygon. */
export function poly(pts: readonly Pt[], close = true): string {
  if (pts.length === 0) return '';
  return `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}${close ? 'Z' : ''}`;
}

/** Corner points of a rectangle, clockwise from the top left. */
export function rect(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/** An ellipse as a polygon (for hatching round shapes). */
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, steps = 36): Pt[] {
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2;
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] as Pt;
  });
}

/**
 * Parallel hatch lines clipped to a polygon (even-odd, so concave shapes and
 * holes work). Lines sit on a global grid, so neighbouring faces line up the
 * way an engraver's ruling would.
 */
export function hatch(pts: readonly Pt[], spacing: number, angleDeg = DEFAULT_ANGLE): string {
  if (pts.length < 3 || spacing <= 0) return '';
  const key = `h${spacing}|${angleDeg}|${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(';')}`;
  return memo(key, () => {
    const a = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    // Rotate into a frame where hatch lines are horizontal.
    const r = pts.map(([x, y]) => [x * cos + y * sin, -x * sin + y * cos] as const);
    const ys = r.map((p) => p[1]);
    const lo = Math.ceil(Math.min(...ys) / spacing) * spacing;
    const hi = Math.max(...ys);
    const out: string[] = [];
    for (let y = lo; y <= hi; y += spacing) {
      const xs: number[] = [];
      for (let i = 0; i < r.length; i++) {
        const [x1, y1] = r[i]!;
        const [x2, y2] = r[(i + 1) % r.length]!;
        if (y1 <= y !== y2 <= y) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((m, n) => m - n);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const [u1, u2] = [xs[k]!, xs[k + 1]!];
        if (u2 - u1 < 0.3) continue;
        // Rotate back.
        out.push(
          `M${f1(u1 * cos - y * sin)} ${f1(u1 * sin + y * cos)}L${f1(u2 * cos - y * sin)} ${f1(u2 * sin + y * cos)}`,
        );
      }
    }
    return out.join('');
  });
}

/** Shorthand: hatch a polygon at a named density. */
export function shade(pts: readonly Pt[], density: HatchDensity, angleDeg = DEFAULT_ANGLE): string {
  return hatch(pts, HATCH[density], angleDeg);
}

/** A horizontal guilloche wave from x0 to x1 (sky lines, water, microprint bands). */
export function waveLine(
  x0: number,
  x1: number,
  y: number,
  amp: number,
  period: number,
  phase = 0,
): string {
  return memo(`w${x0}|${x1}|${y}|${amp}|${period}|${phase}`, () => {
    const step = period / 8;
    const pts: Pt[] = [];
    for (let x = x0; x <= x1 + 0.01; x += step) {
      pts.push([x, y + amp * Math.sin(((x - x0) / period) * Math.PI * 2 + phase)]);
    }
    return poly(pts, false);
  });
}

/** An oval ring with a sine ripple (portrait frames, rosette grids). */
export function waveOval(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  waves: number,
  amp: number,
  phase = 0,
): string {
  return memo(`o${cx}|${cy}|${rx}|${ry}|${waves}|${amp}|${phase}`, () => {
    const steps = Math.max(48, waves * 8);
    const pts: Pt[] = [];
    for (let k = 0; k < steps; k++) {
      const t = (k / steps) * Math.PI * 2;
      const d = amp * Math.sin(waves * t + phase);
      pts.push([cx + (rx + d) * Math.cos(t), cy + (ry + d) * Math.sin(t)]);
    }
    return poly(pts);
  });
}

/** Seeded stipple dots inside a rectangle (parks, gravel, beards), as tiny circles. */
export function stipple(x: number, y: number, w: number, h: number, count: number, seed: number) {
  return memo(`s${x}|${y}|${w}|${h}|${count}|${seed}`, () => {
    const rng = artRng(seed);
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const px = x + rng.next() * w;
      const py = y + rng.next() * h;
      out.push(`M${f1(px)} ${f1(py)}h0.01`);
    }
    return out.join('');
  });
}
