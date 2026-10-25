// Rooftop clutter for the local building styles (ART_DIRECTION §2.1): chimney
// stacks, timber water tanks, solar panels, roof gardens, plant boxes and small
// church spires. Seeded through the caller's ArtRng; the finer pieces only
// draw at the nearer zoom stops.
import { STOREY_PX } from '../config/map';
import type { Engraver, Vec3 } from './engraver';
import { stipple, tree } from './flora';
import type { ArtRng } from './prng';
import type { Rect } from './roofs';
import { box, cylinder } from './solids';

/** Visual tuning, in tiles and world px. */
const TOP = {
  chimneyW: 0.05,
  chimneyPx: 5,
  tankR: 0.07,
  tankLegs: 3,
  panelRows: 2,
  panelCols: [0, 2, 3],
  panelTilt: 2,
  plantPx: 4,
  spireBase: 0.11,
} as const;

/** A brick chimney stack with pots, standing on a roof at (a, b, z). */
export function chimney(e: Engraver, a: number, b: number, z: number, h = TOP.chimneyPx): void {
  if (e.lod === 0) return;
  const w = TOP.chimneyW;
  box(e, a - w, b - w * 0.6, a + w, b + w * 0.6, z, z + h, {
    left: 'medium',
    right: 'dense',
    top: 'none',
  });
  if (e.lod < 2) return;
  e.segments(
    [
      [
        [a - w * 0.4, b, z + h],
        [a - w * 0.4, b, z + h + 1.5],
      ],
      [
        [a + w * 0.4, b, z + h],
        [a + w * 0.4, b, z + h + 1.5],
      ],
    ],
    e.inks.detail * 2,
  );
}

/** A timber water tank on a little frame (brick and dense cities). */
export function waterTank(e: Engraver, a: number, b: number, z: number): void {
  if (e.lod === 0) return;
  e.segments(
    [
      [
        [a, b, z],
        [a, b, z + TOP.tankLegs],
      ],
    ],
    e.inks.detail,
  );
  cylinder(e, a, b, TOP.tankR, z + TOP.tankLegs, z + TOP.tankLegs + STOREY_PX * 0.9, 'light');
  if (e.lod < 2) return;
  // Conical lid.
  const top = z + TOP.tankLegs + STOREY_PX * 0.9;
  e.poly(
    [
      [a - TOP.tankR, b + TOP.tankR, top],
      [a, b, top + 3],
      [a + TOP.tankR, b - TOP.tankR, top],
    ],
    'roofMedium',
    e.inks.detail,
  );
}

/** Rows of tilted solar panels on a flat roof. */
export function solarPanels(e: Engraver, r: Rect, z: number): void {
  const cols = TOP.panelCols[e.lod]!;
  if (cols === 0) return;
  const [a0, b0, a1, b1] = r;
  const da = (a1 - a0) / cols;
  const db = (b1 - b0) / TOP.panelRows;
  const panels: Vec3[][] = [];
  for (let j = 0; j < TOP.panelRows; j++) {
    for (let i = 0; i < cols; i++) {
      const pa = a0 + i * da + da * 0.1;
      const pb = b0 + j * db + db * 0.15;
      panels.push([
        [pa, pb, z + TOP.panelTilt],
        [pa + da * 0.8, pb, z + TOP.panelTilt],
        [pa + da * 0.8, pb + db * 0.7, z + 0.3],
        [pa, pb + db * 0.7, z + 0.3],
      ]);
    }
  }
  e.polys(panels, 'dense', e.inks.detail);
}

/** A roof garden: a tinted lawn, stipple and a couple of small trees. */
export function roofGarden(e: Engraver, r: Rect, z: number, rng: ArtRng): void {
  const [a0, b0, a1, b1] = r;
  e.poly(
    [
      [a0, b0, z],
      [a1, b0, z],
      [a1, b1, z],
      [a0, b1, z],
    ],
    'lawn',
    e.inks.detail,
  );
  if (e.lod < 2) return;
  raisedStipple(e, r, z, rng);
  const n = 1;
  for (let k = 0; k < n; k++) {
    const a = a0 + (a1 - a0) * (0.3 + 0.4 * k);
    const b = b0 + (b1 - b0) * rng.range(0.3, 0.7);
    e.ctx.save();
    e.ctx.translate(0, -z);
    tree(e, a, b, 0.45, rng);
    e.ctx.restore();
  }
}

/** Stipple on a raised surface (shifted up by z). */
function raisedStipple(e: Engraver, r: Rect, z: number, rng: ArtRng): void {
  e.ctx.save();
  e.ctx.translate(0, -z);
  stipple(e, r, rng, 1.2);
  e.ctx.restore();
}

/** Small boxes of plant and air-conditioning units on a flat roof. */
export function plantBoxes(e: Engraver, r: Rect, z: number, rng: ArtRng, count = 2): void {
  if (e.lod === 0) return;
  const [a0, b0, a1, b1] = r;
  const spots: [number, number][] = [];
  for (let k = 0; k < count; k++) {
    spots.push([rng.range(a0 + 0.08, a1 - 0.14), rng.range(b0 + 0.08, b1 - 0.14)]);
  }
  spots.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
  for (const [a, b] of spots)
    box(e, a, b, a + 0.08, b + 0.06, z, z + TOP.plantPx, { right: 'dense' });
}

/** A slim church spire on a square base, rising from (a, b, z) to z + h. */
export function spire(e: Engraver, a: number, b: number, z: number, h: number): void {
  const w = TOP.spireBase;
  const zb = z + h * 0.45;
  box(e, a - w, b - w, a + w, b + w, z, zb, { left: 'light', right: 'medium', top: 'none' });
  if (e.lod > 0) {
    e.segments(
      [
        [
          [a, b + w, zb - 6],
          [a, b + w, zb - 2],
        ],
      ],
      e.inks.detail * 2.4,
    );
  }
  const apex: Vec3 = [a, b, z + h];
  e.poly([[a - w, b + w, zb], [a + w, b + w, zb], apex], 'roofLight');
  e.poly([[a + w, b + w, zb], [a + w, b - w, zb], apex], 'roofMedium');
}
