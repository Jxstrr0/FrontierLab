// Strategy-level balance targets (SIMULATION §25): what each scripted player
// must achieve, beyond the steady first branch's checkpoints. Some targets
// compare against a steady run on the same seed, or against aggressive play
// under the forced recession, so this module runs those companions quietly.
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
export const worse = (a: Tier, b: Tier): Tier =>
  TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b;

/** Week-by-week facts a strategy target can read. */
export interface RunLog {
  assets: number[];
  equity: number[];
  netIncome: number[];
  branches: number[];
  tier: Tier[];
  recession: boolean[];
  /** The home country's nominal index (§4.6), to read targets in start-of-game money. */
  nominal: number[];
}

export const emptyLog = (): RunLog => ({
  assets: [0],
  equity: [0],
  netIncome: [0],
  branches: [0],
  tier: ['strong'],
  recession: [false],
  nominal: [1],
});

export function logWeek(log: RunLog, state: GameState, netIncome: number): void {
  const bs = balanceSheet(state);
  log.assets.push(bs.assets);
  log.equity.push(bs.equity);
  log.netIncome.push(netIncome);
  log.branches.push(Object.keys(state.branches).length);
  log.tier.push(state.company.tier);
  log.recession.push(homeCountry(state).phase === 'recession');
  log.nominal.push(homeCountry(state).nominal);
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
        label: 'Year 2 branches',
        value: String(n),
        // 3–8 since the nominal index (§4.6): a balance sheet that grows with the economy binds capital a little sooner.
        ok: n >= 3 && n <= 8,
        target: '3–8',
      });
    }
    if (weeks >= 520) {
      const n = log.branches[520]!;
      // §25 bands are in start-of-game money: deflate by the nominal index.
      const a = log.assets[520]! / log.nominal[520]!;
      checks.push({
        label: 'Year 10 branches',
        value: String(n),
        ok: n >= 60 && n <= 250,
        target: '60–250',
      });
      checks.push({
        label: 'Year 10 total assets (real)',
        value: B(a),
        ok: a >= 6e9 && a <= 40e9,
        target: '$6–40B',
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
    const mine = log.assets[156]!;
    checks.push({
      label: 'Year 3 assets vs steady',
      value: `${M(mine)} / ${M(steady.assets[156]!)}`,
      ok: mine > steady.assets[156]!,
      target: 'higher growth',
    });
    const start = log.recession.indexOf(true);
    const end = start < 0 ? -1 : log.recession.indexOf(false, start);
    const tier = start < 0 ? 'n/a' : worstOver(start, end < 0 ? weeks : end);
    checks.push({
      label: 'Tier in the first recession',
      value: tier,
      ok: tier === 'watch' || tier === 'restricted' || tier === 'critical',
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
      ok: aggTier === 'restricted' || aggTier === 'critical',
      target: 'Restricted or Critical',
    });
  }
  return checks;
}
