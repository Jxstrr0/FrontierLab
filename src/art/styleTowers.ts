// Tall buildings that change with the local style (ART_DIRECTION §2.1): glass
// curtain-wall towers with cut or notched crowns, stone wedding-cake setbacks
// with piers and a spire, white tropical slabs with sun-shade fins, pencil
// towers hung with signs, glass towers on a podium and stone civic blocks.
// Heights stay within floors + ROOF_EXTRA_STOREYS (drawList.ts).
import { STOREY_PX } from '../config/map';
import type { Shell } from './buildingsTall';
import type { Engraver, Vec3 } from './engraver';
import { arcade, balconies, hangingSign, sunshades } from './facades';
import { bands, ribs, windowSlits } from './faceMarks';
import type { ArtRng } from './prng';
import { flatRoof, type Rect } from './roofs';
import { roofGarden, waterTank } from './rooftop';
import { box, castShadow, cylinder, dome } from './solids';

export type TowerKind = 'glass' | 'stone' | 'slab' | 'pencil' | 'podium' | 'civic';

/** Visual tuning. */
const TOWER = {
  glassInset: [0.12, 0.2],
  glassRibs: [3, 6, 8],
  stoneTiers: [0.55, 0.8],
  stoneInset: 0.08,
  slabLong: [0.66, 0.78],
  slabShort: [0.28, 0.34],
  pencilW: [0.28, 0.36],
  podiumStoreys: 1.5,
  civicInset: 0.07,
} as const;

export function styledTower(e: Engraver, kind: TowerKind, floors: number, rng: ArtRng): Shell {
  switch (kind) {
    case 'glass':
    case 'stone':
    case 'slab':
    case 'podium': {
      // One volume (or set-back tiers): its ribs and floor lines are never
      // covered by a later part, so they are stroked together at the end.
      e.beginBatch();
      const draw = { glass: glassTower, stone: stoneSetback, slab: whiteSlab, podium: podiumTower };
      const shell = draw[kind](e, floors, rng);
      e.endBatch();
      return shell;
    }
    case 'pencil':
      return pencils(e, floors, rng);
    case 'civic':
      return civicBlock(e, floors, rng);
  }
}

function shellOf(r: Rect, wall: number, top: number): Shell {
  return {
    rect: [r[0], r[1], r[2], r[3]],
    wall,
    roof: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, top],
  };
}

/** A glass shaft: paper and light faces, a mullion grid and floor lines. */
function curtain(e: Engraver, r: Rect, z0: number, z1: number): void {
  box(e, r[0], r[1], r[2], r[3], z0, z1, { left: 'paper', right: 'light', top: 'none' });
  const n = TOWER.glassRibs[e.lod]!;
  ribs(e, 'left', r, z0, z1, n);
  ribs(e, 'right', r, z0, z1, n);
  if (e.lod === 0) return;
  const zs: number[] = [];
  for (let z = z0 + STOREY_PX * 2; z < z1; z += STOREY_PX * (e.lod > 1 ? 2 : 3)) zs.push(z);
  bands(e, 'left', r, zs, e.inks.detail * 0.6);
  bands(e, 'right', r, zs, e.inks.detail * 0.6);
}

function glassTower(e: Engraver, floors: number, rng: ArtRng): Shell {
  const m = rng.range(TOWER.glassInset[0], TOWER.glassInset[1]);
  const r: Rect = [m, m, 1 - m, 1 - m];
  const h = floors * STOREY_PX;
  const crown = rng.int(0, 2);
  castShadow(e, ...r, h + STOREY_PX * 2);
  curtain(e, r, 0, h);
  const [a0, b0, a1, b1] = r;
  if (crown === 0) {
    // A sloping cut: the roof rises toward the back corner.
    const hi = h + STOREY_PX * 2.5;
    e.poly(
      [
        [a0, b1, h],
        [a1, b1, h],
        [a1, b0, hi],
        [a0, b0, hi],
      ],
      'roofLight',
    );
    e.poly(
      [
        [a1, b1, h],
        [a1, b0, hi],
        [a1, b0, h],
      ],
      'light',
    );
    return shellOf(r, h, hi);
  }
  if (crown === 1) {
    // Notched top: a corner stepped back two storeys, a garden on the step.
    const top = h + STOREY_PX * 2;
    const am = (a0 + a1) / 2;
    const bm = (b0 + b1) / 2;
    flatRoof(e, r, h);
    if (e.lod > 0) flatRoof(e, [am + 0.03, bm + 0.03, a1 - 0.03, b1 - 0.03], h, 'lawn');
    curtain(e, [a0, b0, a1, bm], h, top);
    flatRoof(e, [a0, b0, a1, bm], top);
    curtain(e, [a0, bm, am, b1], h, top);
    flatRoof(e, [a0, bm, am, b1], top);
    return shellOf(r, h, top);
  }
  // Flat roof with a plant box and a mast.
  flatRoof(e, r, h);
  box(e, a0 + 0.1, b0 + 0.1, a1 - 0.14, b1 - 0.2, h, h + STOREY_PX * 0.8, { right: 'dense' });
  const ma = (a0 + a1) / 2;
  const mb = (b0 + b1) / 2;
  e.segments(
    [
      [
        [ma, mb, h + STOREY_PX * 0.8],
        [ma, mb, h + STOREY_PX * 3],
      ],
    ],
    e.inks.outline,
  );
  return shellOf(r, h, h + STOREY_PX * 0.8);
}

/** A stone wedding cake: three setbacks with piers, crowned by a spire. */
function stoneSetback(e: Engraver, floors: number, rng: ArtRng): Shell {
  const m = TOWER.stoneInset + rng.range(0, 0.04);
  const h = floors * STOREY_PX;
  const t1 = Math.round(h * rng.range(TOWER.stoneTiers[0] - 0.1, TOWER.stoneTiers[0] + 0.1));
  const t2 = Math.round(h * rng.range(TOWER.stoneTiers[1] - 0.05, TOWER.stoneTiers[1] + 0.08));
  const step = 0.09;
  const tiers: [Rect, number, number][] = [
    [[m, m, 1 - m, 1 - m], 0, t1],
    [[m + step, m + step, 1 - m - step, 1 - m - step], t1, t2],
    [[m + step * 2, m + step * 2, 1 - m - step * 2, 1 - m - step * 2], t2, h],
  ];
  castShadow(e, m, m, 1 - m, 1 - m, h + STOREY_PX * 3);
  const piers = [3, 5, 7][e.lod]!;
  for (const [r, z0, z1] of tiers) {
    box(e, r[0], r[1], r[2], r[3], z0, z1, { left: 'light', right: 'medium' });
    ribs(e, 'left', r, z0, z1, piers);
    ribs(e, 'right', r, z0, z1, piers);
    if (e.lod > 0) {
      bands(e, 'left', r, [z1 - 2], e.inks.outline);
      bands(e, 'right', r, [z1 - 2], e.inks.outline);
    }
  }
  const c = tiers[2]![0];
  const am = (c[0] + c[2]) / 2;
  const bm = (c[1] + c[3]) / 2;
  const crown = rng.int(0, 2);
  if (crown === 0) {
    // A stepped lantern and a spire.
    box(e, am - 0.07, bm - 0.07, am + 0.07, bm + 0.07, h, h + STOREY_PX, { right: 'dense' });
    const tip: Vec3 = [am, bm, h + STOREY_PX * 3.4];
    e.poly(
      [[am - 0.07, bm + 0.07, h + STOREY_PX], [am + 0.07, bm + 0.07, h + STOREY_PX], tip],
      'light',
    );
    e.poly(
      [[am + 0.07, bm + 0.07, h + STOREY_PX], [am + 0.07, bm - 0.07, h + STOREY_PX], tip],
      'medium',
    );
  } else if (crown === 1) {
    // A pyramid roof over the top tier.
    const apex: Vec3 = [am, bm, h + STOREY_PX * 1.8];
    e.poly([[c[0], c[3], h], [c[2], c[3], h], apex], 'roofLight');
    e.poly([[c[2], c[3], h], [c[2], c[1], h], apex], 'roofMedium');
  } else {
    flatRoof(e, c, h);
    waterTank(e, am, bm, h);
  }
  return shellOf(tiers[0]![0], t1, h + STOREY_PX);
}

/** A white slab tower with deep sun-shade fins and a garden on the roof. */
function whiteSlab(e: Engraver, floors: number, rng: ArtRng): Shell {
  const alongA = rng.chance(0.5);
  const long = rng.range(TOWER.slabLong[0], TOWER.slabLong[1]);
  const short = rng.range(TOWER.slabShort[0], TOWER.slabShort[1]);
  const [w, d] = alongA ? [long, short] : [short, long];
  const a0 = (1 - w) / 2;
  const b0 = (1 - d) / 2;
  const r: Rect = [a0, b0, a0 + w, b0 + d];
  const h = (floors + 1) * STOREY_PX;
  castShadow(e, ...r, h);
  box(e, r[0], r[1], r[2], r[3], 0, h, { left: 'paper', right: 'light', top: 'none' });
  sunshades(e, 'left', r, STOREY_PX, h - 2, STOREY_PX);
  sunshades(e, 'right', r, STOREY_PX, h - 2, STOREY_PX);
  if (e.lod > 0) {
    ribs(e, 'left', r, 0, h, 4);
    ribs(e, 'right', r, 0, h, 4);
  }
  flatRoof(e, r, h);
  roofGarden(e, [r[0] + 0.05, r[1] + 0.05, r[2] - 0.05, r[3] - 0.05], h, rng);
  return shellOf(r, h, h + 4);
}

/** Two or three narrow pencil towers crowded onto a tile, with signs and tanks. */
function pencils(e: Engraver, floors: number, rng: ArtRng): Shell {
  const w = rng.range(TOWER.pencilW[0], TOWER.pencilW[1]);
  const spots: Rect[] = [
    [0.08, 0.08, 0.08 + w, 0.08 + w],
    [0.92 - w, 0.1, 0.92, 0.1 + w],
    [0.1, 0.92 - w, 0.1 + w, 0.92],
    [0.92 - w, 0.92 - w, 0.92, 0.92],
  ];
  let top = 0;
  const skip = rng.int(0, 3);
  let tank = false;
  const heights = spots.map(() => Math.max(2, floors + rng.int(-1, 2)) * STOREY_PX);
  castShadow(e, 0.08, 0.08, 0.92, 0.92, Math.max(...heights));
  const two = rng.chance(0.4);
  for (const [k, r] of spots.entries()) {
    // Two or three towers; the rest of the tile is a low shop roof.
    if (k === skip || (two && k === (skip + 2) % 4)) {
      box(e, r[0], r[1], r[2], r[3], 0, STOREY_PX, { top: 'roof' });
      continue;
    }
    const h = heights[k]!;
    box(e, r[0], r[1], r[2], r[3], 0, h, { left: 'light', right: 'medium', top: 'roof' });
    if (e.lod > 0) windowSlits(e, 'left', r, STOREY_PX, h - 1, 2, STOREY_PX);
    if (e.lod > 1) windowSlits(e, 'right', r, STOREY_PX, h - 1, 2, STOREY_PX);
    // One sign and one tank per tile keep the paint calls in check.
    const face = rng.chance(0.5) ? 'left' : 'right';
    if (k === 3 || (k === 2 && skip === 3))
      hangingSign(e, face, r, 0.8, STOREY_PX, Math.min(h - 2, STOREY_PX * 4));
    else if (!tank) {
      tank = true;
      waterTank(e, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, h);
    }
    top = Math.max(top, h);
  }
  return shellOf([0.08, 0.08, 0.92, 0.92], STOREY_PX * 2, top);
}

/** A glass tower standing on a podium that fills the tile. */
function podiumTower(e: Engraver, floors: number, rng: ArtRng): Shell {
  const pr: Rect = [0.06, 0.06, 0.94, 0.94];
  const ph = STOREY_PX * TOWER.podiumStoreys;
  const m = rng.range(0.2, 0.26);
  const tr: Rect = [m, m - 0.06, 1 - m, 1 - m - 0.06];
  const h = (floors + 2) * STOREY_PX;
  castShadow(e, ...pr, h);
  box(e, pr[0], pr[1], pr[2], pr[3], 0, ph, { left: 'paper', right: 'light', top: 'roof' });
  ribs(e, 'left', pr, 0, ph, 6);
  curtain(e, tr, ph, h);
  flatRoof(e, tr, h);
  if (e.lod > 0) balconies(e, 'left', tr, ph + STOREY_PX, h - STOREY_PX, STOREY_PX * 2, 0.1, 0.5);
  return shellOf(pr, ph, h);
}

/** A stone civic block: rusticated base, pilasters, cornice and balustrade, sometimes a dome. */
function civicBlock(e: Engraver, floors: number, rng: ArtRng): Shell {
  const m = TOWER.civicInset;
  const r: Rect = [m, m, 1 - m, 1 - m];
  const h = floors * STOREY_PX;
  castShadow(e, ...r, h);
  box(e, r[0], r[1], r[2], r[3], 0, h, { left: 'light', right: 'medium', top: 'roof' });
  arcade(e, 'left', r, STOREY_PX * 1.2, 4);
  arcade(e, 'right', r, STOREY_PX * 1.2, 4);
  bands(e, 'left', r, [STOREY_PX * 1.2, h - 2.5, h - 1], e.inks.detail * 1.4);
  bands(e, 'right', r, [STOREY_PX * 1.2, h - 2.5, h - 1], e.inks.detail * 1.4);
  if (e.lod > 0) {
    windowSlits(e, 'left', r, STOREY_PX * 1.4, h - 3, 4, STOREY_PX, 0.6);
    windowSlits(e, 'right', r, STOREY_PX * 1.4, h - 3, 4, STOREY_PX, 0.6);
  }
  const am = (r[0] + r[2]) / 2;
  const bm = (r[1] + r[3]) / 2;
  if (rng.chance(0.12)) {
    cylinder(e, am, bm, 0.2, h, h + 3, 'light');
    dome(e, am, bm, 0.2, h + 3, STOREY_PX * 0.9);
    return shellOf(r, h, h + STOREY_PX * 1.3);
  }
  return shellOf(r, h, h);
}
