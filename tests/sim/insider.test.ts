// Insider trading (SIMULATION §22): own-share trades inside the 2-week window
// before a quarter-end open a case 15% of the time (never outside it); at the
// quarter-end the gain sets a fine of max(3× gain, $250k); settling pays it
// from personal cash, dents every branch's overall rating for 8 weeks and
// makes the paper.
import { describe, expect, it } from 'vitest';
import { DAYS_PER_WEEK, INSIDER } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { ratingMod } from '../../src/sim/incident/effects';
import {
  inInsiderWindow,
  insiderFine,
  insiderGain,
  insiderQuarter,
  nextQuarterEndWeek,
} from '../../src/sim/insider';
import type { GameState } from '../../src/sim/state';
import { publicBank } from '../helpers/markets';

const setWeek = (s: GameState, week: number) => {
  s.clock.week = week;
  s.clock.day = week * DAYS_PER_WEEK;
};

/** A listed bank with personal cash, its clock at `weeksBefore` weeks before a quarter-end. */
function listed(weeksBefore: number): GameState {
  const s = publicBank();
  s.personal.cash = 1e9;
  const q = nextQuarterEndWeek(s);
  setWeek(s, q - weeksBefore);
  return s;
}

/** Round trips (buy then sell) until a case opens; returns how many trades it took. */
function tradeUntilCase(s: GameState, max = 200): number {
  for (let i = 1; i <= max; i++) {
    expect(cmd.trade(s, 'personal', 'self', i % 2 ? 1_000 : -1_000).ok).toBe(true);
    if (s.personal.empire.insider.pending.length > 0) return i;
  }
  return -1;
}

describe('insider window', () => {
  it('covers the 2 weeks before each quarter-end', () => {
    expect(inInsiderWindow(listed(1))).toBe(true);
    expect(inInsiderWindow(listed(INSIDER.windowWeeks))).toBe(true);
    expect(inInsiderWindow(listed(INSIDER.windowWeeks + 1))).toBe(false);
  });

  it('never opens a case outside the window', () => {
    const s = listed(6);
    for (let i = 0; i < 200; i++) cmd.trade(s, 'personal', 'self', i % 2 ? -500 : 500);
    expect(s.personal.empire.insider.pending).toHaveLength(0);
  });

  it('opens cases at about INSIDER.prob per trade inside it, resolving at the quarter-end', () => {
    const s = listed(1);
    const q = nextQuarterEndWeek(s);
    const n = 2_000;
    for (let i = 0; i < n; i++) cmd.trade(s, 'personal', 'self', i % 2 ? -100 : 100);
    const cases = s.personal.empire.insider.pending;
    expect(cases.length / n).toBeGreaterThan(INSIDER.prob - 0.03);
    expect(cases.length / n).toBeLessThan(INSIDER.prob + 0.03);
    expect(cases.every((c) => c.resolveWeek === q)).toBe(true);
  });
});

describe('insider fine', () => {
  it('measures the gain at resolution, floored at 0', () => {
    const c = { week: 0, side: 'buy' as const, shares: 1_000, price: 10, resolveWeek: 13 };
    expect(insiderGain(c, 14)).toBe(4_000);
    expect(insiderGain(c, 8)).toBe(0);
    expect(insiderGain({ ...c, side: 'sell' }, 8)).toBe(2_000);
    expect(insiderFine(0)).toBe(INSIDER.fineMin);
    expect(insiderFine(1e6)).toBe(INSIDER.fineMult * 1e6);
  });

  it('raises the probe at quarter-end; settling pays from personal cash with a rating hit', () => {
    const s = listed(1);
    const branch = Object.keys(s.branches)[0]!; // the office holding its ARR
    s.branches[branch]!.status = 'open';
    expect(tradeUntilCase(s)).toBeGreaterThan(0);
    const c = s.personal.empire.insider.pending[0]!;
    setWeek(s, c.resolveWeek);
    s.stock.price = c.price * 1.5; // a big move after the trade
    const gain = insiderGain(c, s.stock.price);
    insiderQuarter(s);
    expect(s.personal.empire.insider.pending).toHaveLength(0);
    const inc = s.incidents.active.find((i) => i.type === 'INSIDER_PROBE')!;
    expect(inc.scopeKind).toBe('personal');
    expect(inc.data.fine).toBeCloseTo(insiderFine(gain), 6);
    expect(s.events.log.some((e) => e.type === 'INSIDER_PROBE_OPENED')).toBe(true);

    const cash0 = s.personal.cash;
    const bank0 = s.company.cash;
    const overall0 = s.branches[branch]!.ratings.overall;
    expect(cmd.resolveIncident(s, inc.id, 'settle').ok).toBe(true);
    expect(s.personal.cash).toBeCloseTo(cash0 - insiderFine(gain), 6);
    expect(s.company.cash).toBe(bank0);
    expect(s.branches[branch]!.ratings.overall).toBeCloseTo(overall0 - INSIDER.ratingHit, 6);
    expect(ratingMod(s, s.branches[branch]!, 'overall')).toBeCloseTo(-INSIDER.ratingHit, 6);
    expect(s.events.log.some((e) => e.type === 'INSIDER_FINED')).toBe(true);
  });
});
