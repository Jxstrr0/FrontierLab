// The nominal index (SIMULATION §4.6): each country's price-and-wealth level
// compounds with growth, inflation and the trend; market wages and rival books
// are quoted at that level, while plan ARR follows the price charged (C3a).
import { describe, expect, it } from 'vitest';
import { MACRO_TARGETS, NOMINAL_INDEX, RIVAL_BOOKS } from '../../src/config/balance';
import { marketWage } from '../../src/sim/branch/staff';
import { advanceWeeks } from '../../src/sim/engine';
import { deptMarketSalary } from '../../src/sim/hq';
import { updateMacro } from '../../src/sim/macro';
import { newGame } from '../../src/sim/newGame';
import { nominalIndex } from '../../src/sim/nominal';
import { managerBaseSalary } from '../../src/sim/payReviews';
import { arrPerCustomer } from '../../src/sim/rivalFinance';
import { openScriptedBranch } from '../helpers/scenario';

describe('nominal index (§4.6)', () => {
  it('starts at 1 and compounds at gdp + inflation + trend a year', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const ca = s.world.countries.CA!;
    expect(ca.nominal).toBe(1);
    for (let week = 1; week <= 52; week++) {
      ca.weeksInPhase = 0; // hold the expansion
      s.clock.week = week;
      s.clock.day = week * 7;
      updateMacro(s);
    }
    const t = MACRO_TARGETS.expansion;
    const expected = 1 + (t.gdp + t.inflation + NOMINAL_INDEX.trend) / 100;
    expect(ca.nominal).toBeGreaterThan(expected - 0.015);
    expect(ca.nominal).toBeLessThan(expected + 0.015);
  });

  it('scales market wages, manager and HQ pay and rival usage ARR with the index', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const wage = marketWage(s, 'cal');
    const mgr = managerBaseSalary(s, 'cal');
    const dept = deptMarketSalary(s, 'finance');
    const rival = Object.values(s.rivals)[0]!;
    const perCustomer = arrPerCustomer(s, rival, 'cal');
    s.world.countries.CA!.nominal = 2;
    expect(nominalIndex(s, 'cal')).toBe(2);
    expect(marketWage(s, 'cal')).toBeCloseTo(wage * 2, 6);
    expect(managerBaseSalary(s, 'cal')).toBeCloseTo(mgr * 2, 6);
    expect(deptMarketSalary(s, 'finance')).toBeCloseTo(dept * 2, 6);
    // The usage part of a rival customer's ARR is quoted at the index; plan prices follow its own sheet.
    expect(arrPerCustomer(s, rival, 'cal')).toBeCloseTo(
      perCustomer + RIVAL_BOOKS.usagePerCustomer,
      6,
    );
    expect(nominalIndex(s, 'nowhere')).toBe(1);
  });

  it('books plan ARR at the price charged: seats × monthly fee × 12 (C3a)', () => {
    // Plan balances are ARR at the player's own price, so the index moves them
    // only through prices (§10.7), not through the size of a new account.
    const s = newGame({ seed: 3, cityId: 'cal' });
    const id = openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 2);
    const b = s.branches[id]!;
    const book = b.books.plus!;
    expect(book.last.newAccounts).toBeGreaterThan(0);
    // Free-tier upgrades land after billing, so they join the ARR next week.
    expect(book.balance / (book.accounts * b.offered.plus!.price * 12)).toBeCloseTo(1, 1);
  });
});
