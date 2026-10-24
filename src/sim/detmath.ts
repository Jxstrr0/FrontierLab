// Deterministic transcendental functions for the simulation (CLAUDE.md
// non-negotiable 4). JavaScript engines may compute Math.exp, Math.log,
// Math.pow, Math.cos and friends differently — Node 22 and Node 24 already
// disagree on Math.pow — so the same seed could drift between browsers or
// versions. These versions use only + − × ÷ and Math.sqrt, which IEEE 754
// requires to be exactly rounded everywhere. Accuracy is about 1e-15 relative.
// ESLint bans the Math versions inside src/sim.

const LN2_HI = 6.9314718036912381649e-1;
const LN2_LO = 1.90821492927058770002e-10;
const INV_LN2 = 1.442695040888963387;
const TWO_PI = 6.283185307179586;
const HALF_PI = 1.5707963267948966;

const view = new DataView(new ArrayBuffer(8));

/** 2^k for an integer k, built from the exponent bits (exact). */
function pow2(k: number): number {
  if (k > 1023) return pow2(1023) * pow2(k - 1023);
  if (k < -1022) return pow2(-1022) * pow2(k + 1022);
  view.setUint32(0, (k + 1023) << 20);
  view.setUint32(4, 0);
  return view.getFloat64(0);
}

/** e^x. */
export function dexp(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.78) return Infinity;
  if (x < -745.13) return 0;
  // Cody–Waite reduction: x = k·ln2 + r with |r| ≤ ln2 / 2.
  const k = Math.round(x * INV_LN2);
  const r = x - k * LN2_HI - k * LN2_LO;
  // Taylor series of e^r in Horner form; |r| ≤ 0.347 so 15 terms are plenty.
  let p = 1;
  for (let n = 15; n >= 1; n--) p = 1 + (p * r) / n;
  return p * pow2(k);
}

/** Natural logarithm. */
export function dlog(x: number): number {
  if (Number.isNaN(x) || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  // Split x = m · 2^e with m in [√½, √2).
  let e = 0;
  let m = x;
  if (m < 2.2250738585072014e-308) {
    m *= 18014398509481984; // 2^54, lifts subnormals into the normal range
    e -= 54;
  }
  view.setFloat64(0, m);
  const hi = view.getUint32(0);
  e += ((hi >>> 20) & 0x7ff) - 1023;
  view.setUint32(0, (hi & 0x800fffff) | (1023 << 20));
  m = view.getFloat64(0);
  if (m > Math.SQRT2) {
    m /= 2;
    e += 1;
  }
  // log(m) = 2·atanh(s), s = (m − 1)/(m + 1), |s| ≤ 0.172.
  const s = (m - 1) / (m + 1);
  const s2 = s * s;
  let series = 0;
  for (let n = 25; n >= 3; n -= 2) series = s2 * (1 / n + series);
  const logm = 2 * s + 2 * s * series;
  return e * LN2_HI + (logm + e * LN2_LO);
}

/** base^exponent. Integer exponents multiply exactly; others use e^(y·ln x). */
export function dpow(base: number, exponent: number): number {
  if (Number.isInteger(exponent) && Math.abs(exponent) <= 4096) {
    let result = 1;
    let b = base;
    let n = Math.abs(exponent);
    while (n > 0) {
      if (n & 1) result *= b;
      b *= b;
      n >>= 1;
    }
    return exponent < 0 ? 1 / result : result;
  }
  if (base === 0) return exponent > 0 ? 0 : Infinity;
  if (base < 0) return NaN;
  return dexp(exponent * dlog(base));
}

/** Hyperbolic tangent. */
export function dtanh(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e2 = dexp(2 * x);
  return (e2 - 1) / (e2 + 1);
}

/** sin and cos of a reduced angle |r| ≤ π/4, by Taylor series. */
function sinCore(r: number): number {
  const r2 = r * r;
  let p = 0;
  for (let n = 19; n >= 3; n -= 2) p = (r2 / (n * (n - 1))) * (1 - p);
  return r * (1 - p);
}
function cosCore(r: number): number {
  const r2 = r * r;
  let p = 0;
  for (let n = 20; n >= 2; n -= 2) p = (r2 / (n * (n - 1))) * (1 - p);
  return 1 - p;
}

/** Cosine, for moderate arguments (the simulation only needs [0, 2π)). */
export function dcos(x: number): number {
  let a = Math.abs(x) % TWO_PI;
  // Quadrant reduction to |r| ≤ π/4.
  const q = Math.round(a / HALF_PI);
  a -= q * HALF_PI;
  switch (((q % 4) + 4) % 4) {
    case 0:
      return cosCore(a);
    case 1:
      return -sinCore(a);
    case 2:
      return -cosCore(a);
    default:
      return sinCore(a);
  }
}

/** Euclidean distance; sqrt is exactly rounded everywhere. */
export const dhypot = (x: number, y: number) => Math.sqrt(x * x + y * y);
