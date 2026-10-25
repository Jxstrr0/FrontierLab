// Façade details for the local building styles (ART_DIRECTION §2.1): fire
// escapes, bay windows, shutters, half-timbering, verandahs, balconies,
// arcades, sun-shade fins, shingle courses and hanging signs. Each works on a
// visible face (left: b = b1, right: a = a1) addressed by u across it and z up
// it, and keeps within the tile so chunks never clip it. Most marks only draw
// at the nearer zoom stops (e.lod), so the far zoom stays cheap.
import type { Engraver, Vec3 } from './engraver';
import { onFace, windowSlits, type Face } from './faceMarks';
import type { Rect } from './roofs';
import { box } from './solids';

/** Visual tuning, in tiles (out from the wall) and world px. */
const FACADE = {
  escapeOut: 0.05,
  bayOut: 0.05,
  verandahOut: 0.1,
  verandahPosts: [3, 5, 6],
  balconyOut: 0.04,
  railPx: 2.4,
  signOut: 0.06,
  shingleGap: 1.8,
} as const;

/** A point on a face pushed `out` tiles away from the wall. */
function outward(face: Face, r: Rect, u: number, z: number, out: number): Vec3 {
  const p = onFace(face, r[0], r[1], r[2], r[3], u, z);
  return face === 'left' ? [p[0], p[1] + out, p[2]] : [p[0] + out, p[1], p[2]];
}

/** An iron fire escape zig-zagging up a face between u0 and u1. */
export function fireEscape(
  e: Engraver,
  face: Face,
  r: Rect,
  z0: number,
  z1: number,
  storey: number,
  u0 = 0.3,
  u1 = 0.7,
): void {
  if (e.lod === 0) return;
  const d = FACADE.escapeOut;
  const segs: [Vec3, Vec3][] = [];
  let k = 0;
  for (let z = z0; z + storey * 0.5 <= z1; z += storey, k++) {
    // Landing: outer rail and the two brackets back to the wall.
    segs.push([outward(face, r, u0, z, d), outward(face, r, u1, z, d)]);
    if (e.lod > 1) {
      segs.push([
        outward(face, r, u0, z + FACADE.railPx, d),
        outward(face, r, u1, z + FACADE.railPx, d),
      ]);
      segs.push([outward(face, r, u0, z, 0), outward(face, r, u0, z, d)]);
    }
    // Stair to the next landing, alternating direction.
    if (z + storey <= z1) {
      const [ua, ub] = k % 2 === 0 ? [u0 + 0.04, u1 - 0.04] : [u1 - 0.04, u0 + 0.04];
      segs.push([outward(face, r, ua, z, d * 0.6), outward(face, r, ub, z + storey, d * 0.6)]);
    }
  }
  e.segments(segs, e.inks.detail * 1.1);
}

/** A bay window standing out from a face across u0..u1, from z0 to z1. */
export function bayWindow(
  e: Engraver,
  face: Face,
  r: Rect,
  u0: number,
  u1: number,
  z0: number,
  z1: number,
): void {
  const d = FACADE.bayOut;
  const p = onFace(face, r[0], r[1], r[2], r[3], u0, 0);
  const q = onFace(face, r[0], r[1], r[2], r[3], u1, 0);
  const fr: Rect =
    face === 'left'
      ? [Math.min(p[0], q[0]), r[3], Math.max(p[0], q[0]), r[3] + d]
      : [r[2], Math.min(p[1], q[1]), r[2] + d, Math.max(p[1], q[1])];
  box(e, fr[0], fr[1], fr[2], fr[3], z0, z1, { left: 'paper', right: 'light', top: 'roof' });
  if (e.lod === 0) return;
  const outFace: Face = face;
  const storey = 9;
  windowSlits(e, outFace, fr, z0 + 1, z1 - 1, 2, storey, 0.6);
}

/** Windows flanked by shutters: a dark pane with a bar either side. */
export function shutters(
  e: Engraver,
  face: Face,
  r: Rect,
  z0: number,
  z1: number,
  cols: number,
  storey: number,
): void {
  if (e.lod === 0) return;
  windowSlits(e, face, r, z0, z1, cols, storey, 0.5);
  if (e.lod < 2) return;
  const segs: [Vec3, Vec3][] = [];
  const w = 0.32 / cols;
  for (let z = z0; z + storey * 0.6 <= z1; z += storey) {
    const zb = z + storey * 0.25;
    const zt = z + storey * 0.75;
    for (let k = 0; k < cols; k++) {
      const u = (k + 0.5) / cols;
      for (const s of [-w, w]) {
        segs.push([
          onFace(face, r[0], r[1], r[2], r[3], u + s, zb),
          onFace(face, r[0], r[1], r[2], r[3], u + s, zt),
        ]);
      }
    }
  }
  e.segments(segs, e.inks.detail * 1.3, 0.75);
}

/** Half-timbering: storey beams, posts and diagonal braces over a plaster face. */
export function timberFrame(
  e: Engraver,
  face: Face,
  r: Rect,
  z0: number,
  z1: number,
  storey: number,
): void {
  if (e.lod === 0) return;
  const p = (u: number, z: number) => onFace(face, r[0], r[1], r[2], r[3], u, z);
  const segs: [Vec3, Vec3][] = [];
  const panels = e.lod > 1 ? 4 : 2;
  for (let z = z0; z + storey * 0.5 <= z1; z += storey) {
    const zt = Math.min(z1, z + storey);
    segs.push([p(0, zt), p(1, zt)]);
    for (let k = 0; k <= panels; k++) segs.push([p(k / panels, z), p(k / panels, zt)]);
    if (e.lod > 1) {
      for (let k = 0; k < panels; k += 2) {
        segs.push([p(k / panels, z), p((k + 1) / panels, zt)]);
        segs.push([p((k + 2) / panels, z), p((k + 1) / panels, zt)]);
      }
    }
  }
  e.segments(segs, e.inks.outline * 0.75);
}

/** A verandah along a face: a tinted lean-to roof at height z on posts. */
export function verandah(
  e: Engraver,
  face: Face,
  r: Rect,
  z: number,
  out: number = FACADE.verandahOut,
) {
  const drop = 2.5;
  const roof: Vec3[] = [
    outward(face, r, 0, z, 0),
    outward(face, r, 1, z, 0),
    outward(face, r, 1, z - drop, out),
    outward(face, r, 0, z - drop, out),
  ];
  const posts = FACADE.verandahPosts[e.lod]!;
  const segs: [Vec3, Vec3][] = [];
  for (let k = 0; k <= posts; k++) {
    const u = 0.02 + (0.96 * k) / posts;
    segs.push([outward(face, r, u, 0, out * 0.92), outward(face, r, u, z - drop, out * 0.92)]);
  }
  e.segments(segs, e.inks.detail * 1.2);
  if (e.lod > 0 && z > 12) {
    // An upper verandah carries a railing (iron lace at full detail).
    e.segments(
      [
        [
          outward(face, r, 0, z - 9 + FACADE.railPx, out),
          outward(face, r, 1, z - 9 + FACADE.railPx, out),
        ],
      ],
      e.inks.detail,
    );
  }
  e.poly(roof, 'roofLight', e.inks.detail);
}

/** Balcony slabs with railings on every floor between z0 and z1. */
export function balconies(
  e: Engraver,
  face: Face,
  r: Rect,
  z0: number,
  z1: number,
  storey: number,
  u0 = 0.08,
  u1 = 0.92,
): void {
  if (e.lod === 0) return;
  const d = FACADE.balconyOut;
  const segs: [Vec3, Vec3][] = [];
  for (let z = z0; z <= z1; z += storey) {
    segs.push([outward(face, r, u0, z, d), outward(face, r, u1, z, d)]);
    segs.push([outward(face, r, u0, z, 0), outward(face, r, u0, z, d)]);
    if (e.lod > 1) {
      const zr = z + FACADE.railPx;
      segs.push([outward(face, r, u0, zr, d), outward(face, r, u1, zr, d)]);
      segs.push([outward(face, r, u1, z, d), outward(face, r, u1, zr, d)]);
    }
  }
  e.segments(segs, e.inks.detail * 1.1);
}

/** Ground-floor arches (a covered walkway or arcade) across a face. */
export function arcade(e: Engraver, face: Face, r: Rect, h: number, count: number): void {
  if (e.lod === 0) return;
  const arches: Vec3[][] = [];
  for (let k = 0; k < count; k++) {
    const u0 = (k + 0.15) / count;
    const u1 = (k + 0.85) / count;
    const pts: Vec3[] = [onFace(face, r[0], r[1], r[2], r[3], u0, 0)];
    const steps = e.lod > 1 ? 6 : 3;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI;
      const u = (u0 + u1) / 2 - (Math.cos(t) * (u1 - u0)) / 2;
      pts.push(onFace(face, r[0], r[1], r[2], r[3], u, h * 0.62 + Math.sin(t) * h * 0.25));
    }
    pts.push(onFace(face, r[0], r[1], r[2], r[3], u1, 0));
    arches.push(pts);
  }
  e.polys(arches, 'dense', e.inks.detail);
}

/** Deep horizontal sun-shade fins on every floor (tropical slab towers). */
export function sunshades(
  e: Engraver,
  face: Face,
  r: Rect,
  z0: number,
  z1: number,
  storey: number,
) {
  const segs: [Vec3, Vec3][] = [];
  for (let z = z0; z <= z1; z += storey) {
    segs.push([outward(face, r, 0, z, 0.02), outward(face, r, 1, z, 0.02)]);
  }
  e.segments(segs, e.lod === 0 ? e.inks.detail : e.inks.outline * 1.1);
}

/** Shingle courses: fine horizontal lines across a face, at full detail only. */
export function shingles(e: Engraver, face: Face, r: Rect, z0: number, z1: number): void {
  if (e.lod < 2) return;
  const segs: [Vec3, Vec3][] = [];
  for (let z = z0 + FACADE.shingleGap; z < z1; z += FACADE.shingleGap) {
    segs.push([
      onFace(face, r[0], r[1], r[2], r[3], 0, z),
      onFace(face, r[0], r[1], r[2], r[3], 1, z),
    ]);
  }
  e.segments(segs, e.inks.detail * 0.7, 0.45);
}

/** A tall hanging sign board standing out from a face (dense city streets). */
export function hangingSign(e: Engraver, face: Face, r: Rect, u: number, z0: number, z1: number) {
  if (e.lod === 0) return;
  const d = FACADE.signOut;
  const pts: Vec3[] = [
    outward(face, r, u, z0, 0.005),
    outward(face, r, u, z0, d),
    outward(face, r, u, z1, d),
    outward(face, r, u, z1, 0.005),
  ];
  e.poly(pts, 'paper', e.inks.detail);
  if (e.lod < 2) return;
  const segs: [Vec3, Vec3][] = [];
  for (let k = 1; k < 4; k++) {
    const z = z0 + ((z1 - z0) * k) / 4;
    segs.push([outward(face, r, u, z, d * 0.25), outward(face, r, u, z, d * 0.8)]);
  }
  e.segments(segs, e.inks.detail, 0.8);
}

/** A false front: a flat parapet wall rising above the roof on the street face. */
export function falseFront(e: Engraver, face: Face, r: Rect, z1: number, rise: number): void {
  const p = (u: number, z: number) => onFace(face, r[0], r[1], r[2], r[3], u, z);
  e.poly(
    [
      p(0, z1),
      p(1, z1),
      p(1, z1 + rise * 0.6),
      p(0.7, z1 + rise * 0.6),
      p(0.62, z1 + rise),
      p(0.38, z1 + rise),
      p(0.3, z1 + rise * 0.6),
      p(0, z1 + rise * 0.6),
    ],
    face === 'left' ? 'light' : 'medium',
  );
  if (e.lod > 0) e.segments([[p(0, z1 + 1), p(1, z1 + 1)]], e.inks.detail);
}
