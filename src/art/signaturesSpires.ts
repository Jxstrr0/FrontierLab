// Signature landmarks with spires and domes (ART_DIRECTION §2.1): the stepped
// "wedding cake" tower with low wings and a tall needle spire, and the church
// crowned with a cluster of onion domes beside its bell tower. Local coords
// run 0..s across the block; heights in world px. Drawn back to front.
import type { Engraver, Fill } from './engraver';
import { bands, ribs, windowSlits } from './faceMarks';
import type { Rect } from './roofs';
import { frustum, mast, screenR } from './signatureKit';
import { box, castShadow, cylinder } from './solids';

/** A stone block with piers and a cornice line. */
function block(e: Engraver, r: Rect, z0: number, z1: number, piers: number): void {
  box(e, r[0], r[1], r[2], r[3], z0, z1, { left: 'light', right: 'medium', top: 'roof' });
  ribs(e, 'left', r, z0, z1, piers);
  ribs(e, 'right', r, z0, z1, piers);
  if (e.lod > 0) {
    bands(e, 'left', r, [z1 - 2], e.inks.outline);
    bands(e, 'right', r, [z1 - 2], e.inks.outline);
  }
}

export function steppedSpire(e: Engraver, s: number): void {
  const c = s / 2;
  castShadow(e, 0.3, 0.3, 2.7, 2.7, 230);
  const piers = [3, 5, 7][e.lod]!;
  // Low wings along the back and the left, then the stepped central tower.
  block(e, [0.15, 0.15, 2.85, 0.5], 0, 34, piers + 2);
  block(e, [0.15, 0.5, 0.5, 2.85], 0, 34, piers + 2);
  const tiers: [number, number, number][] = [
    [0.95, 0, 70],
    [0.75, 70, 118],
    [0.58, 118, 152],
    [0.42, 152, 176],
    [0.3, 176, 192],
  ];
  tiers.forEach(([h, z0, z1], k) => {
    const r: Rect = [c - h, c - h, c + h, c + h];
    block(e, r, z0, z1, piers);
    if (k === 0 && e.lod > 0) {
      windowSlits(e, 'left', r, 8, 64, 6, 8, 0.5);
      windowSlits(e, 'right', r, 8, 64, 6, 8, 0.5);
    }
    // Corner pinnacles on the second tier's roof.
    if (k === 1 && e.lod > 0) {
      for (const [a, b] of [
        [c - h, c - h],
        [c + h, c - h],
        [c - h, c + h],
        [c + h, c + h],
      ] as const) {
        frustum(e, a, b, z1, z1 + 12, 0.05, 0.01, 'light', null);
      }
    }
  });
  // The needle spire on a small drum.
  frustum(e, c, c, 192, 202, 0.16, 0.12, 'light', 'paper');
  frustum(e, c, c, 202, 246, 0.1, 0.012, 'roofLight', null);
  mast(e, c, c, 246, 256, 0);
}

/** An onion dome on a drum: a bulb wider than the drum, drawn to a point. */
function onion(e: Engraver, a: number, b: number, r: number, z: number, h: number, fill: Fill) {
  cylinder(e, a, b, r * 0.7, z, z + h * 0.35, 'light');
  const base = z + h * 0.35;
  const c = e.ctx;
  const p = e.pt(a, b, base);
  const x = screenR(e, r);
  const top = p.y - h * 0.9;
  c.beginPath();
  c.moveTo(p.x - x * 0.7, p.y);
  c.bezierCurveTo(p.x - x * 1.5, p.y - h * 0.3, p.x - x * 0.4, top + h * 0.25, p.x, top);
  c.bezierCurveTo(p.x + x * 0.4, top + h * 0.25, p.x + x * 1.5, p.y - h * 0.3, p.x + x * 0.7, p.y);
  c.ellipse(p.x, p.y, x * 0.7, x * 0.35, 0, 0, Math.PI, false);
  c.closePath();
  if (e.setFill(fill)) c.fill();
  c.lineWidth = e.inks.outline;
  c.strokeStyle = e.inks.ink;
  c.stroke();
  if (e.lod > 0) {
    // A swirl line across the bulb, then the finial.
    c.beginPath();
    c.moveTo(p.x - x * 0.9, p.y - h * 0.2);
    c.quadraticCurveTo(p.x, p.y - h * 0.05, p.x + x * 0.5, top + h * 0.2);
    c.lineWidth = e.inks.detail;
    c.stroke();
  }
  c.beginPath();
  c.moveTo(p.x, top);
  c.lineTo(p.x, top - h * 0.25);
  c.lineWidth = e.inks.outline;
  c.stroke();
}

export function onionDomes(e: Engraver, _s: number): void {
  const nave: Rect = [0.6, 0.6, 2.3, 2.3];
  const wall = 40;
  castShadow(e, 0.4, 0.4, 2.6, 2.6, 150);
  // The bell tower behind, a tiered square shaft with a slim tent roof.
  const bell: Rect = [0.25, 1.3, 0.65, 1.7];
  box(e, ...bell, 0, 70, { left: 'light', right: 'medium', top: 'roof' });
  box(e, 0.3, 1.35, 0.6, 1.65, 70, 92, { left: 'paper', right: 'light', top: 'roof' });
  frustum(e, 0.45, 1.5, 92, 128, 0.14, 0.01, 'roofMedium', null);
  box(e, ...nave, 0, wall, { left: 'light', right: 'medium', top: 'roof' });
  if (e.lod > 0) {
    windowSlits(e, 'left', nave, 8, wall - 6, 5, 12, 0.5);
    windowSlits(e, 'right', nave, 8, wall - 6, 5, 12, 0.5);
    bands(e, 'left', nave, [wall - 2], e.inks.outline);
    bands(e, 'right', nave, [wall - 2], e.inks.outline);
  }
  // Four corner domes, back ones first, then the tall central one.
  const fills: Fill[] = ['roofMedium', 'roofLight', 'roofLight', 'roofMedium'];
  const corners: [number, number][] = [
    [0.95, 0.95],
    [1.95, 0.95],
    [0.95, 1.95],
    [1.95, 1.95],
  ];
  corners.forEach(([a, b], k) => {
    if (a + b < 2.9) onion(e, a, b, 0.22, wall, 44, fills[k]!);
  });
  onion(e, 1.45, 1.45, 0.32, wall, 78, 'roofDense');
  corners.forEach(([a, b], k) => {
    if (a + b >= 2.9) onion(e, a, b, 0.22, wall, 44, fills[k]!);
  });
}
