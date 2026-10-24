// Landmarks (ART_DIRECTION §2, ROADMAP Stage 3): one big engraved building over
// a whole 3×3 block. The central bank is a columned temple with a dome and the
// clock tower stands in a university quad; the stadium and airport live in
// landmarksOpen.ts. Local coordinates run 0..3 across the block.
import { STOREY_PX } from '../config/map';
import type { LandmarkSite } from './citygen';
import type { Engraver, Vec3 } from './engraver';
import { stipple } from './flora';
import { airport, stadium } from './landmarksOpen';
import { artRng } from './prng';
import { bands, box, castShadow, cylinder, dome, gable, ribs } from './solids';

/** Visual tuning for the bank and the clock tower, in world px and tiles. */
const BANK = {
  plinth: 5,
  temple: 34,
  entablature: 4,
  pediment: 13,
  columns: [4, 6, 8],
  drum: 9,
  domeR: 0.55,
  domeH: 24,
} as const;
const CLOCK = {
  hall: 2.2,
  shaft: 64,
  belfry: 12,
  spire: 26,
  faceR: 0.17,
} as const;
/** World px along one tile edge on screen (√(32² + 16²)), for circles on walls. */
const EDGE_PX = 35.78;

export function drawLandmark(e: Engraver, site: LandmarkSite, seed: number): void {
  e.origin(site.x, site.y);
  const s = site.size;
  if (site.id === 'centralBank') centralBank(e, s);
  else if (site.id === 'clockTower') clockTower(e, s, seed);
  else if (site.id === 'stadium') stadium(e, s, seed);
  else airport(e, s, seed);
}

function centralBank(e: Engraver, s: number): void {
  const p0 = 0.15;
  const t0 = 0.5;
  const t1 = s - 0.5;
  const zTemple = BANK.plinth + BANK.temple;
  const zRoof = zTemple + BANK.entablature;
  castShadow(e, t0, t0, t1, t1, zRoof + BANK.pediment);
  // Stepped plinth.
  box(e, p0, p0, s - p0, s - p0, 0, BANK.plinth);
  bands(e, 'left', [p0, p0, s - p0, s - p0], [BANK.plinth / 3, (BANK.plinth * 2) / 3]);
  // Portico: shadowed wall with paper columns standing in front of it.
  box(e, t0, t0, t1, t1, BANK.plinth, zTemple, { left: 'dense', right: 'medium', top: 'none' });
  const n = BANK.columns[e.lod]!;
  const cw = ((t1 - t0) / n) * 0.42;
  for (let k = 0; k < n; k++) {
    const a = t0 + ((t1 - t0) * (k + 0.5)) / n;
    e.poly(
      [
        [a - cw / 2, t1, BANK.plinth],
        [a + cw / 2, t1, BANK.plinth],
        [a + cw / 2, t1, zTemple],
        [a - cw / 2, t1, zTemple],
      ],
      'paper',
      e.inks.detail,
    );
  }
  ribs(e, 'right', [t0, t0, t1, t1], BANK.plinth, zTemple, n);
  // Entablature slab.
  const o = 0.06;
  box(e, t0 - o, t0 - o, t1 + o, t1 + o, zTemple, zRoof, { left: 'paper', right: 'light' });
  // Roof: the pediment faces the left street, ridge running along b.
  const am = s / 2;
  const zr = zRoof + BANK.pediment;
  const [a0, b0, a1, b1] = [t0 - o, t0 - o, t1 + o, t1 + o];
  e.poly(
    [
      [am, b0, zr],
      [am, b1, zr],
      [a1, b1, zRoof],
      [a1, b0, zRoof],
    ],
    'medium',
  );
  // Dome on a drum, set back behind the pediment.
  const db = s * 0.42;
  cylinder(e, am, db, BANK.domeR, zRoof, zr + BANK.drum, 'light');
  dome(e, am, db, BANK.domeR, zr + BANK.drum, BANK.domeH);
  const lantern = zr + BANK.drum + BANK.domeH;
  cylinder(e, am, db, 0.08, lantern - 2, lantern + 5, 'medium');
  e.segments(
    [
      [
        [am, db, lantern + 5],
        [am, db, lantern + 13],
      ],
    ],
    e.inks.outline,
  );
  // Pediment triangle with an inner moulding.
  e.poly(
    [
      [a0, b1, zRoof],
      [am, b1, zr],
      [a1, b1, zRoof],
    ],
    'paper',
  );
  if (e.lod > 0) {
    const i = 0.25;
    e.poly(
      [
        [a0 + i, b1, zRoof + 2],
        [am, b1, zr - 3],
        [a1 - i, b1, zRoof + 2],
      ],
      'light',
      e.inks.detail,
    );
  }
}

function clockTower(e: Engraver, s: number, seed: number): void {
  const rng = artRng(seed);
  const h = CLOCK.hall;
  const m = 0.1;
  const d = 0.62;
  castShadow(e, 1.15, 0.9, 1.85, 1.6, CLOCK.shaft);
  // Back hall, then the left wing.
  gable(e, m, m, s - m, m + d, h * STOREY_PX, 10, true);
  gable(e, m, m + d, m + d, s - m - d, h * STOREY_PX, 10, false);
  // The quad lawn with crossing paths.
  stipple(e, [m + d, m + d, s - m - d, s - m - d], rng, 2);
  e.segments(
    [
      [
        [s / 2, m + d, 0],
        [s / 2, s - m - d, 0],
      ],
      [
        [m + d, s / 2, 0],
        [s - m - d, s / 2, 0],
      ],
    ],
    e.inks.detail * 2.5,
    0.25,
  );
  // The tower: shaft, belfry, clock faces and spire.
  const [ta0, tb0, ta1, tb1] = [1.2, 0.95, 1.8, 1.55];
  box(e, ta0, tb0, ta1, tb1, 0, CLOCK.shaft);
  ribs(e, 'left', [ta0, tb0, ta1, tb1], 0, CLOCK.shaft - 14, 3);
  const zb = CLOCK.shaft + CLOCK.belfry;
  const o = 0.05;
  box(e, ta0 - o, tb0 - o, ta1 + o, tb1 + o, CLOCK.shaft, zb, { left: 'dense', right: 'dense' });
  clockFace(e, 'left', [ta0, tb0, ta1, tb1], CLOCK.shaft - 7);
  clockFace(e, 'right', [ta0, tb0, ta1, tb1], CLOCK.shaft - 7);
  const apex: Vec3 = [(ta0 + ta1) / 2, (tb0 + tb1) / 2, zb + CLOCK.spire];
  e.poly([[ta0 - o, tb1 + o, zb], [ta1 + o, tb1 + o, zb], apex], 'light');
  e.poly([[ta1 + o, tb1 + o, zb], [ta1 + o, tb0 - o, zb], apex], 'medium');
  // Right wing, then the front hall.
  gable(e, s - m - d, m + d, s - m, s - m - d, h * STOREY_PX, 10, false);
  gable(e, m, s - m - d, s - m, s - m, h * STOREY_PX, 10, true);
}

/** A round clock face on a tower wall, with two hands. */
function clockFace(
  e: Engraver,
  face: 'left' | 'right',
  rect: readonly [number, number, number, number],
  zc: number,
): void {
  const [a0, b0, a1, b1] = rect;
  const r = CLOCK.faceR;
  const rz = r * EDGE_PX;
  const steps = 18;
  const pts: Vec3[] = [];
  for (let k = 0; k < steps; k++) {
    const t = (k / steps) * Math.PI * 2;
    const u = Math.cos(t) * r;
    const z = zc + Math.sin(t) * rz;
    pts.push(face === 'left' ? [(a0 + a1) / 2 + u, b1, z] : [a1, (b0 + b1) / 2 - u, z]);
  }
  e.poly(pts, 'paper', e.inks.detail);
  if (e.lod === 0) return;
  const c: Vec3 = face === 'left' ? [(a0 + a1) / 2, b1, zc] : [a1, (b0 + b1) / 2, zc];
  const hand = (du: number, dz: number): Vec3 =>
    face === 'left' ? [c[0] + du, c[1], c[2] + dz] : [c[0], c[1] - du, c[2] + dz];
  e.segments(
    [
      [c, hand(0, rz * 0.75)],
      [c, hand(r * 0.55, -rz * 0.2)],
    ],
    e.inks.detail,
  );
}
