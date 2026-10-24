// Bank runs (SIMULATION §13.8), the regulator's letter and the emergency
// recapitalisation (§15): triggers, deposit churn during a run, its end, and the
// accept / decline / grace paths with the balance identity intact.
import { describe, expect, it } from 'vitest';
import { BANK_RUN, FAILURE, RECAP } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { capitalSnapshot, evaluateCapital } from '../../src/sim/capital';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { checkFailure } from '../../src/sim/failure';
import { bankRunMult } from '../../src/sim/incident/effects';
import { runIncidents } from '../../src/sim/incidents';
import { spend } from '../../src/sim/ledger';
import type { GameState } from '../../src/sim/state';
import { openBank } from '../helpers/incidents';
import { bankWithFloors } from '../helpers/scenario';

const identityGap = (s: GameState) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

describe('bank runs', () => {
  /** Ticks incidents week by week until a run starts. */
  function startRun(s: GameState): void {
    for (let i = 0; i < 400 && s.incidents.bankRunWeeksLeft === undefined; i++) {
      s.clock.week += 1;
      runIncidents(s);
    }
  }

  it('need weak ratings and weak capital or liquidity', () => {
    const { s, b } = openBank();
    b.ratings.overall = 2.2;
    s.company.tier = 'adequate';
    s.company.liquidityRatio = 0.3;
    for (let i = 0; i < 200; i++) {
      s.clock.week += 1;
      runIncidents(s);
    }
    expect(s.incidents.bankRunWeeksLeft).toBeUndefined();
    s.company.tier = 'critical';
    s.company.tierWeeks = 5;
    startRun(s);
    const left = s.incidents.bankRunWeeksLeft!;
    expect(left).toBeGreaterThanOrEqual(BANK_RUN.weeks[0]);
    expect(left).toBeLessThanOrEqual(BANK_RUN.weeks[1]);
    expect(s.incidents.active.some((i) => i.type === 'BANK_RUN')).toBe(true);
    expect(s.events.log.some((e) => e.type === 'BANK_RUN')).toBe(true);
    expect(bankRunMult(s)).toBe(BANK_RUN.runMult);
    // It runs its course, then ends.
    for (let i = 0; i < left; i++) {
      s.clock.week += 1;
      runIncidents(s);
    }
    expect(s.incidents.bankRunWeeksLeft).toBeUndefined();
    expect(bankRunMult(s)).toBe(1);
    expect(s.events.log.some((e) => e.type === 'BANK_RUN_ENDED')).toBe(true);
  });

  it('multiplies deposit churn by six while it lasts', () => {
    const base = bankWithFloors([], { weeks: 20 });
    const run = structuredClone(base);
    run.incidents.bankRunWeeksLeft = 3;
    advanceWeeks(base, 1);
    advanceWeeks(run, 1);
    const id = Object.keys(base.branches)[0]!;
    const calm = base.branches[id]!.books.savings!.last.churned;
    const panic = run.branches[id]!.books.savings!.last.churned;
    expect(calm).toBeGreaterThan(0);
    expect(panic / calm).toBeCloseTo(BANK_RUN.runMult, 1);
  });

  it('ends when a public statement works', () => {
    const { s, b } = openBank();
    b.ratings.overall = 2;
    s.company.tier = 'critical';
    s.company.tierWeeks = 3;
    startRun(s);
    const inc = s.incidents.active.find((i) => i.type === 'BANK_RUN')!;
    inc.data.odds = 1;
    const r = cmd.resolveIncident(s, inc.id, 'statement');
    expect(r.ok && r.outcome).toContain('worked');
    expect(s.incidents.bankRunWeeksLeft).toBeUndefined();
  });

  it('borrows from the central bank window', () => {
    const { s, b } = openBank();
    b.ratings.overall = 2;
    s.company.tier = 'critical';
    s.company.tierWeeks = 3;
    b.books.savings!.balance = 10_000_000;
    s.treasury.reserves += 10_000_000;
    startRun(s);
    const inc = s.incidents.active.find((i) => i.type === 'BANK_RUN')!;
    const reserves = s.treasury.reserves;
    cmd.resolveIncident(s, inc.id, 'window');
    expect(s.treasury.window).toBeCloseTo(BANK_RUN.windowShare * 10_000_000);
    expect(s.treasury.reserves - reserves).toBeCloseTo(BANK_RUN.windowShare * 10_000_000);
    expect(s.treasury.windowStigmaWeeks).toBeGreaterThan(0);
  });
});

describe('regulator letter', () => {
  it('arrives on entering the Restricted band', () => {
    const { s } = openBank();
    s.company.tier = 'restricted';
    s.company.tierWeeks = 0;
    runIncidents(s);
    expect(s.incidents.active.map((i) => i.type)).toContain('REGULATOR_LETTER');
  });
});

describe('emergency recapitalisation', () => {
  /** A bank whose capital ratio sits at 2%, eight weeks running below 4.5%. */
  function sinking(): GameState {
    const s = bankWithFloors([], { weeks: 30 });
    const snap = capitalSnapshot(s);
    spend(s, 'fines', snap.cet1 - 0.02 * snap.rwa);
    evaluateCapital(s);
    expect(s.company.capitalRatio).toBeLessThan(FAILURE.takeoverCr);
    s.company.lowCapitalWeeks = RECAP.offerWeeks - 1;
    checkFailure(s);
    expect(s.flags.gameOver).toBeUndefined();
    return s;
  }
  const offer = (s: GameState) => s.incidents.active.find((i) => i.type === 'RECAP_OFFER')!;

  it('is offered after eight weeks below 4.5% instead of a takeover', () => {
    const s = sinking();
    expect(offer(s)).toBeDefined();
    expect(s.incidents.recap?.offeredWeek).toBe(s.clock.week);
  });

  it('accepting issues shares at half of book value and lifts the ratio to 10.5%', () => {
    const s = sinking();
    const shares = s.company.sharesOutstanding;
    const paidIn = s.company.paidInCapital;
    const cash = s.company.cash;
    const bookPerShare = capitalSnapshot(s).equity / shares;
    expect(cmd.resolveIncident(s, offer(s).id, 'accept').ok).toBe(true);
    const raised = s.company.paidInCapital - paidIn;
    expect(raised).toBeGreaterThan(0);
    expect(s.company.cash - cash).toBeCloseTo(raised);
    const newShares = s.company.sharesOutstanding - shares;
    expect(raised / newShares).toBeCloseTo(bookPerShare * 0.5, 0);
    expect(capitalSnapshot(s).capitalRatio).toBeGreaterThanOrEqual(RECAP.targetCr);
    expect(identityGap(s)).toBeLessThan(1);
    expect(s.events.log.some((e) => e.type === 'RECAP')).toBe(true);
  });

  it('declining ends the game in a takeover', () => {
    const s = sinking();
    cmd.resolveIncident(s, offer(s).id, 'decline');
    expect(s.flags.gameOver).toBe('takeover');
  });

  it('still below 4.5% five weeks after accepting means a takeover', () => {
    const s = sinking();
    cmd.resolveIncident(s, offer(s).id, 'accept');
    const snap = capitalSnapshot(s);
    spend(s, 'fines', snap.cet1 - 0.02 * snap.rwa);
    evaluateCapital(s);
    s.clock.week += RECAP.graceWeeks - 1;
    checkFailure(s);
    expect(s.flags.gameOver).toBeUndefined();
    s.clock.week += 1;
    checkFailure(s);
    expect(s.flags.gameOver).toBe('takeover');
  });

  it('unanswered, the deadline declines it', () => {
    const s = sinking();
    s.clock.week = offer(s).deadlineWeek;
    runIncidents(s);
    expect(s.flags.gameOver).toBe('takeover');
  });
});
