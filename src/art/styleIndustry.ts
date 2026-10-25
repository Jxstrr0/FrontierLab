// Industrial buildings that change with the local style (ART_DIRECTION §2.1):
// prairie grain elevators (a row of tall bins with a headhouse) and outback
// sheds with curved corrugated roofs beside a water tank. Other styles keep
// the sawtooth sheds of buildingsLow.ts.
import { STOREY_PX } from '../config/map';
import type { Shell } from './buildingsTall';
import type { Engraver, Vec3 } from './engraver';
import type { ArtRng } from './prng';
import { walls, type Rect } from './roofs';
import { box, castShadow, cylinder } from './solids';

export type IndustryKind = 'sawtooth' | 'elevator' | 'barrel';

/** Visual tuning, in tiles and storeys. */
const MILL = {
  binR: 0.1,
  bins: [3, 4],
  binStoreys: 3.2,
  headStoreys: 4,
  vaultPx: 7,
  vaultSteps: 6,
  tankR: 0.09,
} as const;

/** Grain elevator: tall round bins in a row, a taller headhouse at one end. */
export function grainElevator(e: Engraver, floors: number, rng: ArtRng): Shell {
  const n = rng.int(MILL.bins[0], MILL.bins[1]);
  const r = MILL.binR;
  const h = Math.min(floors + 3, MILL.binStoreys + floors * 0.3) * STOREY_PX;
  const b = 0.5;
  const a0 = 0.32;
  const step = 0.5 / Math.max(1, n - 1);
  castShadow(e, a0 - r, b - r, a0 + step * (n - 1) + r, b + r, h);
  // Headhouse behind the first bin (lower a), drawn first.
  const head: Rect = [0.06, 0.38, 0.22, 0.62];
  const hh = Math.min(floors + 3.4, MILL.headStoreys + floors * 0.3) * STOREY_PX;
  box(e, head[0], head[1], head[2], head[3], 0, hh, { left: 'light', right: 'dense' });
  e.poly(
    [
      [head[0], head[3], hh],
      [(head[0] + head[2]) / 2, head[3], hh + 4],
      [head[2], head[3], hh],
    ],
    'roofLight',
  );
  for (let k = 0; k < n; k++) cylinder(e, a0 + step * k, b, r, 0, h, 'medium');
  // A conveyor gallery along the bin tops.
  if (e.lod > 0) {
    const z = h + 2;
    e.segments(
      [
        [
          [head[2], b, hh - 4],
          [a0 + step * (n - 1), b, z],
        ],
      ],
      e.inks.outline * 1.4,
    );
  }
  return { rect: head as [number, number, number, number], wall: STOREY_PX, roof: [0.5, b, h] };
}

/** An outback shed: low walls under a curved corrugated roof, with a tank. */
export function barrelShed(e: Engraver, rng: ArtRng): Shell {
  const r: Rect = [0.12, 0.2, 0.84, 0.74];
  const wall = STOREY_PX * 0.9;
  const vault = MILL.vaultPx;
  castShadow(e, ...r, wall + vault);
  walls(e, r, wall);
  // Arch profile across b, strips along a.
  const prof: [number, number][] = [];
  for (let k = 0; k <= MILL.vaultSteps; k++) {
    const t = (k / MILL.vaultSteps) * Math.PI;
    prof.push([(r[1] + r[3]) / 2 - (Math.cos(t) * (r[3] - r[1])) / 2, wall + Math.sin(t) * vault]);
  }
  for (let k = 0; k < MILL.vaultSteps; k++) {
    const [ba, za] = prof[k]!;
    const [bb, zb] = prof[k + 1]!;
    e.poly(
      [
        [r[0], ba, za],
        [r[2], ba, za],
        [r[2], bb, zb],
        [r[0], bb, zb],
      ],
      k < MILL.vaultSteps / 2 ? 'roof' : 'roofLight',
      e.inks.detail,
    );
  }
  const end: Vec3[] = [
    [r[2], r[3], 0],
    [r[2], r[1], 0],
    ...prof.map(([b, z]): Vec3 => [r[2], b, z]),
  ];
  e.poly(end, 'medium');
  corrugate(
    e,
    [
      [r[0], (r[1] + r[3]) / 2, wall + vault],
      [r[2], (r[1] + r[3]) / 2, wall + vault],
    ],
    [
      [r[0], r[3], wall],
      [r[2], r[3], wall],
    ],
    10,
  );
  const ta = 0.9 - MILL.tankR;
  const tb = 0.84;
  if (rng.chance(0.7)) cylinder(e, ta, tb, MILL.tankR, 0, STOREY_PX * 1.1, 'light');
  return {
    rect: [r[0], r[1], r[2], r[3]],
    wall,
    roof: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, wall + vault],
  };
}

/** Corrugation lines running down a roof plane (outback sheds), at full detail. */
export function corrugate(e: Engraver, top: [Vec3, Vec3], bottom: [Vec3, Vec3], n: number) {
  if (e.lod < 2) return;
  const lerp = (p: Vec3, q: Vec3, t: number): Vec3 => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
    p[2] + (q[2] - p[2]) * t,
  ];
  const segs: [Vec3, Vec3][] = [];
  for (let k = 1; k < n; k++) {
    const t = k / n;
    segs.push([lerp(top[0], top[1], t), lerp(bottom[0], bottom[1], t)]);
  }
  e.segments(segs, e.inks.detail * 0.8, 0.6);
}
