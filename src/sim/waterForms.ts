// The shape of each layout-2 water form (data/cityLooks.ts WaterForm) as a test
// "is canonical point (u, v) water?". Canonical space puts the main water toward
// high v; cityGeo.ts turns and mirrors it per city and samples it at tile
// centres. Pure and deterministic (detmath trig), so the sim and the art agree.
// Every number lives in config/cityGeo.ts WATER_SHAPES.
import { WATER_SHAPES as W } from '../config/cityGeo';
import type { CityLook, WaterForm } from '../data/cityLooks';
import { clamp } from './math';
import { dcos } from './detmath';

const TWO_PI = 6.283185307179586;

/** Per-city variation: grid size and three stable 0–1 phases from the city id. */
export interface FormContext {
  tiles: number;
  phase: readonly [number, number, number];
}

/** Turns canonical (u, v) by the look's quarter turns, then mirrors (data/cityLooks.ts). */
export function toActual(look: CityLook, u: number, v: number): [number, number] {
  let [a, b] = [u, v];
  for (let k = 0; k < look.arrange.turn; k++) [a, b] = [1 - b, a];
  return look.arrange.mirror ? [1 - a, b] : [a, b];
}

/** Turns and mirrors an offset (dx, dy) like toActual turns a point. */
export function turnOffset(arrange: CityLook['arrange'], dx: number, dy: number): [number, number] {
  let [a, b] = [dx, dy];
  for (let k = 0; k < arrange.turn; k++) [a, b] = [-b, a];
  return arrange.mirror ? [-a, b] : [a, b];
}

/** The inverse of toActual. */
export function toCanonical(look: CityLook, u: number, v: number): [number, number] {
  let [a, b] = look.arrange.mirror ? [1 - u, v] : [u, v];
  for (let k = 0; k < look.arrange.turn; k++) [a, b] = [b, 1 - a];
  return [a, b];
}

/** A stable 0–1 number from a string (city id plus a salt). */
export function phaseOf(text: string): number {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 131 + text.charCodeAt(i)) % 100003;
  return h / 100003;
}

/** A cosine wave across t ∈ [0, 1]. */
const wave = (t: number, waves: number, phase: number) => dcos(TWO_PI * (waves * t + phase));

/** A parabolic bump of height 1 at t = at, falling to 0 at ± width. */
const bump = (t: number, at: number, width: number) =>
  Math.max(0, 1 - ((t - at) / width) * ((t - at) / width));

/** River widths in tiles scale with the grid, within a range. */
const widthFor = (tiles: number, perTile: number, range: readonly [number, number]) =>
  clamp(tiles * perTile, range[0], range[1]);

/** True when a band of `width` tiles centred on `at` (fractions) covers t. */
const inBand = (t: number, at: number, width: number, tiles: number) =>
  Math.abs(t - at) * tiles < width / 2;

/** A value inside a [lo, hi] range picked by a 0–1 phase. */
const pick = (range: readonly [number, number], p: number) => range[0] + (range[1] - range[0]) * p;
/** A signed shift of ± jitter / 2 picked by a 0–1 phase. */
const shift = (jitter: number, p: number) => (p - 0.5) * jitter;

export function canonicalWater(form: WaterForm, u: number, v: number, k: FormContext): boolean {
  const n = k.tiles;
  const [p1, p2, p3] = k.phase;
  switch (form) {
    case 'none':
      return false;
    case 'coast': {
      const s = W.coast;
      const cove = s.coveDepth * bump(u, pick(s.coveAt, p2), s.coveWidth);
      return v > s.shore + s.amp * wave(u, s.waves, p1) - cove;
    }
    case 'river': {
      const s = W.river;
      const waves = s.waves * pick(s.wavesJitter, p3);
      const c = s.centre + s.amp * wave(u, waves, p1) + s.amp2 * wave(u, s.waves2, p2);
      return inBand(v, c, widthFor(n, s.widthPerTile, s.width), n);
    }
    case 'twinRivers': {
      const s = W.twinRivers;
      const taper = s.taper * v * v;
      const west = s.west.at + taper + s.west.amp * wave(v, s.west.waves, p1);
      const east = s.east.at - taper + s.east.amp * wave(v, s.east.waves, p2);
      if (inBand(u, west, s.west.width, n) || inBand(u, east, s.east.width, n)) return true;
      return v > s.harbour + s.harbourAmp * wave(u, s.harbourWaves, p3);
    }
    case 'bay': {
      const s = W.bay;
      const du = u - s.centre[0];
      const dv = v - s.centre[1];
      const r = s.radius + s.radiusAmp * wave(u + v, s.radiusWaves, p1);
      const inBay = du * du + dv * dv < r * r || v > s.ocean;
      // A finger of land pointing into the bay along the diagonal.
      const finger =
        Math.abs(u - v - shift(s.fingerJitter, p2)) < s.peninsulaHalfWidth &&
        u + v > s.peninsulaFrom &&
        u + v < s.peninsulaTo;
      return inBay && !finger;
    }
    case 'lake': {
      const s = W.lake;
      if (v > s.shore + s.amp * wave(u, s.waves, p1)) return true;
      const f = s.feeder;
      const at = pick(f.from, p2) + f.slope * v + f.amp * wave(v, f.waves, p3);
      return inBand(u, at, f.width, n);
    }
    case 'harbour': {
      const s = W.harbour;
      const c = s.centre + s.amp * wave(u, s.waves, p1);
      const w = widthFor(n, s.widthPerTile, s.width) + s.narrows * wave(u, s.narrowsWaves, p2);
      if (inBand(v, c, w, n)) return true;
      // Two coves reaching inland from the near shore.
      const top = c - w / 2 / n;
      return s.coves.some(
        (at, i) =>
          inBand(u, at + shift(s.coveJitter, p3), s.coveWidth, n) &&
          v < top + s.coveOverlap &&
          v > top - s.coveLengths[i]!,
      );
    }
    case 'canals': {
      const s = W.canals;
      if (v > s.mouth + s.mouthAmp * wave(u, s.mouthWaves, p1)) return true;
      // The ring canals are carved on the street grid (cityGeoMasks.carveCanals).
      const rd = s.radial;
      return inBand(u, rd.at + rd.amp * wave(v, rd.waves, p2), rd.width, n);
    }
    case 'islands': {
      const s = W.islands;
      if (v > islandShore(u, k)) return true;
      const r = s.river;
      if (inBand(u, r.at + r.amp * wave(v, r.waves, p2), r.width, n)) return true;
      // A straight canal from the river to the near edge.
      return u < r.at && inBand(v, s.canal.at + shift(s.canal.jitter, p3), s.canal.width, n);
    }
  }
}

/** The islands form's shore at canonical u: its bay lies beyond (higher v). */
export function islandShore(u: number, k: FormContext): number {
  const s = W.islands;
  return s.shore + s.amp * wave(u, s.waves, k.phase[0]);
}
