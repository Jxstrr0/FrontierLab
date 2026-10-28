// New regions (SIMULATION §20a): the late cities stay closed until
// NEW_REGIONS.openWeek, the news says when they open, and the first sales
// office in one pays the market-entry licence once.
import { describe, expect, it } from 'vitest';
import { NEW_REGIONS } from '../../src/config/balance';
import { CITIES, START_CITIES } from '../../src/data/cities';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import * as cmd from '../../src/sim/commands';
import { cityLicenceDue, cityOpen, runRegions } from '../../src/sim/regions';
import { migrate } from '../../src/sim/save/migrations';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/markets';
import { freeLot } from '../helpers/scenario';

const LATE = Object.keys(CITIES).filter((id) => CITIES[id]!.late);

/** A Calgary lab at the week the regions open, with owner's capital to spend. */
function openGame(): GameState {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Region Lab' });
  s.clock.week = NEW_REGIONS.openWeek;
  s.company.cash += 500_000_000;
  s.company.paidInCapital += 500_000_000;
  return s;
}

describe('new regions', () => {
  it('lists eight late cities, none of them a start city', () => {
    expect(LATE).toHaveLength(8);
    for (const id of LATE) expect(START_CITIES).not.toContain(id);
  });

  it('keeps the late cities closed to flights before openWeek', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Region Lab' });
    expect(cityOpen(s, 'bos')).toBe(false);
    expect(cityOpen(s, 'van')).toBe(true);
    const r = cmd.travelTo(s, 'bos');
    expect(r.ok).toBe(false);
    s.clock.week = NEW_REGIONS.openWeek;
    expect(cityOpen(s, 'bos')).toBe(true);
  });

  it('announces the opening once, in the week it happens', () => {
    const s = openGame();
    runRegions(s);
    const news = s.events.log.filter((e) => e.type === 'REGIONS_OPENED');
    expect(news).toHaveLength(1);
    s.clock.week += 1;
    runRegions(s);
    expect(s.events.log.filter((e) => e.type === 'REGIONS_OPENED')).toHaveLength(1);
  });

  it('charges the licence on the first office in a late city, and only once', () => {
    const s = openGame();
    expect(cmd.travelTo(s, 'aus').ok).toBe(true);
    const lot = freeLot(s);
    const quote = cmd.buildQuote(s, lot.id, REFERENCE_BUILDS.mid);
    expect(quote.licence).toBe(cityLicenceDue(s, 'aus'));
    expect(quote.licence).toBeGreaterThanOrEqual(NEW_REGIONS.licence.M);
    const cash = s.company.cash;
    const r = cmd.buildBranch(s, { lotId: lot.id, build: REFERENCE_BUILDS.mid });
    expect(r.ok).toBe(true);
    expect(cash - s.company.cash).toBeCloseTo(quote.total);
    expect(s.world.cities.aus!.licensed).toBe(true);
    expect(cityLicenceDue(s, 'aus')).toBe(0);
    expect(Math.abs(identityGap(s))).toBeLessThan(1);
  });

  it('charges no licence in an old city', () => {
    const s = openGame();
    const lot = freeLot(s);
    expect(cmd.buildQuote(s, lot.id, REFERENCE_BUILDS.mid).licence).toBe(0);
  });

  it('migrates a schema 27 save unchanged', () => {
    const s = openGame();
    const raw = { ...(structuredClone(s) as object), schemaVersion: 27 } as never;
    const m = migrate(raw) as unknown as GameState;
    expect(m.world.cities).toEqual(s.world.cities);
  });
});
