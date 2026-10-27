// ROADMAP Stage 8 acceptance (DESIGN §5.2 "one global enterprise", SIMULATION
// §4–5): (a) a bank with branches in three countries (Calgary, New York,
// London) plays a year with the books balanced every week and every branch
// running; (b) each country's policy rate is its own and drives only its own
// branches' funding charges (FTP).
// C3a: plans and API usage are recurring revenue with no deposit book, so the
// policy rate now reaches an office only through its Loan Desk business loans,
// funded at its own country's short FTP.
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

describe("Stage 8 acceptance: each country's policy rate drives its own branches", () => {
  /** Funding charge per unit of Loan Desk loans, from the weekly P&L (annualised). */
  const chargeRate = (s: GameState, b: Branch) =>
    (lastRow(b).lines.fundingCharge * WEEKS_PER_YEAR) / loans(s, b);

  it('starts the three countries on different policy rates, each branch funded at its own', () => {
    const { s, branches } = worldBank();
    advanceWeeks(s, 26);
    const policy = (c: CountryId) => s.world.countries[c]!.policyRate;
    expect(new Set([policy('CA'), policy('US'), policy('UK')]).size).toBe(3);
    for (const id of Object.values(branches)) {
      const b = s.branches[id]!;
      const c = s.world.countries[countryOf(b)]!;
      // Loan Desk loans are charged at the office's own country's short FTP (§5),
      // on the balance before the week's repayment, so the read runs a touch high.
      expect(loans(s, b)).toBeGreaterThan(0);
      expect(Math.abs(chargeRate(s, b) - c.policyRate)).toBeLessThan(0.006);
    }
  });

  it('moves only the US branch funding charge when the US policy rate rises', () => {
    const { s, branches } = worldBank();
    advanceWeeks(s, 8);
    const base: GameState = structuredClone(s);
    const hike: GameState = structuredClone(s);
    hike.world.countries.US!.policyRate += 0.02;
    advanceWeeks(base, 1);
    advanceWeeks(hike, 1);
    const charge = (st: GameState, id: string) => lastRow(st.branches[id]!).lines.fundingCharge;
    for (const id of [branches.cal, branches.lon])
      expect(charge(hike, id)).toBeCloseTo(charge(base, id), 6);
    const nyc = base.branches[branches.nyc]!;
    const dCharge = charge(hike, branches.nyc) - charge(base, branches.nyc);
    // Loans cost 2pp more to fund for the week (less the week's repayments).
    expect(loans(base, nyc)).toBeGreaterThan(0);
    expect(dCharge).toBeGreaterThan((loans(base, nyc) * 0.015) / WEEKS_PER_YEAR);
    expect(identityGap(hike)).toBeLessThan(1);
  });
});
