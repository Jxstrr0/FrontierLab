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
    const pins = buildPins(s, map, lots);
    expect(pins).toHaveLength(lots.length);
    const mine = pins[0]!;
    expect(mine.kind).toBe('mine');
    expect(mine.branchId).toBe(branchId);
    expect(mine.label).toMatch(/^Your branch, /);
    const lot = s.world.lots[mine.id]!;
    const floors = map.floors[lot.tile.y * map.tiles + lot.tile.x]!;
    expect({ x: mine.x, y: mine.y }).toEqual(roofAnchor(map.tiles, lot.tile.x, lot.tile.y, floors));
    expect(pins.some((p) => p.kind === 'rival')).toBe(true);
    const lease = pins.find((p) => p.kind === 'lease')!;
    expect(lease.label).toBe(`For lease, ${s.world.lots[lease.id]!.address}`);
  });

  it('follows the layer settings', () => {
    const { s, lots, map } = setup();
    cmd.setSettings(s, { layers: { [LEASE_ONLY_KEY]: true } });
    const leaseOnly = buildPins(s, map, lots);
    expect(leaseOnly.length).toBeGreaterThan(0);
    expect(leaseOnly.every((p) => p.kind === 'lease')).toBe(true);
    cmd.setSettings(s, { layers: { branches: false } });
    expect(buildPins(s, map, lots)).toEqual([]);
  });

  it('tells the renderer who occupies each lot, in their ink', () => {
    const { s, lots } = setup();
    const occ = Object.values(occupantsOf(s, lots));
    expect(occ.filter((o) => o.type === 'player')).toEqual([
      { type: 'player', ink: s.meta.brandInk },
    ]);
    expect(occ.some((o) => o.type === 'rival')).toBe(true);
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
