// Where city life can go (ART_DIRECTION §2.3), read once from a CityMap: the
// straight street runs cars drive along (bridges included), the plaza and park
// tiles people wander in, the clear water lines boats cruise, the fountains
// that spray and the door of any tile (the street side people step out to).
// Pure and seeded from the map, like citygen.ts.
import { CITY_LAYOUT } from '../config/balance';
import { CRUISE, LIFE_DISTRICT_BUSY } from '../config/cityLife';
import { DISTRICTS } from '../data/types';
import { KIND } from './cityBlocks';
import { DECOR } from './cityDecor';
import type { CityMap } from './citygen';
import { featureFor } from './parkFurniture';
import { isParkMiddle } from './tintLayer';

/** A straight line of tiles along x (a row, `fixed` = y) or along y (a column, `fixed` = x). */
export interface Run {
  axis: 'x' | 'y';
  fixed: number;
  /** First tile and one past the last, along the axis. */
  from: number;
  to: number;
  /** How busy its districts are on average (LIFE_DISTRICT_BUSY). */
  busy: number;
  /** Mostly downtown or financial: buses run here. */
  central: boolean;
}

export interface Fountain {
  x: number;
  y: number;
  /** Where the jet tops out (world px above the ground). */
  topPx: number;
}

/** Where someone steps out of a tile onto the street: the kerb point and the street's axis. */
export interface Door {
  /** The doorstep at the tile's edge, in tile coords. */
  x: number;
  y: number;
  /** The street tile in front, and which way that street runs. */
  sx: number;
  sy: number;
  axis: 'x' | 'y';
  /** +1 when the street lies toward +x / +y of the tile, −1 when toward −x / −y. */
  side: 1 | -1;
}

export interface LifeRoutes {
  streets: Run[];
  water: Run[];
  plazas: { x: number; y: number; busy: number }[];
  parks: { x: number; y: number; busy: number }[];
  fountains: Fountain[];
}

/** Jet heights of the plaza fountain (streetLife.ts) and the park fountain (parkFurniture.ts). */
const PLAZA_JET_PX = 15;
const PARK_JET_PX = 11;

export function buildLifeRoutes(map: CityMap): LifeRoutes {
  const n = map.tiles;
  const block = CITY_LAYOUT.block;
  const busyAt = (i: number) => LIFE_DISTRICT_BUSY[DISTRICTS[map.district[i]!]!];
  const centralAt = (i: number) => {
    const d = DISTRICTS[map.district[i]!];
    return d === 'downtown' || d === 'financial';
  };
  const drivable = (x: number, y: number, axis: 'x' | 'y') => {
    const i = y * n + x;
    if (map.kind[i] === KIND.street) return true;
    const b = map.geo.bridge[i] ?? 0;
    return (b & (axis === 'x' ? 1 : 2)) !== 0;
  };
  const streets: Run[] = [];
  for (let line = 0; line < n; line += block) {
    for (const axis of ['x', 'y'] as const) {
      const at = (k: number) => (axis === 'x' ? { x: k, y: line } : { x: line, y: k });
      runsAlong(n, (k) => {
        const p = at(k);
        return drivable(p.x, p.y, axis);
      }).forEach(([from, to]) => {
        let busy = 0;
        let central = 0;
        for (let k = from; k < to; k++) {
          const p = at(k);
          busy += busyAt(p.y * n + p.x);
          if (centralAt(p.y * n + p.x)) central++;
        }
        const len = to - from;
        if (len >= 2) {
          streets.push({
            axis,
            fixed: line,
            from,
            to,
            busy: busy / len,
            central: central * 2 > len,
          });
        }
      });
    }
  }
  const water: Run[] = [];
  const clear = (x: number, y: number) => {
    const i = y * n + x;
    return (
      map.kind[i] === KIND.water &&
      !map.geo.bridge[i] &&
      !(map.decor[i]! & DECOR.boat) &&
      map.geo.shoreDist[i]! >= CRUISE.shoreDist
    );
  };
  // Every other line keeps boats on one line apart.
  for (let line = 1; line < n; line += 3) {
    for (const axis of ['x', 'y'] as const) {
      runsAlong(n, (k) => (axis === 'x' ? clear(k, line) : clear(line, k))).forEach(
        ([from, to]) => {
          if (to - from >= CRUISE.minRun)
            water.push({ axis, fixed: line, from, to, busy: 1, central: false });
        },
      );
    }
  }
  const plazas: LifeRoutes['plazas'] = [];
  const parks: LifeRoutes['parks'] = [];
  const fountains: Fountain[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (map.kind[i] !== KIND.park) continue;
      const d = map.decor[i]!;
      if (d & DECOR.plaza) {
        if (d & DECOR.fountain) fountains.push({ x: x + 0.5, y: y + 0.5, topPx: PLAZA_JET_PX });
        else plazas.push({ x, y, busy: busyAt(i) });
      } else if (isParkMiddle(map, x, y)) {
        if (featureFor(map.seed[i]!) === 'fountain')
          fountains.push({ x: x + 0.5, y: y + 0.5, topPx: PARK_JET_PX });
      } else parks.push({ x, y, busy: busyAt(i) });
    }
  }
  return { streets, water, plazas, parks, fountains };
}

/** Maximal runs [from, to) of k in 0..n−1 where ok(k) holds. */
function runsAlong(n: number, ok: (k: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  for (let k = 0; k <= n; k++) {
    const yes = k < n && ok(k);
    if (yes && start < 0) start = k;
    if (!yes && start >= 0) {
      out.push([start, k]);
      start = -1;
    }
  }
  return out;
}

/** The street side of a tile (front faces first, as the shopfront door is drawn), if any. */
export function doorOf(map: CityMap, x: number, y: number): Door | undefined {
  const n = map.tiles;
  const street = (i: number, j: number) =>
    i >= 0 && j >= 0 && i < n && j < n && map.kind[j * n + i] === KIND.street;
  if (street(x, y + 1)) return { x: x + 0.5, y: y + 1, sx: x, sy: y + 1, axis: 'x', side: 1 };
  if (street(x + 1, y)) return { x: x + 1, y: y + 0.5, sx: x + 1, sy: y, axis: 'y', side: 1 };
  if (street(x, y - 1)) return { x: x + 0.5, y, sx: x, sy: y - 1, axis: 'x', side: -1 };
  if (street(x - 1, y)) return { x, y: y + 0.5, sx: x - 1, sy: y, axis: 'y', side: -1 };
  return undefined;
}
