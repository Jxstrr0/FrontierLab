// Tall district buildings (ART_DIRECTION §2 table): financial towers with
// window ribs and setback crowns, downtown mid-rises with cornices, and
// waterfront glass. Each returns its shell so storefront glazing and roof flags
// can be added on top (src/art/buildings.ts).
import { STOREY_PX } from '../config/map';
import type { Engraver, Vec3 } from './engraver';
import type { ArtRng } from './prng';
import { bands, box, castShadow, cylinder, onFace, ribs, windowSlits } from './solids';

/** The main box of a building: footprint, wall height and roof height. */
export interface Shell {
  rect: [number, number, number, number];
  /** Height of the main walls (storefront glazing sits below this). */
  wall: number;
  /** Where a roof flag stands (local a, b, z). */
  roof: Vec3;
}

/** Visual tuning for tall buildings. */
const TALL = {
  towerInset: [0.12, 0.2],
  setbackShare: [0.7, 0.84],
  setbackInset: [0.07, 0.11],
  ribs: [3, 5, 7],
  midInset: [0.06, 0.12],
  corniceStoreys: 0.5,
  corniceOverhang: 0.035,
  slits: [2, 3, 4],
  glassInset: [0.08, 0.16],
  mullions: [3, 6, 9],
} as const;

export function financialTower(e: Engraver, floors: number, rng: ArtRng): Shell {
  const m = rng.range(TALL.towerInset[0], TALL.towerInset[1]);
  const [a0, b0, a1, b1] = [m, m, 1 - m, 1 - m];
  const h = floors * STOREY_PX;
  const crown = rng.int(0, 2);
  const shaftTop = Math.round(h * rng.range(TALL.setbackShare[0], TALL.setbackShare[1]));
  castShadow(e, a0, b0, a1, b1, h);
  // Lit face: paper with window ribs; the shaded face carries the hatch.
  box(e, a0, b0, a1, b1, 0, shaftTop, { left: 'paper' });
  const n = TALL.ribs[e.lod]!;
  const r: [number, number, number, number] = [a0, b0, a1, b1];
  ribs(e, 'left', r, STOREY_PX, shaftTop, n);
  ribs(e, 'right', r, STOREY_PX, shaftTop, n);
  if (e.lod > 0) {
    bands(e, 'left', r, [STOREY_PX]);
    bands(e, 'right', r, [STOREY_PX]);
  }
  // Setback crown.
  const s = rng.range(TALL.setbackInset[0], TALL.setbackInset[1]);
  const c: [number, number, number, number] = [a0 + s, b0 + s, a1 - s, b1 - s];
  box(e, c[0], c[1], c[2], c[3], shaftTop, h, { left: 'paper' });
  ribs(e, 'left', c, shaftTop, h, Math.max(2, n - 2));
  ribs(e, 'right', c, shaftTop, h, Math.max(2, n - 2));
  const am = (c[0] + c[2]) / 2;
  const bm = (c[1] + c[3]) / 2;
  if (crown === 0) {
    // Pyramid cap.
    const apex: Vec3 = [am, bm, h + STOREY_PX * 2];
    e.poly([[c[0], c[3], h], [c[2], c[3], h], apex], 'light');
    e.poly([[c[2], c[3], h], [c[2], c[1], h], apex], 'medium');
  } else if (crown === 1) {
    // Stepped top with a spire.
    const t = s * 1.4;
    box(e, c[0] + t, c[1] + t, c[2] - t, c[3] - t, h, h + STOREY_PX);
    e.segments(
      [
        [
          [am, bm, h + STOREY_PX],
          [am, bm, h + STOREY_PX * 3],
        ],
      ],
      e.inks.outline,
    );
  } else if (e.lod > 0) {
    // Flat roof with a parapet line.
    const p = 0.04;
    e.poly(
      [
        [c[0] + p, c[1] + p, h],
        [c[2] - p, c[1] + p, h],
        [c[2] - p, c[3] - p, h],
        [c[0] + p, c[3] - p, h],
      ],
      'none',
      e.inks.detail,
    );
  }
  return { rect: r, wall: shaftTop, roof: [am, bm, h] };
}

export function downtownMidrise(e: Engraver, floors: number, rng: ArtRng): Shell {
  const m = rng.range(TALL.midInset[0], TALL.midInset[1]);
  const r: [number, number, number, number] = [m, m, 1 - m, 1 - m];
  const h = floors * STOREY_PX;
  const cornice = STOREY_PX * TALL.corniceStoreys;
  castShadow(e, r[0], r[1], r[2], r[3], h);
  box(e, r[0], r[1], r[2], r[3], 0, h - cornice, { top: 'none' });
  if (e.lod > 0) {
    const cols = TALL.slits[e.lod]!;
    windowSlits(e, 'left', r, STOREY_PX, h - cornice, cols, STOREY_PX);
    windowSlits(e, 'right', r, STOREY_PX, h - cornice, cols, STOREY_PX);
  } else {
    ribs(e, 'left', r, STOREY_PX, h - cornice, 3);
    ribs(e, 'right', r, STOREY_PX, h - cornice, 3);
  }
  // Cornice: a slab overhanging the walls.
  const o = TALL.corniceOverhang;
  box(e, r[0] - o, r[1] - o, r[2] + o, r[3] + o, h - cornice, h, { left: 'paper', right: 'light' });
  const am = (r[0] + r[2]) / 2;
  const bm = (r[1] + r[3]) / 2;
  if (e.lod > 0 && rng.chance(0.5)) {
    // Rooftop water tank on a little frame.
    const ta = rng.range(r[0] + 0.15, r[2] - 0.2);
    const tb = rng.range(r[1] + 0.15, r[3] - 0.2);
    e.segments(
      [
        [
          [ta, tb, h],
          [ta, tb, h + 3],
        ],
      ],
      e.inks.detail,
    );
    cylinder(e, ta, tb, 0.07, h + 3, h + 3 + STOREY_PX * 0.9, 'light');
  }
  return { rect: r, wall: h - cornice, roof: [am, bm, h] };
}

export function waterfrontGlass(e: Engraver, floors: number, rng: ArtRng): Shell {
  const m = rng.range(TALL.glassInset[0], TALL.glassInset[1]);
  const r: [number, number, number, number] = [m, m, 1 - m, 1 - m];
  const h = floors * STOREY_PX;
  castShadow(e, r[0], r[1], r[2], r[3], h);
  box(e, r[0], r[1], r[2], r[3], 0, h, { left: 'paper', right: 'light' });
  const n = TALL.mullions[e.lod]!;
  ribs(e, 'left', r, 0, h, n);
  ribs(e, 'right', r, 0, h, n);
  if (e.lod > 0) {
    const floorsZ = Array.from({ length: floors - 1 }, (_, k) => (k + 1) * STOREY_PX);
    bands(e, 'left', r, floorsZ, e.inks.detail * 0.7);
    bands(e, 'right', r, floorsZ, e.inks.detail * 0.7);
    // Reflections: two diagonal strokes across the glass.
    const u = rng.range(0.15, 0.45);
    const z = rng.range(h * 0.3, h * 0.6);
    const seg = (du: number, dz: number): [Vec3, Vec3] => [
      onFace('left', ...r, u + du, z + dz),
      onFace('left', ...r, Math.min(1, u + du + 0.25), Math.min(h, z + dz + STOREY_PX * 1.6)),
    ];
    e.segments([seg(0, 0), seg(0.08, -STOREY_PX * 0.6)], e.inks.detail * 1.4, 0.7);
  }
  return { rect: r, wall: h, roof: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, h] };
}
