// Gable ends that face the street (ART_DIRECTION §2.1): the plain triangle,
// the canal houses' stepped, bell and neck gables, and half-timbered gables,
// drawn as a wall shape in front of the roof on the visible end face.
import type { Engraver, Fill, Vec3 } from './engraver';
import { onFace, type Face } from './faceMarks';
import { gableRoof, walls, type Rect } from './roofs';

/** How a gable end that faces the street is shaped. */
export type GableEnd = 'plain' | 'stepped' | 'bell' | 'neck' | 'timber';

/**
 * A house with a gabled roof whose end wall faces the street: `alongA` ridges
 * show their end on the right face, the others on the left face. Shaped ends
 * (stepped, bell, neck) rise in front of the roof like a canal-house façade.
 */
export function gableHouse(
  e: Engraver,
  r: Rect,
  z1: number,
  rh: number,
  alongA: boolean,
  end: GableEnd = 'plain',
  wallFill: Fill = 'light',
): void {
  walls(e, r, z1, wallFill);
  gableRoof(e, r, z1, rh, alongA);
  const face: Face = alongA ? 'right' : 'left';
  if (end !== 'plain') gableEnd(e, face, r, z1, rh, end);
}

/** The outline of a shaped gable end in face coordinates (u 0..1, z). */
export function gableOutline(end: GableEnd, z1: number, rh: number): [number, number][] {
  const zr = z1 + rh;
  switch (end) {
    case 'stepped': {
      const steps = 3;
      const out: [number, number][] = [[0, z1]];
      for (let k = 0; k < steps; k++) {
        const u = (k / steps) * 0.38;
        const z = z1 + (rh * (k + 1)) / (steps + 0.4);
        out.push([u, z], [u + 0.38 / steps, z]);
      }
      out.push([0.38, zr + 2], [0.62, zr + 2]);
      for (let k = steps - 1; k >= 0; k--) {
        const u = 1 - (k / steps) * 0.38;
        const z = z1 + (rh * (k + 1)) / (steps + 0.4);
        out.push([u - 0.38 / steps, z], [u, z]);
      }
      out.push([1, z1]);
      return out;
    }
    case 'bell': {
      // Shoulders curve in to a narrow raised top, like a bell.
      const out: [number, number][] = [[0, z1]];
      const n = 6;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        out.push([0.05 + 0.25 * t, z1 + rh * (0.15 + 0.75 * Math.sin((t * Math.PI) / 2))]);
      }
      out.push([0.36, zr + 1.5], [0.64, zr + 1.5]);
      for (let k = n; k >= 0; k--) {
        const t = k / n;
        out.push([0.95 - 0.25 * t, z1 + rh * (0.15 + 0.75 * Math.sin((t * Math.PI) / 2))]);
      }
      out.push([1, z1]);
      return out;
    }
    case 'neck':
      // Low shoulders and a tall central neck with a little pediment.
      return [
        [0, z1],
        [0, z1 + rh * 0.35],
        [0.3, z1 + rh * 0.45],
        [0.3, zr - 2],
        [0.5, zr + 2],
        [0.7, zr - 2],
        [0.7, z1 + rh * 0.45],
        [1, z1 + rh * 0.35],
        [1, z1],
      ];
    default:
      return [
        [0, z1],
        [0.5, zr],
        [1, z1],
      ];
  }
}

/** Draws a gable end wall on a face, with a hoist beam or timber marks. */
export function gableEnd(e: Engraver, face: Face, r: Rect, z1: number, rh: number, end: GableEnd) {
  const pts = gableOutline(end, z1, rh).map(([u, z]) => onFace(face, r[0], r[1], r[2], r[3], u, z));
  e.poly(pts, face === 'left' ? 'light' : 'medium');
  if (e.lod === 0) return;
  const p = (u: number, z: number) => onFace(face, r[0], r[1], r[2], r[3], u, z);
  if (end === 'timber') {
    // King post and two braces in the gable.
    e.segments(
      [
        [p(0.5, z1), p(0.5, z1 + rh)],
        [p(0.18, z1), p(0.5, z1 + rh * 0.6)],
        [p(0.82, z1), p(0.5, z1 + rh * 0.6)],
      ],
      e.inks.outline * 0.8,
    );
  } else {
    // A small attic window, and a hoist beam on the shaped canal gables.
    const zw = z1 + rh * 0.35;
    const marks: [Vec3, Vec3][] = [[p(0.5, zw), p(0.5, zw + Math.min(5, rh * 0.3))]];
    if (end !== 'plain') marks.push([p(0.5, z1 + rh * 0.8), p(0.5, z1 + rh * 0.86)]);
    e.segments(marks, e.inks.detail * 2.2);
  }
}
