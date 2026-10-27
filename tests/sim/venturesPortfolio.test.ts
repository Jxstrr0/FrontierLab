// Portfolio ties out, ventures part (ROADMAP Stage 7 acceptance): company
// venture stakes and venture debt sit on the balance sheet at the portfolio's
// values, the balance identity holds
// every week through a new round, a failure, an acquisition and an IPO, and
// personal stakes never touch the bank's books.
import { describe, expect, it } from 'vitest';
import { VENTURE_DEBT } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceDay } from '../../src/sim/engine';
import { ventureDebtValue, venturesValue } from '../../src/sim/portfolio';
import { rngFromState } from '../../src/sim/rng';
import type { GameState, Startup } from '../../src/sim/state';
import { homeCountry } from '../../src/sim/treasury';
import { acquireStartup, failStartup, ipoStartup } from '../../src/sim/ventureExits';
import { openRound } from '../../src/sim/ventureRounds';
import { refreshPipeline } from '../../src/sim/ventures';
import { addCapital, identityGap } from '../helpers/markets';
import { bankWithFloors } from '../helpers/scenario';

function setup(): GameState {
  const s = bankWithFloors(['investment'], { weeks: 2, capital: 50_000_000 });
  addCapital(s, 400_000_000);
  s.personal.cash += 500_000_000;
  s.departments.investment!.staff = 12;
  s.ventures.pipelineRefreshWeek = -10;
  refreshPipeline(s);
  return s;
}

/** Runs whole weeks, checking the identity after every tick. */
function weeksChecked(s: GameState, n: number): void {
  for (let d = 0; d < n * 7; d++) {
    advanceDay(s);
    if (s.clock.day % 7 === 0) expect(identityGap(s)).toBeLessThan(1);
  }
}

const tieOut = (s: GameState) => {
  const bs = balanceSheet(s);
  expect(bs.ventures).toBeCloseTo(venturesValue(s, 'company'), 4);
  expect(bs.ventureDebt).toBeCloseTo(ventureDebtValue(s, 'company'), 4);
  expect(identityGap(s)).toBeLessThan(1);
};

const pick = (s: GameState, i: number): Startup => s.ventures.startups[s.ventures.pipeline[i]!]!;

describe('portfolio ties out (ventures)', () => {
  it('books company lots and venture debt at their marks', () => {
    const s = setup();
    expect(s.ventures.pipeline.length).toBeGreaterThanOrEqual(3);
    const a = pick(s, 0);
    const equity = balanceSheet(s).equity;
    const lot = a.round!.lots[0]!;
    expect(cmd.buyStartupLot(s, a.id, 0, 'company').ok).toBe(true);
    expect(balanceSheet(s).equity).toBeCloseTo(equity, 4);
    expect(balanceSheet(s).ventures).toBeCloseTo(lot.price, 4);

    const rate = homeCountry(s).policyRate + 0.05;
    const amount = a.postMoney * VENTURE_DEBT.maxShare * 0.5;
    const r = cmd.offerVentureDebt(s, a.id, amount, rate, 'company');
    expect(r).toEqual({ ok: true, accepted: true });
    tieOut(s);
    expect(balanceSheet(s).ventureDebt).toBeCloseTo(amount, 2);

    // A second loan is refused; too high a rate is turned down.
    expect(cmd.offerVentureDebt(s, a.id, 1000, rate, 'company').ok).toBe(false);
    const b = pick(s, 1);
    const no = cmd.offerVentureDebt(s, b.id, 1000, homeCountry(s).policyRate + 0.09, 'company');
    expect(no).toEqual({ ok: true, accepted: false });
    expect(b.ventureDebt).toBeUndefined();

    // Personal stakes never touch the books.
    const bsBefore = balanceSheet(s);
    expect(cmd.buyStartupLot(s, a.id, 1, 'personal').ok).toBe(true);
    const bsAfter = balanceSheet(s);
    expect(bsAfter.ventures).toBeCloseTo(bsBefore.ventures, 4);
    expect(bsAfter.assets).toBeCloseTo(bsBefore.assets, 4);
    expect(venturesValue(s, 'personal')).toBeGreaterThan(0);

    // Weekly debt payments: interest income and investing cash, identity every week.
    weeksChecked(s, 3);
    tieOut(s);
    expect(a.ventureDebt!.balance).toBeLessThan(amount);
  });

  it('holds the identity through a new round, a failure, an acquisition and an IPO', () => {
    const s = setup();
    const [a, b, c] = [pick(s, 0), pick(s, 1), pick(s, 2)];
    for (const x of [a, b, c]) expect(cmd.buyStartupLot(s, x.id, 0, 'company').ok).toBe(true);
    const rate = homeCountry(s).policyRate;
    expect(cmd.offerVentureDebt(s, a.id, a.postMoney * 0.05, rate, 'company').ok).toBe(true);
    weeksChecked(s, 5); // the pipeline rounds close
    tieOut(s);

    // New round at a higher price: the mark moves, booked as investment gains.
    const gainsBefore = s.ledger.pnl.investmentGains;
    const value = venturesValue(s, 'company');
    openRound(s, b, 2, 0.2, s.clock.week + 4);
    expect(venturesValue(s, 'company')).toBeGreaterThan(value);
    expect(s.ledger.pnl.investmentGains - gainsBefore).toBeCloseTo(
      venturesValue(s, 'company') - value,
      4,
    );
    tieOut(s);
    weeksChecked(s, 1);

    // Failure: stake to zero, 80% of the loan lost (non-cash), 20% recovered.
    const loan = a.ventureDebt!.balance;
    const losses = s.ledger.pnl.loanLosses;
    const cash = s.company.cash;
    failStartup(s, a);
    expect(a.stage).toBe('failed');
    expect(s.ledger.pnl.loanLosses - losses).toBeCloseTo(loan * 0.8, 4);
    expect(s.company.cash - cash).toBeCloseTo(loan * 0.2, 4);
    tieOut(s);
    weeksChecked(s, 1);

    // Acquisition: the stake becomes corporate cash at the deal price.
    const shares = b.holders.find((h) => h.id === 'company')!.shares;
    const cash2 = s.company.cash;
    acquireStartup(s, b, b.shares * b.lastPrice * 1.5);
    expect(s.company.cash - cash2).toBeCloseTo(shares * b.exitPrice!, 2);
    tieOut(s);
    weeksChecked(s, 1);

    // IPO: the stake moves into market holdings at the listing price.
    const coShares = c.holders.find((h) => h.id === 'company')!.shares;
    const listed = ipoStartup(s, c, rngFromState([9, 9, 9, 9]));
    expect(s.market.holdings.company[listed.id]!.shares).toBe(coShares);
    expect(c.stage).toBe('public');
    tieOut(s);
    weeksChecked(s, 2);
    tieOut(s);
  });

  it('refuses company investments at the Restricted tier and without the cash', () => {
    const s = setup();
    const a = pick(s, 0);
    s.company.tier = 'restricted';
    expect(cmd.buyStartupLot(s, a.id, 0, 'company').ok).toBe(false);
    expect(cmd.buyStartupLot(s, a.id, 0, 'personal').ok).toBe(true);
    s.company.tier = 'adequate';
    s.personal.cash = 0;
    expect(cmd.buyStartupLot(s, a.id, 1, 'personal').ok).toBe(false);
    expect(cmd.buyStartupLot(s, a.id, 0, 'company')).toEqual({
      ok: false,
      reason: 'That offer has been taken.',
    });
  });
});
