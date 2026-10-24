import { describe, expect, it } from 'vitest';
import { clusterLevel, clusterPins, clusterRadius } from '../../src/app/map/cluster';
import { buildPins, occupantsOf } from '../../src/app/map/pins';
import { generateCityMap } from '../../src/art/citygen';
import { roofAnchor } from '../../src/art/iso';
import { FEATURES } from '../../src/config/balance';
import { CLUSTER_RADIUS_PX } from '../../src/config/mapView';
import { CITIES } from '../../src/data/cities';
import { availableLayers, LEASE_ONLY_KEY, MAP_LAYERS } from '../../src/data/mapLayers';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import { openScriptedBranch } from '../helpers/scenario';

describe('pin clustering', () => {
  const pts = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 20, y: 0 },
    { id: 'c', x: 0, y: 30 },
    { id: 'd', x: 200, y: 200 },
    { id: 'e', x: 230, y: 200 },
  ];

  it('merges pins within the radius of a seed, in the given order', () => {
    const cl = clusterPins(pts, 36);
    expect(cl.map((c) => [c.key, c.members.map((m) => m.id)])).toEqual([
      ['a', ['a', 'b', 'c']],
      ['d', ['d', 'e']],
    ]);
    expect(cl[1]!.x).toBe(215);
    expect(cl[1]!.y).toBe(200);
  });

  it('keeps every pin exactly once', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({
      id: `p${i}`,
      x: (i * 37) % 900,
      y: (i * 53) % 700,
    }));
    const ids = clusterPins(many, 36).flatMap((c) => c.members.map((m) => m.id));
    expect(ids.sort()).toEqual(many.map((p) => p.id).sort());
  });

  it('does not depend on the camera, only on the zoom level', () => {
    // Same zoom level, same clusters: panning can't reshuffle them.
    expect(clusterLevel(0.62)).toBe(clusterLevel(0.6));
    expect(clusterRadius(0.62)).toBe(clusterRadius(0.6));
    expect(clusterRadius(0.5)).toBeCloseTo(CLUSTER_RADIUS_PX / 0.5);
    expect(clusterLevel(0.7)).toBeLessThanOrEqual(0.7);
  });
});

/** Feature sets with the HQ stage off and on, whatever the build's flags say. */
const NO_HQ = { ...FEATURES, hq: false, competition: false };
const WITH_HQ = {
  ...FEATURES,
  hq: true,
  competition: false,
  capitalMarkets: false,
  investments: false,
};
const STAGE5 = {
  ...FEATURES,
  hq: true,
  competition: true,
  capitalMarkets: false,
  investments: false,
};
const STAGE6 = {
  ...FEATURES,
  hq: true,
  competition: true,
  capitalMarkets: true,
  investments: false,
};

describe('map pins', () => {
  function setup() {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Pin Bank' });
    const branchId = openScriptedBranch(s, 'midtown');
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'cal');
    const map = generateCityMap(CITIES.cal!, s.meta.seed, lots);
    return { s, branchId, lots, map };
  }

  it('has one pin per storefront, yours first, anchored on the roof', () => {
    const { s, branchId, lots, map } = setup();
    const pins = buildPins(s, map, lots, NO_HQ);
    expect(pins).toHaveLength(lots.length);
    const mine = pins[0]!;
    expect(mine.kind).toBe('mine');
    expect(mine.branchId).toBe(branchId);
    expect(mine.label).toMatch(/^Your branch, /);
    const lot = s.world.lots[mine.id]!;
    const floors = map.floors[lot.tile.y * map.tiles + lot.tile.x]!;
    expect({ x: mine.x, y: mine.y }).toEqual(roofAnchor(map.tiles, lot.tile.x, lot.tile.y, floors));
    expect(pins.some((p) => p.kind === 'rival')).toBe(true);
    const open = pins.find((p) => p.kind === 'lot')!;
    expect(open.label).toBe(`Available branch location, ${s.world.lots[open.id]!.address}`);
  });

  it('follows the layer settings', () => {
    const { s, lots, map } = setup();
    cmd.setSettings(s, { layers: { [LEASE_ONLY_KEY]: true } });
    const leaseOnly = buildPins(s, map, lots, NO_HQ);
    expect(leaseOnly.length).toBeGreaterThan(0);
    expect(leaseOnly.every((p) => p.kind === 'lot')).toBe(true);
    cmd.setSettings(s, { layers: { branches: false } });
    expect(buildPins(s, map, lots, NO_HQ)).toEqual([]);
  });

  it('tells the renderer who occupies each lot, in their ink', () => {
    const { s, lots } = setup();
    const occ = Object.values(occupantsOf(s, lots, NO_HQ));
    expect(occ.filter((o) => o.type === 'player')).toEqual([
      { type: 'player', ink: s.meta.brandInk },
    ]);
    expect(occ.some((o) => o.type === 'rival')).toBe(true);
  });
});

describe('HQ pins (Stage 4)', () => {
  function setup() {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Pin Bank' });
    s.company.cash = 50_000_000;
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'cal');
    const offices = Object.values(s.world.officeListings).filter((o) => o.cityId === 'cal');
    const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'cal');
    const map = generateCityMap(CITIES.cal!, s.meta.seed, lots, { offices, sites });
    return { s, lots, offices, sites, map };
  }

  it('adds offices for lease, credit bureaus and agencies only with the HQ stage', () => {
    const { s, lots, offices, sites, map } = setup();
    expect(
      buildPins(s, map, lots, NO_HQ).every((p) => p.kind === 'rival' || p.kind === 'lot'),
    ).toBe(true);
    const pins = buildPins(s, map, lots, WITH_HQ);
    const officePins = pins.filter((p) => p.kind === 'office');
    expect(officePins.map((p) => p.id).sort()).toEqual(offices.map((o) => o.id).sort());
    const o = offices.find((x) => x.id === officePins[0]!.id)!;
    expect(officePins[0]!.label).toBe(`Office for lease, ${o.address}, ${o.floors} floors`);
    expect(officePins[0]!.icon).toBe('offices');
    const floors = map.floors[o.tile.y * map.tiles + o.tile.x]!;
    expect({ x: officePins[0]!.x, y: officePins[0]!.y }).toEqual(
      roofAnchor(map.tiles, o.tile.x, o.tile.y, floors),
    );
    expect(pins.filter((p) => p.kind === 'bureau').length).toBe(
      sites.filter((x) => x.kind === 'bureau').length,
    );
    const agencies = pins.filter((p) => p.kind === 'agency');
    expect(agencies.length).toBe(sites.filter((x) => x.kind === 'agency').length);
    expect(agencies.length).toBeGreaterThan(0);
    expect(agencies[0]!.label).toMatch(/, marketing agency, /);
    expect(agencies[0]!.icon).toBe('marketingAgencies');
  });

  it('shows a leased office as your HQ in brand ink, stacked with your pins', () => {
    const { s, lots, offices, map } = setup();
    const listing = offices[0]!;
    const r = cmd.leaseOffice(s, listing.id, ['finance']);
    expect(r.ok).toBe(true);
    const pins = buildPins(s, map, lots, WITH_HQ);
    const hq = pins.find((p) => p.id === listing.id)!;
    expect(hq.kind).toBe('hq');
    expect(hq.label).toBe(`Your HQ, ${listing.address}`);
    expect(hq.ink).toBe(s.meta.brandInk);
    expect(hq.monogram).toBe(s.meta.monogram);
    expect(hq.officeId).toBe(r.ok ? r.officeId : undefined);
    expect(pins[0]!.kind).toBe('hq');
    expect(occupantsOf(s, lots, WITH_HQ)[listing.id]).toEqual({
      type: 'player',
      ink: s.meta.brandInk,
    });
    expect(occupantsOf(s, lots, NO_HQ)[listing.id]).toBeUndefined();
  });

  it('follows the Offices, Credit Bureaus and Marketing Agencies layers', () => {
    const { s, lots, map } = setup();
    cmd.setSettings(s, { layers: { branches: false, offices: false } });
    const kinds = new Set(buildPins(s, map, lots, WITH_HQ).map((p) => p.kind));
    expect([...kinds].sort()).toEqual(['agency', 'bureau']);
    // setSettings replaces the whole layers map.
    cmd.setSettings(s, {
      layers: { branches: false, offices: false, creditBureaus: false, marketingAgencies: false },
    });
    expect(buildPins(s, map, lots, WITH_HQ)).toEqual([]);
  });

  it('clusters HQ pins with the rest', () => {
    const { s, lots, map } = setup();
    const pins = buildPins(s, map, lots, WITH_HQ);
    const ids = clusterPins(pins, clusterRadius(0.4)).flatMap((c) => c.members.map((m) => m.id));
    expect(ids.sort()).toEqual(pins.map((p) => p.id).sort());
  });
});

describe('Stage 5 pins', () => {
  it('adds rival head offices, employers, the university and the central bank', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Pin Bank' });
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'cal');
    const offices = Object.values(s.world.officeListings).filter((o) => o.cityId === 'cal');
    const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'cal');
    const map = generateCityMap(CITIES.cal!, s.meta.seed, lots, { offices, sites });
    const pins = buildPins(s, map, lots, STAGE5);
    const hqs = pins.filter((p) => p.kind === 'rivalHq');
    expect(hqs.length).toBe(Object.values(s.rivals).length);
    expect(hqs[0]!.label).toMatch(/ head office, /);
    expect(pins.filter((p) => p.kind === 'employer').length).toBeGreaterThanOrEqual(2);
    expect(pins.filter((p) => p.kind === 'university')).toHaveLength(1);
    const cb = pins.find((p) => p.kind === 'centralBank')!;
    expect(cb.countryId).toBe('CA');
    expect(cb.label).toBe('Bank of Canada');
    cmd.setSettings(s, { layers: { banks: false, employers: false, universities: false } });
    const kinds = new Set(buildPins(s, map, lots, STAGE5).map((p) => p.kind));
    for (const k of ['rivalHq', 'centralBank', 'employer', 'university'] as const)
      expect(kinds.has(k)).toBe(false);
  });

  it('marks an employer you partner with in your brand ink', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Pin Bank' });
    const branchId = openScriptedBranch(s, 'midtown');
    s.branches[branchId]!.status = 'open';
    s.company.cash += 5_000_000;
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'cal');
    const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'cal');
    const map = generateCityMap(CITIES.cal!, s.meta.seed, lots, { sites });
    const employer = sites.find((x) => x.kind === 'employer')!;
    const before = buildPins(s, map, lots, STAGE5).find((p) => p.id === employer.id)!;
    expect(before.partner).toBeUndefined();
    expect(cmd.signPartnership(s, employer.id, branchId, 'savings').ok).toBe(true);
    const after = buildPins(s, map, lots, STAGE5).find((p) => p.id === employer.id)!;
    expect(after.partner).toBe(true);
    expect(after.ink).toBe(s.meta.brandInk);
    expect(after.label).toMatch(/your partner/);
  });
});

describe('map layers', () => {
  it('lists the 14 layer types and only offers those whose stage is on', () => {
    expect(MAP_LAYERS).toHaveLength(14);
    expect(new Set(MAP_LAYERS.map((l) => l.id)).size).toBe(14);
    for (const l of availableLayers()) expect(FEATURES[l.feature]).toBe(true);
    const mapOnly = { ...FEATURES, cityMap: true, hq: false };
    expect(availableLayers(mapOnly).map((l) => l.id)).toContain('branches');
    const none = Object.fromEntries(Object.keys(FEATURES).map((k) => [k, false])) as Record<
      keyof typeof FEATURES,
      boolean
    >;
    expect(availableLayers(none)).toEqual([]);
  });
});

describe('Stage 6 pins', () => {
  it("adds the city's investment bank as a type medallion", () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Pin Bank' });
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'cal');
    const offices = Object.values(s.world.officeListings).filter((o) => o.cityId === 'cal');
    const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'cal');
    const map = generateCityMap(CITIES.cal!, s.meta.seed, lots, { offices, sites });
    const ib = buildPins(s, map, lots, STAGE6).filter((p) => p.kind === 'investmentBank');
    expect(ib.map((p) => p.label.split(',')[0])).toEqual(['Ashgrove Capital']);
    expect(ib[0]!.icon).toBe('investmentBanks');
    expect(buildPins(s, map, lots, STAGE5).some((p) => p.kind === 'investmentBank')).toBe(false);
  });
});
