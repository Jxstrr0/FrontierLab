// ROADMAP Stage 6 acceptance: an IPO is achievable in years 3–6 of a steady
// run (SIMULATION §25). Seed 42 in Calgary with the scripted `steady` player,
// which takes a placement when capital binds and launches the IPO as soon as
// it is eligible; the listing must land between week 104 and week 312.
import { describe, expect, it } from 'vitest';
import { STRATEGIES } from '../../scripts/strategies';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { capTableGap, identityGap } from '../helpers/markets';

describe('IPO acceptance (steady, seed 42, Calgary)', () => {
  it('lists between week 104 and week 312', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const steady = STRATEGIES.steady!;
    steady.setup(s);
    let worstGap = 0;
    for (let w = 1; w <= 312 && s.stock.status === 'private'; w++) {
      advanceWeeks(s, 1);
      steady.weekly(s);
      worstGap = Math.max(worstGap, identityGap(s));
    }
    expect(s.stock.status).toBe('public');
    expect(s.stock.listedWeek).toBeGreaterThanOrEqual(104);
    expect(s.stock.listedWeek).toBeLessThanOrEqual(312);
    expect(worstGap).toBeLessThan(1);
    expect(capTableGap(s)).toBe(0);
  }, 60_000);
});
