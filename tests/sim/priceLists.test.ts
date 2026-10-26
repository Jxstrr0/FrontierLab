// Price lists and city growth (SIMULATION §4.6, CONTENT §3): catalogue prices
// are charged at each country's list level, which steps to the nominal index
// at the year end along with every rent; and cities open new storefronts every
// few years.
import { describe, expect, it } from 'vitest';
import { CITY_GROWTH, WEEKS_PER_YEAR } from '../../src/config/balance';
import { CARS } from '../../src/data/cars';
import { EQUIPMENT } from '../../src/data/equipment';
import { growCities, growCity, growthLots } from '../../src/sim/cityGrowth';
import * as cmd from '../../src/sim/commands';
import { listLevel, listPrice } from '../../src/sim/nominal';
import { newGame } from '../../src/sim/newGame';
import { reviewPriceLists } from '../../src/sim/priceList';
import { type GameState } from '../../src/sim/state';
import { openScriptedBranch } from '../helpers/scenario';

const lotsIn = (s: GameState, cityId: string) =>
  Object.values(s.world.lots).filter((l) => l.cityId === cityId);

describe('price lists (§4.6)', () => {
  it('start at 1 and step to the nominal index at the review, moving rents by the same step', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    const branchId = openScriptedBranch(s, 'midtown');
    const ca = s.world.countries.CA!;
    expect(listLevel(s, 'cal')).toBe(1);
    const lot = lotsIn(s, 'cal').find((l) => !l.occupant)!;
    const rent = lot.weeklyRent;
    const lease = s.branches[branchId]!.lease.weeklyRent;
    const deposit = s.branches[branchId]!.lease.deposit;
    ca.nominal = 1.25;
    reviewPriceLists(s);
    expect(ca.listIndex).toBe(1.25);
    expect(listLevel(s, 'cal')).toBe(1.25);
    expect(lot.weeklyRent).toBe(Math.round(rent * 1.25));
    expect(s.branches[branchId]!.lease.weeklyRent).toBe(Math.round(lease * 1.25));
    // The deposit was paid at signing and comes back as paid.
    expect(s.branches[branchId]!.lease.deposit).toBe(deposit);
    // A second review with no growth changes nothing.
    reviewPriceLists(s);
    expect(lot.weeklyRent).toBe(Math.round(rent * 1.25));
  });

  it('charges builds, cars and fit-outs at today’s list', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    s.world.countries.CA!.nominal = 2;
    reviewPriceLists(s);
    const lot = lotsIn(s, 'cal').find((l) => !l.occupant)!;
    const build = { lobby: 'lobby_1', teller: 'teller_1', atm: 'atm_0', vault: 'vault_1' };
    const valid = Object.values(build).every((id) => EQUIPMENT[id]);
    if (valid) {
      const q = cmd.buildQuote(s, lot.id, build as never);
      const base = Object.values(build).reduce((t, id) => t + EQUIPMENT[id]!.cost, 0);
      expect(q.parts).toBe(base * 2);
    }
    const car = Object.values(CARS)[0]!;
    expect(listPrice(s, car.price, 'cal')).toBe(car.price * 2);
    expect(cmd.floorFitout(s, 'cal')).toBe(
      2 * cmd.floorFitout(newGame({ seed: 5, cityId: 'cal' }), 'cal'),
    );
  });
});

describe('city growth (CONTENT §3)', () => {
  it('adds share × the starting count, at today’s rents, up to maxGrowth', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    const base = lotsIn(s, 'cal').length;
    const step = Math.max(1, Math.round(base * CITY_GROWTH.share));
    expect(growthLots(s, 'cal')).toBe(step);
    const added = growCity(s, 'cal', growthLots(s, 'cal'));
    expect(added).toBe(step);
    expect(lotsIn(s, 'cal').length).toBe(base + step);
    expect(s.world.cities.cal!.grownLots).toBe(step);
    // Every new lot sits on its own tile.
    const tiles = new Set(lotsIn(s, 'cal').map((l) => `${l.tile.x},${l.tile.y}`));
    expect(tiles.size).toBe(base + step);
    // Grow until the cap (or the street frontage) stops it.
    for (let i = 0; i < 40; i++) growCity(s, 'cal', growthLots(s, 'cal'));
    expect(s.world.cities.cal!.grownLots!).toBeLessThanOrEqual(
      Math.floor(base * CITY_GROWTH.maxGrowth),
    );
    expect(growthLots(s, 'cal')).toBe(0);
  });

  it('grows every everyYears at the year end and announces it', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    const base = lotsIn(s, 'cal').length;
    s.clock.week = WEEKS_PER_YEAR; // year 1: no growth
    growCities(s);
    expect(lotsIn(s, 'cal').length).toBe(base);
    s.clock.week = WEEKS_PER_YEAR * CITY_GROWTH.everyYears;
    growCities(s);
    expect(lotsIn(s, 'cal').length).toBeGreaterThan(base);
    expect(s.events.log.some((e) => e.type === 'CITY_GROWTH')).toBe(true);
  });
});
