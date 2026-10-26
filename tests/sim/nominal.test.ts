// The nominal index (SIMULATION §4.6): each country's price-and-wealth level
// compounds with growth, inflation and the trend, and balances per account,
// market wages and rival books are all quoted at that level.
import { describe, expect, it } from 'vitest';
import { MACRO_TARGETS, NOMINAL_INDEX } from '../../src/config/balance';
import { marketWage } from '../../src/sim/branch/staff';
import { advanceWeeks } from '../../src/sim/engine';
import { deptMarketSalary } from '../../src/sim/hq';
import { updateMacro } from '../../src/sim/macro';
import { newGame } from '../../src/sim/newGame';
import { nominalIndex } from '../../src/sim/nominal';
import { managerBaseSalary } from '../../src/sim/payReviews';
import { matureDeposits } from '../../src/sim/rivals';
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

  it('scales market wages, manager and HQ pay and rival mature books with the index', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const wage = marketWage(s, 'cal');
    const mgr = managerBaseSalary(s, 'cal');
    const dept = deptMarketSalary(s, 'finance');
    const rival = Object.values(s.rivals)[0]!.branches[0]!;
    const books = matureDeposits(s, rival);
    s.world.countries.CA!.nominal = 2;
    expect(nominalIndex(s, 'cal')).toBe(2);
    expect(marketWage(s, 'cal')).toBeCloseTo(wage * 2, 6);
    expect(managerBaseSalary(s, 'cal')).toBeCloseTo(mgr * 2, 6);
    expect(deptMarketSalary(s, 'finance')).toBeCloseTo(dept * 2, 6);
    expect(matureDeposits(s, rival)).toBeCloseTo(books * 2, 6);
    expect(nominalIndex(s, 'nowhere')).toBe(1);
  });

  it('quotes new-account balances at the index, so a doubled level doubles new volume', () => {
    const run = (level: number) => {
      const s = newGame({ seed: 3, cityId: 'cal' });
      s.world.countries.CA!.nominal = level;
      const id = openScriptedBranch(s, 'midtown');
      advanceWeeks(s, 2);
      return s.branches[id]!.books.chequing!.last.newVolume;
    };
    const base = run(1);
    expect(base).toBeGreaterThan(0);
    expect(run(2) / base).toBeCloseTo(2, 1);
  });
});
