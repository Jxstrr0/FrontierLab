// The city-wide customer pool (SIMULATION §9.2): reach and room follow your
// customers across the city, and a full city stops sending new prospects.
import { describe, expect, it } from 'vitest';
import { CITY_BRANCH_GUIDE, CITY_MARKET, CITY_SATURATION_EXP } from '../../src/config/balance';
import {
  cityBranchGuide,
  cityCustomers,
  cityMarket,
  cityReach,
  cityRoom,
} from '../../src/sim/branch/cityMarket';
import { newGame } from '../../src/sim/newGame';
import { openScriptedBranch } from '../helpers/scenario';

describe('city market', () => {
  it('sizes the pool and the branch advice by city size', () => {
    expect(cityMarket('sas')).toBe(CITY_MARKET.S);
    expect(cityMarket('nyc')).toBe(CITY_MARKET.XL);
    expect(cityBranchGuide('cal')).toBe(CITY_BRANCH_GUIDE.M);
    expect(CITY_MARKET.S).toBeLessThan(CITY_MARKET.M);
    expect(CITY_MARKET.L).toBeLessThan(CITY_MARKET.XL);
  });

  it("counts your office's customers and shrinks room as reach grows", () => {
    const s = newGame({ seed: 11, cityId: 'cal', startCash: 3_500_000 });
    expect(cityRoom(s, 'cal')).toBe(1);
    const a = openScriptedBranch(s, 'midtown');
    s.branches[a]!.customers = CITY_MARKET.M * 0.5;
    expect(cityCustomers(s, 'cal')).toBeCloseTo(CITY_MARKET.M * 0.5);
    expect(cityReach(s, 'cal')).toBeCloseTo(0.5);
    expect(cityRoom(s, 'cal')).toBeCloseTo(1 - 0.5 ** CITY_SATURATION_EXP);
    // Other cities are untouched.
    expect(cityRoom(s, 'tor')).toBe(1);
    s.branches[a]!.customers = CITY_MARKET.M;
    expect(cityReach(s, 'cal')).toBe(1);
    expect(cityRoom(s, 'cal')).toBe(0);
  });
});
