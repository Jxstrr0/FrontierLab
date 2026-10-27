// ROADMAP Stage 8 acceptance (DESIGN §5.2 "one global enterprise", SIMULATION
// §4–5): (a) a bank with branches in three countries (Calgary, New York,
// London) plays a year with the books balanced every week and every branch
// running; (b) each country's policy rate is its own.
// C5b: contracts are not priced off the policy rate any more, so the old "only New
// York's loan rates move" check has no equivalent and was removed.
import { describe, expect, it } from 'vitest';
import { handleIncidents } from '../../scripts/strategies/common';
import { CITIES } from '../../src/data/cities';
import type { CountryId } from '../../src/data/types';
import { WEEKS_PER_YEAR } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import { branchArr } from '../../src/sim/arr';
import { contractsOf } from '../../src/sim/branch/dealDesk';
import type { Branch, GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/markets';
import { worldBank } from '../helpers/world';

/** Contracts an office holds with the businesses in its city (C5b). */
const contractCount = (s: GameState, id: string) => contractsOf(s, id).length;
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
      expect(contractCount(s, b.id)).toBeGreaterThan(0);
    }
    // Each country's central bank runs its own path.
    expect(rates.CA).not.toEqual(rates.US);
    expect(rates.CA).not.toEqual(rates.UK);
    expect(rates.US).not.toEqual(rates.UK);
  }, 60_000);
});

describe("Stage 8 acceptance: each country's policy rate is its own", () => {
  it('starts the three countries on different policy rates', () => {
    const { s } = worldBank();
    advanceWeeks(s, 26);
    const policy = (c: CountryId) => s.world.countries[c]!.policyRate;
    expect(new Set([policy('CA'), policy('US'), policy('UK')]).size).toBe(3);
  });
});
