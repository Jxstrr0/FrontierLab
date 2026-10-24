// Headless multi-year balance run (SIMULATION §25).
//   npm run balance -- --years 5 --seed 42 --strategy steady --city cal
//     [--difficulty normal] [--competitors 3] [--cash 750000]
// Prints a yearly company table, the steady first branch's checkpoints, the
// strategy's own targets (strategyTargets.ts), and a warning for every target
// out of range. Branch revenue, income and loan-ratio checkpoints that land in
// a recession or the 26 weeks after it read "n/a" (§25: they assume Expansion).
import { isDeposit, PRODUCTS } from '../src/data/products';
import { balanceSheet } from '../src/sim/balanceSheet';
import { advanceWeeks } from '../src/sim/engine';
import { newGame } from '../src/sim/newGame';
import type { Difficulty } from '../src/data/types';
import type { Branch, GameState } from '../src/sim/state';
import { hqStaff } from '../src/sim/hq';
import { summarize } from '../src/sim/ledger';
import { founderStake } from '../src/sim/shares';
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
  }
  return args;
}

const M = (x: number) => `${(x / 1e6).toFixed(1)}M`;
const K = (x: number) => `${(x / 1e3).toFixed(1)}k`;
const P = (x: number) => `${(x * 100).toFixed(1)}%`;

function branchDeposits(b: Branch): number {
  return Object.entries(b.books).reduce(
    (s, [p, bk]) => s + (PRODUCTS[p] && isDeposit(PRODUCTS[p]) ? bk.balance : 0),
    0,
  );
}

function branchLoans(state: GameState, b: Branch): number {
  let total = 0;
  for (const [p, bk] of Object.entries(b.books)) {
    const kind = PRODUCTS[p]?.kind;
    if (kind === 'amortizing' || kind === 'revolving' || kind === 'sbl') total += bk.balance;
  }
  return total;
}

/** Lowest HQ coverage k′ across departments (1 in founder mode). */
function minCoverage(state: GameState): number {
  return Math.min(...Object.values(state.hq.coverage).map((c) => c.kPrime));
}

/** Weeks after a recession during which branch earnings checkpoints don't apply. */
const RECESSION_GRACE_WEEKS = 26;

function run(): void {
  const args = parseArgs(process.argv.slice(2));
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
  const at: Record<number, { dep: number; loans: number; cust: number; rev: number; inc: number }> =
    {};
  const rows: string[] = [];
  const weeks = args.years * 52;
  let minCash = Infinity;
  let maxIdentityGap = 0;
  const yearly = { ni: 0, nii: 0, losses: 0, loans: 0, earning: 0, equity: 0, n: 0 };
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
    yearly.nii += sum.netInterestIncome;
    yearly.losses += sum.loanLosses;
    yearly.loans += bs.loans;
    yearly.earning += bs.loans + bs.reserves + bs.bonds;
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
        at[w] = {
          dep: branchDeposits(first),
          loans: branchLoans(state, first),
          cust: first.customers,
          rev: avg((r) => r.revenue),
          inc: avg((r) => r.income),
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
          M(bs.deposits).padStart(9),
          M(bs.loans).padStart(9),
          M(bs.equity).padStart(8),
          P(state.company.capitalRatio).padStart(7),
          P(yearly.nii / (yearly.earning / n)).padStart(6),
          P(yearly.losses / Math.max(1, yearly.loans / n)).padStart(6),
          P(yearly.ni / Math.max(1, yearly.equity / n)).padStart(7),
          M(state.company.cash).padStart(8),
          state.company.tier.padStart(10),
          `${(country.policyRate * 100).toFixed(2)}% ${country.phase}`.padStart(18),
          String(hqStaff(state)).padStart(6),
          P(minCoverage(state)).padStart(7),
        ].join(' '),
      );
      Object.assign(yearly, { ni: 0, nii: 0, losses: 0, loans: 0, earning: 0, equity: 0, n: 0 });
    }
  }

  console.log(
    `Vault Street balance — strategy ${strategy.name}, seed ${args.seed}, city ${args.city}, ` +
      `${args.difficulty}, ${state.meta.competitors} competitors, ${args.years} years\n`,
  );
  console.log(
    'Year Branches  Deposits     Loans   Equity      CR    NIM   Loss     ROE     Cash       Tier       Policy HQ ppl  Min k′',
  );
  for (const r of rows) console.log(r);

  const checks: Check[] = [];
  const branchChecks = strategy.name === 'steady';
  const exempt = (wk: number) => nearRecession(log, wk, RECESSION_GRACE_WEEKS);
  const na = (c: Check, wk: number): Check =>
    exempt(wk) ? { ...c, value: 'n/a', ok: true, target: `${c.target} (recession)` } : c;
  const inRange = (x: number | undefined, lo: number, hi: number) =>
    x !== undefined && x >= lo && x <= hi;
  checks.push({
    label: 'First branch build + deposit',
    value: K(buildSpend),
    ok: inRange(buildSpend, 300e3, 450e3),
    target: '$300k–$450k',
  });
  checks.push({
    label: 'First week income positive',
    value: String(positiveWeek ?? '—'),
    ok: inRange(positiveWeek, 6, 16),
    target: 'week 6–16',
  });
  const w26 = at[26];
  if (w26) {
    checks.push({
      label: 'Week 26 deposits',
      value: M(w26.dep),
      ok: inRange(w26.dep, 15e6, 30e6),
      target: '$15–30M',
    });
    checks.push({
      label: 'Week 26 income',
      value: K(w26.inc),
      ok: w26.inc > 0,
      target: 'positive',
    });
  }
  const w52 = at[52];
  if (w52) {
    checks.push({
      label: 'Week 52 deposits',
      value: M(w52.dep),
      ok: inRange(w52.dep, 30e6, 50e6),
      target: '$30–50M',
    });
    checks.push({
      label: 'Week 52 loans / deposits',
      value: P(w52.loans / w52.dep),
      ok: inRange(w52.loans / w52.dep, 0.75, 0.9),
      target: '75–90%',
    });
    checks.push({
      label: 'Week 52 customers',
      value: String(w52.cust),
      ok: inRange(w52.cust, 3000, 5000),
      target: '3,000–5,000',
    });
    checks.push({
      label: 'Week 52 income / week',
      value: K(w52.inc),
      ok: inRange(w52.inc, 20e3, 40e3),
      target: '$20–40k',
    });
  }
  for (const wk of [104, 156, 208, 260]) {
    const m = at[wk];
    if (!m) continue;
    checks.push({
      label: `Week ${wk} deposits`,
      value: M(m.dep),
      ok: inRange(m.dep, 40e6, 70e6),
      target: '$40–70M',
    });
    checks.push(
      na(
        {
          label: `Week ${wk} loans / deposits`,
          value: P(m.loans / m.dep),
          ok: inRange(m.loans / m.dep, 0.7, 0.9),
          target: '70–90%',
        },
        wk,
      ),
    );
    checks.push(
      na(
        {
          label: `Week ${wk} revenue / week`,
          value: K(m.rev),
          ok: inRange(m.rev, 110e3, 150e3),
          target: '$110–150k',
        },
        wk,
      ),
    );
    checks.push(
      na(
        {
          label: `Week ${wk} income / week`,
          value: K(m.inc),
          ok: inRange(m.inc, 45e3, 70e3),
          target: '$45–70k',
        },
        wk,
      ),
    );
  }
  checks.push({
    label: 'Payback from opening',
    value: String(paybackWeek ?? '—'),
    ok: inRange(paybackWeek, 1, 40),
    target: '≤ 40 weeks',
  });
  // §25: the branch checkpoints read the steady strategy's first branch only.
  if (!branchChecks) checks.splice(0, checks.length);
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
  const print = (title: string, list: Check[]) => {
    console.log(`\n${title}`);
    for (const c of list)
      console.log(
        `  ${c.ok ? '✓' : '✗'} ${c.label.padEnd(30)} ${c.value.padStart(10)}   target ${c.target}`,
      );
  };
  print(branchChecks ? 'First-branch checkpoints (SIMULATION §25)' : 'Company checks', checks);
  if (own.length) print(`Strategy targets: ${strategy.name} (SIMULATION §25)`, own);
  const bad = [...checks, ...own].filter((c) => !c.ok);
  console.log(bad.length ? `\n${bad.length} warning(s).` : '\nAll checkpoints in range.');
}

run();
