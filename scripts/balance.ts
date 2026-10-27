// Headless multi-year balance run (SIMULATION §25).
//   npm run balance -- --years 5 --seed 42 --strategy steady --city cal
//     [--difficulty normal] [--competitors 3] [--cash 750000]
//   npm run balance -- --years 5 --seeds 1-20   (steady first branch, median city)
// Prints a yearly company table, the steady first branch's checkpoints, the
// strategy's own targets (strategyTargets.ts), and a warning for every target
// out of range. Branch revenue and income checkpoints that land in
// a recession or the 26 weeks after it read "n/a" (§25: they assume Expansion).
// With --seeds, it runs steady once per seed and checks the first-branch bands
// against the median city (branchCheckpoints.ts).
import { branchArr, companyArr } from '../src/sim/arr';
import { balanceSheet } from '../src/sim/balanceSheet';
import { advanceWeeks } from '../src/sim/engine';
import { newGame } from '../src/sim/newGame';
import type { Difficulty } from '../src/data/types';
import type { GameState } from '../src/sim/state';
import { hqStaff } from '../src/sim/hq';
import { summarize } from '../src/sim/ledger';
import { founderStake } from '../src/sim/shares';
import { nominalIndex } from '../src/sim/nominal';
import { branchCheckpoints, medianMetrics, type BranchMetrics } from './branchCheckpoints';
import { STRATEGIES } from './strategies';
import { emptyLog, logWeek, nearRecession, strategyChecks, type Check } from './strategyTargets';

interface Args {
  years: number;
  seed: number;
  strategy: string;
  city: string;
  difficulty: Difficulty;
  competitors?: number;
  cash?: number;
  /** --seeds a-b: run steady once per seed and judge the median first branch. */
  seeds?: [number, number];
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    years: 5,
    seed: 42,
    strategy: 'steady',
    city: 'cal',
    difficulty: 'normal',
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]?.replace(/^--/, '');
    const val = argv[i + 1];
    if (!key || val === undefined) continue;
    if (key === 'years') args.years = Number(val);
    if (key === 'seed') args.seed = Number(val);
    if (key === 'strategy') args.strategy = val;
    if (key === 'city') args.city = val;
    if (key === 'difficulty') args.difficulty = val as Difficulty;
    if (key === 'competitors') args.competitors = Number(val);
    if (key === 'cash') args.cash = Number(val);
    if (key === 'seeds') {
      const [a, b = a] = val.split('-').map(Number);
      args.seeds = [a!, b!];
    }
  }
  return args;
}

const M = (x: number) => `${(x / 1e6).toFixed(1)}M`;
const K = (x: number) => `${(x / 1e3).toFixed(1)}k`;
const P = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Lowest HQ coverage k′ across departments (1 in founder mode). */
function minCoverage(state: GameState): number {
  return Math.min(...Object.values(state.hq.coverage).map((c) => c.kPrime));
}

/** Weeks after a recession during which branch earnings checkpoints don't apply. */
const RECESSION_GRACE_WEEKS = 26;

/** One headless run: the yearly table rows, the first branch's metrics and company checks. */
function simulate(args: Args) {
  const strategy = STRATEGIES[args.strategy];
  if (!strategy)
    throw new Error(
      `Unknown strategy ${args.strategy}. Try: ${Object.keys(STRATEGIES).join(', ')}`,
    );
  const state = newGame({
    seed: args.seed,
    cityId: args.city,
    difficulty: args.difficulty,
    competitors: args.competitors,
    startCash: args.cash,
  });
  const cash0 = state.company.cash;
  strategy.setup(state);
  const first = Object.values(state.branches)[0];
  const buildSpend = cash0 - state.company.cash;

  let positiveWeek: number | undefined;
  let paybackWeek: number | undefined;
  let cumIncome = 0;
  const at: BranchMetrics['at'] = {};
  const rows: string[] = [];
  const weeks = args.years * 52;
  let minCash = Infinity;
  let maxIdentityGap = 0;
  const yearly = { ni: 0, rev: 0, gross: 0, losses: 0, loans: 0, equity: 0, n: 0 };
  const log = emptyLog();

  for (let w = 1; w <= weeks; w++) {
    advanceWeeks(state, 1);
    strategy.weekly(state);
    const bs = balanceSheet(state);
    minCash = Math.min(minCash, state.company.cash);
    maxIdentityGap = Math.max(maxIdentityGap, Math.abs(bs.equity - bs.expectedEquity));
    const snap = state.history.weekly.at(-1)!;
    const sum = summarize(snap.pnl);
    logWeek(log, state, sum.netIncome);
    yearly.ni += sum.netIncome;
    yearly.rev += sum.revenue;
    yearly.gross += sum.grossProfit;
    yearly.losses += sum.loanLosses;
    yearly.loans += bs.loans;
    yearly.equity += bs.equity;
    yearly.n += 1;

    if (first && first.status === 'open') {
      const row = first.pnl.at(-1);
      if (row && row.week === state.clock.week) {
        cumIncome += row.income;
        if (positiveWeek === undefined && row.income > 0) positiveWeek = w;
        if (paybackWeek === undefined && cumIncome >= buildSpend)
          paybackWeek = w - (first.openedWeek ?? 0);
        // Revenue and income use a 4-week average so one large default doesn't swing a checkpoint.
        const recent = first.pnl.slice(-4);
        const avg = (f: (r: (typeof recent)[number]) => number) =>
          recent.reduce((t, r) => t + f(r), 0) / recent.length;
        // §25: checkpoints are in start-of-game money, so deflate by the nominal index (§4.6).
        const level = nominalIndex(state, first.cityId);
        at[w] = {
          arr: branchArr(state, first) / level,
          cust: first.customers,
          rev: avg((r) => r.revenue) / level,
          inc: avg((r) => r.income) / level,
        };
      }
    }

    if (w % 52 === 0) {
      const n = yearly.n;
      const country = Object.values(state.world.countries)[0]!;
      rows.push(
        [
          String(w / 52).padStart(4),
          String(Object.keys(state.branches).length).padStart(8),
          M(companyArr(state)).padStart(9),
          M(bs.loans).padStart(9),
          M(bs.equity).padStart(8),
          P(state.company.safetyRatio).padStart(7),
          P(yearly.gross / Math.max(1, yearly.rev)).padStart(6),
          P(yearly.losses / Math.max(1, yearly.loans / n)).padStart(6),
          P(yearly.ni / Math.max(1, yearly.equity / n)).padStart(7),
          M(state.company.cash).padStart(8),
          state.company.tier.padStart(10),
          `${(country.policyRate * 100).toFixed(2)}% ${country.phase}`.padStart(18),
          String(hqStaff(state)).padStart(6),
          P(minCoverage(state)).padStart(7),
          country.nominal.toFixed(2).padStart(6),
        ].join(' '),
      );
      Object.assign(yearly, { ni: 0, rev: 0, gross: 0, losses: 0, loans: 0, equity: 0, n: 0 });
    }
  }

  const metrics: BranchMetrics = {
    buildSpend,
    positiveWeek,
    paybackWeek,
    at,
    exempt: (wk) => nearRecession(log, wk, RECESSION_GRACE_WEEKS),
  };
  return { state, strategy, rows, metrics, minCash, maxIdentityGap, log };
}

const print = (title: string, list: Check[]) => {
  console.log(`\n${title}`);
  for (const c of list)
    console.log(
      `  ${c.ok ? '✓' : '✗'} ${c.label.padEnd(30)} ${c.value.padStart(10)}   target ${c.target}`,
    );
};

function run(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.seeds) return runPanel(args, args.seeds);
  const { state, strategy, rows, metrics, minCash, maxIdentityGap, log } = simulate(args);
  console.log(
    `Frontier Lab balance — strategy ${strategy.name}, seed ${args.seed}, city ${args.city}, ` +
      `${args.difficulty}, ${state.meta.competitors} competitors, ${args.years} years\n`,
  );
  console.log(
    'Year Branches       ARR     Loans   Equity  Safety     GM   Loss     ROE     Cash       Tier       Policy HQ ppl  Min k′  Index',
  );
  for (const r of rows) console.log(r);

  // §25: the branch checkpoints read the steady strategy's first branch only.
  const branchChecks = strategy.name === 'steady';
  const checks: Check[] = branchChecks ? branchCheckpoints(metrics) : [];
  checks.push({
    label: 'Corporate cash never < 0',
    value: K(minCash),
    ok: minCash >= 0,
    target: '≥ 0',
  });
  // §25 "IPO eligible (steady): years 3–6": the week the IPO listed (steady lists as soon as eligible).
  const listed = state.stock.listedWeek;
  if (strategy.name === 'steady' && args.years >= 6) {
    checks.push({
      label: 'IPO listed (week)',
      value: listed === undefined ? '—' : String(listed),
      ok: inRange(listed, 104, 312),
      target: 'years 3–6 (weeks 104–312)',
    });
  }
  console.log(
    `\nEquity: ${state.stock.placements.length} placement(s), ` +
      (listed === undefined
        ? 'not listed'
        : `listed week ${listed} (year ${Math.floor(listed / 52) + 1}) as ${state.stock.ticker}`) +
      `, founder stake ${P(founderStake(state))}, share price ${state.stock.price.toFixed(2)}`,
  );
  const byCity = new Map<string, number>();
  for (const b of Object.values(state.branches))
    byCity.set(b.cityId, (byCity.get(b.cityId) ?? 0) + 1);
  console.log(
    `Branches by city: ${[...byCity].map(([id, n]) => `${id} ${n}`).join(', ')}; ` +
      `${state.world.travel.flights} flight(s); total assets ${M(balanceSheet(state).assets)}`,
  );
  const dcs = Object.values(state.dataCenters);
  if (dcs.length > 0) {
    console.log(
      `Data centers: ${dcs.map((d) => `${d.name} (${d.status}, from week ${d.builtWeek})`).join(', ')}`,
    );
  }
  checks.push({
    label: 'Balance identity gap',
    value: maxIdentityGap.toFixed(4),
    ok: maxIdentityGap < 1,
    target: '< $1',
  });

  const own = strategyChecks(
    strategy.name,
    {
      seed: args.seed,
      cityId: args.city,
      difficulty: args.difficulty,
      competitors: args.competitors,
      startCash: args.cash,
    },
    log,
  );
  print(branchChecks ? 'First-branch checkpoints (SIMULATION §25)' : 'Company checks', checks);
  if (own.length) print(`Strategy targets: ${strategy.name} (SIMULATION §25)`, own);
  const bad = [...checks, ...own].filter((c) => !c.ok);
  console.log(bad.length ? `\n${bad.length} warning(s).` : '\nAll checkpoints in range.');
  if (branchChecks)
    console.log(
      'First-branch bands describe a typical city; one seed can sit outside them. ' +
        'Judge them with --seeds 1-20 (the median city).',
    );
}

/** --seeds: steady once per seed, a line per seed, then the bands against the median city. */
function runPanel(args: Args, [from, to]: [number, number]): void {
  const runs: BranchMetrics[] = [];
  let worstGap = 0;
  let worstCash = Infinity;
  console.log(
    `Frontier Lab balance — steady first branch, seeds ${from}–${to}, city ${args.city}, ` +
      `${args.difficulty}, ${args.years} years\n`,
  );
  console.log('Seed   Wk52 ARR  Wk104 ARR  Wk208 ARR  Wk156 inc  Payback  Misses');
  for (let seed = from; seed <= to; seed++) {
    const r = simulate({ ...args, seed, strategy: 'steady' });
    runs.push(r.metrics);
    worstGap = Math.max(worstGap, r.maxIdentityGap);
    worstCash = Math.min(worstCash, r.minCash);
    const a = r.metrics.at;
    const cell = (x: number | undefined, f: (n: number) => string) =>
      (x === undefined ? '—' : f(x)).padStart(10);
    const misses = branchCheckpoints(r.metrics).filter((c) => !c.ok).length;
    console.log(
      [
        String(seed).padStart(4),
        cell(a[52]?.arr, M),
        cell(a[104]?.arr, M),
        cell(a[208]?.arr, M),
        cell(a[156]?.inc, K),
        String(r.metrics.paybackWeek ?? '—').padStart(8),
        String(misses).padStart(7),
      ].join(' '),
    );
  }
  const checks = branchCheckpoints(medianMetrics(runs));
  checks.push(
    {
      label: 'Corporate cash never < 0',
      value: K(worstCash),
      ok: worstCash >= 0,
      target: '≥ 0 (every seed)',
    },
    {
      label: 'Balance identity gap',
      value: worstGap.toFixed(4),
      ok: worstGap < 1,
      target: '< $1 (every seed)',
    },
  );
  print(`First-branch checkpoints, median of ${runs.length} cities (SIMULATION §25)`, checks);
  const bad = checks.filter((c) => !c.ok);
  console.log(bad.length ? `\n${bad.length} warning(s).` : '\nAll checkpoints in range.');
}

const inRange = (x: number | undefined, lo: number, hi: number) =>
  x !== undefined && x >= lo && x <= hi;

run();
