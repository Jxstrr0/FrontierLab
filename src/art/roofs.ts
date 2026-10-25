// Roof shapes for the local building styles (ART_DIRECTION §2.1): hipped,
// gabled, mansard (with dormers), lean-to and flat roofs with a parapet
// (shaped gable ends that face the street are in gables.ts). Roof planes take
// the tinted hatches (the underprint), walls keep plain paper hatching.
// A footprint is local a0..a1 × b0..b1; walls rise to z1; the left face is
// b = b1 and the right face a = a1, as in solids.ts.
import type { Engraver, Fill, Vec3 } from './engraver';
import { box } from './solids';

export type Rect = readonly [number, number, number, number];

/**
 * Slopes facing away from the viewer show above the ridge when the pitch is low
 * (rise < 32 px per tile of half-depth, the 2:1 view angle), so those are
 * drawn first in that case.
 */
const VIEW_RISE_PER_TILE = 32;

/** Walls with no lid, ready for a roof. */
export function walls(
  e: Engraver,
  r: Rect,
  z1: number,
  left: Fill = 'light',
  right: Fill = 'medium',
) {
  box(e, r[0], r[1], r[2], r[3], 0, z1, { left, right, top: 'none' });
}

/** A flat roof at z, tinted, with a parapet line inside the edge. */
export function flatRoof(e: Engraver, r: Rect, z: number, fill: Fill = 'roof'): void {
  const [a0, b0, a1, b1] = r;
  e.poly(
    [
      [a0, b0, z],
      [a1, b0, z],
      [a1, b1, z],
      [a0, b1, z],
    ],
    fill,
  );
  if (e.lod === 0) return;
  const p = Math.min(0.04, (a1 - a0) / 6, (b1 - b0) / 6);
  e.poly(
    [
      [a0 + p, b0 + p, z],
      [a1 - p, b0 + p, z],
      [a1 - p, b1 - p, z],
      [a0 + p, b1 - p, z],
    ],
    'none',
    e.inks.detail,
  );
}

/** A hipped roof: slopes on all four sides up to a short ridge. */
export function hipRoof(e: Engraver, r: Rect, z1: number, rh: number, alongA: boolean): void {
  const [a0, b0, a1, b1] = r;
  const zr = z1 + rh;
  const am = (a0 + a1) / 2;
  const bm = (b0 + b1) / 2;
  const half = alongA ? (b1 - b0) / 2 : (a1 - a0) / 2;
  // Ridge ends, pulled in by the half-depth so the hips are 45° in plan.
  const ra0 = alongA ? Math.min(am, a0 + half) : am;
  const ra1 = alongA ? Math.max(am, a1 - half) : am;
  const rb0 = alongA ? bm : Math.min(bm, b0 + half);
  const rb1 = alongA ? bm : Math.max(bm, b1 - half);
  if (rh < VIEW_RISE_PER_TILE * half) {
    // Back slopes peek over the ridge at low pitch.
    e.poly(
      [
        [a0, b0, z1],
        [a1, b0, z1],
        [ra1, rb0, zr],
        [ra0, rb0, zr],
      ],
      'roof',
    );
    e.poly(
      [
        [a0, b1, z1],
        [a0, b0, z1],
        [ra0, rb0, zr],
        [ra0, rb1, zr],
      ],
      'roofLight',
    );
  }
  e.poly(
    [
      [a0, b1, z1],
      [a1, b1, z1],
      [ra1, rb1, zr],
      [ra0, rb1, zr],
    ],
    'roofLight',
  );
  e.poly(
    [
      [a1, b1, z1],
      [a1, b0, z1],
      [ra1, rb0, zr],
      [ra1, rb1, zr],
    ],
    'roofMedium',
  );
}

/** Gabled roof planes over walls of height z1 (walls drawn separately). */
export function gableRoof(
  e: Engraver,
  r: Rect,
  z1: number,
  rh: number,
  alongA: boolean,
  end = true,
): void {
  const [a0, b0, a1, b1] = r;
  const zr = z1 + rh;
  if (alongA) {
    const bm = (b0 + b1) / 2;
    if (rh < (VIEW_RISE_PER_TILE * (b1 - b0)) / 2)
      e.poly(
        [
          [a0, b0, z1],
          [a1, b0, z1],
          [a1, bm, zr],
          [a0, bm, zr],
        ],
        'roof',
      );
    if (end) {
      e.poly(
        [
          [a1, b0, z1],
          [a1, bm, zr],
          [a1, b1, z1],
        ],
        'medium',
      );
    }
    e.poly(
      [
        [a0, bm, zr],
        [a1, bm, zr],
        [a1, b1, z1],
        [a0, b1, z1],
      ],
      'roofMedium',
    );
  } else {
    const am = (a0 + a1) / 2;
    if (rh < (VIEW_RISE_PER_TILE * (a1 - a0)) / 2)
      e.poly(
        [
          [a0, b0, z1],
          [am, b0, zr],
          [am, b1, zr],
          [a0, b1, z1],
        ],
        'roof',
      );
    e.poly(
      [
        [am, b0, zr],
        [am, b1, zr],
        [a1, b1, z1],
        [a1, b0, z1],
      ],
      'roofMedium',
    );
    if (end) {
      e.poly(
        [
          [a0, b1, z1],
          [am, b1, zr],
          [a1, b1, z1],
        ],
        'light',
      );
    }
  }
}

/** A mansard roof: steep tinted slopes up from the cornice, a flat top and dormers. */
export function mansardRoof(e: Engraver, r: Rect, z1: number, mh: number, dormers: number): void {
  const [a0, b0, a1, b1] = r;
  const i = Math.min(0.09, (a1 - a0) / 4, (b1 - b0) / 4);
  const zt = z1 + mh;
  const top: Rect = [a0 + i, b0 + i, a1 - i, b1 - i];
  e.poly(
    [
      [a0, b1, z1],
      [a1, b1, z1],
      [top[2], top[3], zt],
      [top[0], top[3], zt],
    ],
    'roofDense',
  );
  e.poly(
    [
      [a1, b1, z1],
      [a1, b0, z1],
      [top[2], top[1], zt],
      [top[2], top[3], zt],
    ],
    'roofMedium',
  );
  e.poly(
    [
      [top[0], top[1], zt],
      [top[2], top[1], zt],
      [top[2], top[3], zt],
      [top[0], top[3], zt],
    ],
    'roof',
  );
  if (e.lod === 0 || dormers <= 0) return;
  // Dormers: little upright windows standing on the slopes, each with a cap.
  const zb = z1 + mh * 0.2;
  const zh = z1 + mh * 0.72;
  const bd = b1 - i * 0.5;
  const ad = a1 - i * 0.5;
  const w = 0.3 / dormers;
  for (let k = 0; k < dormers; k++) {
    const u = (k + 0.5) / dormers;
    const al = a0 + (a1 - a0) * u;
    dormer(e, [al - w * 0.5, bd, zb], [al + w * 0.5, bd, zb], zh);
    const br = b1 - (b1 - b0) * u;
    dormer(e, [ad, br + w * 0.5, zb], [ad, br - w * 0.5, zb], zh);
  }
}

function dormer(e: Engraver, p: Vec3, q: Vec3, zh: number): void {
  const cap = (zh - p[2]) * 0.45;
  const mid: Vec3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, zh + cap];
  e.poly([p, q, [q[0], q[1], zh], mid, [p[0], p[1], zh]], 'paper', e.inks.detail);
  if (e.lod < 2) return;
  e.segments(
    [
      [
        [mid[0], mid[1], p[2] + 1],
        [mid[0], mid[1], zh - 0.5],
      ],
    ],
    e.inks.detail * 2.4,
  );
}

/** A single-pitch (lean-to) roof sloping down toward +b or +a. */
export function shedRoof(e: Engraver, r: Rect, z1: number, rh: number, alongA: boolean): void {
  const [a0, b0, a1, b1] = r;
  const zh = z1 + rh;
  if (alongA) {
    e.poly(
      [
        [a1, b0, z1],
        [a1, b0, zh],
        [a1, b1, z1],
      ],
      'medium',
    );
    e.poly(
      [
        [a0, b0, zh],
        [a1, b0, zh],
        [a1, b1, z1],
        [a0, b1, z1],
      ],
      'roofLight',
    );
  } else {
    e.poly(
      [
        [a0, b1, z1],
        [a0, b1, zh],
        [a1, b1, z1],
      ],
      'light',
    );
    e.poly(
      [
        [a0, b0, zh],
        [a0, b1, zh],
        [a1, b1, z1],
        [a1, b0, z1],
      ],
      'roofMedium',
    );
  }
}
