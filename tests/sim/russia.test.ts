// Moscow and St Petersburg (CONTENT §1–2): Russia's economy and currency, the
// density that crowds Moscow's streets, its rivals and the v15 → v16 migration
// that adds Russia to existing saves.
import { describe, expect, it } from 'vitest';
import { CITY_MARKET, FX_START_INDEX } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { COUNTRIES } from '../../src/data/countries';
import { DISTRICT_SPECS } from '../../src/data/districts';
import { cityBranchGuide, cityMarket } from '../../src/sim/branch/cityMarket';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { addCapital, identityGap } from '../helpers/markets';
import { openScriptedBranch } from '../helpers/scenario';
import { fly } from '../helpers/world';

/** Mean foot traffic of a city's lots as a multiple of their district's typical traffic. */
function trafficRatio(s: GameState, cityId: string): number {
  const lots = Object.values(s.world.lots).filter((l) => l.cityId === cityId);
  const total = lots.reduce(
    (sum, l) => sum + l.footTraffic / DISTRICT_SPECS[l.district].footTraffic,
    0,
  );
  return total / lots.length;
}

describe('Russia', () => {
  it('starts a bank in Moscow with Russian rivals and a busy, crowded map', () => {
    const s = newGame({ seed: 42, cityId: 'mos' });
    expect(s.world.countries.RU).toBeDefined();
    const rivals = Object.values(s.rivals);
    expect(rivals.length).toBe(CITIES.mos!.rivals);
    expect(rivals.every((r) => r.cities.includes('mos'))).toBe(true);
    // Lot noise averages 1, so the mean ratio sits near the city's density.
    expect(trafficRatio(s, 'mos')).toBeGreaterThan(1.2);
    expect(cityMarket('mos')).toBeCloseTo(CITY_MARKET.XL * CITIES.mos!.density!);
    expect(cityBranchGuide('mos')).toBeGreaterThan(cityBranchGuide('tyo'));
  });

  it('runs a Moscow bank for a year with the books balanced', () => {
    const s = newGame({ seed: 7, cityId: 'mos' });
    openScriptedBranch(s, 'downtown');
    advanceWeeks(s, 52);
    expect(identityGap(s)).toBeLessThan(1);
    expect(s.flags.gameOver).toBeUndefined();
  });

  it('flies a Calgary bank to St Petersburg and opens there', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    addCapital(s, 10_000_000);
    fly(s, 'spb');
    expect(s.world.cities.spb).toBeDefined();
    openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 8);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it("draws Russia's cycle and currency from their own streams", () => {
    const a = newGame({ seed: 42, cityId: 'cal' });
    advanceWeeks(a, 26);
    expect(a.rng['macro:RU']).toBeDefined();
    expect(a.rng['fx:RU']).toBeDefined();
  });

  it('adds Russia to v15 saves', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    advanceWeeks(s, 4);
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    const world = raw.world as GameState['world'];
    delete world.countries.RU;
    const fx = raw.fx as GameState['fx'];
    delete fx.level.RU;
    delete fx.history.RU;
    raw.schemaVersion = 15;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.world.countries.RU!.policyRate).toBe(COUNTRIES.RU.startPolicy);
    expect(up.fx.level.RU).toBe(FX_START_INDEX);
    advanceWeeks(up, 4);
    expect(identityGap(up)).toBeLessThan(1);
  });
});
