// Small seeded random numbers for procedural art (never Math.random, so a city
// looks the same every session). Separate from the simulation's RNG streams so
// drawing never disturbs game state.

/** FNV-1a hash of a string to a 32-bit unsigned integer. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mixes integers into one 32-bit seed. */
export function mixSeed(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h = Math.imul(h ^ (p >>> 0), 0x85ebca6b);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

export interface ArtRng {
  /** 0 ≤ n < 1 */
  next(): number;
  range(lo: number, hi: number): number;
  int(lo: number, hi: number): number;
  chance(p: number): boolean;
}

/** mulberry32. */
export function artRng(seed: number): ArtRng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: (p) => next() < p,
  };
}
