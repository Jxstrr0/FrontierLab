// Marks drawn on a building's visible faces (ART_DIRECTION §2): window slits,
// full-height tower ribs and horizontal bands. A face is addressed by u across
// it (0..1, left to right on screen) and z up it, in world px.
import type { Engraver, Vec3 } from './engraver';

/** Which visible face a mark sits on: left (b = b1) or right (a = a1). */
export type Face = 'left' | 'right';

/** A point on a face: u runs 0..1 left to right across it, z is height. */
export function onFace(
  face: Face,
  a0: number,
  b0: number,
  a1: number,
  b1: number,
  u: number,
  z: number,
): Vec3 {
  return face === 'left' ? [a0 + u * (a1 - a0), b1, z] : [a1, b1 - u * (b1 - b0), z];
}

/**
 * Window marks on a face: `cols` slits per storey between z0 and z1, each a
 * short vertical stroke covering `fill` of the storey height.
 */
export function windowSlits(
  e: Engraver,
  face: Face,
  rect: readonly [number, number, number, number],
  z0: number,
  z1: number,
  cols: number,
  storey: number,
  fill = 0.55,
): void {
  const [a0, b0, a1, b1] = rect;
  const segs: [Vec3, Vec3][] = [];
  const rows = Math.max(0, Math.floor((z1 - z0) / storey + 0.01));
  for (let r = 0; r < rows; r++) {
    const zb = z0 + r * storey + storey * (1 - fill) * 0.5;
    const zt = zb + storey * fill;
    for (let k = 0; k < cols; k++) {
      const u = (k + 0.5) / cols;
      segs.push([onFace(face, a0, b0, a1, b1, u, zb), onFace(face, a0, b0, a1, b1, u, zt)]);
    }
  }
  e.segments(segs, e.inks.detail * 1.7, 0.9);
}

/** Vertical lines running the full height of a face (tower window ribs). */
export function ribs(
  e: Engraver,
  face: Face,
  rect: readonly [number, number, number, number],
  z0: number,
  z1: number,
  count: number,
): void {
  const [a0, b0, a1, b1] = rect;
  const segs: [Vec3, Vec3][] = [];
  for (let k = 1; k < count; k++) {
    const u = k / count;
    segs.push([onFace(face, a0, b0, a1, b1, u, z0), onFace(face, a0, b0, a1, b1, u, z1)]);
  }
  e.segments(segs, e.inks.detail);
}

/** Horizontal bands across a face at the given heights (floor lines, cornices). */
export function bands(
  e: Engraver,
  face: Face,
  rect: readonly [number, number, number, number],
  heights: readonly number[],
  width = e.inks.detail,
): void {
  const [a0, b0, a1, b1] = rect;
  e.segments(
    heights.map((z) => [onFace(face, a0, b0, a1, b1, 0, z), onFace(face, a0, b0, a1, b1, 1, z)]),
    width,
  );
}
