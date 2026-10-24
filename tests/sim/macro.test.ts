import { describe, expect, it } from 'vitest';
import { creditCycle, initCountry, loanDemand, updateMacro } from '../../src/sim/macro';
import { newGame } from '../../src/sim/newGame';
import { rngFromState, hashSeed } from '../../src/sim/rng';

describe('macro (§4)', () => {
  it('derives factors with percent and decimal units kept apart', () => {
    const c = initCountry('CA', rngFromState(hashSeed(1, 'm')));
    c.unemployment = 7.6;
    expect(creditCycle(c)).toBeCloseTo(1.91); // 1 + 0.35 × 2.6
    c.gdp = 2;
    c.policyRate = 0.0275; // at neutral
    expect(loanDemand(c)).toBeCloseTo(1);
    c.policyRate = 0.0375; // 1pp above neutral
    expect(loanDemand(c)).toBeCloseTo(0.88);
  });

  it('hikes in 25bp steps toward the rule in an expansion (Bank of Canada starts below it)', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const ca = s.world.countries.CA!;
    ca.weeksInPhase = 0; // stay in expansion for the test
    const start = ca.policyRate;
    for (let week = 1; week <= 12; week++) {
      s.clock.week = week;
      s.clock.day = week * 7;
      updateMacro(s);
    }
    const moves = Math.round((ca.policyRate - start) / 0.0025);
    expect(moves).toBeGreaterThanOrEqual(1);
    expect((ca.policyRate * 1e4) % 25).toBeCloseTo(0);
    expect(s.events.log.some((e) => e.type === 'CB_DECISION')).toBe(true);
  });
});
