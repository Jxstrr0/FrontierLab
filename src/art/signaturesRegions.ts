// Signature landmarks for the new regions (ART_DIRECTION §2.1, SIMULATION §20a):
// a granite clock tower, a domed capitol, a hilltop observatory, a columned
// gate, a steel needle on a plaza, red-brick mills with chimneys, a tiered
// castle keep and a glass cone over an old brick tower. Local coords run 0..s
// across the block; heights in world px. Drawn back to front.
import type { Engraver } from './engraver';
import { bands, ribs, windowSlits } from './faceMarks';
import type { Rect } from './roofs';
import { cone, frustum, mast, plaza } from './signatureKit';
import { box, castShadow, cylinder, dome } from './solids';

/** A box with window slits on both visible faces (skipped at the lowest detail). */
function windowed(e: Engraver, r: Rect, z0: number, z1: number, cols: number, storey: number) {
  box(e, ...r, z0, z1, { left: 'light', right: 'medium', top: 'roof' });
  if (e.lod === 0) return;
  windowSlits(e, 'left', r, z0 + 4, z1 - 4, cols, storey, 0.5);
  windowSlits(e, 'right', r, z0 + 4, z1 - 4, cols, storey, 0.5);
}

export function clockTower(e: Engraver, _s: number): void {
  castShadow(e, 0.4, 0.4, 2.6, 2.6, 220);
  windowed(e, [0.4, 0.4, 2.6, 2.6], 0, 30, 6, 12);
  const t: Rect = [1.1, 1.1, 1.9, 1.9];
  box(e, ...t, 30, 190, { left: 'light', right: 'medium', top: 'roof' });
  if (e.lod > 0) {
    ribs(e, 'left', t, 30, 150, 4);
    ribs(e, 'right', t, 30, 150, 4);
    bands(e, 'left', t, [150, 172], e.inks.outline);
    bands(e, 'right', t, [150, 172], e.inks.outline);
  }
  // The clock stage, then a pyramid spire.
  box(e, 1.05, 1.05, 1.95, 1.95, 186, 194, { left: 'paper', right: 'light', top: 'roof' });
  cone(e, 1.5, 1.5, 194, 0.55, 40, 'roofMedium');
  mast(e, 1.5, 1.5, 234, 246, 0);
}

export function capitolDome(e: Engraver, _s: number): void {
  castShadow(e, 0.2, 0.6, 2.8, 2.4, 150);
  windowed(e, [0.2, 0.8, 2.8, 2.2], 0, 40, 10, 13);
  windowed(e, [0.9, 0.6, 2.1, 2.4], 0, 52, 5, 13);
  cylinder(e, 1.5, 1.5, 0.5, 52, 80, 'light');
  dome(e, 1.5, 1.5, 0.55, 80, 30);
  frustum(e, 1.5, 1.5, 108, 124, 0.12, 0.08, 'light', 'paper');
  mast(e, 1.5, 1.5, 124, 134, 0);
}

export function observatoryDomes(e: Engraver, _s: number): void {
  plaza(e, 0.2, 0.2, 2.8, 2.8);
  castShadow(e, 0.4, 1.0, 2.6, 2.0, 80);
  windowed(e, [0.4, 1.0, 2.6, 2.0], 0, 30, 8, 12);
  for (const [a, r, h] of [
    [0.75, 0.28, 14],
    [1.5, 0.42, 22],
    [2.25, 0.28, 14],
  ] as const) {
    cylinder(e, a, 1.5, r, 30, 44, 'light');
    dome(e, a, 1.5, r, 44, h);
  }
}

export function columnGate(e: Engraver, _s: number): void {
  castShadow(e, 0.3, 1.1, 2.7, 1.9, 100);
  box(e, 0.3, 1.1, 2.7, 1.9, 0, 8, { left: 'light', right: 'medium', top: 'paper' });
  // Two rows of columns, the back row first.
  for (const b of [1.25, 1.75]) {
    for (let k = 0; k < 6; k++) cylinder(e, 0.45 + k * 0.42, b, 0.07, 8, 56, 'light');
  }
  const top: Rect = [0.3, 1.15, 2.7, 1.85];
  box(e, ...top, 56, 70, { left: 'light', right: 'medium', top: 'roof' });
  if (e.lod > 0) bands(e, 'left', top, [62], e.inks.detail);
  box(e, 1.1, 1.3, 1.9, 1.7, 70, 82, { left: 'paper', right: 'light', top: 'roof' });
  // The chariot group on top: a block with a rearing figure.
  box(e, 1.35, 1.4, 1.65, 1.6, 82, 90, { left: 'medium', right: 'dense', top: 'roofDense' });
  cone(e, 1.5, 1.5, 90, 0.08, 10, 'roofDense');
}

export function plazaNeedle(e: Engraver, _s: number): void {
  plaza(e, 0.3, 0.3, 2.7, 2.7);
  // Low terraces behind the square.
  windowed(e, [0.1, 0.1, 2.9, 0.6], 0, 36, 10, 12);
  windowed(e, [0.1, 0.6, 0.6, 2.9], 0, 36, 8, 12);
  castShadow(e, 1.4, 1.4, 1.6, 1.6, 250);
  frustum(e, 1.6, 1.6, 0, 8, 0.14, 0.12, 'medium', 'paper');
  frustum(e, 1.6, 1.6, 8, 250, 0.06, 0.004, 'light', null);
}

export function millChimneys(e: Engraver, _s: number): void {
  castShadow(e, 0.2, 0.3, 2.8, 2.8, 170);
  windowed(e, [0.2, 0.3, 2.8, 1.4], 0, 64, 12, 12);
  windowed(e, [0.2, 1.4, 1.2, 2.8], 0, 48, 5, 12);
  for (const [a, b, h] of [
    [2.45, 1.8, 130],
    [2.15, 2.45, 168],
  ] as const) {
    frustum(e, a, b, 0, h, 0.18, 0.12, 'medium', 'dense');
    if (e.lod > 0) frustum(e, a, b, h - 8, h, 0.15, 0.15, 'dense', 'dense');
  }
}

export function castleKeep(e: Engraver, _s: number): void {
  castShadow(e, 0.5, 0.5, 2.5, 2.5, 160);
  // The sloping stone base, then three white tiers under dark eaves.
  box(e, 0.5, 0.5, 2.5, 2.5, 0, 34, { left: 'medium', right: 'dense', top: 'roof' });
  const tiers: [number, number, number][] = [
    [0.7, 34, 64],
    [0.55, 68, 94],
    [0.4, 98, 120],
  ];
  for (const [h, z0, z1] of tiers) {
    const r: Rect = [1.5 - h, 1.5 - h, 1.5 + h, 1.5 + h];
    windowed(e, r, z0, z1, 4, 10);
    const w = h + 0.12;
    box(e, 1.5 - w, 1.5 - w, 1.5 + w, 1.5 + w, z1, z1 + 4, {
      left: 'roofDense',
      right: 'roofDense',
      top: 'roofMedium',
    });
  }
  cone(e, 1.5, 1.5, 124, 0.5, 32, 'roofDense');
  mast(e, 1.5, 1.5, 150, 160, 0);
}

export function glassCone(e: Engraver, _s: number): void {
  castShadow(e, 0.3, 0.3, 2.7, 2.7, 190);
  cylinder(e, 1.5, 1.5, 1.15, 0, 40, 'light');
  // The glass cone over the old shot tower, whose brick top pokes through.
  frustum(e, 1.5, 1.5, 40, 150, 0.95, 0.16, 'paper', null);
  if (e.lod > 0) {
    const segs: [[number, number, number], [number, number, number]][] = [];
    for (const f of [-0.6, -0.2, 0.2, 0.6])
      segs.push([
        [1.5 + f * 0.95, 1.5 - f * 0.95, 40],
        [1.5 + f * 0.16, 1.5 - f * 0.16, 150],
      ]);
    e.segments(segs, e.inks.detail);
  }
  cylinder(e, 1.5, 1.5, 0.14, 150, 176, 'medium');
  cone(e, 1.5, 1.5, 176, 0.17, 14, 'roofDense');
}
