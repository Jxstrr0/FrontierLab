// Suburban houses for each local style (ART_DIRECTION §2.1): low wide ranch
// houses, steep shingled cottages among conifers, porch houses, bay-windowed
// cottages, semi-detached pairs, mansard villas, chalets with deep eaves,
// clusters of tiny houses, verandah bungalows, outback homesteads with water
// tanks and modern flat-roofed boxes with a pool. Every house stands in a
// tinted yard; sizes and spots come from the tile's ArtRng.
import { STOREY_PX } from '../config/map';
import type { Shell } from './buildingsTall';
import type { Engraver } from './engraver';
import { balconies, bayWindow, shingles, shutters, timberFrame, verandah } from './facades';
import { ribs, windowSlits } from './faceMarks';
import { stipple, tree } from './flora';
import type { ArtRng } from './prng';
import { gableEnd } from './gables';
import { flatRoof, gableRoof, hipRoof, mansardRoof, walls, type Rect } from './roofs';
import { chimney, solarPanels } from './rooftop';
import { box, castShadow, cylinder } from './solids';

export type HouseKind =
  | 'ranch'
  | 'modern'
  | 'porch'
  | 'bay'
  | 'shingle'
  | 'semi'
  | 'villa'
  | 'timber'
  | 'chalet'
  | 'tiny'
  | 'bungalow'
  | 'homestead';

/** Visual tuning, in tiles and px of rise per tile of half-width. */
const HOUSE = {
  yardInset: 0.04,
  scrubChance: 0.35,
  lowPitch: 30,
  midPitch: 40,
  steepPitch: 62,
  tankR: 0.08,
  tankStand: 7,
} as const;

export function styledHouse(e: Engraver, kind: HouseKind, cap: number, rng: ArtRng): Shell {
  const floors = Math.max(1, Math.min(cap, 2));
  // Tiny houses crowd their tile: paved alleys, no yard.
  if (kind !== 'tiny') yard(e, rng);
  switch (kind) {
    case 'ranch':
      return ranch(e, rng);
    case 'modern':
      return modern(e, floors, rng);
    case 'tiny':
      return tiny(e, rng);
    case 'homestead':
      return homestead(e, rng);
    case 'bungalow':
      return bungalow(e, rng);
    case 'semi':
      return semi(e, floors, rng);
    case 'villa':
      return villa(e, rng);
    default:
      return gabled(e, kind, floors, rng);
  }
}

/** The yard: a tinted lawn wash and stipple over the whole tile. */
function yard(e: Engraver, rng: ArtRng): void {
  const m = HOUSE.yardInset;
  e.poly(
    [
      [m, m, 0],
      [1 - m, m, 0],
      [1 - m, 1 - m, 0],
      [m, 1 - m, 0],
    ],
    'lawn',
    null,
  );
  stipple(e, [m, m, 1 - m, 1 - m], rng, 0.5);
}

function shellOf(r: Rect, wall: number, top: number): Shell {
  return {
    rect: [r[0], r[1], r[2], r[3]],
    wall,
    roof: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, top],
  };
}

/** A footprint w × d placed at a seeded spot inside the yard. */
function spot(rng: ArtRng, w: number, d: number, lo = 0.14): Rect {
  const a0 = rng.range(lo, 1 - lo - w);
  const b0 = rng.range(lo, 1 - lo - d);
  return [a0, b0, a0 + w, b0 + d];
}

function ranch(e: Engraver, rng: ArtRng): Shell {
  const r = spot(rng, rng.range(0.56, 0.66), rng.range(0.32, 0.38), 0.12);
  const wall = STOREY_PX * 0.9;
  tree(e, 0.18, 0.2, 0.9, rng);
  castShadow(e, ...r, wall + 8);
  // Garage wing at the back end, lower than the house.
  const g: Rect = [r[0] - 0.0, r[1] - 0.14, r[0] + 0.24, r[1]];
  if (g[1] > 0.06) {
    walls(e, g, wall * 0.85);
    hipRoof(e, g, wall * 0.85, HOUSE.lowPitch * 0.12, true);
  }
  walls(e, r, wall);
  if (e.lod > 0) windowSlits(e, 'left', r, 2, wall - 1, 5, STOREY_PX, 0.5);
  const half = (r[3] - r[1]) / 2;
  hipRoof(e, r, wall, HOUSE.lowPitch * half, true);
  if (e.lod > 0)
    e.segments(
      [
        [
          [r[2] - 0.12, r[3], 0],
          [r[2] - 0.12, 0.98, 0],
        ],
      ],
      e.inks.detail,
      0.5,
    );
  return shellOf(r, wall, wall + HOUSE.lowPitch * half);
}

function modern(e: Engraver, floors: number, rng: ArtRng): Shell {
  const r = spot(rng, rng.range(0.4, 0.5), rng.range(0.34, 0.42), 0.16);
  const z1 = STOREY_PX;
  // A pool in the front yard.
  if (r[3] < 0.66 && e.lod > 0) {
    const pa = r[0] + 0.02;
    e.poly(
      [
        [pa, r[3] + 0.08, 0],
        [pa + 0.28, r[3] + 0.08, 0],
        [pa + 0.28, r[3] + 0.22, 0],
        [pa, r[3] + 0.22, 0],
      ],
      'water',
    );
  }
  castShadow(e, ...r, z1 * floors);
  box(e, r[0], r[1], r[2], r[3], 0, z1, { left: 'paper', right: 'light', top: 'roof' });
  ribs(e, 'left', r, 0, z1, 4);
  if (floors > 1) {
    // The upper box slides forward over the lower one.
    const u: Rect = [r[0] + 0.06, r[1] + 0.04, r[2] + 0.04, r[3] - 0.08];
    box(e, u[0], u[1], u[2], u[3], z1, z1 * 2, { left: 'paper', right: 'medium', top: 'roof' });
    if (e.lod > 0) ribs(e, 'left', u, z1, z1 * 2, 3);
    solarPanels(e, [u[0] + 0.04, u[1] + 0.04, u[2] - 0.04, u[3] - 0.04], z1 * 2);
    return shellOf(r, z1, z1 * 2 + 2);
  }
  solarPanels(e, [r[0] + 0.04, r[1] + 0.04, r[2] - 0.04, r[3] - 0.04], z1);
  return shellOf(r, z1, z1 + 2);
}

/** Gable-to-street houses: porch, bay, shingle, timber and chalet. */
function gabled(e: Engraver, kind: HouseKind, floors: number, rng: ArtRng): Shell {
  const chalet = kind === 'chalet';
  const w = chalet ? rng.range(0.44, 0.52) : rng.range(0.32, 0.4);
  const d = rng.range(0.4, 0.48);
  const r = spot(rng, w, d, 0.16);
  const wall = floors * STOREY_PX;
  const pitch = chalet
    ? HOUSE.midPitch * 0.8
    : kind === 'shingle' || kind === 'timber'
      ? HOUSE.steepPitch
      : HOUSE.midPitch;
  const rh = pitch * (w / 2);
  const treeBack = rng.chance(0.5);
  if (treeBack) tree(e, r[0] > 0.4 ? 0.2 : 0.8, 0.2, 0.85, rng);
  castShadow(e, ...r, wall + rh);
  walls(e, r, wall, kind === 'timber' ? 'paper' : 'light');
  // Gable end on the left face (ridge along b), toward the street.
  if (kind === 'timber') timberFrame(e, 'left', r, 0, wall, STOREY_PX);
  else if (chalet) shutters(e, 'left', r, 1, wall, 3, STOREY_PX);
  else if (e.lod > 0) windowSlits(e, 'left', r, 1, wall - 1, 2, STOREY_PX);
  if (kind === 'shingle') shingles(e, 'left', r, 0, wall);
  if (kind === 'bay' && floors > 1) bayWindow(e, 'left', r, 0.15, 0.55, 1, wall - 2);
  // Deep eaves: the chalet roof overhangs its walls.
  const eave = chalet ? 0.05 : 0;
  const rr: Rect = [r[0] - eave, r[1] - eave, r[2] + eave, Math.min(0.97, r[3] + eave)];
  gableRoof(e, rr, wall, rh, false);
  if (kind === 'timber') gableEnd(e, 'left', r, wall, rh, 'timber');
  if (chalet && floors > 1) balconies(e, 'left', r, STOREY_PX, STOREY_PX, STOREY_PX, 0.05, 0.95);
  if (kind === 'porch') verandah(e, 'left', r, STOREY_PX - 1, 0.08);
  if (kind === 'shingle' || kind === 'porch')
    chimney(e, r[2] - 0.06, (r[1] + r[3]) / 2, wall + rh * 0.4);
  if (!treeBack) tree(e, r[2] < 0.6 ? 0.8 : 0.2, 0.8, 0.85, rng);
  return shellOf(r, wall, wall + rh);
}

function semi(e: Engraver, floors: number, rng: ArtRng): Shell {
  const r = spot(rng, rng.range(0.5, 0.6), rng.range(0.3, 0.36), 0.14);
  const wall = floors * STOREY_PX;
  const half = (r[3] - r[1]) / 2;
  castShadow(e, ...r, wall + HOUSE.midPitch * half);
  walls(e, r, wall);
  if (e.lod > 0) windowSlits(e, 'left', r, 1, wall - 1, 4, STOREY_PX);
  const am = (r[0] + r[2]) / 2;
  if (e.lod > 1) {
    bayWindow(e, 'left', r, 0.08, 0.3, 0.5, STOREY_PX - 1);
    bayWindow(e, 'left', r, 0.7, 0.92, 0.5, STOREY_PX - 1);
  }
  hipRoof(e, r, wall, HOUSE.midPitch * half, true);
  chimney(e, am, (r[1] + r[3]) / 2, wall + HOUSE.midPitch * half - 3);
  tree(e, 0.85, 0.82, 0.8, rng);
  return shellOf(r, wall, wall + HOUSE.midPitch * half);
}

function villa(e: Engraver, rng: ArtRng): Shell {
  const r = spot(rng, rng.range(0.38, 0.44), rng.range(0.38, 0.44), 0.18);
  const wall = 2 * STOREY_PX;
  tree(e, 0.15, 0.5, 0.9, rng, 'poplar');
  castShadow(e, ...r, wall + STOREY_PX);
  walls(e, r, wall, 'paper');
  shutters(e, 'left', r, 1, wall, 3, STOREY_PX);
  shutters(e, 'right', r, 1, wall, 3, STOREY_PX);
  mansardRoof(e, r, wall, STOREY_PX * 0.9, 1);
  tree(e, 0.85, 0.85, 0.9, rng, 'poplar');
  return shellOf(r, wall, wall + STOREY_PX);
}

/** Several tiny houses packed onto one tile, with narrow alleys. */
function tiny(e: Engraver, rng: ArtRng): Shell {
  const cells: Rect[] = [
    [0.08, 0.08, 0.46, 0.46],
    [0.54, 0.08, 0.92, 0.46],
    [0.08, 0.54, 0.46, 0.92],
    [0.54, 0.54, 0.92, 0.92],
  ];
  let top = 0;
  // One shadow for the whole cluster: fewer paint calls than one per house.
  castShadow(e, 0.08, 0.08, 0.92, 0.92, STOREY_PX * 1.5);
  for (const c of cells) {
    const r: Rect = [c[0] + rng.range(0, 0.04), c[1] + rng.range(0, 0.04), c[2], c[3]];
    const wall = (rng.chance(0.4) ? 2 : 1) * STOREY_PX;
    walls(e, r, wall);
    if (e.lod > 1) windowSlits(e, 'left', r, 1, wall - 1, 2, STOREY_PX);
    if (rng.chance(0.5)) {
      const along = rng.chance(0.5);
      const half = along ? (r[3] - r[1]) / 2 : (r[2] - r[0]) / 2;
      gableRoof(e, r, wall, HOUSE.midPitch * half, along);
      top = Math.max(top, wall + HOUSE.midPitch * half);
    } else {
      flatRoof(e, r, wall);
      top = Math.max(top, wall);
    }
  }
  return shellOf([0.08, 0.08, 0.92, 0.92], STOREY_PX, top);
}

function bungalow(e: Engraver, rng: ArtRng): Shell {
  const r = spot(rng, rng.range(0.42, 0.5), rng.range(0.4, 0.46), 0.18);
  const wall = STOREY_PX;
  tree(e, 0.2, 0.18, 1, rng);
  castShadow(e, ...r, wall + 10);
  walls(e, r, wall, 'paper');
  if (e.lod > 0) windowSlits(e, 'left', r, 1, wall - 1, 3, STOREY_PX);
  const half = (r[3] - r[1]) / 2;
  hipRoof(e, r, wall, HOUSE.midPitch * half, true);
  verandah(e, 'left', r, wall - 0.5, 0.1);
  verandah(e, 'right', r, wall - 0.5, 0.1);
  return shellOf(r, wall, wall + HOUSE.midPitch * half);
}

/** An outback homestead with a water tank, or an empty scrub lot. */
function homestead(e: Engraver, rng: ArtRng): Shell {
  if (rng.chance(HOUSE.scrubChance)) {
    tree(e, rng.range(0.25, 0.45), rng.range(0.25, 0.45), 0.9, rng);
    tree(e, rng.range(0.55, 0.8), rng.range(0.55, 0.8), 0.9, rng);
    return shellOf([0.4, 0.4, 0.6, 0.6], 0, 0);
  }
  const r = spot(rng, rng.range(0.44, 0.52), rng.range(0.34, 0.4), 0.18);
  const wall = STOREY_PX * 0.9;
  // Tank on its stand behind the house.
  const ta = Math.max(0.14, r[0] - 0.02);
  const tb = Math.max(0.14, r[1] - 0.04);
  e.segments(
    [
      [
        [ta, tb, 0],
        [ta, tb, HOUSE.tankStand],
      ],
    ],
    e.inks.outline,
  );
  cylinder(e, ta, tb, HOUSE.tankR, HOUSE.tankStand, HOUSE.tankStand + 8, 'light');
  castShadow(e, ...r, wall + 6);
  walls(e, r, wall);
  const half = (r[3] - r[1]) / 2;
  hipRoof(e, r, wall, HOUSE.lowPitch * half, true);
  verandah(e, 'left', r, wall - 0.5, 0.1);
  verandah(e, 'right', r, wall - 0.5, 0.1);
  tree(e, 0.82, 0.84, 0.9, rng);
  return shellOf(r, wall, wall + HOUSE.lowPitch * half);
}
