// The cast of city life (ART_DIRECTION §2.3): cars and buses on the street
// runs, people on pavements, plazas and park paths, boats on open water, people
// at your and rivals' offices, delivery trucks at your data centers. Each mover
// is plain data whose pose is a pure function of time, so nothing is stepped
// per frame and an off-screen mover costs nothing. How many there are follows
// the city's mood: the economy, and how busy each office and data center is.
import { CITY_LAYOUT } from '../config/balance';
import { CARS, CRUISE, DATA_CENTER_LIFE, OFFICE_FOOTFALL, PEOPLE } from '../config/cityLife';
import type { CityMap } from './citygen';
import { doorOf, type LifeRoutes, type Run } from './lifeRoutes';
import { artRng, hashString, mixSeed, type ArtRng } from './prng';

/** How lively the city is right now (from the game state, cityMood.ts). */
export interface LifeMood {
  /** Economy multiplier on every crowd (LIFE_BUSY_RANGE). */
  busy: number;
  /** Your and rivals' sales offices: how busy each is, 0–1. */
  offices: { x: number; y: number; level: number }[];
  /**
   * Your data centers: how busy the loading dock is (0–1), whether the
   * chillers steam (not while being fitted out), and your ink for the trucks.
   */
  dataCenters: { x: number; y: number; level: number; steam: boolean; ink: string }[];
}

export type MoverKind = 'car' | 'bus' | 'truck' | 'person' | 'boat';

/** Something that follows a polyline: round and round (loop) or back and forth (shuttle). */
export interface PathMover {
  kind: MoverKind;
  /** Polyline in tile coords, x0, y0, x1, y1, … */
  pts: number[];
  /** Distance along the line at each point. */
  cum: number[];
  speed: number;
  phase: number;
  mode: 'loop' | 'shuttle';
  /** Shuttle: seconds at each end. Loop: seconds stopped at `stopAt`. */
  dwell: number;
  stopAt: number;
  /** Loop: seconds out of sight after the end. */
  gap: number;
  /** Loop: tiles to fade in and out over at the ends. */
  fade: number;
  /** Colour choice (the layer maps it to an ink). */
  tone: number;
  /** Brand ink for your trucks. */
  ink?: string;
  /** Tile-space box around the whole line, for culling. */
  box: [number, number, number, number];
}

/** People wandering one plaza or park tile, from stop to stop. */
export interface Wanderer {
  x: number;
  y: number;
  seed: number;
  leg: number;
  phase: number;
  tone: number;
}

export interface Pose {
  x: number;
  y: number;
  /** Heading (unit, in tile space). */
  dx: number;
  dy: number;
  alpha: number;
}

export interface Cast {
  paths: PathMover[];
  wanderers: Wanderer[];
}

export function lifeSeed(map: CityMap): number {
  return mixSeed(hashString(map.cityId), map.seed[0] ?? 0, map.tiles);
}

export function castFor(map: CityMap, routes: LifeRoutes, mood: LifeMood): Cast {
  const base = lifeSeed(map);
  const paths: PathMover[] = [];
  const wanderers: Wanderer[] = [];
  for (const run of routes.streets) {
    traffic(paths, run, mood.busy, artRng(mixSeed(base, 1, runKey(run))));
    strollers(paths, run, mood.busy, artRng(mixSeed(base, 2, runKey(run))));
  }
  for (const run of routes.water) {
    const rng = artRng(mixSeed(base, 3, runKey(run)));
    const count = Math.floor((run.to - run.from) / CRUISE.tilesPerBoat);
    for (let k = 0; k < count; k++) {
      const c = run.fixed + rng.range(0.3, 0.7);
      const line = lineAlong(run, run.from + 0.6, run.to - 0.6, c);
      paths.push(path('boat', line, rng.range(...CRUISE.speed), 'shuttle', rng, { dwell: 2 }));
    }
  }
  const crowd = (list: LifeRoutes['plazas'], per: number, key: number) => {
    for (const p of list) {
      const rng = artRng(mixSeed(base, key, p.x, p.y));
      const count = expected(per * p.busy * mood.busy, rng);
      for (let k = 0; k < count; k++) {
        wanderers.push({
          x: p.x,
          y: p.y,
          seed: mixSeed(base, key, p.x, p.y, k),
          leg: rng.range(...PEOPLE.legSeconds),
          phase: rng.range(0, 100),
          tone: rng.int(0, 3),
        });
      }
    }
  };
  crowd(routes.plazas, PEOPLE.perPlazaTile, 4);
  crowd(routes.parks, PEOPLE.perParkTile, 5);
  for (const o of mood.offices) footfall(paths, map, o, artRng(mixSeed(base, 6, o.x, o.y)));
  for (const d of mood.dataCenters) deliveries(paths, map, d, artRng(mixSeed(base, 7, d.x, d.y)));
  return { paths, wanderers };
}

const runKey = (r: Run) => (r.axis === 'x' ? 1 : 2) * 1_000_003 + r.fixed * 1009 + r.from;

/** A whole count whose average is `mean` (so small means still show up sometimes). */
function expected(mean: number, rng: ArtRng): number {
  const whole = Math.floor(mean);
  return whole + (rng.chance(mean - whole) ? 1 : 0);
}

/** Points along a run from s0 to s1, at `across` on the other axis. */
function lineAlong(run: Run, s0: number, s1: number, across: number): number[] {
  return run.axis === 'x' ? [s0, across, s1, across] : [across, s0, across, s1];
}

function path(
  kind: MoverKind,
  pts: number[],
  speed: number,
  mode: PathMover['mode'],
  rng: ArtRng,
  o: Partial<Pick<PathMover, 'dwell' | 'stopAt' | 'gap' | 'fade' | 'phase' | 'ink'>> = {},
): PathMover {
  const cum = [0];
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let k = 0; k < pts.length; k += 2) {
    const x = pts[k]!;
    const y = pts[k + 1]!;
    [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    if (k > 0) cum.push(cum[cum.length - 1]! + Math.hypot(x - pts[k - 2]!, y - pts[k - 1]!));
  }
  return {
    kind,
    pts,
    cum,
    speed,
    phase: o.phase ?? rng.range(0, 1000),
    mode,
    dwell: o.dwell ?? 0,
    stopAt: o.stopAt ?? 0,
    gap: o.gap ?? 0,
    fade: o.fade ?? 0,
    tone: rng.int(0, 5),
    ink: o.ink,
    box: [x0, y0, x1, y1],
  };
}

/**
 * Cars both ways along a street run. Each lane keeps one speed and its cars
 * evenly spaced, so they never run into each other; driving +axis keeps to
 * the + side of the centre line.
 */
function traffic(out: PathMover[], run: Run, busy: number, rng: ArtRng): void {
  const len = run.to - run.from;
  const centre = run.fixed + 0.5;
  for (const dir of [1, -1] as const) {
    const count = expected((len * CARS.perTile * run.busy * busy) / 2, rng);
    const speed = rng.range(...CARS.speed);
    const across = centre + dir * CARS.lane;
    const line =
      dir === 1
        ? lineAlong(run, run.from, run.to, across)
        : lineAlong(run, run.to, run.from, across);
    const cycle = len / speed;
    const start = rng.range(0, cycle);
    for (let k = 0; k < count; k++) {
      const bus = run.central && rng.chance(CARS.busShare);
      const jitter = rng.range(-0.25, 0.25) / count;
      out.push(
        path(bus ? 'bus' : 'car', line, speed, 'loop', rng, {
          phase: start + ((k + 0.5 + jitter) / count) * cycle,
          fade: CARS.fade,
        }),
      );
    }
  }
}

/** People strolling a stretch of pavement on either side of a street run, and back. */
function strollers(out: PathMover[], run: Run, busy: number, rng: ArtRng): void {
  const len = run.to - run.from;
  const count = expected(len * PEOPLE.perStreetTile * run.busy * busy, rng);
  for (let k = 0; k < count; k++) {
    const stroll = Math.min(len - 0.4, rng.range(...PEOPLE.stroll));
    const s0 = run.from + 0.2 + rng.range(0, Math.max(0, len - 0.4 - stroll));
    const across = run.fixed + (rng.chance(0.5) ? PEOPLE.pavement : 1 - PEOPLE.pavement);
    const line = lineAlong(run, s0, s0 + stroll, across);
    out.push(path('person', line, rng.range(...PEOPLE.speed), 'shuttle', rng, { dwell: 1.5 }));
  }
}

/** People stepping out of an office's door, along the pavement, and back in. */
function footfall(
  out: PathMover[],
  map: CityMap,
  o: LifeMood['offices'][number],
  rng: ArtRng,
): void {
  const door = doorOf(map, o.x, o.y);
  if (!door) return;
  const span = OFFICE_FOOTFALL.max - OFFICE_FOOTFALL.min;
  const count = Math.round(OFFICE_FOOTFALL.min + span * Math.max(0, Math.min(1, o.level)));
  // The pavement on the office's side of the street.
  const pav = door.side === 1 ? PEOPLE.pavement : 1 - PEOPLE.pavement;
  const block = CITY_LAYOUT.block;
  for (let k = 0; k < count; k++) {
    const reach = rng.range(...OFFICE_FOOTFALL.reach) * (rng.chance(0.5) ? 1 : -1);
    let pts: number[];
    if (door.axis === 'x') {
      const b = door.sy + pav;
      const far = clampToMap(map, door.x + reach, block);
      pts = [door.x, door.y, door.x, b, far, b];
    } else {
      const a = door.sx + pav;
      const far = clampToMap(map, door.y + reach, block);
      pts = [door.x, door.y, a, door.y, a, far];
    }
    out.push(
      path('person', pts, rng.range(...PEOPLE.speed), 'shuttle', rng, {
        dwell: rng.range(...OFFICE_FOOTFALL.dwell),
      }),
    );
  }
}

const clampToMap = (map: CityMap, v: number, margin: number) =>
  Math.max(margin * 0.25, Math.min(map.tiles - margin * 0.25, v));

/** Delivery trucks in your ink: down the street, a stop at the dock, and on. */
function deliveries(
  out: PathMover[],
  map: CityMap,
  d: LifeMood['dataCenters'][number],
  rng: ArtRng,
): void {
  const door = doorOf(map, d.x, d.y);
  if (!door) return;
  const count = Math.round(DATA_CENTER_LIFE.trucks * Math.max(0, Math.min(1, d.level)));
  // The lane nearer the dock: on the street's − side for a street at +x/+y of the hall.
  const dir = door.side === 1 ? -1 : 1;
  const across = (door.axis === 'x' ? door.sy : door.sx) + 0.5 + dir * CARS.lane;
  const at = door.axis === 'x' ? door.x : door.y;
  for (let k = 0; k < count; k++) {
    const reach = rng.range(...DATA_CENTER_LIFE.truckReach);
    const s0 = clampToMap(map, at - dir * reach, 0);
    const s1 = clampToMap(map, at + dir * reach, 0);
    const pts = door.axis === 'x' ? [s0, across, s1, across] : [across, s0, across, s1];
    const dwell = rng.range(...DATA_CENTER_LIFE.truckDwell);
    const speed = rng.range(...CARS.speed);
    out.push(
      path('truck', pts, speed, 'loop', rng, {
        stopAt: Math.abs(at - s0),
        dwell,
        // Trucks come every so often, not nose to tail.
        gap: rng.range(4, 12) + (k * reach) / speed,
        fade: CARS.fade,
        ink: d.ink,
      }),
    );
  }
}

/** Where a path mover is at time t (seconds), or null while it is out of sight. */
export function poseAt(m: PathMover, t: number): Pose | null {
  const len = m.cum[m.cum.length - 1]!;
  const travel = len / m.speed;
  let s: number;
  let back = false;
  let alpha = 1;
  if (m.mode === 'shuttle') {
    const cycle = 2 * (travel + m.dwell);
    let u = mod(t + m.phase, cycle);
    if (u >= travel + m.dwell) {
      back = true;
      u -= travel + m.dwell;
    }
    const along = Math.max(0, Math.min(travel, u - m.dwell)) * m.speed;
    s = back ? len - along : along;
  } else {
    const cycle = travel + m.dwell + m.gap;
    const u = mod(t + m.phase, cycle);
    const toStop = m.stopAt / m.speed;
    if (u < toStop) s = u * m.speed;
    else if (u < toStop + m.dwell) s = m.stopAt;
    else if (u < travel + m.dwell) s = (u - m.dwell) * m.speed;
    else return null;
    if (m.fade > 0) alpha = Math.max(0, Math.min(1, Math.min(s, len - s) / m.fade));
  }
  // Find the segment holding s.
  let k = 1;
  while (k < m.cum.length - 1 && m.cum[k]! < s) k++;
  const s0 = m.cum[k - 1]!;
  const seg = m.cum[k]! - s0 || 1;
  const f = (s - s0) / seg;
  const ax = m.pts[2 * k - 2]!;
  const ay = m.pts[2 * k - 1]!;
  const bx = m.pts[2 * k]!;
  const by = m.pts[2 * k + 1]!;
  const sign = back ? -1 : 1;
  return {
    x: ax + (bx - ax) * f,
    y: ay + (by - ay) * f,
    dx: (sign * (bx - ax)) / seg,
    dy: (sign * (by - ay)) / seg,
    alpha,
  };
}

/** Where a wanderer is at time t: walking between seeded stops in its tile, pausing at each. */
export function wanderAt(w: Wanderer, t: number, pause: number): Pose {
  const u = (t + w.phase) / w.leg;
  const leg = Math.floor(u);
  const f = Math.min(1, (u - leg) / (1 - pause));
  const a = stop(w, leg);
  const b = stop(w, leg + 1);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1;
  return { x: a[0] + dx * f, y: a[1] + dy * f, dx: dx / d, dy: dy / d, alpha: 1 };
}

function stop(w: Wanderer, leg: number): [number, number] {
  const rng = artRng(mixSeed(w.seed, leg));
  return [w.x + rng.range(0.12, 0.88), w.y + rng.range(0.12, 0.88)];
}

const mod = (a: number, b: number) => ((a % b) + b) % b;
