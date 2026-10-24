// Seeded randomness (SIMULATION §3): sfc32 with one stream per system, each
// seeded from hash(saveSeed, streamName). Stream state lives in GameState.rng,
// so the same seed plus the same commands always gives the same game.
import { dcos, dexp, dlog } from './detmath';

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [a, b). */
  range(a: number, b: number): number;
  /** Integer in [a, b], inclusive. */
  int(a: number, b: number): number;
  chance(p: number): boolean;
  normal(mu: number, sigma: number): number;
  lognormal(median: number, sigma: number): number;
  poisson(lambda: number): number;
  pick<T>(items: readonly T[]): T;
  pickWeighted<T>(items: readonly { item: T; weight: number }[]): T;
}

interface RngHost {
  meta: { seed: number };
  rng: Record<string, number[]>;
}

/** cyrb128 string hash → four 32-bit seeds. */
export function hashSeed(seed: number, name: string): number[] {
  const str = `${seed}:${name}`;
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** One sfc32 step; mutates the 4-word state in place. */
function sfc32(s: number[]): number {
  let a = s[0]! | 0,
    b = s[1]! | 0,
    c = s[2]! | 0,
    d = s[3]! | 0;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  s[0] = a >>> 0;
  s[1] = b >>> 0;
  s[2] = c >>> 0;
  s[3] = d >>> 0;
  return (t >>> 0) / 4294967296;
}

/** Wraps a raw 4-word state with the helper methods. */
export function rngFromState(s: number[]): Rng {
  const next = () => sfc32(s);
  const rng: Rng = {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    chance: (p) => next() < p,
    normal: (mu, sigma) => {
      // Box–Muller with two fresh draws (no cached spare, so state stays plain data).
      const u = 1 - next();
      const v = next();
      return mu + sigma * Math.sqrt(-2 * dlog(u)) * dcos(2 * Math.PI * v);
    },
    lognormal: (median, sigma) => median * dexp(rng.normal(0, sigma)),
    poisson: (lambda) => {
      if (lambda <= 0) return 0;
      if (lambda >= 30) return Math.max(0, Math.round(rng.normal(lambda, Math.sqrt(lambda))));
      // Knuth's method.
      const limit = dexp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= next();
      } while (p > limit);
      return k - 1;
    },
    pick: (items) => items[Math.floor(next() * items.length)]!,
    pickWeighted: (items) => {
      const total = items.reduce((sum, it) => sum + Math.max(0, it.weight), 0);
      let roll = next() * total;
      for (const it of items) {
        roll -= Math.max(0, it.weight);
        if (roll < 0) return it.item;
      }
      return items[items.length - 1]!.item;
    },
  };
  return rng;
}

/** The named stream for this game, created on first use from the save seed. */
export function stream(state: RngHost, name: string): Rng {
  let s = state.rng[name];
  if (!s) {
    s = hashSeed(state.meta.seed, name);
    state.rng[name] = s;
  }
  return rngFromState(s);
}
