// Migration 26 → 27 (DESIGN decision log 2026-10-26): a generated city keeps
// the offices you lease and only as many unleased listings as the new count
// allows, and gains property buildings up to the new count. Existing
// buildings, listings and the game itself carry on.
import { describe, expect, it } from 'vitest';
import { OFFICE_LISTINGS, REAL_ESTATE } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { advanceWeeks } from '../../src/sim/engine';
import { listingsByDistrict } from '../../src/sim/hqSites';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState, type OfficeListing } from '../../src/sim/state';
import { bankWithFloors } from '../helpers/scenario';

type Raw = Record<string, unknown> & { schemaVersion: number };

/** A v26-shaped save: Calgary with its old five office listings and six buildings. */
function v26Save(): { raw: Raw; leasedId: string } {
  const s = bankWithFloors(['treasury'], { weeks: 8 });
  const raw = JSON.parse(JSON.stringify(s)) as Raw;
  const state = raw as unknown as GameState;
  const existing = Object.values(state.world.officeListings).filter((o) => o.cityId === 'cal');
  const leased = existing.find((o) => o.officeId)!;
  // Pad the city back up to the old count of five listings.
  const template = existing.find((o) => !o.officeId) ?? leased;
  for (let i = existing.length + 1; i <= 5; i++) {
    const id = `office_cal_${String(i).padStart(2, '0')}`;
    const copy: OfficeListing = { ...template, id, tile: { x: 90 + i, y: 90 } };
    delete copy.officeId;
    state.world.officeListings[id] = copy;
  }
  // Drop the buildings a v26 city never had.
  for (const site of Object.values(state.world.sites)) {
    if (site.kind === 'property' && Number(/_p(\d+)$/.exec(site.id)?.[1]) > 6) {
      delete state.world.sites[site.id];
      delete state.realEstate.listings[site.id];
    }
  }
  raw.schemaVersion = 26;
  return { raw, leasedId: leased.id };
}

describe('v26 → v27 migration', () => {
  it('keeps the leased office, trims the rest and tops up the buildings', () => {
    const { raw, leasedId } = v26Save();
    const before = (raw as unknown as GameState).world.sites;
    const kept = Object.entries(before)
      .filter(([, s]) => s.kind === 'property')
      .map(([id, s]) => [id, JSON.stringify(s)] as const);
    expect(kept).toHaveLength(6);

    const s = migrate(raw) as unknown as GameState;
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    const offices = Object.values(s.world.officeListings).filter((o) => o.cityId === 'cal');
    expect(offices).toHaveLength(OFFICE_LISTINGS.countBySize.M);
    expect(offices.some((o) => o.id === leasedId)).toBe(true);
    expect(s.offices[s.world.officeListings[leasedId]!.officeId!]).toBeDefined();

    const props = Object.values(s.world.sites).filter((x) => x.kind === 'property');
    expect(props).toHaveLength(REAL_ESTATE.buildingsPerCity.M);
    for (const [id, json] of kept) expect(JSON.stringify(s.world.sites[id])).toBe(json);
    const [lo, hi] = REAL_ESTATE.sqmRangeBySize.M;
    for (const p of props.slice(6)) {
      expect(p.property!.sqm).toBeGreaterThanOrEqual(lo);
      expect(p.property!.sqm).toBeLessThanOrEqual(hi);
    }

    advanceWeeks(s, 4);
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });

  it('keeps every leased office even past the new count', () => {
    const { raw } = v26Save();
    const state = raw as unknown as GameState;
    const unleased = Object.values(state.world.officeListings).filter((o) => !o.officeId);
    for (const o of unleased.slice(0, 3)) o.officeId = `office_fake_${o.id}`;
    const s = migrate(raw) as unknown as GameState;
    const offices = Object.values(s.world.officeListings).filter((o) => o.cityId === 'cal');
    expect(offices).toHaveLength(4);
    expect(offices.every((o) => o.officeId)).toBe(true);
  });
});

describe('office listings by district', () => {
  it('splits an exact total by largest remainder', () => {
    expect(listingsByDistrict(2)).toEqual([
      ['financial', 1],
      ['downtown', 1],
      ['midtown', 0],
    ]);
    expect(listingsByDistrict(3)).toEqual([
      ['financial', 1],
      ['downtown', 1],
      ['midtown', 1],
    ]);
    expect(listingsByDistrict(4)).toEqual([
      ['financial', 2],
      ['downtown', 1],
      ['midtown', 1],
    ]);
  });
});
