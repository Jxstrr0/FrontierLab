// ROADMAP Stage 8 acceptance (DESIGN §5.2 "one global enterprise", SIMULATION
// §4–5): (a) a bank with branches in three countries (Calgary, New York,
// London) plays a year with the books balanced every week and every branch
// running; (b) each country's policy rate is its own and drives only its own
// branches' funding credits and charges (FTP).
import { describe, expect, it } from 'vitest';
import { handleIncidents } from '../../scripts/strategies/common';
import { CITIES } from '../../src/data/cities';
import { isDeposit, isLoan, PRODUCTS } from '../../src/data/products';
import type { CountryId } from '../../src/data/types';
import { WEEKS_PER_YEAR } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import { ftpFor } from '../../src/sim/rates';
import type { Branch, GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/markets';
import { worldBank } from '../helpers/world';

const deposits = (b: Branch) =>
  Object.entries(b.books).reduce(
    (t, [pid, bk]) => t + (PRODUCTS[pid] && isDeposit(PRODUCTS[pid]) ? bk.balance : 0),
    0,
  );
const loans = (b: Branch) =>
  Object.entries(b.books).reduce(
    (t, [pid, bk]) => t + (PRODUCTS[pid] && isLoan(PRODUCTS[pid]) ? bk.balance : 0),
    0,
  );
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
      expect(deposits(b)).toBeGreaterThan(5_000_000);
      expect(loans(b)).toBeGreaterThan(1_000_000);
    }
    // Each country's central bank runs its own path.
    expect(rates.CA).not.toEqual(rates.US);
    expect(rates.CA).not.toEqual(rates.UK);
    expect(rates.US).not.toEqual(rates.UK);
  }, 60_000);
});

describe("Stage 8 acceptance: each country's policy rate drives its own branches", () => {
  /** Funding credit per unit of deposits, from the weekly P&L (annualised). */
  const creditRate = (b: Branch) => (lastRow(b).lines.fundingCredit * WEEKS_PER_YEAR) / deposits(b);

  it('starts the three countries on different policy rates, each branch funded at its own', () => {
    const { s, branches } = worldBank();
    advanceWeeks(s, 3);
    const policy = (c: CountryId) => s.world.countries[c]!.policyRate;
    expect(new Set([policy('CA'), policy('US'), policy('UK')]).size).toBe(3);
    for (const id of Object.values(branches)) {
      const b = s.branches[id]!;
      const c = s.world.countries[countryOf(b)]!;
      // Deposit books are credited at the branch's own country's FTP (§5): exactly
      // Σ balance × FTP(own country) ∕ 52 over its deposit books.
      let expected = 0;
      for (const [pid, book] of Object.entries(b.books)) {
        const spec = PRODUCTS[pid];
        if (spec && isDeposit(spec)) expected += (book.balance * ftpFor(spec, c)) / WEEKS_PER_YEAR;
      }
      expect(lastRow(b).lines.fundingCredit).toBeCloseTo(expected, 2);
      expect(Math.abs(creditRate(b) - c.policyRate)).toBeLessThan(0.006);
    }
  });

  it('moves only the US branch margins when the US policy rate rises', () => {
    const { s, branches } = worldBank();
    advanceWeeks(s, 8);
    const base: GameState = structuredClone(s);
    const hike: GameState = structuredClone(s);
    hike.world.countries.US!.policyRate += 0.02;
    advanceWeeks(base, 1);
    advanceWeeks(hike, 1);
    const margin = (st: GameState, id: string) => {
      const row = lastRow(st.branches[id]!).lines;
      return { deposit: row.fundingCredit - row.depositInterest, charge: row.fundingCharge };
    };
    for (const id of [branches.cal, branches.lon]) {
      expect(margin(hike, id).deposit).toBeCloseTo(margin(base, id).deposit, 6);
      expect(margin(hike, id).charge).toBeCloseTo(margin(base, id).charge, 6);
    }
    const nyc = base.branches[branches.nyc]!;
    const dDeposit = margin(hike, branches.nyc).deposit - margin(base, branches.nyc).deposit;
    const dCharge = margin(hike, branches.nyc).charge - margin(base, branches.nyc).charge;
    // +2pp on every deposit dollar for a week, and loans cost 2pp more to fund.
    expect(dDeposit).toBeCloseTo((deposits(nyc) * 0.02) / WEEKS_PER_YEAR, -2);
    expect(dCharge).toBeGreaterThan((loans(nyc) * 0.015) / WEEKS_PER_YEAR);
    expect(identityGap(hike)).toBeLessThan(1);
  });
});
