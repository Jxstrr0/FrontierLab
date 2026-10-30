// HQ marketing (SIMULATION §7, §16.10; CONTENT §11): brand campaigns raise city
// brand awareness and cost money, agency packages spread their boost, and the
// Prestige package lifts the Branch rating in its city.
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/sim/state';
import { AGENCIES, BRAND_CAMPAIGNS } from '../../src/data/brandCampaigns';
import { campaignEffects } from '../../src/sim/branch/marketing';
import { branchTarget } from '../../src/sim/branch/ratings';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import {
  agenciesInCity,
  brandSegmentMults,
  cityBrandBonus,
  runBrandMarketing,
} from '../../src/sim/hqMarketing';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { bankWithFloors } from '../helpers/scenario';

/** B3: agencies sell launch campaigns only just after a model launch; open that window. */
function openLaunchWindow(s: GameState): void {
  s.underwriting.launch = {
    modelId: s.underwriting.activeModelId,
    week: s.clock.week,
    headroom: 0,
    awareness: 0,
  };
}

describe('brand campaigns', () => {
  it('needs a Marketing floor and refuses what can’t run yet', () => {
    const s = bankWithFloors(['finance']);
    const order = { campaignId: 'billboards', scope: 'city', targetId: 'cal' } as const;
    expect(cmd.startBrandCampaign(s, order)).toEqual({
      ok: false,
      reason: 'Brand campaigns need a Marketing floor at HQ.',
    });
    const m = bankWithFloors(['marketing']);
    expect(
      cmd.startBrandCampaign(m, { campaignId: 'naming', scope: 'city', targetId: 'cal' }),
    ).toEqual({
      ok: false,
      reason: 'Arena Naming Rights needs a sports franchise you own in the city.',
    });
    expect(
      cmd.startBrandCampaign(m, { campaignId: 'billboards', scope: 'country', targetId: 'CA' }),
    ).toMatchObject({ ok: false });
    expect(cmd.startBrandCampaign(m, { ...order, targetId: 'nyc' })).toMatchObject({ ok: false });
    expect(cmd.startBrandCampaign(m, order).ok).toBe(true);
    expect(cmd.startBrandCampaign(m, order)).toEqual({
      ok: false,
      reason: 'Billboards is already running there.',
    });
  });

  it('raises b with the (1 − b) shape and costs its weekly price', () => {
    const s = bankWithFloors(['marketing']);
    const r = cmd.startBrandCampaign(s, {
      campaignId: 'billboards',
      scope: 'city',
      targetId: 'cal',
    });
    expect(r.ok).toBe(true);
    const city = s.world.cities.cal!;
    const b0 = city.brandAwareness;
    const marketing0 = s.ledger.pnl.marketing;
    const cash0 = s.company.cash;
    runBrandMarketing(s);
    // Full coverage (no requirements yet): campaignMult = 1.
    expect(city.brandAwareness).toBeCloseTo(b0 + 0.012 * (1 - b0), 10);
    expect(s.ledger.pnl.marketing - marketing0).toBe(8_000);
    expect(s.company.cash).toBe(cash0 - 8_000);
  });

  it('country scope covers every simulated city in the country', () => {
    const s = bankWithFloors(['marketing']);
    cmd.startBrandCampaign(s, { campaignId: 'tv', scope: 'country', targetId: 'CA' });
    const b0 = s.world.cities.cal!.brandAwareness;
    const before = s.ledger.pnl.marketing;
    runBrandMarketing(s);
    expect(s.world.cities.cal!.brandAwareness).toBeCloseTo(b0 + 0.012 * (1 - b0), 10);
    expect(s.ledger.pnl.marketing - before).toBe(BRAND_CAMPAIGNS.tv!.costPerWeek.country);
  });

  it('beats no campaign over ten weeks and keeps the balance identity', () => {
    const control = bankWithFloors(['marketing']);
    const s = bankWithFloors(['marketing']);
    const r = cmd.startBrandCampaign(s, { campaignId: 'tv', scope: 'city', targetId: 'cal' });
    advanceWeeks(control, 10);
    advanceWeeks(s, 10);
    expect(s.world.cities.cal!.brandAwareness).toBeGreaterThan(
      control.world.cities.cal!.brandAwareness + 0.1,
    );
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
    expect(cmd.stopBrandCampaign(s, r.ok ? r.id : '')).toEqual({ ok: true });
    expect(s.marketing.campaigns).toHaveLength(0);
  });

  it('boosts segments from campaigns covering the city', () => {
    const s = bankWithFloors(['marketing']);
    cmd.startBrandCampaign(s, { campaignId: 'creators', scope: 'country', targetId: 'CA' });
    cmd.startBrandCampaign(s, { campaignId: 'podcasts', scope: 'country', targetId: 'CA' });
    const seg = brandSegmentMults(s, 'cal');
    expect(seg.STU).toBeCloseTo(1.08);
    expect(seg.YP).toBeCloseTo(1.08 * 1.05);
    expect(seg.FAM).toBe(1);
    expect(brandSegmentMults(s, 'nyc').YP).toBe(1);
  });

  it('stops when the Marketing floor is released', () => {
    const s = bankWithFloors(['marketing']);
    cmd.startBrandCampaign(s, { campaignId: 'billboards', scope: 'city', targetId: 'cal' });
    s.departments = {};
    runBrandMarketing(s);
    expect(s.marketing.campaigns).toHaveLength(0);
    expect(s.events.log.some((e) => e.type === 'BRAND_CAMPAIGN_ENDED')).toBe(true);
  });
});

describe('agency packages', () => {
  it('needs the agency in that city', () => {
    const s = bankWithFloors([], { cityId: 'tor' });
    expect(agenciesInCity(s, 'tor').sort()).toEqual(['brightwell', 'halcyon', 'northwind_pike']);
    expect(
      cmd.buyAgencyPackage(s, { agencyId: 'halcyon', packageId: 'nope', cityId: 'tor' }),
    ).toEqual({ ok: false, reason: 'That package is not available.' });
    expect(
      cmd.buyAgencyPackage(s, { agencyId: 'halcyon', packageId: 'prestige', cityId: 'nyc' }),
    ).toMatchObject({ ok: false });
  });

  it('charges once and spreads the boost evenly over its weeks', () => {
    const s = bankWithFloors([], { cityId: 'tor' });
    const city = s.world.cities.tor!;
    city.brandAwareness = 0;
    openLaunchWindow(s);
    const cash0 = s.company.cash;
    const r = cmd.buyAgencyPackage(s, {
      agencyId: 'brightwell',
      packageId: 'city_blitz',
      cityId: 'tor',
    });
    expect(r.ok).toBe(true);
    expect(s.company.cash).toBe(cash0 - 180_000);
    const run = s.marketing.packages[0]!;
    expect(run.boostPerWeek * run.weeksTotal).toBeCloseTo(0.25, 12);
    let expected = 0;
    for (let w = 0; w < 8; w++) {
      runBrandMarketing(s);
      expected += (0.25 / 8) * (1 - expected);
    }
    expect(city.brandAwareness).toBeCloseTo(expected, 12);
    expect(s.marketing.packages).toHaveLength(0);
    runBrandMarketing(s);
    expect(city.brandAwareness).toBeCloseTo(expected, 12);
  });

  it('Prestige lifts the Branch rating in its city for 26 weeks', () => {
    const s = bankWithFloors([], { cityId: 'tor' });
    const branch = Object.values(s.branches)[0]!;
    const fx = campaignEffects(s, branch);
    const before = branchTarget(s, branch, fx);
    const pkg = AGENCIES.halcyon!.packages[0]!;
    openLaunchWindow(s);
    const r = cmd.buyAgencyPackage(s, { agencyId: 'halcyon', packageId: pkg.id, cityId: 'tor' });
    expect(r.ok).toBe(true);
    expect(cityBrandBonus(s, 'tor')).toBe(0.1);
    expect(branchTarget(s, branch, fx)).toBeCloseTo(Math.min(5, before + 0.1), 10);
    for (let w = 0; w < 25; w++) runBrandMarketing(s);
    expect(cityBrandBonus(s, 'tor')).toBe(0.1);
    runBrandMarketing(s);
    expect(cityBrandBonus(s, 'tor')).toBe(0);
    expect(s.marketing.cityBonus).toEqual({});
  });
});
