// ROADMAP Stage 8 acceptance (DESIGN §5.2 "one global enterprise", SIMULATION
// §4–5): (a) a bank with branches in three countries (Calgary, New York,
// London) plays a year with the books balanced every week and every branch
// running; (b) each country's policy rate is its own and drives only its own
// offices' Loan Desk pricing.
// C3b: the Loan Desk lends company cash with no internal funding charge, so the
// policy rate reaches an office through what its business borrowers will pay.
import { describe, expect, it } from 'vitest';
import { handleIncidents } from '../../scripts/strategies/common';
import { CITIES } from '../../src/data/cities';
import type { CountryId } from '../../src/data/types';
import { WEEKS_PER_YEAR } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import { branchArr } from '../../src/sim/arr';
import type { Branch, GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/markets';
import { worldBank } from '../helpers/world';

/** Current Loan Desk balances booked at an office. */
const loans = (s: GameState, b: Branch) =>
  Object.values(s.loanDesk.loans)
    .filter((l) => l.branchId === b.id && l.status === 'current')
    .reduce((t, l) => t + l.balance, 0);
const countryOf = (b: Branch) => CITIES[b.cityId]!.country;
const lastRow = (b: Branch) => b.pnl.at(-1)!;

describe('Stage 8 acceptance: branches in three countries', () => {
  it('runs every branch for a year with the books balanced every week', () => {
    const { s, branches } = worldBank();
    const ids = Object.values(branches);
    expect(new Set(ids.map((id) => countryOf(s.branches[id]!)))).toEqual(
      new Set<CountryId>(['CA', 'US', 'UK']),
    );
    const rates: Record<string, number[]> = { CA: [], US: [], UK: [] };
    let worst = 0;
    for (let w = 0; w < WEEKS_PER_YEAR; w++) {
      advanceWeeks(s, 1);
      handleIncidents(s);
      worst = Math.max(worst, identityGap(s));
      for (const c of Object.keys(rates))
        rates[c]!.push(s.world.countries[c as CountryId]!.policyRate);
    }
    expect(worst).toBeLessThan(1);
    expect(s.flags.gameOver).toBeUndefined();
    for (const id of ids) {
      const b = s.branches[id]!;
      expect(b.status).toBe('open');
      expect(b.customers).toBeGreaterThan(1_000);
      // A P&L row for every week since it opened, and real business on both sides.
      expect(b.pnl.length).toBeGreaterThanOrEqual(WEEKS_PER_YEAR - 2);
      expect(lastRow(b).revenue).toBeGreaterThan(0);
      expect(branchArr(s, b)).toBeGreaterThan(200_000);
      expect(loans(s, b)).toBeGreaterThan(1_000_000);
    }
    // Each country's central bank runs its own path.
    expect(rates.CA).not.toEqual(rates.US);
    expect(rates.CA).not.toEqual(rates.UK);
    expect(rates.US).not.toEqual(rates.UK);
  }, 60_000);
});

describe("Stage 8 acceptance: each country's policy rate drives its own offices", () => {
  /** Rates on the Loan Desk loans an office booked since `before`, keyed by application order. */
  const asks = (s: GameState, id: string, before: GameState) =>
    Object.values(s.loanDesk.loans)
      .filter((l) => l.branchId === id && !before.loanDesk.loans[l.id])
      .map((l) => l.rate);

  it('starts the three countries on different policy rates', () => {
    const { s } = worldBank();
    advanceWeeks(s, 26);
    const policy = (c: CountryId) => s.world.countries[c]!.policyRate;
    expect(new Set([policy('CA'), policy('US'), policy('UK')]).size).toBe(3);
  });

  it("moves only New York's Loan Desk loan rates when the US policy rate rises", () => {
    const { s, branches } = worldBank();
    advanceWeeks(s, 8);
    const start: GameState = structuredClone(s);
    const base: GameState = structuredClone(s);
    const hike: GameState = structuredClone(s);
    hike.world.countries.US!.policyRate += 0.02;
    advanceWeeks(base, 1);
    advanceWeeks(hike, 1);
    for (const id of [branches.cal, branches.lon])
      expect(asks(hike, id, start)).toEqual(asks(base, id, start));
    const b = asks(base, branches.nyc, start);
    const h = asks(hike, branches.nyc, start);
    expect(b.length).toBeGreaterThan(0);
    expect(h.length).toBe(b.length);
    // The desk prices loans off the office's own country's short rate (§5, §11).
    // The short rate follows the policy rate over a few weeks, so the first week moves a little.
    h.forEach((r, i) => expect(r).toBeGreaterThanOrEqual(b[i]!));
    expect(h.reduce((t, r) => t + r, 0)).toBeGreaterThan(b.reduce((t, r) => t + r, 0));
    expect(identityGap(hike)).toBeLessThan(1);
  });
});
