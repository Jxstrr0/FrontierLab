// The steady strategy's first-branch checkpoints (SIMULATION §25): the numbers
// one run measures on its first branch, the checks against the §25 bands, and
// the median across a panel of seeds. The bands describe a typical city; one
// city's "average lot" can sit well above or below it, so `--seeds` judges the
// median city rather than any single seed.
import type { Check } from './strategyTargets';

/** The first office at one week: ARR, customers and 4-week average earnings. */
export interface BranchSnap {
  arr: number;
  cust: number;
  rev: number;
  inc: number;
}

/** What one run measured on its first branch. */
export interface BranchMetrics {
  buildSpend: number;
  positiveWeek?: number;
  paybackWeek?: number;
  at: Record<number, BranchSnap>;
  /** Whether a week's earnings checks are excused by a recession. */
  exempt: (week: number) => boolean;
}

/** Weeks with ARR, customer and earnings checkpoints. */
export const CHECK_WEEKS = [26, 52, 104, 156, 208, 260] as const;

/** §25 home-office bands from year 2 (C2a, C3a): [low, high] ARR, revenue and income a week. */
const OFFICE_BANDS: Record<
  number,
  { arr: [number, number]; rev: [number, number]; inc: [number, number] }
> = {
  104: { arr: [8e6, 20e6], rev: [160e3, 380e3], inc: [55e3, 140e3] },
  // C8f: income ceilings raised for the all-spendable seed's lasting head start.
  156: { arr: [12e6, 28e6], rev: [250e3, 520e3], inc: [85e3, 230e3] },
  208: { arr: [16e6, 36e6], rev: [320e3, 700e3], inc: [110e3, 340e3] },
  260: { arr: [16e6, 38e6], rev: [320e3, 720e3], inc: [110e3, 360e3] },
};

/** §25 first-year ARR bands (C3a; raised in C8f for the $1.5M all-spendable seed). */
const W26_ARR: [number, number] = [1.5e6, 5e6];
const W52_ARR: [number, number] = [3e6, 8e6];

const M = (x: number) => `${(x / 1e6).toFixed(1)}M`;
const K = (x: number) => `${(x / 1e3).toFixed(1)}k`;
const inRange = (x: number | undefined, lo: number, hi: number) =>
  x !== undefined && x >= lo && x <= hi;

/** The §25 first-branch checks for one run's (or the median's) metrics. */
export function branchCheckpoints(m: BranchMetrics): Check[] {
  const checks: Check[] = [];
  const na = (c: Check, wk: number): Check =>
    m.exempt(wk) ? { ...c, value: 'n/a', ok: true, target: `${c.target} (recession)` } : c;
  checks.push({
    label: 'First branch build + deposit',
    value: K(m.buildSpend),
    ok: inRange(m.buildSpend, 300e3, 450e3),
    target: '$300k–$450k',
  });
  checks.push({
    label: 'First week income positive',
    value: String(m.positiveWeek ?? '—'),
    ok: inRange(m.positiveWeek, 6, 16),
    target: 'week 6–16',
  });
  const w26 = m.at[26];
  if (w26) {
    checks.push(
      {
        label: 'Week 26 ARR',
        value: M(w26.arr),
        ok: inRange(w26.arr, W26_ARR[0], W26_ARR[1]),
        target: `$${W26_ARR[0] / 1e6}–${W26_ARR[1] / 1e6}M`,
      },
      { label: 'Week 26 income', value: K(w26.inc), ok: w26.inc > 0, target: 'positive' },
    );
  }
  const w52 = m.at[52];
  if (w52) {
    checks.push(
      {
        label: 'Week 52 ARR',
        value: M(w52.arr),
        ok: inRange(w52.arr, W52_ARR[0], W52_ARR[1]),
        target: `$${W52_ARR[0] / 1e6}–${W52_ARR[1] / 1e6}M`,
      },
      {
        label: 'Week 52 customers',
        value: String(Math.round(w52.cust)),
        // §25 (balance fix): a Team seat now earns a margin, so the office sells a little more.
        ok: inRange(w52.cust, 3500, 9500),
        target: '3,500–9,500',
      },
      {
        label: 'Week 52 income / week',
        value: K(w52.inc),
        ok: inRange(w52.inc, 24e3, 65e3),
        target: '$24–65k',
      },
    );
  }
  for (const wk of [104, 156, 208, 260]) {
    const s = m.at[wk];
    if (!s) continue;
    // §25 (C2a): the home office grows a size at a time once HQ is up, so its
    // bands climb to week 208 and then level off as the city fills (§9.2).
    // Set from the 20-city median on 2026-10-26.
    const band = OFFICE_BANDS[wk]!;
    checks.push({
      label: `Week ${wk} ARR`,
      value: M(s.arr),
      ok: inRange(s.arr, band.arr[0], band.arr[1]),
      target: `$${band.arr[0] / 1e6}–${band.arr[1] / 1e6}M`,
    });
    checks.push(
      na(
        {
          label: `Week ${wk} revenue / week`,
          value: K(s.rev),
          ok: inRange(s.rev, band.rev[0], band.rev[1]),
          target: `$${band.rev[0] / 1e3}–${band.rev[1] / 1e3}k`,
        },
        wk,
      ),
      na(
        {
          label: `Week ${wk} income / week`,
          value: K(s.inc),
          ok: inRange(s.inc, band.inc[0], band.inc[1]),
          target: `$${band.inc[0] / 1e3}–${band.inc[1] / 1e3}k`,
        },
        wk,
      ),
    );
  }
  checks.push({
    label: 'Payback from opening',
    value: String(m.paybackWeek ?? '—'),
    ok: inRange(m.paybackWeek, 1, 44),
    target: '≤ 44 weeks',
  });
  return checks;
}

/** Median of the defined values (undefined if there are none). */
export function median(xs: (number | undefined)[]): number | undefined {
  const v = xs
    .filter((x): x is number => x !== undefined && Number.isFinite(x))
    .sort((a, b) => a - b);
  if (v.length === 0) return undefined;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1]! + v[mid]!) / 2;
}

/**
 * The median city: every checkpoint is the median across runs. Earnings at a
 * week only count runs that week isn't excused for; if every run is excused,
 * the week reads n/a.
 */
export function medianMetrics(runs: BranchMetrics[]): BranchMetrics {
  const at: Record<number, BranchSnap> = {};
  const excused = new Set<number>();
  for (const wk of CHECK_WEEKS) {
    const snaps = runs.map((r) => r.at[wk]).filter((s): s is BranchSnap => !!s);
    if (snaps.length === 0) continue;
    const live = runs.filter((r) => r.at[wk] && !r.exempt(wk)).map((r) => r.at[wk]!);
    if (live.length === 0) excused.add(wk);
    at[wk] = {
      arr: median(snaps.map((s) => s.arr))!,
      cust: median(snaps.map((s) => s.cust))!,
      rev: median(live.map((s) => s.rev)) ?? 0,
      inc: median(live.map((s) => s.inc)) ?? 0,
    };
  }
  return {
    buildSpend: median(runs.map((r) => r.buildSpend)) ?? 0,
    positiveWeek: median(runs.map((r) => r.positiveWeek)),
    paybackWeek: median(runs.map((r) => r.paybackWeek)),
    at,
    exempt: (wk) => excused.has(wk),
  };
}
