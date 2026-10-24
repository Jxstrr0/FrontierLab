// ROADMAP Stage 6 acceptance: the share price responds to earnings and
// incidents (SIMULATION §19.5). Each case compares two copies of the same
// listed bank that differ only in the event under test; both draw the same
// random numbers, so the gap is the event's effect.
import { describe, expect, it } from 'vitest';
import { updateOwnPrice, ownEarningsShock } from '../../src/sim/equityPrice';
import { forceIncident } from '../../src/sim/incidents';
import { runMarkets } from '../../src/sim/market';
import type { GameState } from '../../src/sim/state';
import { publicBank } from '../helpers/markets';

const copy = (s: GameState): GameState => structuredClone(s);

/** Rewrites the last two quarters' earnings, keeping the trailing total unchanged. */
function lastTwo(s: GameState, prev: number, last: number): void {
  const q = s.history.quarterly;
  q[q.length - 2]!.netIncome = prev;
  q[q.length - 1]!.netIncome = last;
}

describe('share price acceptance (§19.5)', () => {
  it('falls after a company incident', () => {
    const base = publicBank();
    runMarkets(base); // settle the event cursor past the listing
    const calm = copy(base);
    const hit = copy(base);
    expect(forceIncident(hit, 'DATA_BREACH', 'company')).toBeDefined();
    runMarkets(calm);
    runMarkets(hit);
    expect(hit.stock.sentiment).toBeLessThan(calm.stock.sentiment);
    expect(hit.stock.price).toBeLessThan(calm.stock.price);
    // The dent lasts: a few quiet weeks later it is still below.
    for (let i = 0; i < 4; i++) {
      updateOwnPrice(calm);
      updateOwnPrice(hit);
    }
    expect(hit.stock.price).toBeLessThan(calm.stock.price);
  });

  it('a worse incident costs more', () => {
    const base = publicBank();
    runMarkets(base);
    const minor = copy(base);
    const major = copy(base);
    const raise = (s: GameState, type: string) =>
      s.events.log.push({
        week: s.clock.week,
        type: 'INCIDENT_RAISED',
        payload: { incidentId: 'x', type, scope: 'company', scopeName: 'Test Bank' },
        priority: 2,
      });
    raise(minor, 'ROBBERY');
    raise(major, 'BANK_RUN');
    updateOwnPrice(minor);
    updateOwnPrice(major);
    expect(major.stock.sentiment).toBeLessThan(minor.stock.sentiment);
    expect(major.stock.price).toBeLessThan(minor.stock.price);
  });

  it('moves with earnings growth, all else equal', () => {
    const base = publicBank();
    runMarkets(base);
    const q = base.history.quarterly.at(-1)!.netIncome;
    const beat = copy(base);
    const miss = copy(base);
    lastTwo(beat, q * 0.9, q * 1.1);
    lastTwo(miss, q * 1.1, q * 0.9);
    ownEarningsShock(beat);
    ownEarningsShock(miss);
    expect(beat.stock.sentiment).toBeGreaterThan(base.stock.sentiment);
    expect(miss.stock.sentiment).toBeLessThan(base.stock.sentiment);
    updateOwnPrice(beat);
    updateOwnPrice(miss);
    expect(beat.stock.price).toBeGreaterThan(miss.stock.price);
  });

  it('a dividend raise lifts and a cut drops sentiment', () => {
    const base = publicBank();
    runMarkets(base);
    const up = copy(base);
    const down = copy(base);
    const push = (s: GameState, dps: number, prevDps: number) =>
      s.events.log.push({
        week: s.clock.week,
        type: 'DIVIDEND_DECLARED',
        payload: { bank: 'Test Bank', dps, prevDps, total: 0, payWeek: 0, yieldPct: 0 },
        priority: 3,
      });
    push(up, 0.2, 0.1);
    push(down, 0.05, 0.1);
    updateOwnPrice(up);
    updateOwnPrice(down);
    updateOwnPrice(base);
    expect(up.stock.sentiment).toBeGreaterThan(base.stock.sentiment);
    expect(down.stock.sentiment).toBeLessThan(base.stock.sentiment);
  });
});
