// Small things that make the engraved city look lived in (ART_DIRECTION §2.3),
// drawn with the city like any other detail: cars parked along the kerbs, café
// tables under umbrellas on plazas, washing lines in suburban yards and tower
// cranes over lots being fitted out. Where they go comes only from each
// tile's art seed, so every chunk agrees. Heights stay within PROPS (config).
import { CITY_LAYOUT } from '../config/balance';
import { CARS, PROPS } from '../config/cityLife';
import { DISTRICTS } from '../data/types';
import { KIND } from './cityBlocks';
import { DECOR } from './cityDecor';
import type { CityMap } from './citygen';
import type { Engraver, Fill, Vec3 } from './engraver';
import { artRng, mixSeed } from './prng';
import { box } from './solids';

/** Visual tuning, in tiles and world px. */
const PROP = {
  /** Parked cars sit this far in from the kerb, at these spots along the street. */
  parkedAt: 0.2,
  parkedSpots: [0.18, 0.5, 0.82],
  bodies: ['paper', 'roof', 'light', 'paper', 'medium'] as Fill[],
  tables: [3, 4],
  tableR: 0.05,
  tablePx: 2.4,
  umbrellaR: 0.1,
  postPx: 5,
  clothes: 4,
  mastW: 0.035,
  jib: 0.72,
} as const;

/** Whether a street tile has cars parked along it. */
export function hasParkedCars(map: CityMap, index: number): boolean {
  if (map.kind[index] !== KIND.street || map.decor[index]! & DECOR.avenue) return false;
  const n = map.tiles;
  const x = index % n;
  const y = (index - x) / n;
  const step = CITY_LAYOUT.block;
  if (x % step === 0 && y % step === 0) return false;
  const share = PROPS.parked[DISTRICTS[map.district[index]!]!];
  return artRng(mixSeed(map.seed[index]!, 21)).chance(share);
}

/** Whether a plaza tile without a fountain has café tables. */
export function hasCafe(map: CityMap, index: number): boolean {
  return artRng(mixSeed(map.seed[index]!, 22)).chance(PROPS.cafe);
}

/** Cars nose to tail along one or both kerbs of a street tile. */
export function parkedCars(e: Engraver, map: CityMap, x: number, y: number): void {
  const i = y * map.tiles + x;
  const rng = artRng(mixSeed(map.seed[i]!, 23));
  const column = x % CITY_LAYOUT.block === 0;
  const sides = rng.chance(0.4)
    ? [PROP.parkedAt, 1 - PROP.parkedAt]
    : [rng.chance(0.5) ? PROP.parkedAt : 1 - PROP.parkedAt];
  const cars: [number, number][] = [];
  for (const across of sides) {
    for (const along of PROP.parkedSpots) {
      if (rng.chance(0.65)) cars.push(column ? [across, along] : [along, across]);
    }
  }
  cars.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
  e.origin(x, y);
  const hl = CARS.len / 2;
  const hw = CARS.width / 2;
  for (const [a, b] of cars) {
    const [da, db] = column ? [hw, hl] : [hl, hw];
    const body = PROP.bodies[rng.int(0, PROP.bodies.length - 1)]!;
    box(e, a - da, b - db, a + da, b + db, 0, CARS.bodyPx, {
      left: 'light',
      right: 'medium',
      top: body,
    });
    if (e.lod === 0) continue;
    const [ca, cb] = column ? [hw * 0.8, hl * 0.5] : [hl * 0.5, hw * 0.8];
    box(e, a - ca, b - cb, a + ca, b + cb, CARS.bodyPx, CARS.bodyPx + CARS.cabinPx, {
      left: 'light',
      right: 'medium',
      top: 'paper',
    });
  }
}

/** Round café tables under umbrellas in the city's tint. */
export function cafeTables(e: Engraver, map: CityMap, x: number, y: number): void {
  const rng = artRng(mixSeed(map.seed[y * map.tiles + x]!, 24));
  const count = rng.int(PROP.tables[0], PROP.tables[1]);
  const spots: [number, number][] = [];
  for (let k = 0; k < count; k++) spots.push([rng.range(0.18, 0.82), rng.range(0.18, 0.82)]);
  spots.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
  e.origin(x, y);
  for (const [a, b] of spots) {
    if (e.lod > 0) {
      // Two chairs and the table.
      e.flatCircle(a - 0.07, b, 0.8, 0.025, 'medium', false);
      e.flatCircle(a, b - 0.07, 0.8, 0.025, 'medium', false);
      e.segments(
        [
          [
            [a, b, 0],
            [a, b, PROP.tablePx],
          ],
        ],
        e.inks.detail,
      );
      e.flatCircle(a, b, PROP.tablePx, PROP.tableR, 'paper', true);
    }
    e.segments(
      [
        [
          [a, b, PROP.tablePx],
          [a, b, PROPS.cafePx - 1.2],
        ],
      ],
      e.inks.detail,
    );
    e.flatCircle(a, b, PROPS.cafePx - 1.2, PROP.umbrellaR, 'roof', true);
  }
}

/**
 * A washing line in a suburban yard, on whichever side of the house has room
 * (`rect` is the house footprint). Drawn after the house: the yard is in front.
 */
export function washingLine(e: Engraver, rect: readonly number[], seed: number): void {
  if (e.lod === 0) return;
  const rng = artRng(mixSeed(seed, 25));
  if (!rng.chance(PROPS.washing)) return;
  const front = 1 - rect[3]!;
  const right = 1 - rect[2]!;
  if (Math.max(front, right) < 0.18) return;
  const alongA = front >= right;
  const across = alongA ? rect[3]! + front * 0.55 : rect[2]! + right * 0.55;
  const s0 = rng.range(0.15, 0.35);
  const s1 = s0 + rng.range(0.35, 0.45);
  const P = (s: number, z: number): Vec3 => (alongA ? [s, across, z] : [across, s, z]);
  const top = PROP.postPx;
  e.segments(
    [
      [P(s0, 0), P(s0, top)],
      [P(s1, 0), P(s1, top)],
    ],
    e.inks.detail * 1.4,
  );
  e.segments(
    [
      [P(s0, top), P((s0 + s1) / 2, top - 0.6)],
      [P((s0 + s1) / 2, top - 0.6), P(s1, top)],
    ],
    e.inks.detail,
    0.8,
  );
  for (let k = 1; k <= PROP.clothes; k++) {
    const u = s0 + ((s1 - s0) * k) / (PROP.clothes + 1);
    const w = (s1 - s0) * 0.09;
    const z = top - 0.6 + Math.abs(k - (PROP.clothes + 1) / 2) * 0.2;
    const drop = rng.range(1.6, 2.6);
    const fill: Fill = rng.chance(0.4) ? 'roof' : 'paper';
    e.poly([P(u - w, z), P(u + w, z), P(u + w, z - drop), P(u - w, z - drop)], fill, e.inks.detail);
  }
}

/**
 * A tower crane at the front corner of a lot being fitted out: a lattice mast
 * from the ground and a jib reaching back over the roof, with a hook hanging.
 * `wall` is the building's wall height; `reach` how high the tile's drawing
 * may go (drawList.tileHeightPx), which the crane keeps well inside.
 */
export function crane(e: Engraver, wall: number, reach: number): void {
  const top = Math.min(wall + PROPS.craneAbovePx, reach - 6);
  const [a, b] = [0.9, 0.9];
  const w = PROP.mastW;
  const segs: [Vec3, Vec3][] = [
    [
      [a - w, b, 0],
      [a - w, b, top],
    ],
    [
      [a, b - w, 0],
      [a, b - w, top],
    ],
  ];
  if (e.lod > 0) {
    const rungs = Math.floor(top / 4);
    for (let k = 0; k < rungs; k++) {
      const z0 = k * 4;
      segs.push([
        [a - w, b, z0],
        [a, b - w, z0 + 4],
      ]);
    }
  }
  // The jib reaches back over the roof, the counter-jib forward.
  // Along −a, so it reads across the screen (a jib along −a−b would hide behind the mast).
  const tip: Vec3 = [a - PROP.jib, b, top];
  const tail: Vec3 = [a + 0.08, b, top];
  segs.push(
    [tail, tip],
    [[a - w * 0.5, b - w * 0.5, top + 4], tip],
    [[a - w * 0.5, b - w * 0.5, top + 4], tail],
  );
  e.segments(segs, e.inks.detail * 1.3);
  // Counterweight and the hook line.
  const hook: Vec3 = [a - PROP.jib * 0.7, b, top];
  e.segments([[hook, [hook[0], hook[1], Math.max(wall + 3, top - 14)]]], e.inks.detail, 0.8);
  box(e, a + 0.03, b - 0.03, a + 0.09, b + 0.03, top - 2.5, top, {
    left: 'dense',
    right: 'dense',
    top: 'medium',
  });
}
