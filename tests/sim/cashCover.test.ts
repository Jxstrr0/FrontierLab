// Cash cover (SCREENS §24): weeks of running costs that corporate cash would pay for.
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION } from '../../src/config/balance';
import { cashCoverWeeks, weeklyCosts } from '../../src/sim/cashCover';
import { openBank } from '../helpers/incidents';

describe('cash cover', () => {
  it('is unknown before the first close and cash over average costs after', () => {
    const { s } = openBank();
    s.history.weekly.length = 0;
    expect(weeklyCosts(s)).toBe(0);
    expect(cashCoverWeeks(s)).toBeNull();
    for (let i = 0; i < EXEC_DELEGATION.revenueWeeks + 2; i++)
      s.history.weekly.push({ revenue: 20_000, netIncome: i < 2 ? 1_000_000 : 5_000 } as never);
    expect(weeklyCosts(s)).toBe(15_000); // only the last revenueWeeks closes count
    s.company.cash = 120_000;
    expect(cashCoverWeeks(s)).toBe(8);
    expect(cashCoverWeeks(s, 0)).toBe(0);
    expect(cashCoverWeeks(s, -5_000)).toBe(0);
  });
});
