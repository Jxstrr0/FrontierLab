import { describe, expect, it } from 'vitest';
import { hashSeed, rngFromState, stream } from '../../src/sim/rng';

const host = (seed: number) => ({ meta: { seed }, rng: {} as Record<string, number[]> });

describe('rng', () => {
  it('repeats the same sequence for the same seed and stream', () => {
    const a = stream(host(42), 'demand');
    const b = stream(host(42), 'demand');
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('keeps streams independent of each other', () => {
    const h = host(42);
    const first = stream(h, 'macro').next();
    const h2 = host(42);
    stream(h2, 'demand').next();
    stream(h2, 'demand').next();
    expect(stream(h2, 'macro').next()).toBe(first);
  });

  it('stores stream state as plain numbers so saves can carry it', () => {
    const h = host(7);
    stream(h, 'x').next();
    expect(h.rng.x).toHaveLength(4);
    expect(h.rng.x!.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
  });

  it('produces sensible distributions', () => {
    const r = rngFromState(hashSeed(1, 'dist'));
    let sum = 0;
    let pois = 0;
    const ints = new Set<number>();
    const n = 20000;
    for (let i = 0; i < n; i++) {
      sum += r.normal(5, 2);
      pois += r.poisson(3);
      ints.add(r.int(1, 3));
    }
    expect(sum / n).toBeCloseTo(5, 1);
    expect(pois / n).toBeCloseTo(3, 1);
    expect([...ints].sort()).toEqual([1, 2, 3]);
  });
});
