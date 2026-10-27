// Main offices and company-wide prices (stage C2d2, SIMULATION §16.1 and §8):
// at most two HQ buildings, the second in another country; a sales office can
// set its own prices while HQ prices apply everywhere else; the 4 → 5 migration.
import { describe, expect, it } from 'vitest';
import { MAIN_OFFICES_MAX } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { basePrice, followsHq } from '../../src/sim/branch/pricing';
import * as cmd from '../../src/sim/commands';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { bankWithFloors } from '../helpers/scenario';

const freeListing = (s: GameState, cityId: string) =>
  Object.values(s.world.officeListings).find((l) => !l.officeId && l.cityId === cityId)!;

describe('main offices', () => {
  it('allows a second main office only in another country, and no third', () => {
    const s = bankWithFloors(['finance']);
    expect(cmd.mainOfficeBlocker(s, 'cal')).toMatch(/another country/);
    const same = cmd.leaseOffice(s, freeListing(s, 'cal').id, ['hr']);
    expect(same.ok).toBe(false);

    const abroad = 'nyc';
    expect(CITIES[abroad]!.country).not.toBe(CITIES.cal!.country);
    expect(cmd.mainOfficeBlocker(s, abroad)).toBeNull();
    cmd.travelTo(s, abroad);
    expect(cmd.leaseOffice(s, freeListing(s, abroad).id, ['hr']).ok).toBe(true);
    expect(Object.keys(s.offices)).toHaveLength(MAIN_OFFICES_MAX);
    expect(cmd.mainOfficeBlocker(s, abroad)).toMatch(/at most/);
  });
});

describe('per-office prices', () => {
  it('lets one office set its own prices while HQ sets the rest', () => {
    const s = bankWithFloors([]);
    const branch = Object.values(s.branches)[0]!;
    expect(cmd.setOwnPrices(s, branch.id, true).ok).toBe(false);
    cmd.setApplyRatesToAll(s, true);
    expect(followsHq(s, branch)).toBe(true);
    expect(cmd.setPrice(s, branch.id, 'plus', 30).ok).toBe(false);

    const hq = cmd.setCompanyPrice(s, 'plus', 18);
    expect(hq.ok).toBe(true);
    expect(basePrice(s, branch, 'plus')).toBeCloseTo(18, 6);

    // Its own sheet starts from the HQ price, then moves on its own.
    expect(cmd.setOwnPrices(s, branch.id, true).ok).toBe(true);
    expect(basePrice(s, branch, 'plus')).toBeCloseTo(18, 6);
    expect(cmd.setPrice(s, branch.id, 'plus', 30).ok).toBe(true);
    cmd.setCompanyPrice(s, 'plus', 22);
    expect(basePrice(s, branch, 'plus')).toBeCloseTo(30, 6);

    // HQ lineup changes skip it until it follows HQ again.
    const was = branch.offered.plus!.on;
    cmd.setCompanyOffered(s, 'plus', !was);
    expect(branch.offered.plus!.on).toBe(was);
    expect(cmd.setOwnPrices(s, branch.id, false).ok).toBe(true);
    expect(branch.offered.plus!.on).toBe(!was);
    expect(basePrice(s, branch, 'plus')).toBeCloseTo(22, 6);
  });
});

describe('migration 4 → 5', () => {
  it('has every sales office follow HQ prices', () => {
    const out = migrations[4]!({ schemaVersion: 4, branches: { b1: {} } }) as unknown as {
      branches: Record<string, { ownPrices?: boolean }>;
    };
    expect(out.branches.b1!.ownPrices).toBe(false);
  });
});
