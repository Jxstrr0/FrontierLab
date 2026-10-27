// Data center and energy site buildings on the map (ART_DIRECTION §2, stage
// C8c): a low, wide engraved hall with a long parapet roofline, precast wall
// panels, a louvre band, a loading door and rooftop chillers with fan rings,
// beside a small fenced substation yard. Energy sites draw a bigger yard with
// transformers and a lattice pylon, plus the hall once you build there. Each
// look comes only from the tile's art seed, so it draws the same in every chunk.
import { STOREY_PX } from '../config/map';
import { roofFlag } from './buildings';
import type { TileInfo } from './citygen';
import type { Engraver, Vec3 } from './engraver';
import type { LotOccupant } from './mapRenderer';
import { artRng, type ArtRng } from './prng';
import { bands, box, castShadow, cylinder, onFace, ribs } from './solids';

type Rect = [number, number, number, number];

/** Visual tuning, in tiles and storeys. */
const HALL = {
  /** Footprint on a storefront lot: the whole width along a, the yard in front of the lit face. */
  lot: [0.04, 0.05, 0.96, 0.66] as Rect,
  /** Footprint at an energy site, beside its bigger yard. */
  site: [0.04, 0.05, 0.62, 0.72] as Rect,
  wallStoreys: [1.2, 1.5],
  parapetStoreys: 0.18,
  louvreStoreys: 0.3,
  panels: [3, 6, 9],
  chillers: [2, 3, 4],
  chillerStoreys: 0.45,
  fanR: 0.045,
  ventR: 0.035,
  doorU: [0.62, 0.84],
} as const;

const YARD = {
  lot: [0.3, 0.72, 0.94, 0.96] as Rect,
  site: [0.64, 0.1, 0.96, 0.94] as Rect,
  fenceStoreys: 0.35,
  posts: [2, 4, 6],
  transformerStoreys: 0.55,
  pylonStoreys: 3.6,
} as const;

/** What a tile shows: your data center hall, an energy site's yard, or both. */
export const isDataCenter = (o: LotOccupant | undefined): boolean => o?.building === 'dataCenter';

/** A data center on a storefront lot: the hall, its substation yard and your roof flag. */
export function drawDataCenterLot(e: Engraver, t: TileInfo, occupant: LotOccupant): void {
  e.origin(t.x, t.y);
  const rng = artRng(t.seed);
  const roof = hall(e, HALL.lot, rng);
  yard(e, YARD.lot, false);
  roofFlag(e, roof, occupant.ink);
}

/** An energy site: a substation yard and pylon, with your hall once you build one there. */
export function drawEnergySite(e: Engraver, t: TileInfo, occupant: LotOccupant): void {
  e.origin(t.x, t.y);
  const rng = artRng(t.seed);
  if (isDataCenter(occupant)) {
    const roof = hall(e, HALL.site, rng);
    roofFlag(e, roof, occupant.ink);
  } else {
    controlHouse(e);
  }
  yard(e, YARD.site, true);
}

/** The engraved hall; returns where the roof flag stands. */
function hall(e: Engraver, r: Rect, rng: ArtRng): Vec3 {
  const wall = STOREY_PX * rng.range(HALL.wallStoreys[0], HALL.wallStoreys[1]);
  const parapet = STOREY_PX * HALL.parapetStoreys;
  const chillerH = STOREY_PX * HALL.chillerStoreys;
  castShadow(e, ...r, wall + chillerH);
  box(e, r[0], r[1], r[2], r[3], 0, wall, { left: 'light', right: 'medium', top: 'none' });
  // Precast panels and a louvre band under the parapet: the long roofline.
  const n = HALL.panels[e.lod]!;
  ribs(e, 'left', r, 0, wall, n);
  ribs(e, 'right', r, 0, wall, Math.max(2, Math.round(n / 2)));
  const louvre = wall - STOREY_PX * HALL.louvreStoreys;
  if (e.lod > 0) {
    for (const face of ['left', 'right'] as const) {
      const p = (u: number, z: number) => onFace(face, ...r, u, z);
      e.poly([p(0, louvre), p(1, louvre), p(1, wall), p(0, wall)], 'dense', e.inks.detail);
    }
  }
  bands(e, 'left', r, [louvre], e.inks.outline);
  bands(e, 'right', r, [louvre], e.inks.outline);
  // Roof slab with a raised parapet edge.
  box(e, r[0] - 0.01, r[1] - 0.01, r[2] + 0.01, r[3] + 0.01, wall, wall + parapet, {
    left: 'paper',
    right: 'light',
    top: 'roof',
  });
  const top = wall + parapet;
  if (e.lod > 0) {
    // Loading door on the lit face.
    const p = (u: number, z: number) => onFace('left', ...r, u, z);
    const [u0, u1] = HALL.doorU;
    e.poly([p(u0, 0), p(u1, 0), p(u1, wall * 0.62), p(u0, wall * 0.62)], 'dense', e.inks.detail);
  }
  chillers(e, r, top);
  return [r[0] + 0.12, (r[1] + r[3]) / 2, top];
}

/** A row of rooftop chiller units with fan rings, and a few round vents. */
function chillers(e: Engraver, r: Rect, z: number): void {
  const count = HALL.chillers[e.lod]!;
  const h = STOREY_PX * HALL.chillerStoreys;
  const a0 = r[0] + 0.24;
  const a1 = r[2] - 0.06;
  const w = (a1 - a0) / count;
  const b0 = r[1] + (r[3] - r[1]) * 0.42;
  const b1 = r[1] + (r[3] - r[1]) * 0.78;
  for (let k = 0; k < count; k++) {
    const ca = a0 + k * w + w * 0.1;
    const cb = ca + w * 0.8;
    box(e, ca, b0, cb, b1, z, z + h, { left: 'light', right: 'dense', top: 'paper' });
    if (e.lod === 0) continue;
    const mid = (ca + cb) / 2;
    e.flatCircle(mid, b0 + (b1 - b0) * 0.3, z + h, HALL.fanR, 'medium', true);
    e.flatCircle(mid, b0 + (b1 - b0) * 0.72, z + h, HALL.fanR, 'medium', true);
  }
  if (e.lod < 2) return;
  const vb = r[1] + (r[3] - r[1]) * 0.2;
  for (const f of [0.35, 0.6, 0.85]) {
    cylinder(e, r[0] + (r[2] - r[0]) * f, vb, HALL.ventR, z, z + 2.5, 'light');
  }
}

/** A small control house for an energy site with no hall yet. */
function controlHouse(e: Engraver): void {
  const r: Rect = [0.2, 0.22, 0.52, 0.5];
  const h = STOREY_PX * 1.2;
  castShadow(e, ...r, h);
  box(e, r[0], r[1], r[2], r[3], 0, h, { left: 'light', right: 'medium', top: 'roof' });
  bands(e, 'left', r, [h * 0.8], e.inks.detail);
}

/** A fenced substation yard: transformers and, at energy sites, a lattice pylon. */
function yard(e: Engraver, r: Rect, pylon: boolean): void {
  const [a0, b0, a1, b1] = r;
  e.poly(
    [
      [a0, b0, 0],
      [a1, b0, 0],
      [a1, b1, 0],
      [a0, b1, 0],
    ],
    'roof',
    e.inks.detail,
  );
  const th = STOREY_PX * YARD.transformerStoreys;
  const units = pylon ? 3 : 2;
  // Transformers in a line along the yard's long side, with the pylon's room kept clear.
  const alongA = a1 - a0 >= b1 - b0;
  const room = pylon ? 0.6 : 1;
  for (let k = 0; k < units; k++) {
    const f0 = ((k + 0.2) / units) * room;
    const f1 = ((k + 0.8) / units) * room;
    const t: Rect = alongA
      ? [a0 + (a1 - a0) * f0, b0 + (b1 - b0) * 0.25, a0 + (a1 - a0) * f1, b0 + (b1 - b0) * 0.75]
      : [a0 + (a1 - a0) * 0.2, b0 + (b1 - b0) * f0, a0 + (a1 - a0) * 0.65, b0 + (b1 - b0) * f1];
    box(e, t[0], t[1], t[2], t[3], 0, th, { left: 'light', right: 'dense' });
    if (e.lod === 0) continue;
    // Bushings: three short posts on top.
    const bush: [Vec3, Vec3][] = [0.25, 0.5, 0.75].map((f) => {
      const p: Vec3 = alongA
        ? [t[0] + (t[2] - t[0]) * f, (t[1] + t[3]) / 2, th]
        : [(t[0] + t[2]) / 2, t[1] + (t[3] - t[1]) * f, th];
      return [p, [p[0], p[1], p[2] + 2.2]];
    });
    e.segments(bush, e.inks.detail * 1.2);
  }
  if (pylon) lattice(e, a0 + (a1 - a0) * 0.5, b0 + (b1 - b0) * 0.82);
  fence(e, r);
}

/** Fence posts and a top rail along the two visible edges of the yard. */
function fence(e: Engraver, r: Rect): void {
  if (e.lod === 0) return;
  const h = STOREY_PX * YARD.fenceStoreys;
  const n = YARD.posts[e.lod]!;
  const segs: [Vec3, Vec3][] = [];
  for (const face of ['left', 'right'] as const) {
    const p = (u: number, z: number) => onFace(face, ...r, u, z);
    segs.push([p(0, h), p(1, h)]);
    for (let k = 0; k <= n; k++) segs.push([p(k / n, 0), p(k / n, h)]);
  }
  e.segments(segs, e.inks.detail, 0.85);
}

/** A tapering lattice pylon with two cross-arms. */
function lattice(e: Engraver, a: number, b: number): void {
  const h = STOREY_PX * YARD.pylonStoreys;
  const base = 0.07;
  const tip = 0.015;
  const leg = (sa: number, sb: number): [Vec3, Vec3] => [
    [a + sa * base, b + sb * base, 0],
    [a + sa * tip, b + sb * tip, h],
  ];
  const segs: [Vec3, Vec3][] = [leg(-1, 1), leg(1, 1), leg(1, -1)];
  // Cross-arms carrying the lines.
  for (const f of [0.72, 0.9]) {
    const z = h * f;
    const reach = 0.12 * (1.1 - f);
    segs.push([
      [a, b - reach - 0.05, z],
      [a, b + reach + 0.05, z],
    ]);
  }
  if (e.lod > 0) {
    // Zig-zag bracing up the front legs.
    const steps = e.lod === 2 ? 6 : 3;
    for (let k = 0; k < steps; k++) {
      const z0 = (h * 0.7 * k) / steps;
      const z1 = (h * 0.7 * (k + 1)) / steps;
      const w0 = base + (tip - base) * (z0 / h);
      const w1 = base + (tip - base) * (z1 / h);
      segs.push([
        [a - w0, b + w0, z0],
        [a + w1, b + w1, z1],
      ]);
    }
  }
  e.segments(segs, e.inks.detail * 1.2);
}
