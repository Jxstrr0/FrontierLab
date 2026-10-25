// Park furniture (ART_DIRECTION §2.1): the middle tile of every park block gets
// a feature (a fountain, a pond, a bandstand or a statue) at the crossing of
// its paths. The choice comes only from the tile's seed, so the flat parts
// (drawn with the ground in tintLayer.ts) and the raised parts (drawn here as
// the tile's item) always agree.
import type { Engraver, Vec3 } from './engraver';
import { tree } from './flora';
import { artRng, mixSeed, type ArtRng } from './prng';
import { box, cylinder } from './solids';

export type ParkFeature = 'fountain' | 'pond' | 'bandstand' | 'statue';
const FEATURES: readonly ParkFeature[] = ['fountain', 'pond', 'bandstand', 'statue'];

/** Visual tuning, in tiles and world px. */
const PARK = {
  basinR: 0.24,
  basinPx: 2.5,
  jetPx: 9,
  pondR: 0.34,
  standR: 0.2,
  standPx: 7,
  roofPx: 5,
  plinth: 0.07,
  plinthPx: 5,
  figurePx: 6,
  plazaR: 0.36,
} as const;

/** Which feature a park block's middle tile holds (from its seed). */
export function featureFor(seed: number): ParkFeature {
  return FEATURES[artRng(mixSeed(seed, 11)).int(0, FEATURES.length - 1)]!;
}

/** The flat part of a feature, drawn with the ground: a paved round or a pond. */
export function featureGround(e: Engraver, feature: ParkFeature): void {
  if (feature === 'pond') {
    const c = e.ctx;
    const p = e.pt(0.5, 0.5, 0);
    const rx = PARK.pondR * Math.SQRT2 * (e.pt(1, 0, 0).x - e.pt(0, 0, 0).x);
    c.beginPath();
    c.ellipse(p.x, p.y, rx, rx / 2, 0, 0, Math.PI * 2);
    c.fillStyle = e.inks.waterPrint;
    c.fill();
    c.lineWidth = e.inks.outline;
    c.strokeStyle = e.inks.ink;
    c.stroke();
    return;
  }
  e.flatCircle(0.5, 0.5, 0, PARK.plazaR, 'paper', false);
  e.ctx.lineWidth = e.inks.detail;
  e.ctx.strokeStyle = e.inks.inkA(0.5);
  e.ctx.stroke();
}

/** Draws the raised part of the middle tile's feature, with trees in the corners. */
export function parkFeature(e: Engraver, rng: ArtRng, seed: number): boolean {
  // Corner trees behind the feature first, the front one last.
  tree(e, 0.12, 0.14, 0.8, rng);
  const feature = featureFor(seed);
  if (feature === 'fountain') fountain(e);
  else if (feature === 'bandstand') bandstand(e);
  else if (feature === 'statue') statue(e);
  else reeds(e);
  tree(e, 0.88, 0.86, 0.8, rng);
  return true;
}

function fountain(e: Engraver): void {
  const c = 0.5;
  cylinder(e, c, c, PARK.basinR, 0, PARK.basinPx, 'light');
  e.flatCircle(c, c, PARK.basinPx, PARK.basinR * 0.8, 'water', false);
  cylinder(e, c, c, 0.035, PARK.basinPx, PARK.basinPx + 5, 'medium');
  if (e.lod === 0) return;
  // Water jets: arcs falling from the top of the column.
  const top = e.pt(c, c, PARK.basinPx + 5 + PARK.jetPx * 0.4);
  const ctx = e.ctx;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    const end = e.pt(c + 0.15 * s, c - 0.15 * s, PARK.basinPx);
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(top.x + (end.x - top.x) * 0.6, top.y - PARK.jetPx * 0.5, end.x, end.y);
  }
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(top.x, top.y - PARK.jetPx * 0.5);
  ctx.lineWidth = e.inks.detail;
  ctx.strokeStyle = e.inks.inkA(0.7);
  ctx.stroke();
}

function bandstand(e: Engraver): void {
  const c = 0.5;
  const r = PARK.standR;
  cylinder(e, c, c, r, 0, 1.5, 'light');
  const posts: [Vec3, Vec3][] = [];
  for (let k = 0; k < 6; k++) {
    const t = Math.PI * (0.05 + (k / 5) * 0.9);
    const a = c + Math.cos(t) * r * 0.9;
    const b = c + Math.sin(t) * r * 0.9;
    posts.push([
      [a, b, 1.5],
      [a, b, PARK.standPx],
    ]);
  }
  e.segments(posts, e.inks.detail * 1.2);
  // Conical roof with a finial.
  const p = e.pt(c, c, PARK.standPx);
  const rx = r * 1.15 * Math.SQRT2 * (e.pt(1, 0, 0).x - e.pt(0, 0, 0).x);
  const ctx = e.ctx;
  ctx.beginPath();
  ctx.moveTo(p.x - rx, p.y);
  ctx.lineTo(p.x, p.y - PARK.roofPx);
  ctx.lineTo(p.x + rx, p.y);
  ctx.ellipse(p.x, p.y, rx, rx / 2, 0, 0, Math.PI, false);
  ctx.closePath();
  e.setFill('roofLight');
  ctx.fill();
  ctx.lineWidth = e.inks.outline;
  ctx.strokeStyle = e.inks.ink;
  ctx.stroke();
}

function statue(e: Engraver): void {
  const c = 0.5;
  const w = PARK.plinth;
  box(e, c - w, c - w, c + w, c + w, 0, PARK.plinthPx, { left: 'light', right: 'medium' });
  // A figure suggested by a body stroke, a head and a raised arm.
  const z = PARK.plinthPx;
  e.segments(
    [
      [
        [c, c, z],
        [c, c, z + PARK.figurePx * 0.75],
      ],
      [
        [c, c, z + PARK.figurePx * 0.6],
        [c + 0.05, c - 0.05, z + PARK.figurePx],
      ],
    ],
    e.inks.outline * 1.4,
  );
  e.flatCircle(c, c, z + PARK.figurePx * 0.85, 0.02, 'paper', true);
}

/** Reeds at the pond's edge. */
function reeds(e: Engraver): void {
  if (e.lod === 0) return;
  const segs: [Vec3, Vec3][] = [];
  for (const [a, b] of [
    [0.22, 0.6],
    [0.26, 0.66],
    [0.7, 0.24],
    [0.75, 0.28],
  ] as const) {
    segs.push([
      [a, b, 0],
      [a, b, 4],
    ]);
  }
  e.segments(segs, e.inks.detail);
}
