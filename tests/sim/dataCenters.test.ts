// Data centers (stage C2c, SIMULATION §9.9): build on a free lot or at an
// energy site, fit-out then open, the weekly power bill, the Service lift for
// nearby sales offices, part upgrades, closing, and the 3 → 4 migration.
import { describe, expect, it } from 'vitest';
import { DATA_CENTER } from '../../src/config/balance';
import { DC_PARTS, DEFAULT_DC_BUILD } from '../../src/data/dataCenters';
import * as cmd from '../../src/sim/commands';
import { hallWeeks, latencyLift, powerBill, pueOf, usableGpus } from '../../src/sim/dataCenters';
import { advanceWeeks } from '../../src/sim/engine';
import { cityDistanceKm } from '../../src/sim/geo';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import { addCapital, identityGap } from '../helpers/mergers';
import { freeLot } from '../helpers/scenario';

function rich() {
  const s = newGame({ seed: 7, cityId: 'cal', startCash: 1_500_000 });
  addCapital(s, 60_000_000);
  return s;
}

function buildOnLot(s = rich()) {
  const lot = freeLot(s);
  const r = cmd.buildDataCenter(s, { where: { lotId: lot.id }, build: DEFAULT_DC_BUILD });
  if (!r.ok) throw new Error(r.reason);
  return { s, id: r.dataCenterId, lot };
}

describe('data center formulas', () => {
  it('runs the hall capped by power, billed by PUE and the power index', () => {
    const build = { hall: 'hall_twin', power: 'power_grid', cooling: 'cool_liquid' };
    expect(usableGpus(build)).toBe(DC_PARTS.power_grid!.gpus);
    expect(pueOf(build)).toBe(1.25);
    // 3,000 GPUs × 12 × 1.25 at an energy site's 0.5 power index.
    expect(powerBill(build, 'fmm')).toBeCloseTo(3_000 * 12 * 1.25 * 0.5, 6);
    expect(hallWeeks(build)).toBe(12);
  });
});

describe('building a data center', () => {
  it('takes the lot, pays parts, deposit and rent, and opens after fit-out', () => {
    const s = rich();
    const lot = freeLot(s);
    const q = cmd.dataCenterQuote(s, { lotId: lot.id }, DEFAULT_DC_BUILD);
    const cash = s.company.cash;
    const r = cmd.buildDataCenter(s, { where: { lotId: lot.id }, build: DEFAULT_DC_BUILD });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const dc = s.dataCenters[r.dataCenterId]!;
    expect(s.company.cash).toBeCloseTo(cash - q.total, 0);
    expect(lot.occupant).toEqual({ type: 'player', id: dc.id });
    expect(dc.name).toBe('Calgary Data Center');
    expect(dc.status).toBe('fitout');
    expect(identityGap(s)).toBeLessThan(1);
    // A second free lot can't take the same storefront.
    const again = cmd.buildDataCenter(s, { where: { lotId: lot.id }, build: DEFAULT_DC_BUILD });
    expect(again.ok).toBe(false);

    advanceWeeks(s, q.weeks - 1);
    expect(dc.status).toBe('fitout');
    advanceWeeks(s, 1);
    expect(dc.status).toBe('open');
    expect(dc.openedWeek).toBeDefined();
    expect(s.milestones.first_data_center).toBeDefined();
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('only builds in the city you are in, and needs the cash', () => {
    const s = newGame({ seed: 7, cityId: 'cal', startCash: 1_500_000 });
    const lot = freeLot(s);
    expect(cmd.dataCenterBlocker(s, { lotId: lot.id }, DEFAULT_DC_BUILD)).toMatch(/cash/);
    addCapital(s, 60_000_000);
    s.world.currentCityId = 'sas';
    expect(cmd.dataCenterBlocker(s, { lotId: lot.id }, DEFAULT_DC_BUILD)).toMatch(/city/);
  });

  it('builds at a regional energy site with cheap power and no deposit, up to the cap', () => {
    const s = rich();
    cmd.travelTo(s, 'fmm');
    const site = Object.values(s.world.sites).find((x) => x.cityId === 'fmm')!;
    for (let i = 0; i < DATA_CENTER.perEnergySite; i++) {
      const r = cmd.buildDataCenter(s, { where: { siteId: site.id }, build: DEFAULT_DC_BUILD });
      expect(r.ok).toBe(true);
    }
    const dcs = Object.values(s.dataCenters);
    expect(dcs[0]!.lease.deposit).toBe(0);
    expect(dcs.map((d) => d.name)).toEqual([
      'Fort McMurray Data Center',
      'Fort McMurray Data Center 2',
      'Fort McMurray Data Center 3',
    ]);
    expect(cmd.dataCenterBlocker(s, { siteId: site.id }, DEFAULT_DC_BUILD)).toMatch(/already/);
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('running a data center', () => {
  it('pays power only once open', () => {
    const { s, id } = buildOnLot();
    const dc = s.dataCenters[id]!;
    // A branch-free game: the week's equipment line is the data center's power alone.
    const lastPower = () => s.history.weekly.at(-1)!.pnl.equipment;
    advanceWeeks(s, 1);
    expect(lastPower()).toBe(0);
    advanceWeeks(s, dc.weeksLeft);
    expect(dc.status).toBe('open');
    advanceWeeks(s, 1);
    expect(lastPower()).toBeCloseTo(powerBill(dc.build, dc.cityId), 6);
  });

  it('lifts Service in its city and nearby cities once open', () => {
    const { s, id } = buildOnLot();
    expect(latencyLift(s, 'cal')).toBe(0);
    advanceWeeks(s, s.dataCenters[id]!.weeksLeft);
    expect(latencyLift(s, 'cal')).toBe(DATA_CENTER.liftSameCity);
    expect(cityDistanceKm('cal', 'fmm')).toBeLessThan(DATA_CENTER.nearKm);
    expect(latencyLift(s, 'fmm')).toBe(DATA_CENTER.liftNear);
    expect(latencyLift(s, 'syd')).toBe(0);
  });
});

describe('upgrading and closing', () => {
  it('swaps power at once and refits for a bigger hall', () => {
    const { s, id } = buildOnLot();
    const dc = s.dataCenters[id]!;
    expect(cmd.dcUpgradeBlocker(s, id, 'hall', 'hall_twin')).toMatch(/fit-out/);
    advanceWeeks(s, dc.weeksLeft);
    expect(cmd.dcUpgradeBlocker(s, id, 'power', 'power_grid')).toMatch(/better/);
    expect(cmd.upgradeDataCenter(s, id, 'power', 'power_substation').ok).toBe(true);
    expect(dc.build.power).toBe('power_substation');
    expect(dc.status).toBe('open');
    expect(cmd.upgradeDataCenter(s, id, 'hall', 'hall_twin').ok).toBe(true);
    expect(dc.status).toBe('fitout');
    expect(dc.weeksLeft).toBe(Math.ceil(12 * DATA_CENTER.upgradeWeeksShare));
    expect(identityGap(s)).toBeLessThan(1);
    advanceWeeks(s, dc.weeksLeft);
    expect(dc.status).toBe('open');
    expect(usableGpus(dc.build)).toBe(6_000);
    const parts = s.company.fixedAssets.filter((a) => a.ownerId === id).map((a) => a.slot);
    expect(parts.sort()).toEqual(['cooling', 'hall', 'power']);
  });

  it('closes: frees the lot, recovers part of book value, keeps the identity', () => {
    const { s, id, lot } = buildOnLot();
    advanceWeeks(s, 10);
    const q = cmd.closeDataCenterQuote(s, id)!;
    const cash = s.company.cash;
    expect(cmd.closeDataCenter(s, id).ok).toBe(true);
    expect(s.dataCenters[id]).toBeUndefined();
    expect(lot.occupant).toBeUndefined();
    expect(s.company.fixedAssets.some((a) => a.ownerId === id)).toBe(false);
    expect(s.company.cash).toBeCloseTo(cash + q.cashBack, 0);
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('migration 3 → 4', () => {
  it('adds an empty data center table', () => {
    const out = migrations[3]!({ schemaVersion: 3 }) as Record<string, unknown>;
    expect(out.dataCenters).toEqual({});
  });
});
