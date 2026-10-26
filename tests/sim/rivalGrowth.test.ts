// Rivals that grow (SIMULATION §18.3–18.4): a roll per city served, entry into
// new cities (home country first, abroad once they serve a few), yearly
// learning from the cities you share, and no seeding of a bank that is gone.
import { describe, expect, it } from 'vitest';
import { RIVAL_EXPANSION, RIVAL_LEARNING } from '../../src/config/balance';
import { RIVALS } from '../../src/data/rivals';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { entryCity, runExpansion } from '../../src/sim/rivalExpansion';
import { learn, rivalsLearn } from '../../src/sim/rivalLearning';
import { generateCity } from '../../src/sim/worldGen';
import type { GameState, RivalBank } from '../../src/sim/state';
import { openScriptedBranch } from '../helpers/scenario';

/** A rival that passes every expansion test: a year of profit, strong capital, a network. */
function primed(s: GameState, bank: RivalBank): void {
  bank.quarters = [1, 2, 3, 4].map(() => ({ revenue: 1e6, netIncome: 5e5 }));
  bank.capitalRatio = 0.2;
  bank.equity = 1e9;
  while (bank.branches.length < RIVAL_EXPANSION.entryMinBranches) {
    bank.branches.push({ ...bank.branches[0]!, id: `${bank.id}_x${bank.branches.length}` });
  }
}

describe('rival city entry', () => {
  it('picks a generated home-country city it does not serve, with the most free lots', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 3 });
    const bank = Object.values(s.rivals).find((r) => RIVALS[r.id]!.home.length === 1)!;
    const lots = Object.values(s.world.lots);
    expect(entryCity(s, bank, lots)).toBeUndefined(); // only Calgary exists so far
    generateCity(s, 'van');
    generateCity(s, 'nyc');
    const all = Object.values(s.world.lots);
    const pick = entryCity(s, bank, all);
    // Vancouver is home ground; New York needs abroadMinCities cities first.
    expect(pick === 'van' || pick === undefined).toBe(true);
    if (pick === undefined) expect(bank.cities).toContain('van');
    bank.cities = ['cal', 'tor', 'mtl'];
    const abroad = entryCity(s, bank, all);
    expect(abroad === 'van' || abroad === 'nyc').toBe(true);
  });

  it('opens a first branch in the new city and announces it', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 3 });
    generateCity(s, 'van');
    const bank = Object.values(s.rivals).find((r) => RIVALS[r.id]!.home.includes('CA'))!;
    // Make sure it has Vancouver still to enter.
    for (const b of bank.branches.filter((x) => x.cityId === 'van')) {
      delete s.world.lots[b.lotId]!.occupant;
    }
    bank.branches = bank.branches.filter((b) => b.cityId !== 'van');
    bank.cities = bank.cities.filter((c) => c !== 'van');
    primed(s, bank);
    for (const other of Object.values(s.rivals)) if (other !== bank) other.status = 'seized';
    let entered = false;
    for (let i = 1; i <= 400 && !entered; i++) {
      s.clock.week = i * RIVAL_EXPANSION.everyWeeks;
      runExpansion(s);
      entered = s.events.log.some((e) => e.type === 'RIVAL_CITY_ENTRY');
    }
    expect(entered).toBe(true);
    expect(bank.cities).toContain('van');
    const there = bank.branches.filter((b) => b.cityId === 'van');
    expect(there.length).toBeGreaterThan(0);
    expect(s.world.lots[there[0]!.lotId]?.occupant).toEqual({ type: 'rival', id: bank.id });
    const e = s.events.log.find((ev) => ev.type === 'RIVAL_CITY_ENTRY')!;
    expect(e.payload.city).toBe('van');
    expect(e.payload.cities).toBe(bank.cities.length);
  });
});

describe('rivals learn (§18.3)', () => {
  it('moves quality coins a step toward your rating where you are better, and the app rating', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const id = openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 1);
    s.branches[id]!.ratings.overall = 4.8;
    s.company.appRating = 4.9;
    const bank = Object.values(s.rivals).find((r) => r.appRating < 4.9)!;
    const branch = bank.branches[0]!;
    branch.quality = [3, 3, 3, 3];
    branch.overall = 3;
    const app = bank.appRating;
    expect(learn(s, bank, new Map([['cal', 4.8]]))).toBeGreaterThan(0);
    expect(branch.quality).toEqual([3.1, 3.1, 3.1, 3.1]);
    expect(branch.overall).toBeCloseTo(3.1, 6);
    expect(bank.appRating).toBeCloseTo(app + RIVAL_LEARNING.step, 6);
    // Already ahead: nothing moves.
    branch.overall = 4.9;
    const before = [...branch.quality];
    learn(s, bank, new Map([['cal', 4.8]]));
    expect(branch.quality).toEqual(before);
  });

  it('does nothing in a city without your branches, and caps at maxQuality', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const bank = Object.values(s.rivals)[0]!;
    const before = bank.branches.map((b) => b.overall);
    rivalsLearn(s); // no open branches of yours anywhere
    expect(bank.branches.map((b) => b.overall)).toEqual(before);
    const branch = bank.branches[0]!;
    branch.quality = [4.55, 4.6, 4.6, 4.6];
    branch.overall = 4.0; // behind on paper, but the coins are at the cap
    learn(s, bank, new Map([['cal', 5]]));
    expect(Math.max(...branch.quality)).toBeLessThanOrEqual(RIVAL_LEARNING.maxQuality);
  });
});

describe('seeding a later city', () => {
  it('never brings back a bank you bought or the regulator seized', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 5 });
    const gone = Object.values(s.rivals).filter((r) => RIVALS[r.id]!.home.includes('CA'));
    gone[0]!.status = 'acquired';
    gone[1]!.status = 'seized';
    generateCity(s, 'tor');
    for (const lot of Object.values(s.world.lots)) {
      if (lot.cityId !== 'tor' || lot.occupant?.type !== 'rival') continue;
      expect(lot.occupant.id).not.toBe(gone[0]!.id);
      expect(lot.occupant.id).not.toBe(gone[1]!.id);
    }
    expect(gone[0]!.branches.every((b) => b.cityId !== 'tor')).toBe(true);
  });
});
