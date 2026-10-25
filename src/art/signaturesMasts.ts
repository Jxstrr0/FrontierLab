// Signature landmarks that are round towers and lattice masts (ART_DIRECTION
// §2.1): the slim needle tower with its round lookout, the very tall
// broadcast tower with a pod and an antenna, the saucer-crowned tower on
// three legs, the iron lattice tower on four legs and the banded lattice
// mast. Local coords run 0..s across the block; heights in world px.
import type { Engraver, Vec3 } from './engraver';
import { cone, disc, frustum, lattice, mast, plaza } from './signatureKit';
import { box, castShadow } from './solids';

export function needleTower(e: Engraver, s: number): void {
  const c = s / 2;
  plaza(e, 0.3, 0.3, s - 0.3, s - 0.3);
  castShadow(e, c - 0.2, c - 0.2, c + 0.2, c + 0.2, 180);
  disc(e, c, c, 0, 0.55, 7, 'light');
  frustum(e, c, c, 7, 150, 0.16, 0.1, 'light', null);
  // The lookout: a flared underside, a glazed drum, a shallow roof and the mast.
  frustum(e, c, c, 144, 154, 0.1, 0.44, 'medium', null);
  frustum(e, c, c, 154, 163, 0.44, 0.44, 'paper', null);
  if (e.lod > 0) ribsOnDrum(e, c, 154, 163, 0.44, 8);
  frustum(e, c, c, 163, 168, 0.44, 0.2, 'roofLight', 'paper');
  mast(e, c, c, 168, 192, 2);
}

export function broadcastTower(e: Engraver, s: number): void {
  const c = s / 2;
  castShadow(e, c - 0.25, c - 0.25, c + 0.25, c + 0.25, 240);
  // Flared three-legged foot, then the long shaft with its buttress ribs.
  frustum(e, c, c, 0, 40, 0.55, 0.18, 'medium', null);
  frustum(e, c, c, 40, 150, 0.18, 0.12, 'light', null);
  // The main pod: underside, glazed ring, upper ring and cap.
  frustum(e, c, c, 144, 151, 0.12, 0.48, 'medium', null);
  frustum(e, c, c, 151, 160, 0.48, 0.48, 'paper', null);
  if (e.lod > 0) ribsOnDrum(e, c, 151, 160, 0.48, 10);
  frustum(e, c, c, 160, 165, 0.48, 0.36, 'light', null);
  frustum(e, c, c, 165, 169, 0.36, 0.14, 'roofLight', 'paper');
  // Upper shaft and the little sky pod.
  frustum(e, c, c, 169, 192, 0.1, 0.08, 'light', null);
  disc(e, c, c, 192, 0.17, 6, 'medium');
  // Antenna.
  frustum(e, c, c, 198, 232, 0.05, 0.025, 'light', null);
  mast(e, c, c, 232, 256, 0);
}

export function saucerTower(e: Engraver, s: number): void {
  const c = s / 2;
  castShadow(e, c - 0.3, c - 0.3, c + 0.3, c + 0.3, 170);
  plaza(e, 0.35, 0.35, s - 0.35, s - 0.35);
  // Three legs pinched at a waist, flaring up to the saucer.
  const w = (z: number) => {
    if (z < 70) return 0.12 + 0.68 * (1 - z / 70) ** 2;
    return 0.12 + 0.2 * ((z - 70) / 62) ** 1.5;
  };
  frustum(e, c, c, 0, 132, 0.07, 0.07, 'light', null);
  const legs: [Vec3, Vec3][] = [];
  const steps = e.lod === 0 ? 8 : 16;
  for (const ang of [Math.PI * 0.25, Math.PI * 0.92, Math.PI * 1.58]) {
    for (let k = 0; k < steps; k++) {
      const za = (132 * k) / steps;
      const zb = (132 * (k + 1)) / steps;
      legs.push([
        [c + Math.cos(ang) * w(za), c + Math.sin(ang) * w(za), za],
        [c + Math.cos(ang) * w(zb), c + Math.sin(ang) * w(zb), zb],
      ]);
    }
  }
  e.segments(legs, e.inks.outline * 1.6);
  // The saucer: underside, rim, upper dome and a stub mast.
  frustum(e, c, c, 128, 138, 0.22, 0.58, 'medium', null);
  frustum(e, c, c, 138, 142, 0.58, 0.58, 'light', null);
  frustum(e, c, c, 142, 149, 0.58, 0.32, 'roofLight', null);
  frustum(e, c, c, 149, 156, 0.2, 0.16, 'paper', 'paper');
  mast(e, c, c, 156, 176, 1);
}

export function latticeTower(e: Engraver, s: number): void {
  const c = s / 2;
  const top = 222;
  // The legs splay out toward the ground in a smooth curve.
  const half = (z: number) => 0.07 + 1.08 * Math.max(0, 1 - z / (top + 8)) ** 2.7;
  castShadow(e, c - 0.6, c - 0.6, c + 0.6, c + 0.6, 200);
  plaza(e, 0.15, 0.15, s - 0.15, s - 0.15);
  lattice(e, c, c, 0, top, half, [44, 108, 172]);
  // Arches between the legs on the two visible faces.
  for (const face of ['left', 'right'] as const) {
    const pts: Vec3[] = [];
    const n = e.lod === 0 ? 6 : 12;
    for (let k = 0; k <= n; k++) {
      const u = -1 + (2 * k) / n;
      const z = 34 * Math.sqrt(1 - u * u);
      const h = half(z);
      pts.push(face === 'left' ? [c + u * h, c + h, z] : [c + h, c - u * h, z]);
    }
    e.segments(
      pts.slice(1).map((p, k) => [pts[k]!, p]),
      e.inks.outline * 1.2,
    );
  }
  // Platforms: thin bands that hide the lattice behind them.
  for (const [z, extra] of [
    [44, 0.06],
    [108, 0.05],
  ] as const) {
    const h = half(z) + extra;
    box(e, c - h, c - h, c + h, c + h, z, z + 5, { left: 'paper', right: 'light', top: 'none' });
  }
  box(e, c - 0.1, c - 0.1, c + 0.1, c + 0.1, top, top + 8, { right: 'medium' });
  mast(e, c, c, top + 8, 258, 1);
}

export function latticeMast(e: Engraver, s: number): void {
  const c = s / 2;
  const top = 206;
  const half = (z: number) => 0.06 + 0.95 * (1 - z / (top + 20)) ** 1.3;
  castShadow(e, c - 0.5, c - 0.5, c + 0.5, c + 0.5, 210);
  plaza(e, 0.25, 0.25, s - 0.25, s - 0.25);
  // Alternate bands are hatched solid: the mast's two colours.
  const rings: number[] = [];
  for (let z = 26; z < top; z += 26) rings.push(z);
  const zs = [0, ...rings, top];
  for (let k = 0; k < zs.length - 1; k += 2) {
    const za = zs[k]!;
    const zb = zs[k + 1]!;
    const ha = half(za);
    const hb = half(zb);
    e.poly(
      [
        [c - ha, c + ha, za],
        [c + ha, c + ha, za],
        [c + hb, c + hb, zb],
        [c - hb, c + hb, zb],
      ],
      'medium',
      null,
    );
    e.poly(
      [
        [c + ha, c + ha, za],
        [c + ha, c - ha, za],
        [c + hb, c - hb, zb],
        [c + hb, c + hb, zb],
      ],
      'dense',
      null,
    );
  }
  lattice(e, c, c, 0, top, half, rings);
  // Two observation decks and the antenna.
  for (const [z, d] of [
    [118, 0.12],
    [178, 0.09],
  ] as const) {
    const h = half(z) + d;
    box(e, c - h, c - h, c + h, c + h, z, z + 9, {
      left: 'paper',
      right: 'light',
      top: 'roofLight',
    });
  }
  frustum(e, c, c, top, top + 30, 0.05, 0.03, 'paper', null);
  mast(e, c, c, top + 30, 256, 0);
  cone(e, c, c, top - 2, 0.12, 6, 'light');
}

/** Vertical window ribs round the front of a drum. */
function ribsOnDrum(e: Engraver, c: number, z0: number, z1: number, r: number, n: number): void {
  const segs: [Vec3, Vec3][] = [];
  for (let k = 1; k < n; k++) {
    // The visible half of a drum faces +a +b: angles −45° to 135°.
    const t = Math.PI * (k / n - 0.25);
    const a = c + Math.cos(t) * r * 0.99;
    const b = c + Math.sin(t) * r * 0.99;
    segs.push([
      [a, b, z0],
      [a, b, z1],
    ]);
  }
  e.segments(segs, e.inks.detail);
}
