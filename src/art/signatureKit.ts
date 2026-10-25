// Drawing helpers for the signature landmarks (ART_DIRECTION §2.1,
// signatures*.ts): tapered round shafts, flat discs and pods, cones, lattice
// legs with cross-bracing, wheels standing in a vertical plane and hatched
// ground plazas. All in tile space through the engraver (a, b across the
// block, z in world px up), so the art sits on the isometric grid.
import type { Engraver, Fill, Vec3 } from './engraver';

/** World px along one tile edge on screen (√(32² + 16²)): a circle's radius in px. */
export const EDGE_PX = 35.78;

/** Screen x-radius of a flat circle of radius r tiles. */
export function screenR(e: Engraver, r: number): number {
  return r * Math.SQRT2 * (e.pt(1, 0, 0).x - e.pt(0, 0, 0).x);
}

/**
 * A round shaft tapering from radius r0 (tiles) at z0 to r1 at z1, with a
 * flat cap and, nearer in, two shading lines that make it read as round.
 */
export function frustum(
  e: Engraver,
  a: number,
  b: number,
  z0: number,
  z1: number,
  r0: number,
  r1: number,
  side: Fill = 'light',
  cap: Fill | null = 'paper',
): void {
  const c = e.ctx;
  const p0 = e.pt(a, b, z0);
  const p1 = e.pt(a, b, z1);
  const x0 = screenR(e, r0);
  const x1 = screenR(e, r1);
  c.beginPath();
  c.moveTo(p1.x - x1, p1.y);
  c.lineTo(p0.x - x0, p0.y);
  c.ellipse(p0.x, p0.y, x0, x0 / 2, 0, Math.PI, 0, true);
  c.lineTo(p1.x + x1, p1.y);
  c.ellipse(p1.x, p1.y, x1, x1 / 2, 0, 0, Math.PI, false);
  c.closePath();
  if (e.setFill(side)) c.fill();
  c.lineWidth = e.inks.outline;
  c.strokeStyle = e.inks.ink;
  c.stroke();
  if (e.lod > 0 && x0 > 2) {
    c.beginPath();
    for (const f of [0.45, 0.75]) {
      c.moveTo(p0.x + x0 * f, p0.y + (x0 / 2) * Math.sqrt(1 - f * f));
      c.lineTo(p1.x + x1 * f, p1.y + (x1 / 2) * Math.sqrt(1 - f * f));
    }
    c.lineWidth = e.inks.detail;
    c.stroke();
  }
  if (cap) e.flatCircle(a, b, z1, r1, cap, true);
}

/** A disc (pod, deck or saucer) of radius r and thickness t px at z. */
export function disc(
  e: Engraver,
  a: number,
  b: number,
  z: number,
  r: number,
  t: number,
  side: Fill = 'medium',
) {
  frustum(e, a, b, z, z + t, r, r, side, 'paper');
}

/** A cone of base radius r at z rising to a point h px above. */
export function cone(
  e: Engraver,
  a: number,
  b: number,
  z: number,
  r: number,
  h: number,
  fill: Fill = 'roofLight',
) {
  const c = e.ctx;
  const p = e.pt(a, b, z);
  const x = screenR(e, r);
  c.beginPath();
  c.moveTo(p.x - x, p.y);
  c.lineTo(p.x, p.y - h);
  c.lineTo(p.x + x, p.y);
  c.ellipse(p.x, p.y, x, x / 2, 0, 0, Math.PI, false);
  c.closePath();
  if (e.setFill(fill)) c.fill();
  c.lineWidth = e.inks.outline;
  c.strokeStyle = e.inks.ink;
  c.stroke();
}

/** A mast: a vertical line from z0 to z1 with optional cross-bars. */
export function mast(e: Engraver, a: number, b: number, z0: number, z1: number, bars = 0): void {
  const segs: [Vec3, Vec3][] = [
    [
      [a, b, z0],
      [a, b, z1],
    ],
  ];
  for (let k = 1; k <= bars && e.lod > 0; k++) {
    const z = z0 + ((z1 - z0) * k) / (bars + 1);
    segs.push([
      [a - 0.04, b + 0.04, z],
      [a + 0.04, b - 0.04, z],
    ]);
  }
  e.segments(segs, e.inks.outline);
}

/**
 * A lattice of `legs` corner lines whose plan half-width at height z is
 * half(z) (tiles), with horizontal rings at `rings` heights and X-bracing in
 * each visible face between them. Used for iron towers and masts.
 */
export function lattice(
  e: Engraver,
  a: number,
  b: number,
  z0: number,
  z1: number,
  half: (z: number) => number,
  rings: readonly number[],
): void {
  const steps = e.lod === 0 ? 6 : 14;
  const corners: [number, number][] = [
    [-1, 1],
    [1, 1],
    [1, -1],
  ];
  // Visible legs: left, front and right corners.
  const legs: [Vec3, Vec3][] = [];
  for (const [sa, sb] of corners) {
    for (let k = 0; k < steps; k++) {
      const za = z0 + ((z1 - z0) * k) / steps;
      const zb = z0 + ((z1 - z0) * (k + 1)) / steps;
      legs.push([
        [a + sa * half(za), b + sb * half(za), za],
        [a + sa * half(zb), b + sb * half(zb), zb],
      ]);
    }
  }
  e.segments(legs, e.inks.outline * 1.1);
  const zs = [z0, ...rings, z1];
  const brace: [Vec3, Vec3][] = [];
  const ringSegs: [Vec3, Vec3][] = [];
  for (let k = 0; k < zs.length - 1; k++) {
    const za = zs[k]!;
    const zb = zs[k + 1]!;
    const ha = half(za);
    const hb = half(zb);
    ringSegs.push(
      [
        [a - hb, b + hb, zb],
        [a + hb, b + hb, zb],
      ],
      [
        [a + hb, b + hb, zb],
        [a + hb, b - hb, zb],
      ],
    );
    if (e.lod === 0) continue;
    // X-bracing on the two visible faces.
    brace.push(
      [
        [a - ha, b + ha, za],
        [a + hb, b + hb, zb],
      ],
      [
        [a + ha, b + ha, za],
        [a - hb, b + hb, zb],
      ],
      [
        [a + ha, b + ha, za],
        [a + hb, b - hb, zb],
      ],
      [
        [a + ha, b - ha, za],
        [a + hb, b + hb, zb],
      ],
    );
  }
  e.segments(ringSegs, e.inks.detail * 1.3);
  e.segments(brace, e.inks.detail * 0.8, 0.8);
}

/** A paved plaza over the block: a paper square with a ruled border. */
export function plaza(e: Engraver, a0: number, b0: number, a1: number, b1: number): void {
  e.poly(
    [
      [a0, b0, 0],
      [a1, b0, 0],
      [a1, b1, 0],
      [a0, b1, 0],
    ],
    'paper',
    e.inks.detail,
  );
  if (e.lod < 2) return;
  const segs: [Vec3, Vec3][] = [];
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    segs.push([
      [a0 + (a1 - a0) * t, b0, 0],
      [a0 + (a1 - a0) * t, b1, 0],
    ]);
  }
  e.segments(segs, e.inks.detail * 0.6, 0.35);
}

/** A point on a vertical circle in the plane b = const: angle t, radius R px, centre (a, b, zc). */
export function wheelPt(a: number, b: number, zc: number, rPx: number, t: number): Vec3 {
  return [a + (Math.cos(t) * rPx) / EDGE_PX, b, zc + Math.sin(t) * rPx];
}
