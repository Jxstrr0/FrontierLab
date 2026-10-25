// Engraved greenery (ART_DIRECTION §2, Parks): stipple dots for lawns and
// lollipop trees whose crowns are drawn as a single spiral stroke, the way an
// engraver suggests foliage with one continuous line. Crowns carry the city's
// tint underprint, and each building style picks its tree (round, conifer,
// palm, poplar or scrub; styleProfiles.ts).
import { artRng, type ArtRng } from './prng';
import type { Engraver } from './engraver';
import { treeKindFor } from './styleProfiles';
import { parkFeature } from './parkFurniture';

export type TreeKind = 'round' | 'conifer' | 'palm' | 'poplar' | 'scrub';

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

/**
 * A tree standing at local (a, b); `size` scales trunk and crown. The kind
 * defaults to the city style's tree.
 */
export function tree(
  e: Engraver,
  a: number,
  b: number,
  size: number,
  rng: ArtRng,
  kind: TreeKind = treeKindFor(e.style),
): void {
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
  if (kind === 'conifer') return conifer(e, base.x, base.y, trunk, r);
  if (kind === 'palm') return palm(e, base.x, base.y, trunk, r, rng);
  if (kind === 'scrub') return scrub(e, base.x, base.y, r, rng);
  if (kind === 'poplar') return poplar(e, base.x, base.y, trunk, r);
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
  c.fillStyle = e.inks.crown;
  c.fill();
  c.stroke();
  spiral(e, cx, cy, r, rng);
}

/** The engraver's one-line spiral inside a round crown. */
function spiral(e: Engraver, cx: number, cy: number, r: number, rng: ArtRng): void {
  const c = e.ctx;
  // Draw the phase first so every zoom stop uses the same random numbers.
  const phase = rng.range(0, Math.PI * 2);
  const turns = FLORA.spiralTurns[e.lod]!;
  if (turns === 0) return;
  const steps = Math.ceil(turns * FLORA.spiralSteps);
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

/** A conifer: short trunk and two stacked tinted cones with a centre rib. */
function conifer(e: Engraver, x: number, y: number, trunk: number, r: number): void {
  const c = e.ctx;
  const h = trunk * 0.4;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, y - h);
  c.lineWidth = e.inks.outline;
  c.strokeStyle = e.inks.ink;
  c.stroke();
  const tiers = e.lod === 0 ? 1 : 2;
  const total = r * 3.2;
  for (let k = 0; k < tiers; k++) {
    const yb = y - h - (total * k) / (tiers + 0.6);
    const w = r * (1 - k * 0.3);
    c.beginPath();
    c.moveTo(x - w, yb);
    c.lineTo(x, yb - total / (tiers === 1 ? 1 : 1.35));
    c.lineTo(x + w, yb);
    c.closePath();
    c.fillStyle = e.inks.crown;
    c.fill();
    c.stroke();
  }
  if (e.lod === 0) return;
  // Hatch the shaded right half with a few strokes.
  c.beginPath();
  for (let k = 1; k <= 3; k++) {
    const yy = y - h - (total * k) / 4.5;
    c.moveTo(x + 0.5, yy);
    c.lineTo(x + r * 0.5 * (1 - k / 5), yy + r * 0.3);
  }
  c.lineWidth = e.inks.detail;
  c.stroke();
}

/** A palm: a leaning trunk and drooping fronds. */
function palm(e: Engraver, x: number, y: number, trunk: number, r: number, rng: ArtRng): void {
  const c = e.ctx;
  const lean = rng.range(-0.25, 0.25) * r;
  const h = trunk + r * 1.6;
  const tx = x + lean;
  const ty = y - h;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x, y - h * 0.6, tx, ty);
  c.lineWidth = e.inks.outline * 1.2;
  c.strokeStyle = e.inks.ink;
  c.stroke();
  const fronds = e.lod === 0 ? 4 : 6;
  const phase = rng.range(0, Math.PI);
  c.beginPath();
  for (let k = 0; k < fronds; k++) {
    const ang = phase + (k / fronds) * Math.PI * 2;
    const dx = Math.cos(ang) * r * 1.15;
    const dy = Math.sin(ang) * r * 0.45;
    // A leaf: out along an arch and back, so it reads as a filled frond.
    c.moveTo(tx, ty);
    c.quadraticCurveTo(tx + dx * 0.6, ty + dy - r * 0.7, tx + dx, ty + dy + r * 0.35);
    c.quadraticCurveTo(tx + dx * 0.5, ty + dy - r * 0.25, tx, ty);
  }
  c.fillStyle = e.inks.crown;
  c.fill();
  c.lineWidth = e.inks.detail;
  c.stroke();
}

/** A tall narrow poplar with a wavy centre stroke. */
function poplar(e: Engraver, x: number, y: number, trunk: number, r: number): void {
  const c = e.ctx;
  const ry = r * 1.7;
  const cy = y - trunk * 0.5 - ry;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, cy + ry);
  c.lineWidth = e.inks.outline;
  c.strokeStyle = e.inks.ink;
  c.stroke();
  c.beginPath();
  c.ellipse(x, cy, r * 0.55, ry, 0, 0, Math.PI * 2);
  c.fillStyle = e.inks.crown;
  c.fill();
  c.stroke();
  if (e.lod === 0) return;
  // A few shading strokes down the right side.
  c.beginPath();
  for (let k = 1; k <= 4; k++) {
    const py = cy - ry * 0.7 + (k * ry * 1.4) / 5;
    c.moveTo(x + r * 0.1, py);
    c.lineTo(x + r * 0.42, py - r * 0.3);
  }
  c.lineWidth = e.inks.detail;
  c.stroke();
}

/** Low scrub: a ragged tinted bush with no trunk (outback). */
function scrub(e: Engraver, x: number, y: number, r: number, rng: ArtRng): void {
  const c = e.ctx;
  const rr = r * 0.7;
  c.beginPath();
  const n = 7;
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * Math.PI;
    const w = rr * rng.range(0.8, 1.15);
    const px = x - Math.cos(t) * w;
    const py = y - Math.sin(t) * w * 0.9;
    if (k === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fillStyle = e.inks.crown;
  c.fill();
  c.lineWidth = e.inks.outline * 0.8;
  c.strokeStyle = e.inks.ink;
  c.stroke();
}

/** Stipple dots scattered over the local rect a0..a1 × b0..b1 at ground level. */
export function stipple(
  e: Engraver,
  rect: readonly [number, number, number, number],
  rng: ArtRng,
  density = 1,
): void {
  // The dot count depends on the zoom stop, so dots come from a fork of the
  // caller's stream: the caller's later draws match at every zoom stop.
  const dots = artRng(Math.floor(rng.next() * 4294967296));
  const [a0, b0, a1, b1] = rect;
  const c = e.ctx;
  const count = Math.round(FLORA.dots[e.lod]! * density * (a1 - a0) * (b1 - b0));
  const d = FLORA.dotCss / e.inks.stop;
  c.beginPath();
  for (let k = 0; k < count; k++) {
    const p = e.pt(dots.range(a0, a1), dots.range(b0, b1), 0);
    c.rect(p.x - d / 2, p.y - d / 2, d, d);
  }
  c.fillStyle = e.inks.inkA(FLORA.dotAlpha);
  c.fill();
}

/**
 * A park tile's trees at seeded spots, back to front. The middle tile of a
 * park block holds a feature instead (fountain, pond or bandstand), with a
 * ring of trees around it.
 */
export function parkTrees(e: Engraver, x: number, y: number, seed: number, middle = false): void {
  const rng = artRng(seed);
  e.origin(x, y);
  if (middle && parkFeature(e, rng, seed)) return;
  const count = rng.int(FLORA.perTile[0], FLORA.perTile[1]);
  const spots = Array.from({ length: count }, () => [rng.range(0.2, 0.8), rng.range(0.2, 0.8)]);
  spots.sort((p, q) => p[0]! + p[1]! - (q[0]! + q[1]!));
  for (const [a, b] of spots) tree(e, a!, b!, rng.range(0.85, 1.15), rng);
}
