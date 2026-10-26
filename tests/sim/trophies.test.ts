// Trophy assets (SIMULATION §22a): bought at the home price list with personal
// cash, valued with the list plus drift, upkeep paid weekly, sold less the fee,
// counted in net worth; the airline makes flights free.
import { describe, expect, it } from 'vitest';
import { TROPHIES_CFG, WEEKS_PER_YEAR } from '../../src/config/balance';
import { TROPHIES } from '../../src/data/trophies';
import * as cmd from '../../src/sim/commands';
import { netWorth } from '../../src/sim/netWorth';
import { newGame } from '../../src/sim/newGame';
import { homeCountry } from '../../src/sim/treasury';
import { fareTo } from '../../src/sim/travel';
import { runTrophies, trophyPrice } from '../../src/sim/trophies';
import type { GameState } from '../../src/sim/state';

function rich(cash = 20e9): GameState {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
  s.personal.cash = cash;
  return s;
}

describe('trophy assets (§22a)', () => {
  it('charges the catalogue price at the home price list', () => {
    const s = rich();
    expect(trophyPrice(s, 'island')).toBe(TROPHIES.island!.price);
    homeCountry(s).listIndex = 1.5;
    expect(trophyPrice(s, 'island')).toBe(Math.round(TROPHIES.island!.price * 1.5));
  });

  it('buys with personal cash, once, and counts in net worth', () => {
    const s = rich();
    const worth0 = netWorth(s).total;
    expect(cmd.buyTrophy(s, 'painting').ok).toBe(true);
    expect(s.personal.cash).toBe(20e9 - TROPHIES.painting!.price);
    expect(netWorth(s).trophies).toBe(TROPHIES.painting!.price);
    expect(netWorth(s).total).toBeCloseTo(worth0, 0);
    expect(cmd.buyTrophy(s, 'painting').ok).toBe(false);
    expect(s.events.log.some((e) => e.type === 'TROPHY_BOUGHT')).toBe(true);
  });

  it('refuses without the cash', () => {
    const s = rich(1e6);
    expect(cmd.trophyBlocker(s, 'station')).toMatch(/of your own/);
    expect(cmd.buyTrophy(s, 'station').ok).toBe(false);
  });

  it('follows the price list, drifts and pays upkeep each week', () => {
    const s = rich();
    cmd.buyTrophy(s, 'yacht');
    const t = s.personal.empire.trophies![0]!;
    const spec = TROPHIES.yacht!;
    const cash = s.personal.cash;
    homeCountry(s).listIndex = 1.1;
    runTrophies(s);
    const expected = spec.price * 1.1 * (1 + spec.drift / WEEKS_PER_YEAR);
    expect(t.value).toBeCloseTo(expected, 0);
    expect(cash - s.personal.cash).toBeCloseTo((expected * spec.upkeep) / WEEKS_PER_YEAR, 3);
  });

  it('sells for value less the fee', () => {
    const s = rich();
    cmd.buyTrophy(s, 'vineyard');
    const value = s.personal.empire.trophies![0]!.value;
    const cash = s.personal.cash;
    const r = cmd.sellTrophy(s, 'vineyard');
    expect(r.ok && r.raised).toBeCloseTo(value * (1 - TROPHIES_CFG.sellFee), 3);
    expect(s.personal.cash - cash).toBeCloseTo(value * (1 - TROPHIES_CFG.sellFee), 3);
    expect(s.personal.empire.trophies).toHaveLength(0);
  });

  it('makes every flight free with the airline', () => {
    const s = rich();
    expect(fareTo(s, 'tor')).toBeGreaterThan(0);
    cmd.buyTrophy(s, 'airline');
    expect(fareTo(s, 'tor')).toBe(0);
  });
});
