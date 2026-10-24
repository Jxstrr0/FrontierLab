// Deterministic math (src/sim/detmath.ts): close to Math everywhere, and
// bit-identical across engines because it only uses + − × ÷ and sqrt.
import { describe, expect, it } from 'vitest';
import { dcos, dexp, dlog, dpow, dtanh } from '../../src/sim/detmath';

const near = (a: number, b: number, rel = 1e-14) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));

describe('detmath', () => {
  it('matches Math within rounding noise', () => {
    for (let i = 0; i <= 400; i++) {
      const x = i / 400;
      near(dexp(x * 40 - 20) / Math.exp(x * 40 - 20), 1);
      near(dlog(x * 1e6 + 1e-9), Math.log(x * 1e6 + 1e-9));
      near(dpow(x * 3, 2.8), Math.pow(x * 3, 2.8), 1e-13);
      near(dcos(x * 2 * Math.PI), Math.cos(x * 2 * Math.PI));
      near(dtanh(x * 6 - 3), Math.tanh(x * 6 - 3));
    }
  });

  it('handles edges and integer powers exactly', () => {
    expect(dexp(0)).toBe(1);
    expect(dlog(1)).toBe(0);
    expect(dlog(0)).toBe(-Infinity);
    expect(dpow(1.5, 2)).toBe(2.25);
    expect(dpow(2, -3)).toBe(0.125);
    expect(dpow(0, 2.5)).toBe(0);
    expect(dexp(1000)).toBe(Infinity);
  });

  it('gives fixed bits for fixed inputs (portable reference values)', () => {
    expect(dexp(1)).toBe(2.7182818284590455);
    expect(dlog(10)).toBe(2.302585092994046);
    expect(dpow(0.7, 2.8)).toBe(0.36836173685852225);
  });
});
