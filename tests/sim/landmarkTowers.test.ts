// Landmark towers (src/sim/landmarkTowers.ts, SIMULATION §16.1): London and
// Moscow each list one giant Financial District office, big enough for every
// department; other cities don't; save migration 24 → 25 adds it to old saves.
import { describe, expect, it } from 'vitest';
import { LANDMARK_TOWERS } from '../../src/data/landmarkTowers';
import * as cmd from '../../src/sim/commands';
import { deptAvailable } from '../../src/sim/commands/hq';
import { towerListingId } from '../../src/sim/landmarkTowers';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { DeptId } from '../../src/sim/state';
import { DEPARTMENTS } from '../../src/data/departments';

describe('landmark towers', () => {
  it.each(Object.entries(LANDMARK_TOWERS))(
    '%s lists its tower in the Financial District',
    (id, spec) => {
      const s = newGame({ seed: 42, cityId: id, bankName: 'Test Lab' });
      const tower = s.world.officeListings[towerListingId(id)]!;
      expect(tower).toMatchObject({ cityId: id, district: 'financial', floors: spec.floors });
      expect(tower.desksPerFloor).toBe(32);
      expect(tower.floors).toBeGreaterThanOrEqual(10);
      // Its tile is its own: no lot, other listing or site shares it.
      const key = `${tower.tile.x},${tower.tile.y}`;
      const tiles = [
        ...Object.values(s.world.lots).filter((l) => l.cityId === id),
        ...Object.values(s.world.officeListings).filter(
          (o) => o.cityId === id && o.id !== tower.id,
        ),
        ...Object.values(s.world.sites).filter((x) => x.cityId === id),
      ].map((p) => `${p.tile.x},${p.tile.y}`);
      expect(tiles).not.toContain(key);
    },
  );

  it('is not listed in other cities', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Lab' });
    expect(Object.keys(s.world.officeListings).some((k) => k.endsWith('_tower'))).toBe(false);
  });

  it('holds every department, with floors to spare', () => {
    const s = newGame({ seed: 42, cityId: 'lon', bankName: 'Test Lab' });
    s.company.cash += 50_000_000;
    s.company.paidInCapital += 50_000_000;
    const depts = (Object.keys(DEPARTMENTS) as DeptId[]).filter(deptAvailable);
    const r = cmd.leaseOffice(s, towerListingId('lon'), depts);
    expect(r.ok).toBe(true);
    const office = s.offices[r.ok ? r.officeId : '']!;
    // Spare floors take a second floor of any department.
    expect(cmd.addFloor(s, office.id, 'products').ok).toBe(true);
    expect(office.floors.filter((f) => f !== null)).toHaveLength(depts.length + 1);
    expect(office.floors.length).toBeGreaterThan(depts.length + 1);
  });

  it('migration 24 → 25 adds the tower where an old save already has London', () => {
    const s = newGame({ seed: 42, cityId: 'lon', bankName: 'Test Lab' });
    const id = towerListingId('lon');
    const tile = s.world.officeListings[id]!.tile;
    // An old save has neither the listing nor its stream.
    delete s.world.officeListings[id];
    delete s.rng['tower:lon'];
    const listings = Object.keys(s.world.officeListings).length;
    migrations[24]!(s as never);
    expect(Object.keys(s.world.officeListings)).toHaveLength(listings + 1);
    expect(s.world.officeListings[id]!.tile).toEqual(tile);
    migrations[24]!(s as never); // safe to run twice
    expect(Object.keys(s.world.officeListings)).toHaveLength(listings + 1);
  });
});
