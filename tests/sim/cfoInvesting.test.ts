// The CFO's Investing switches (SIMULATION §17.2; DESIGN decision log
// 2026-10-26): every 4 weeks each switch trims stocks 25% under cost, buys
// one stock toward a market-cap weighting and backs the best-scoring
// Investment floor startup, within the bank's caps and capital floor or your
// spare cash; migration 30 → 31 adds the switches (off for a seated CFO).
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION as X } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { refreshExecCandidates } from '../../src/sim/execCandidates';
import {
  cfoInvest,
  losers,
  nextStartup,
  nextStock,
  personalInvestLimit,
} from '../../src/sim/execInvesting';
import { postCash } from '../../src/sim/ledger';
import { startupShares } from '../../src/sim/portfolio';
import { migrate } from '../../src/sim/save/migrations';
import { holdingsValue, withMarks } from '../../src/sim/securities';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { refreshPipeline } from '../../src/sim/ventures';
import { execGame, hire, identityGap } from '../helpers/executives';

type Raw = Record<string, unknown> & { schemaVersion: number };

function fund(s: GameState, amount: number) {
  postCash(s, amount, 'financing');
  s.company.paidInCapital += amount;
}

/** A game with an Investment floor, a seated CFO and the Investing switches as given. */
function cfoGame(on: Partial<Record<string, boolean>> = {}): GameState {
  const s = execGame(['investment']);
  refreshExecCandidates(s, true);
  hire(s, 'cfo');
  for (const id of ['bankInvests', 'privateInvests'])
    cmd.setExecDelegation(s, 'cfo', id, on[id] ?? false);
  refreshPipeline(s);
  return s;
}

/** Makes every pipeline startup score `score` on all five measures. */
function scoreAll(s: GameState, score: number) {
  for (const id of s.ventures.pipeline)
    s.ventures.startups[id]!.pentagon = [score, score, score, score, score];
}

describe('investing the bank’s money', () => {
  it('buys the largest company first and keeps the books balanced', () => {
    const s = cfoGame({ bankInvests: true });
    fund(s, 1_000_000_000);
    const plan = nextStock(s, 'company');
    expect(plan.pick).toBeDefined();
    const biggest = Object.values(s.market.companies).sort(
      (a, b) => b.price * b.shares - a.price * a.shares,
    )[0]!;
    expect(plan.pick!.id).toBe(biggest.id);
    cfoInvest(s, 'company');
    expect(s.market.holdings.company[biggest.id]!.shares).toBe(plan.pick!.shares);
    // The next buy goes to another company: the first is now nearer its weight.
    expect(nextStock(s, 'company').pick!.id).not.toBe(biggest.id);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('backs the best-scoring startup on the floor’s list, skipping weak ones', () => {
    const s = cfoGame({ bankInvests: true });
    fund(s, 1_000_000_000);
    scoreAll(s, X.investMinScore - 1);
    expect(nextStartup(s, 'company').blocker).toMatch(/scores/);
    scoreAll(s, 8);
    const plan = nextStartup(s, 'company');
    expect(plan.pick).toBeDefined();
    cfoInvest(s, 'company');
    const st = s.ventures.startups[plan.pick!.id]!;
    expect(startupShares(st, 'company')).toBeGreaterThan(0);
    // Never twice into the same startup.
    expect(nextStartup(s, 'company').pick?.id).not.toBe(st.id);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('keeps stocks under 5% and startups under 3% of assets', () => {
    const s = cfoGame({ bankInvests: true });
    fund(s, 300_000_000);
    scoreAll(s, 8);
    for (let i = 0; i < 60; i++) cfoInvest(s, 'company');
    const bs = balanceSheet(s);
    expect(holdingsValue(s, 'company')).toBeLessThanOrEqual(X.investStockCap * bs.assets + 1);
    expect(bs.ventures).toBeLessThanOrEqual(X.investVentureCap * bs.assets + 1);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('never buys at a restricted tier and needs an Investment floor for startups', () => {
    const s = cfoGame({ bankInvests: true });
    fund(s, 1_000_000_000);
    s.company.tier = 'restricted';
    expect(nextStock(s, 'company').blocker).toMatch(/regulator/);
    scoreAll(s, 8);
    expect(nextStartup(s, 'company').blocker).toMatch(/regulator/);
    delete s.departments.investment;
    expect(nextStartup(s, 'company').blocker).toMatch(/Investment floor/);
  });

  it('trims a stock 25% under cost and leaves it alone for a year', () => {
    const s = cfoGame({ bankInvests: true });
    fund(s, 1_000_000_000);
    cfoInvest(s, 'company');
    const id = Object.keys(s.market.holdings.company)[0]!;
    const c = s.market.companies[id]!;
    withMarks(s, () => (c.price = s.market.holdings.company[id]!.avgCost * X.investTrimAt));
    expect(losers(s, 'company')).toEqual([id]);
    cfoInvest(s, 'company');
    expect(s.market.holdings.company[id]).toBeUndefined();
    expect(s.executives.trimmedStocks.company[id]).toBe(s.clock.week);
    expect(nextStock(s, 'company').pick?.id).not.toBe(id);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('runs by itself every 4 weeks', () => {
    const s = cfoGame({ bankInvests: true });
    fund(s, 1_000_000_000);
    advanceWeeks(s, X.investEveryWeeks * 2);
    expect(Object.keys(s.market.holdings.company).length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(s.market.holdings.personal)).toHaveLength(0);
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('investing your money', () => {
  it('keeps a year of salary and spends at most a quarter of the rest at a time', () => {
    const s = cfoGame({ privateInvests: true });
    const reserve = X.buyReserveYears * s.governance.ceoSalary;
    s.personal.cash = reserve;
    expect(personalInvestLimit(s)).toBe(0);
    expect(nextStock(s, 'personal').blocker).toMatch(/salary/);
    s.personal.cash = reserve + 40_000_000;
    expect(personalInvestLimit(s)).toBeCloseTo(10_000_000, 2);
    const cash = s.personal.cash;
    const plan = nextStock(s, 'personal');
    cfoInvest(s, 'personal');
    expect(plan.pick!.cost).toBeLessThanOrEqual(10_000_000);
    expect(s.personal.cash).toBeLessThan(cash);
    expect(s.personal.cash).toBeGreaterThanOrEqual(cash - 2 * 10_000_000 - 1);
  });
});

describe('save migration', () => {
  it('adds the Investing switches, off for a seated CFO (30 → 31)', () => {
    const s0 = cfoGame({ bankInvests: true });
    const raw = JSON.parse(JSON.stringify(s0)) as Raw;
    const ex = (raw as unknown as GameState).executives;
    delete (ex as Partial<typeof ex>).trimmedStocks;
    delete ex.seats.cfo!.delegations.bankInvests;
    delete ex.seats.cfo!.delegations.privateInvests;
    raw.schemaVersion = 30;
    const s = migrate(raw) as unknown as GameState;
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.executives.trimmedStocks).toEqual({ company: {}, personal: {} });
    expect(s.executives.seats.cfo!.delegations).toMatchObject({
      bankInvests: false,
      privateInvests: false,
    });
  });
});
