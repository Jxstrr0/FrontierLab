// Engraved greenery (ART_DIRECTION §2, Parks): stipple dots for lawns and
// lollipop trees whose crowns are drawn as a single spiral stroke, the way an
// engraver suggests foliage with one continuous line.
import { artRng, type ArtRng } from './prng';
import type { Engraver } from './engraver';

/** Visual tuning for trees and stipple. */
const FLORA = {
  /** Spiral turns inside a crown, by level of detail. */
  spiralTurns: [0, 2.2, 3],
  spiralSteps: 10,
  /** Stipple dots per tile, by level of detail. */
  dots: [8, 18, 30],
  dotCss: 0.9,
  dotAlpha: 0.55,
  /** Trunk height and crown radius range, in world px. */
  trunk: [5, 8],
  crown: [4.5, 7],
  /** Trees per park tile. */
  perTile: [1, 3],
} as const;

/** A lollipop tree standing at local (a, b); `size` scales trunk and crown. */
export function tree(e: Engraver, a: number, b: number, size: number, rng: ArtRng): void {
  const c = e.ctx;
  const trunk = rng.range(FLORA.trunk[0], FLORA.trunk[1]) * size;
  const r = rng.range(FLORA.crown[0], FLORA.crown[1]) * size;
  const base = e.pt(a, b, 0);
  const cx = base.x;
  const cy = base.y - trunk - r * 0.8;
  // Small shadow on the ground, thrown along +a.
  const s = e.pt(a + 0.1 * size, b, 0);
  c.beginPath();
  c.ellipse(s.x, s.y, r * 0.9, r * 0.45, 0, 0, Math.PI * 2);
  c.fillStyle = e.inks.patterns.shadow;
  c.fill();
  // Trunk.
  c.beginPath();
  c.moveTo(base.x, base.y);
  c.lineTo(base.x, cy);
  c.lineWidth = e.inks.outline;
  c.strokeStyle = e.inks.ink;
  c.stroke();
  // Crown: paper disc, outline, then the spiral.
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = e.inks.paper;
  c.fill();
  c.stroke();
  const turns = FLORA.spiralTurns[e.lod]!;
  if (turns === 0) return;
  const steps = Math.ceil(turns * FLORA.spiralSteps);
  const phase = rng.range(0, Math.PI * 2);
  c.beginPath();
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const ang = phase + t * turns * Math.PI * 2;
    const rr = r * 0.82 * t;
    const x = cx + Math.cos(ang) * rr;
    const y = cy + Math.sin(ang) * rr;
    if (k === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.lineWidth = e.inks.detail;
  c.stroke();
}

/** Stipple dots scattered over the local rect a0..a1 × b0..b1 at ground level. */
export function stipple(
  e: Engraver,
  rect: readonly [number, number, number, number],
  rng: ArtRng,
  density = 1,
): void {
  const [a0, b0, a1, b1] = rect;
  const c = e.ctx;
  const count = Math.round(FLORA.dots[e.lod]! * density * (a1 - a0) * (b1 - b0));
  const d = FLORA.dotCss / e.inks.stop;
  c.beginPath();
  for (let k = 0; k < count; k++) {
    const p = e.pt(rng.range(a0, a1), rng.range(b0, b1), 0);
    c.rect(p.x - d / 2, p.y - d / 2, d, d);
  }
  c.fillStyle = e.inks.inkA(FLORA.dotAlpha);
  c.fill();
}

/** A park tile's trees at seeded spots, back to front. */
export function parkTrees(e: Engraver, x: number, y: number, seed: number): void {
  const rng = artRng(seed);
  e.origin(x, y);
  const count = rng.int(FLORA.perTile[0], FLORA.perTile[1]);
  const spots = Array.from({ length: count }, () => [rng.range(0.2, 0.8), rng.range(0.2, 0.8)]);
  spots.sort((p, q) => p[0]! + p[1]! - (q[0]! + q[1]!));
  for (const [a, b] of spots) tree(e, a!, b!, rng.range(0.85, 1.15), rng);
}
