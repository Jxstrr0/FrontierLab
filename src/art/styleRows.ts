// The row-house and walk-up fabric of each local style (ART_DIRECTION §2.1):
// one generic drawer driven by a RowSpec (styleProfiles.ts) — how the tile is
// split into houses along the street, the roof (flat, gabled, hipped, mansard,
// gable-to-street or lean-to), the façade marks and the rooftop clutter.
// Perimeter styles hug the street and join their neighbours (blockRows.ts);
// the others stand detached on their tile.
import { STOREY_PX } from '../config/map';
import { rowPlan, splitUnits, type Frontage } from './blockRows';
import type { Shell } from './buildingsTall';
import type { Engraver, Fill } from './engraver';
import {
  arcade,
  balconies,
  bayWindow,
  falseFront,
  fireEscape,
  hangingSign,
  shingles,
  shutters,
  timberFrame,
  verandah,
} from './facades';
import { bands, onFace, windowSlits, type Face } from './faceMarks';
import { gableEnd, type GableEnd } from './gables';
import { stipple, tree } from './flora';
import { artRng, type ArtRng } from './prng';
import { flatRoof, gableRoof, hipRoof, mansardRoof, shedRoof, walls, type Rect } from './roofs';
import { chimney, plantBoxes, roofGarden, solarPanels, waterTank } from './rooftop';
import { castShadow } from './solids';

export type RowRoof = 'flat' | 'gable' | 'hip' | 'mansard' | 'gableFront' | 'shed';
export type RowMark =
  | 'fireEscape'
  | 'bay'
  | 'shutters'
  | 'timber'
  | 'verandah'
  | 'balcony'
  | 'arcade'
  | 'shingle'
  | 'sign'
  | 'falseFront'
  | 'cornice';
export type RowTop = 'chimneys' | 'tank' | 'solar' | 'garden' | 'plant' | 'dormers';

export interface RowSpec {
  /** Hug the street and join neighbours (true) or stand detached in a yard. */
  perimeter: boolean;
  /** Depth of a street-hugging row, in tiles. */
  depth: number;
  /** Houses per tile along the street. */
  units: readonly [number, number];
  /** Storeys added to (or taken from) the district's floors, and a cap. */
  storeys: number;
  maxStoreys: number;
  /** Storey jitter between neighbouring houses (0 keeps cornices even). */
  jitter: number;
  roof: RowRoof;
  /** Gable-to-street shapes, picked per house. */
  ends?: readonly GableEnd[];
  /** Roof rise in px per tile of half-width (≥ 32 hides the back slope). */
  pitch: number;
  marks: readonly RowMark[];
  tops: readonly RowTop[];
  /** Chance a house carries its rooftop clutter. */
  topChance: number;
  /** Fill of the lit wall (paper for white stucco, light for brick and stone). */
  wall?: Fill;
}

/** Inset from the street for street-hugging rows; yard margin for detached ones. */
const ROW = { streetInset: 0.05, yard: [0.12, 0.2], courtTrees: 2 } as const;

/**
 * Draws a row (or a detached block) of houses on one tile and returns its
 * shell. Walls stop at `cap` storeys so roofs stay inside the tile's drawing
 * bounds (drawList.ts: floors + ROOF_EXTRA_STOREYS).
 */
export function rowBuilding(
  e: Engraver,
  floors: number,
  cap: number,
  f: Frontage,
  spec: RowSpec,
  rng: ArtRng,
  lot: boolean,
): Shell {
  let plan = rowPlan(f, spec.depth, ROW.streetInset);
  if (!spec.perimeter || (plan.court && lot)) {
    const m = rng.range(ROW.yard[0], ROW.yard[1]);
    plan = { rect: [m, m, 1 - m, 1 - m], alongA: rng.chance(0.5), face: null, court: false };
  } else if (plan.court) {
    return courtGarden(e, rng);
  }
  const units = splitUnits(plan.rect, plan.alongA, rng.int(spec.units[0], spec.units[1]));
  const top = Math.min(spec.maxStoreys, cap);
  const base = Math.min(top, Math.max(1, floors + spec.storeys));
  const heights = units.map(() => {
    const j = spec.jitter > 0 ? rng.int(-spec.jitter, spec.jitter) : 0;
    return Math.max(1, Math.min(top, base + j)) * STOREY_PX;
  });
  castShadow(e, ...plan.rect, Math.max(...heights));
  // Even rows share one continuous roof; uneven rows roof each house.
  const shared =
    spec.jitter === 0 && (spec.roof === 'gable' || spec.roof === 'hip' || spec.roof === 'mansard');
  if (shared) {
    // One wall for the whole even row; houses only add their façade marks.
    const lit: Fill = spec.marks.includes('timber') ? 'paper' : (spec.wall ?? 'light');
    walls(e, plan.rect, heights[0]!, lit);
  }
  // At most one house per tile carries rooftop clutter (it costs a lot of paint calls).
  const hasClutter = rng.chance(spec.topChance);
  const clutterUnit = rng.int(0, units.length - 1);
  const clutterAt = e.lod > 0 && hasClutter ? clutterUnit : -1;
  // Clutter draws a zoom-dependent amount, so it gets its own stream.
  const clutterRng = artRng(Math.floor(rng.next() * 4294967296));
  let roofZ = 0;
  // Window and façade strokes of the whole row go out in a few paths.
  e.beginBatch(shared);
  units.forEach((u, k) => {
    const last = k === units.length - 1;
    const next = last ? 0 : heights[k + 1]!;
    const opts = { shared, clutter: k === clutterAt, clutterRng };
    roofZ = Math.max(roofZ, unit(e, u, heights[k]!, next, plan.alongA, spec, rng, opts));
  });
  e.endBatch();
  const [a0, b0, a1, b1] = plan.rect;
  if (shared) roofZ = sharedRoof(e, plan.rect, heights[0]!, plan.alongA, units, spec);
  return {
    rect: [a0, b0, a1, b1],
    wall: Math.min(...heights),
    roof: [(a0 + a1) / 2, (b0 + b1) / 2, roofZ],
  };
}

/** One roof over a whole even row, with chimney stacks on the party walls. */
function sharedRoof(
  e: Engraver,
  r: Rect,
  h: number,
  alongA: boolean,
  units: Rect[],
  spec: RowSpec,
): number {
  const half = alongA ? (r[3] - r[1]) / 2 : (r[2] - r[0]) / 2;
  const rh = spec.pitch * half;
  if (spec.roof === 'mansard') {
    mansardRoof(e, r, h, STOREY_PX, units.length * (e.lod > 1 ? 2 : 1));
    return h + STOREY_PX;
  }
  if (spec.roof === 'hip') hipRoof(e, r, h, rh, alongA);
  else gableRoof(e, r, h, rh, alongA);
  if (spec.tops.includes('chimneys')) {
    const zc = h + rh - 3;
    for (let k = 1; k < units.length; k++) {
      const u = units[k]!;
      if (alongA) chimney(e, u[0], (u[1] + u[3]) / 2, zc);
      else chimney(e, (u[0] + u[2]) / 2, u[1], zc);
    }
  }
  return h + rh;
}

/** One house of a row: walls, façade marks, roof and clutter. Returns its roof top. */
function unit(
  e: Engraver,
  r: Rect,
  h: number,
  next: number,
  alongA: boolean,
  spec: RowSpec,
  rng: ArtRng,
  opts: { shared: boolean; clutter: boolean; clutterRng: ArtRng },
): number {
  const { shared } = opts;
  const street: Face = alongA ? 'left' : 'right';
  const end: Face = alongA ? 'right' : 'left';
  const half = alongA ? (r[3] - r[1]) / 2 : (r[2] - r[0]) / 2;
  const wide = alongA ? (r[2] - r[0]) / 2 : (r[3] - r[1]) / 2;
  const marks = spec.marks;
  const timber = marks.includes('timber');
  // The street face shows whole; the end face only above the next house
  // (`next` is 0 for the last house), which saves painting hidden party walls.
  const lit: Fill = timber ? 'paper' : (spec.wall ?? 'light');
  if (!shared) faceQuad(e, street, r, 0, h, alongA ? lit : 'medium');
  if (!shared && h > next) faceQuad(e, end, r, next, h, alongA ? 'medium' : lit);
  facade(e, street, r, h, spec, rng);
  if (next === 0 && e.lod > 0) windowSlits(e, end, r, STOREY_PX * 0.4, h - 2, 2, STOREY_PX);
  let top = h;
  switch (shared ? 'none' : spec.roof) {
    case 'flat':
      flatRoof(e, r, h);
      if (marks.includes('cornice') && e.lod > 0)
        bands(e, street, r, [h - 1.5], e.inks.outline * 1.3);
      if (marks.includes('falseFront')) falseFront(e, street, r, h, STOREY_PX * 0.6);
      top = h + 2;
      break;
    case 'gable':
      gableRoof(e, r, h, spec.pitch * half, alongA);
      top = h + spec.pitch * half;
      break;
    case 'hip':
      hipRoof(e, r, h, spec.pitch * half, alongA);
      top = h + spec.pitch * half;
      break;
    case 'mansard':
      mansardRoof(e, r, h, STOREY_PX, e.lod > 1 ? 2 : 1);
      top = h + STOREY_PX;
      break;
    case 'shed':
      shedRoof(e, r, h, spec.pitch * half * 0.5, alongA);
      top = h + spec.pitch * half * 0.5;
      break;
    case 'gableFront': {
      const rh = spec.pitch * wide;
      const ends = spec.ends ?? ['plain'];
      const shape = ends[rng.int(0, ends.length - 1)]!;
      gableRoof(e, r, h, rh, !alongA, shape === 'plain');
      if (shape !== 'plain') gableEnd(e, street, r, h, rh, shape);
      else if (timber) gableEnd(e, street, r, h, rh, 'timber');
      top = h + rh + 2;
      break;
    }
  }
  if (spec.roof === 'flat' && opts.clutter) flatClutter(e, r, h, spec, opts.clutterRng);
  const pitched = spec.roof === 'gable' || spec.roof === 'hip';
  if (!shared && pitched && spec.tops.includes('chimneys') && rng.chance(0.6)) {
    const zc = h + spec.pitch * half - 3;
    chimney(e, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, zc);
  }
  return top;
}

/** A wall face of a house from z0 up to z1. */
function faceQuad(e: Engraver, face: Face, r: Rect, z0: number, z1: number, fill: Fill): void {
  const p = (u: number, z: number) => onFace(face, r[0], r[1], r[2], r[3], u, z);
  e.poly([p(0, z0), p(1, z0), p(1, z1), p(0, z1)], fill);
}

/** Marks on the street face of one house. */
function facade(e: Engraver, face: Face, r: Rect, h: number, spec: RowSpec, rng: ArtRng): void {
  const m = spec.marks;
  const s = STOREY_PX;
  if (m.includes('timber')) timberFrame(e, face, r, s, h, s);
  else if (m.includes('shutters')) shutters(e, face, r, s * 0.2, h - 1, 2, s);
  else if (e.lod > 0) windowSlits(e, face, r, m.includes('arcade') ? s : s * 0.2, h - 2, 2, s);
  if (m.includes('shingle')) shingles(e, face, r, 0, h);
  if (m.includes('arcade')) arcade(e, face, r, s, 2);
  if (m.includes('bay') && h >= s * 2) bayWindow(e, face, r, 0.2, 0.6, 1, h - s * 0.4);
  if (m.includes('fireEscape') && h >= s * 3) fireEscape(e, face, r, s, h - s * 0.5, s, 0.25, 0.75);
  if (m.includes('balcony') && h >= s * 2) balconies(e, face, r, s, h - s, s);
  if (m.includes('verandah')) verandah(e, face, r, Math.min(h, s * 2) - 1, 0.04);
  if (m.includes('sign') && rng.chance(0.6))
    hangingSign(e, face, r, 0.85, s * 0.8, Math.min(h, s * 3));
}

/** Flat-roof clutter: tanks, plant boxes, solar panels or a garden. */
function flatClutter(e: Engraver, r: Rect, h: number, spec: RowSpec, rng: ArtRng): void {
  const tops = spec.tops.filter((t) => t !== 'chimneys' && t !== 'dormers');
  if (tops.length === 0) return;
  const pick = tops[rng.int(0, tops.length - 1)]!;
  const [a0, b0, a1, b1] = r;
  const am = (a0 + a1) / 2;
  const bm = (b0 + b1) / 2;
  const inner: Rect = [a0 + 0.06, b0 + 0.06, a1 - 0.06, b1 - 0.06];
  if (inner[2] - inner[0] < 0.1 || inner[3] - inner[1] < 0.1) return;
  if (pick === 'tank') waterTank(e, am, bm, h);
  else if (pick === 'solar') solarPanels(e, inner, h);
  else if (pick === 'garden') roofGarden(e, inner, h, rng);
  else plantBoxes(e, inner, h, rng);
}

/** The middle tile of a perimeter block: a garden court with trees. */
function courtGarden(e: Engraver, rng: ArtRng): Shell {
  e.poly(
    [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
    'lawn',
    null,
  );
  stipple(e, [0.05, 0.05, 0.95, 0.95], rng, 0.8);
  for (let k = 0; k < ROW.courtTrees; k++) {
    tree(e, 0.3 + k * 0.4, rng.range(0.3, 0.7), 0.85, rng);
  }
  return { rect: [0.3, 0.3, 0.7, 0.7], wall: 0, roof: [0.5, 0.5, 0] };
}
