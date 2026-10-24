// Travel (DESIGN §5.17, SIMULATION §22): first-visit generation, the weekly
// allowance, fares (with the bank covering a short founder), the jet's range,
// upkeep and resale, and that visiting a city never shifts other cities.
import { describe, expect, it } from 'vitest';
import { FLIGHT_FARE, JET, TRAVEL_KM_PER_WEEK } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { JETS } from '../../src/data/jets';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { cityDistanceKm } from '../../src/sim/geo';
import { newGame } from '../../src/sim/newGame';
import { flightQuote, kmRemaining } from '../../src/sim/travel';
import { generateCity } from '../../src/sim/worldGen';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Travel Bank' });

describe('first visits', () => {
  it('generates a city on arrival, with lots, rivals, buildings and listings', () => {
    const s = game();
    expect(s.world.cities.nyc).toBeUndefined();
    const r = cmd.travelTo(s, 'nyc');
    expect(r.ok).toBe(true);
    expect(s.world.currentCityId).toBe('nyc');
    expect(s.world.cities.nyc?.generated).toBe(true);
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'nyc');
    expect(lots.length).toBeGreaterThan(50);
    expect(lots.some((l) => l.occupant?.type === 'rival')).toBe(true);
    const kinds = new Set(
      Object.values(s.world.sites)
        .filter((x) => x.cityId === 'nyc')
        .map((x) => x.kind),
    );
    for (const k of ['bureau', 'rivalHq', 'employer', 'investmentBank', 'property'])
      expect(kinds.has(k as never)).toBe(true);
    expect(
      Object.values(s.realEstate.listings).some((l) => s.world.sites[l.siteId]?.cityId === 'nyc'),
    ).toBe(true);
    expect(s.events.log.at(-1)).toMatchObject({
      type: 'FLIGHT_TAKEN',
      payload: { firstVisit: true },
    });
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });

  it('makes the same city whenever you first arrive', () => {
    const a = game();
    generateCity(a, 'lon');
    const b = game();
    advanceWeeks(b, 30);
    generateCity(b, 'lon');
    const lotsOf = (s: typeof a) =>
      Object.values(s.world.lots)
        .filter((l) => l.cityId === 'lon')
        .map((l) => [l.id, l.tile.x, l.tile.y, l.weeklyRent]);
    expect(lotsOf(b)).toEqual(lotsOf(a));
  });

  it('gives a regional site only an airport and its employers', () => {
    const s = game();
    cmd.travelTo(s, 'fmm');
    expect(Object.values(s.world.lots).some((l) => l.cityId === 'fmm')).toBe(false);
    const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'fmm');
    expect(sites.map((x) => x.refId)).toEqual(['Athabasca Sands Camp']);
    advanceWeeks(s, 2);
    expect(s.flags.gameOver).toBeUndefined();
  });
});

describe('the weekly allowance', () => {
  it('flies free within the allowance and charges a fare past it', () => {
    const s = game();
    s.personal.cash = 1_000_000;
    const km = cityDistanceKm('cal', 'syd');
    expect(cmd.travelTo(s, 'syd')).toEqual({ ok: true, km, mode: 'free', fare: 0 });
    expect(kmRemaining(s)).toBe(TRAVEL_KM_PER_WEEK - km);
    // Sydney → London is longer than what's left.
    const q = flightQuote(s, 'lon');
    expect(q.mode).toBe('fare');
    expect(q.fare).toBe(Math.round(FLIGHT_FARE * CITIES.lon!.costIndex));
    cmd.travelTo(s, 'lon');
    expect(s.personal.cash).toBe(1_000_000 - q.fare);
    expect(kmRemaining(s)).toBe(TRAVEL_KM_PER_WEEK - km);
    expect(s.world.travel.flights).toBe(2);
    advanceWeeks(s, 1);
    expect(kmRemaining(s)).toBe(TRAVEL_KM_PER_WEEK);
  });

  it('never blocks: the bank pays what personal cash cannot', () => {
    const s = game();
    s.world.travel.kmThisWeek = TRAVEL_KM_PER_WEEK;
    s.personal.cash = 10_000;
    const fare = Math.round(FLIGHT_FARE * CITIES.van!.costIndex);
    const cash = s.company.cash;
    expect(cmd.travelTo(s, 'van').ok).toBe(true);
    expect(s.personal.cash).toBe(0);
    expect(s.company.cash).toBeCloseTo(cash - (fare - 10_000), 6);
    expect(s.ledger.pnl.travel).toBeCloseTo(fare - 10_000, 6);
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });

  it('refuses a flight to where you already are', () => {
    expect(cmd.travelTo(game(), 'cal').ok).toBe(false);
  });
});

describe('private jet', () => {
  it('flies free within its range, costs upkeep and sells at a haircut', () => {
    const s = game();
    expect(cmd.buyJet(s, 'corvid600').ok).toBe(false);
    s.personal.cash = 30_000_000;
    expect(cmd.buyJet(s, 'corvid600').ok).toBe(true);
    expect(cmd.buyJet(s, 'albatross8000').ok).toBe(false);
    s.world.travel.kmThisWeek = TRAVEL_KM_PER_WEEK;
    // Calgary → Toronto is inside the Corvid's 6,000 km; Calgary → Sydney isn't.
    expect(cmd.travelTo(s, 'syd', { jet: true }).ok).toBe(false);
    const cash = s.personal.cash;
    expect(cmd.travelTo(s, 'tor', { jet: true })).toMatchObject({ ok: true, mode: 'jet', fare: 0 });
    expect(s.personal.cash).toBe(cash);
    const value = s.personal.jet!.value;
    advanceWeeks(s, 1);
    expect(s.personal.jet!.value).toBeCloseTo(value * (1 - JET.depreciation / 52), 6);
    const resale = s.personal.jet!.value * (1 - JET.resaleHaircut);
    const before = s.personal.cash;
    expect(cmd.sellJet(s)).toEqual({ ok: true, price: resale });
    expect(s.personal.cash).toBeCloseTo(before + resale, 6);
    expect(s.personal.jet).toBeUndefined();
    expect(JETS.albatross8000!.rangeKm).toBeNull();
  });
});
