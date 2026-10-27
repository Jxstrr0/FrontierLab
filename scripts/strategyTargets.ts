// Strategy-level balance targets (SIMULATION §25): what each scripted player
// must achieve, beyond the steady first branch's checkpoints. Some targets
// compare against a steady run on the same seed, or against aggressive play
// under the forced recession, so this module runs those companions quietly.
import { companyArr } from '../src/sim/arr';
import { balanceSheet } from '../src/sim/balanceSheet';
import { advanceWeeks } from '../src/sim/engine';
import { newGame, type NewGameOptions } from '../src/sim/newGame';
import type { Tier } from '../src/data/types';
import type { GameState } from '../src/sim/state';
import { homeCountry } from '../src/sim/treasury';
import { STRATEGIES } from './strategies';
import { forceRecession } from './strategies/stress';
import type { Strategy } from './strategies/types';

export interface Check {
  label: string;
  value: string;
  ok: boolean;
  target: string;
}

/** Worst first: a lower index is a weaker tier. */
const TIER_ORDER: Tier[] = ['critical', 'restricted', 'watch', 'adequate', 'strong'];
/** True when `t` is `line` or a worse tier. */
const atOrBelow = (t: Tier, line: Tier) => TIER_ORDER.indexOf(t) <= TIER_ORDER.indexOf(line);

export const worse = (a: Tier, b: Tier): Tier =>
  TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b;

/** Week-by-week facts a strategy target can read. */
export interface RunLog {
  assets: number[];
  /** Company ARR (C3a). */
  arr: number[];
  equity: number[];
  netIncome: number[];
  branches: number[];
  tier: Tier[];
  recession: boolean[];
  /** The home country's nominal index (§4.6), to read targets in start-of-game money. */
  nominal: number[];
  /** Corporate cash at the week's end (C8d). */
  cash: number[];
}

export const emptyLog = (): RunLog => ({
  assets: [0],
  arr: [0],
  equity: [0],
  netIncome: [0],
  branches: [0],
  tier: ['strong'],
  recession: [false],
  nominal: [1],
  cash: [0],
});

export function logWeek(log: RunLog, state: GameState, netIncome: number): void {
  const bs = balanceSheet(state);
  log.assets.push(bs.assets);
  log.arr.push(companyArr(state));
  log.equity.push(bs.equity);
  log.netIncome.push(netIncome);
  log.branches.push(Object.keys(state.branches).length);
  log.tier.push(state.company.tier);
  log.recession.push(homeCountry(state).phase === 'recession');
  log.nominal.push(homeCountry(state).nominal);
  log.cash.push(state.company.cash);
}

/** Whether the home country was in recession within `window` weeks before `week`. */
export function nearRecession(log: RunLog, week: number, window: number): boolean {
  for (let w = Math.max(0, week - window); w <= week; w++) if (log.recession[w]) return true;
  return false;
}

/** Runs a strategy silently for `weeks` and logs it. */
function companion(opts: NewGameOptions, strategy: Strategy, weeks: number): RunLog {
  const state = newGame(opts);
  strategy.setup(state);
  const log = emptyLog();
  for (let w = 1; w <= weeks; w++) {
    advanceWeeks(state, 1);
    strategy.weekly(state);
    logWeek(log, state, 0);
  }
  return log;
}

const aggressiveStress: Strategy = {
  name: 'aggressive-stress',
  setup: (s) => {
    forceRecession(s);
    STRATEGIES.aggressive!.setup(s);
  },
  weekly: (s) => STRATEGIES.aggressive!.weekly(s),
};

/** §25 steady year-10 ARR band, start-of-game money (C3a). */
const YEAR10_ARR: [number, number] = [0.5e9, 5e9];

const M = (x: number) => `${(x / 1e6).toFixed(1)}M`;
const B = (x: number) => `${(x / 1e9).toFixed(1)}B`;
const sum = (xs: number[], from: number, to: number) =>
  xs.slice(from, to + 1).reduce((a, b) => a + b, 0);

/** The §25 targets for `name`, given its own log. */
export function strategyChecks(name: string, opts: NewGameOptions, log: RunLog): Check[] {
  const weeks = log.assets.length - 1;
  const checks: Check[] = [];
  const worstOver = (from: number, to: number) =>
    log.tier.slice(from, to + 1).reduce<Tier>(worse, 'strong');
  if (name === 'steady') {
    if (weeks >= 104) {
      const n = log.branches[104]!;
      checks.push({
        label: 'Year 2 sales offices',
        value: String(n),
        // C2a: one office per city, grown in place, so year 2 holds the home office and a city or so more.
        ok: n >= 1 && n <= 4,
        target: '1–4',
      });
    }
    if (weeks >= 520) {
      const n = log.branches[520]!;
      // §25 bands are in start-of-game money: deflate by the nominal index.
      const a = log.arr[520]! / log.nominal[520]!;
      checks.push({
        label: 'Year 10 cities with an office',
        value: String(n),
        ok: n >= 10 && n <= 25,
        target: '10–25',
      });
      checks.push({
        label: 'Year 10 ARR (real)',
        value: B(a),
        ok: a >= YEAR10_ARR[0] && a <= YEAR10_ARR[1],
        target: `$${YEAR10_ARR[0] / 1e9}–${YEAR10_ARR[1] / 1e9}B`,
      });
    }
  }
  if (name === 'turtle' && weeks >= 260) {
    const ni = sum(log.netIncome, 209, 260);
    checks.push({ label: 'Year 5 net income', value: M(ni), ok: ni > 0, target: 'profitable' });
    const steady = companion(opts, STRATEGIES.steady!, 260);
    const share = log.equity[260]! / Math.max(1, steady.equity[260]!);
    checks.push({
      label: "Year 5 equity vs steady's",
      value: `${(share * 100).toFixed(0)}%`,
      ok: share < 0.4,
      target: '< 40%',
    });
  }
  if (name === 'aggressive' && weeks >= 156) {
    const steady = companion(opts, STRATEGIES.steady!, 156);
    const mine = log.arr[156]!;
    checks.push({
      label: 'Year 3 ARR vs steady',
      value: `${M(mine)} / ${M(steady.arr[156]!)}`,
      ok: mine > steady.arr[156]!,
      target: 'higher growth',
    });
    // C8d: growing fast strains the Safety floor; the safety tier (C7a) shows it.
    const tier = worstOver(0, weeks);
    checks.push({
      label: 'Worst safety tier',
      value: tier,
      ok: atOrBelow(tier, 'watch'),
      target: 'Watch or worse',
    });
  }
  if (name === 'stress') {
    const tier = worstOver(0, weeks);
    checks.push({
      label: 'Worst tier (steady)',
      value: tier,
      ok: tier !== 'critical',
      target: 'never Critical',
    });
    const agg = companion(opts, aggressiveStress, Math.min(weeks, 260));
    const aggTier = agg.tier.reduce<Tier>(worse, 'strong');
    checks.push({
      label: 'Worst tier (aggressive)',
      value: aggTier,
      ok: atOrBelow(aggTier, 'watch'),
      target: 'Watch or worse',
    });
    // C8d: a recession hits a lab through its cash, not bank capital: aggressive bends, not breaks.
    const aggCash = Math.min(...agg.cash);
    checks.push({
      label: 'Aggressive min cash',
      value: M(aggCash),
      ok: aggCash >= 0,
      target: '≥ 0',
    });
  }
  return checks;
}
