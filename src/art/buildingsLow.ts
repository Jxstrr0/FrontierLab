// Low district buildings (ART_DIRECTION §2 table): midtown rowhouses, suburban
// gabled houses with yards, university halls around a quad, and industrial
// sheds with sawtooth roofs and stacks.
import { CITY_LAYOUT } from '../config/balance';
import { STOREY_PX } from '../config/map';
import type { Shell } from './buildingsTall';
import type { Engraver, Vec3 } from './engraver';
import { stipple, tree } from './flora';
import type { ArtRng } from './prng';
import { bands, box, castShadow, cylinder, gable, sawtooth, windowSlits } from './solids';

/** Visual tuning for low buildings. */
const LOW = {
  rowInset: 0.06,
  rowUnits: [2, 3],
  rowHeightJitter: [-0.5, 0.6],
  houseSize: [0.42, 0.56],
  roofPitch: [0.7, 1.0],
  fenceInset: 0.06,
  fencePx: 2.5,
  hallLong: [0.74, 0.86],
  hallShort: [0.42, 0.52],
  shedInset: 0.06,
  teeth: [3, 4],
  stackChance: 0.45,
} as const;

export function midtownRow(e: Engraver, floors: number, rng: ArtRng): Shell {
  const m = LOW.rowInset;
  const units = rng.int(LOW.rowUnits[0], LOW.rowUnits[1]);
  const alongA = rng.chance(0.5);
  const base = floors * STOREY_PX;
  let tallest = 0;
  let last = base;
  castShadow(e, m, m, 1 - m, 1 - m, base);
  const span = (1 - 2 * m) / units;
  for (let u = 0; u < units; u++) {
    const h = Math.max(
      STOREY_PX * 1.5,
      base + Math.round(rng.range(LOW.rowHeightJitter[0], LOW.rowHeightJitter[1]) * STOREY_PX),
    );
    tallest = Math.max(tallest, h);
    last = h;
    const lo = m + u * span;
    const r: [number, number, number, number] = alongA
      ? [lo, m, lo + span, 1 - m]
      : [m, lo, 1 - m, lo + span];
    box(e, r[0], r[1], r[2], r[3], 0, h);
    if (e.lod > 0) {
      const face = alongA ? 'left' : 'right';
      windowSlits(e, face, r, STOREY_PX, h - STOREY_PX * 0.3, 2, STOREY_PX);
      bands(e, face, r, [h - STOREY_PX * 0.3]);
    }
  }
  // Only the frontmost unit's other face shows: give it windows too.
  if (e.lod > 0) {
    const lo = 1 - m - span;
    const f: [number, number, number, number] = alongA
      ? [lo, m, 1 - m, 1 - m]
      : [m, lo, 1 - m, 1 - m];
    windowSlits(e, alongA ? 'right' : 'left', f, STOREY_PX, last - STOREY_PX * 0.3, 2, STOREY_PX);
  }
  return { rect: [m, m, 1 - m, 1 - m], wall: base, roof: [0.5, 0.5, tallest] };
}

export function suburbanHouse(e: Engraver, floors: number, rng: ArtRng): Shell {
  const w = rng.range(LOW.houseSize[0], LOW.houseSize[1]);
  const d = rng.range(LOW.houseSize[0], LOW.houseSize[1]);
  const a0 = rng.range(0.12, 0.88 - w);
  const b0 = rng.range(0.12, 0.88 - d);
  const r: [number, number, number, number] = [a0, b0, a0 + w, b0 + d];
  const wall = floors * STOREY_PX;
  const alongA = w > d;
  const rh = (alongA ? d : w) * 32 * rng.range(LOW.roofPitch[0], LOW.roofPitch[1]);
  // Yard: lawn stipple and a low fence on the two front edges.
  stipple(e, [LOW.fenceInset, LOW.fenceInset, 1 - LOW.fenceInset, 1 - LOW.fenceInset], rng, 0.6);
  // A tree behind the house goes first, one in front goes after.
  const ta = a0 > 0.4 ? rng.range(0.12, a0 - 0.05) : rng.range(a0 + w + 0.05, 0.9);
  const tb = rng.range(0.15, 0.85);
  const treeBehind = ta + tb < a0 + b0 + w;
  if (treeBehind) tree(e, ta, tb, 0.8, rng);
  castShadow(e, ...r, wall + rh);
  gable(e, r[0], r[1], r[2], r[3], wall, rh, alongA);
  if (e.lod > 0) {
    // Door and a window on the lit face.
    const door: Vec3[] = [
      [a0 + w * 0.3, r[3], 0],
      [a0 + w * 0.3, r[3], STOREY_PX * 0.65],
    ];
    e.segments([[door[0]!, door[1]!]], e.inks.detail * 2.4);
  }
  if (!treeBehind) tree(e, ta, tb, 0.8, rng);
  if (e.lod > 0) {
    const f = LOW.fenceInset;
    const z = LOW.fencePx;
    e.segments(
      [
        [
          [f, 1 - f, z],
          [1 - f, 1 - f, z],
        ],
        [
          [1 - f, 1 - f, z],
          [1 - f, f, z],
        ],
      ],
      e.inks.detail,
      0.7,
    );
  }
  return { rect: r, wall, roof: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, wall + rh] };
}

/** University tiles form quads: halls on the block rim, a lawn and tree in the middle. */
export function universityHall(
  e: Engraver,
  x: number,
  y: number,
  floors: number,
  rng: ArtRng,
  lot: boolean,
): Shell {
  const block = CITY_LAYOUT.block;
  const lx = x % block;
  const ly = y % block;
  const wall = floors * STOREY_PX;
  if (!lot && lx === 2 && ly === 2) {
    stipple(e, [0.05, 0.05, 0.95, 0.95], rng, 1);
    tree(e, 0.5, 0.5, 1.2, rng);
    return { rect: [0.3, 0.3, 0.7, 0.7], wall: 0, roof: [0.5, 0.5, 0] };
  }
  // Halls run along the rim of the block (ridge parallel to the nearer street).
  const alongA = ly !== 2;
  const long = rng.range(LOW.hallLong[0], LOW.hallLong[1]);
  const short = rng.range(LOW.hallShort[0], LOW.hallShort[1]);
  const [w, d] = alongA ? [long, short] : [short, long];
  // Hug the street side of the tile.
  const a0 = lx === 1 ? 0.08 : lx === 3 ? 0.92 - w : (1 - w) / 2;
  const b0 = ly === 1 ? 0.08 : ly === 3 ? 0.92 - d : (1 - d) / 2;
  const r: [number, number, number, number] = [a0, b0, a0 + w, b0 + d];
  const rh = (alongA ? d : w) * 30;
  castShadow(e, ...r, wall + rh);
  gable(e, r[0], r[1], r[2], r[3], wall, rh, alongA);
  if (e.lod > 0) {
    const face = alongA ? 'left' : 'right';
    windowSlits(e, face, r, STOREY_PX * 0.5, wall, 5, STOREY_PX, 0.65);
  }
  return { rect: r, wall, roof: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, wall + rh] };
}

export function industrialShed(e: Engraver, floors: number, rng: ArtRng): Shell {
  const m = LOW.shedInset;
  const r: [number, number, number, number] = [m, m, 1 - m, 1 - m];
  const wall = Math.max(1, floors - 0.5) * STOREY_PX;
  const teeth = rng.int(LOW.teeth[0], LOW.teeth[1]);
  const th = STOREY_PX * 0.9;
  const stack = rng.chance(LOW.stackChance);
  const sa = r[0] + 0.15;
  const sb = r[1] + 0.15;
  const stackTop = wall + STOREY_PX * rng.range(2.5, 3.5);
  castShadow(e, ...r, wall + th);
  box(e, r[0], r[1], r[2], r[3], 0, wall, { top: 'none' });
  if (stack) cylinder(e, sa, sb, 0.06, wall, stackTop, 'medium');
  sawtooth(e, r[0], r[1], r[2], r[3], wall, teeth, th);
  if (e.lod > 0) {
    // Loading door on the lit face.
    const u0 = 0.55;
    const u1 = 0.8;
    const door: Vec3[] = [
      [r[0] + u0 * (r[2] - r[0]), r[3], 0],
      [r[0] + u1 * (r[2] - r[0]), r[3], 0],
      [r[0] + u1 * (r[2] - r[0]), r[3], wall * 0.6],
      [r[0] + u0 * (r[2] - r[0]), r[3], wall * 0.6],
    ];
    e.poly(door, 'dense', e.inks.detail);
  }
  return { rect: r, wall, roof: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, wall + th] };
}
