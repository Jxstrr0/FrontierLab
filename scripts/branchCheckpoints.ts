// The steady strategy's first-branch checkpoints (SIMULATION §25): the numbers
// one run measures on its first branch, the checks against the §25 bands, and
// the median across a panel of seeds. The bands describe a typical city; one
// city's "average lot" can sit well above or below it, so `--seeds` judges the
// median city rather than any single seed.
import type { Check } from './strategyTargets';

/** The first branch at one week: balances, customers and 4-week average earnings. */
export interface BranchSnap {
  dep: number;
  loans: number;
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
  /** Whether a week's earnings and loan-ratio checks are excused by a recession. */
  exempt: (week: number) => boolean;
}

/** Weeks with deposit, customer and earnings checkpoints. */
export const CHECK_WEEKS = [26, 52, 104, 156, 208, 260] as const;

/** §25 home-office bands from year 2 (C2a): [low, high] deposits, revenue and income a week. */
const OFFICE_BANDS: Record<
  number,
  { dep: [number, number]; rev: [number, number]; inc: [number, number] }
> = {
  104: { dep: [70e6, 180e6], rev: [160e3, 380e3], inc: [55e3, 140e3] },
  156: { dep: [110e6, 260e6], rev: [250e3, 520e3], inc: [85e3, 190e3] },
  208: { dep: [140e6, 340e6], rev: [320e3, 700e3], inc: [110e3, 260e3] },
  260: { dep: [140e6, 360e6], rev: [320e3, 720e3], inc: [110e3, 260e3] },
};

const M = (x: number) => `${(x / 1e6).toFixed(1)}M`;
const K = (x: number) => `${(x / 1e3).toFixed(1)}k`;
const P = (x: number) => `${(x * 100).toFixed(1)}%`;
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
        label: 'Week 26 deposits',
        value: M(w26.dep),
        ok: inRange(w26.dep, 15e6, 30e6),
        target: '$15–30M',
      },
      { label: 'Week 26 income', value: K(w26.inc), ok: w26.inc > 0, target: 'positive' },
    );
  }
  const w52 = m.at[52];
  if (w52) {
    checks.push(
      {
        label: 'Week 52 deposits',
        value: M(w52.dep),
        ok: inRange(w52.dep, 35e6, 80e6),
        target: '$35–80M',
      },
      {
        label: 'Week 52 loans / deposits',
        value: P(w52.loans / w52.dep),
        ok: inRange(w52.loans / w52.dep, 0.65, 0.9),
        target: '65–90%',
      },
      {
        label: 'Week 52 customers',
        value: String(Math.round(w52.cust)),
        ok: inRange(w52.cust, 3500, 8000),
        target: '3,500–8,000',
      },
      {
        label: 'Week 52 income / week',
        value: K(w52.inc),
        ok: inRange(w52.inc, 25e3, 60e3),
        target: '$25–60k',
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
      label: `Week ${wk} deposits`,
      value: M(s.dep),
      ok: inRange(s.dep, band.dep[0], band.dep[1]),
      target: `$${band.dep[0] / 1e6}–${band.dep[1] / 1e6}M`,
    });
    checks.push(
      na(
        {
          label: `Week ${wk} loans / deposits`,
          value: P(s.loans / s.dep),
          ok: inRange(s.loans / s.dep, 0.65, 0.9),
          target: '65–90%',
        },
        wk,
      ),
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
    ok: inRange(m.paybackWeek, 1, 40),
    target: '≤ 40 weeks',
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
 * The median city: every checkpoint is the median across runs. Earnings and
 * loan ratios at a week only count runs that week isn't excused for; if every
 * run is excused, the week reads n/a.
 */
export function medianMetrics(runs: BranchMetrics[]): BranchMetrics {
  const at: Record<number, BranchSnap> = {};
  const excused = new Set<number>();
  for (const wk of CHECK_WEEKS) {
    const snaps = runs.map((r) => r.at[wk]).filter((s): s is BranchSnap => !!s);
    if (snaps.length === 0) continue;
    const live = runs.filter((r) => r.at[wk] && !r.exempt(wk)).map((r) => r.at[wk]!);
    if (live.length === 0) excused.add(wk);
    const dep = median(snaps.map((s) => s.dep))!;
    const ratio = median(live.map((s) => s.loans / s.dep)) ?? 0;
    at[wk] = {
      dep,
      loans: ratio * dep,
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
