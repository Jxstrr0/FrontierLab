// Stage 8 regressions: every Stage 3–7 system copes with cities generated
// mid-game and with a bank that operates in several of them (DESIGN §5.2,
// §5.17): rivals seeded again in a later city, rival prices per country,
// regional employers hosted elsewhere in the country, conventions in cities
// not yet visited, HQ campaigns and price lists for other countries, lobbying
// and agency rules, news and names.
import { describe, expect, it } from 'vitest';
import { AGENCIES } from '../../src/data/brandCampaigns';
import { CITIES } from '../../src/data/cities';
import { conventionIn } from '../../src/data/conventions';
import { PRODUCTS } from '../../src/data/products';
import { REAL_ESTATE } from '../../src/config/balance';
import { convertRivalBranch } from '../../src/sim/acquisitionBranch';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { newsContext } from '../../src/sim/newsStory';
import { rateWatchStory } from '../../src/sim/newsRivals';
import { defaultPrice } from '../../src/sim/rates';
import { rivalPriceIn, rivalTargetPrice } from '../../src/sim/rivalPrices';
import { removeRivalBranch } from '../../src/sim/rivalExpansion';
import { stream } from '../../src/sim/rng';
import type { GameState } from '../../src/sim/state';
import { addCapital, identityGap } from '../helpers/markets';
import { bankWithFloors, openScriptedBranch } from '../helpers/scenario';
import { fly, worldBank } from '../helpers/world';

const game = () => {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Globe Bank' });
  addCapital(s, 20_000_000);
  return s;
};
const siteOf = (s: GameState, kind: string, cityId: string) =>
  Object.values(s.world.sites).find((x) => x.kind === kind && x.cityId === cityId)!;

describe('rivals in cities generated later', () => {
  it('keeps rival branch ids unique when a bank is seeded again after closures', () => {
    const s = game();
    fly(s, 'nyc');
    // Fizz (US and UK) has New York branches; close its first one before London is made.
    const fizz = s.rivals.fizz!;
    expect(fizz.cities).toEqual(['nyc']);
    removeRivalBranch(s, fizz, fizz.branches[0]!);
    fly(s, 'lon');
    expect(fizz.cities).toEqual(['nyc', 'lon']);
    const ids = Object.values(s.rivals).flatMap((r) => r.branches.map((b) => b.id));
    expect(new Set(ids).size).toBe(ids.length);
    // A bank first met mid-game starts with books, a CEO and a share price.
    const london = Object.values(s.rivals).filter((r) => r.cities[0] === 'lon');
    expect(london.length).toBeGreaterThan(0);
    for (const r of london) {
      expect(r.equity).toBeGreaterThan(0);
      expect(r.shares).toBeGreaterThan(0);
      expect(r.ceo).not.toBe('');
    }
  });

  it('reports, prices and trades rivals met mid-game like the rest', () => {
    const s = game();
    advanceWeeks(s, 10);
    fly(s, 'lon');
    advanceWeeks(s, 60);
    // Banks seeded with the city; one chartered later (§18.7) has fewer quarters.
    const seeded = Object.values(s.rivals).filter(
      (x) => x.cities[0] === 'lon' && x.charteredWeek === undefined,
    );
    expect(seeded.length).toBeGreaterThan(0);
    for (const r of seeded) {
      expect(r.quarters.length).toBeGreaterThanOrEqual(4);
      if (r.listed) expect(r.history.length).toBeGreaterThan(10);
      expect(Number.isFinite(r.price)).toBe(true);
    }
    expect(identityGap(s)).toBeLessThan(1);
  });

  it("prices a rival abroad off that country's rates, untouched by its home country", () => {
    const s = game();
    fly(s, 'nyc');
    fly(s, 'lon');
    const fizz = s.rivals.fizz!;
    const uk = s.world.countries.UK!;
    // C3a: business loans are the rate product left, priced off the short FTP.
    const sbl = PRODUCTS.sbl!;
    const inLondon = rivalPriceIn(s, fizz, 'sbl', 'UK')!;
    expect(inLondon).toBeCloseTo(rivalTargetPrice(sbl, fizz.strategy, uk), 10);
    expect(rivalPriceIn(s, fizz, 'sbl', 'US')).toBe(fizz.prices.sbl);
    // A UK hike reaches Fizz's London prices at once; a US hike doesn't touch them.
    const usBefore = fizz.prices.sbl!;
    uk.policyRate += 0.01;
    expect(rivalPriceIn(s, fizz, 'sbl', 'UK')).toBeCloseTo(inLondon + 0.01, 10);
    s.world.countries.US!.policyRate += 0.01;
    expect(rivalPriceIn(s, fizz, 'sbl', 'UK')).toBeCloseTo(inLondon + 0.01, 10);
    expect(fizz.prices.sbl).toBe(usBefore);
    expect(defaultPrice(sbl, uk)).toBeGreaterThan(0);
    // Plan prices abroad sit at the strategy's fee multiple of that country's list price.
    expect(rivalPriceIn(s, fizz, 'plus', 'UK')).toBeCloseTo(
      rivalTargetPrice(PRODUCTS.plus!, fizz.strategy, uk),
      10,
    );
  });
});

describe('regional employers', () => {
  it('sign power deals rather than partnerships (C8a)', () => {
    const s = game();
    const host = openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 2);
    fly(s, 'fmm');
    const camp = siteOf(s, 'employer', 'fmm');
    expect(cmd.signBlocker(s, camp.id, host, 'team', 'student')).toMatch(/power deals/);
    expect(cmd.signPowerDeal(s, camp.id).ok).toBe(true);
    // Each energy site signs its own deal, in any country.
    fly(s, 'mid');
    const midland = siteOf(s, 'employer', 'mid');
    expect(cmd.signPowerDeal(s, midland.id).ok).toBe(true);
    advanceWeeks(s, 4);
    expect(Object.keys(s.powerDeals)).toHaveLength(2);
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('conventions in cities not yet visited', () => {
  it('announces the New York convention from Calgary and deals there once you fly in', () => {
    const s = bankWithFloors(['investment'], { weeks: 1, capital: 50_000_000 });
    const spec = conventionIn('nyc')!;
    const run = s.conventions.runs.find((r) => r.conventionId === spec.id && r.year === 2027)!;
    advanceWeeks(s, run.startWeek - s.clock.week);
    expect(run.announced).toBe(true);
    expect(s.world.cities.nyc).toBeUndefined();
    const [first] = run.startupIds as [string];
    expect(cmd.buyStartupLot(s, first, 0, 'company')).toEqual({
      ok: false,
      reason: 'You need to be at the conference.',
    });
    fly(s, 'nyc');
    const venue = siteOf(s, 'conventionCenter', 'nyc');
    expect(venue.refId).toBe(spec.id);
    addCapital(s, 100_000_000);
    expect(cmd.buyStartupLot(s, first, 0, 'company')).toEqual({ ok: true });
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('HQ for several countries', () => {
  it('runs brand campaigns in another city from anywhere, only where you have been', () => {
    const s = bankWithFloors(['marketing']);
    fly(s, 'nyc');
    fly(s, 'lon');
    const order = { campaignId: 'billboards', scope: 'city', targetId: 'nyc' } as const;
    expect(cmd.startBrandCampaign(s, order).ok).toBe(true);
    expect(cmd.startBrandCampaign(s, { ...order, targetId: 'chi' })).toEqual({
      ok: false,
      reason: 'Pick a city you have flown to.',
    });
    expect(
      cmd.startBrandCampaign(s, { campaignId: 'tv', scope: 'country', targetId: 'JP' }).ok,
    ).toBe(false);
    expect(
      cmd.startBrandCampaign(s, { campaignId: 'tv', scope: 'country', targetId: 'US' }).ok,
    ).toBe(true);
    const before = s.world.cities.nyc!.brandAwareness;
    advanceWeeks(s, 1);
    expect(s.world.cities.nyc!.brandAwareness).toBeGreaterThan(before);
  });

  it('sells agency packages only in the agency’s city', () => {
    const s = game();
    fly(s, 'nyc');
    const agency = siteOf(s, 'agency', 'nyc');
    fly(s, 'lon');
    const packageId = AGENCIES[agency.refId]!.packages[0]!.id;
    const pkg = { agencyId: agency.refId, packageId, cityId: 'nyc' };
    expect(cmd.buyAgencyPackage(s, pkg)).toEqual({
      ok: false,
      reason: 'You need to be in New York to visit the agency.',
    });
    fly(s, 'nyc');
    expect(cmd.buyAgencyPackage(s, pkg).ok).toBe(true);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('keeps the capital buffer campaigns at home', () => {
    const s = game();
    fly(s, 'lon');
    const firm = siteOf(s, 'lobbyingFirm', 'lon');
    expect(cmd.lobbyBlock(s, firm.id, 'easeBuffer')).toMatch(/at home in Canada/);
    expect(cmd.lobbyBlock(s, firm.id, 'fastTrack')).toBeUndefined();
  });

  it('gives each new country its own HQ price list from its first branch', () => {
    const { s, branches } = worldBank();
    expect(cmd.setApplyRatesToAll(s, true).ok).toBe(true);
    expect(Object.keys(s.company.companyPrices).sort()).toEqual(['CA', 'UK', 'US']);
    const us = s.company.companyPrices.US!;
    expect(us.plus).toBe(s.branches[branches.nyc]!.offered.plus!.price);
    expect(cmd.setCompanyPrice(s, 'plus', 24, 'US').ok).toBe(true);
    expect(s.company.companyPrices.US!.plus).toBe(24);
    expect(s.company.companyPrices.CA!.plus).not.toBe(24);
    // An acquired branch in a country with no list yet seeds one from its own sheet.
    fly(s, 'tor');
    fly(s, 'par');
    const bank = Object.values(s.rivals).find((r) => r.cities.includes('par'))!;
    const rb = bank.branches.find((b) => b.cityId === 'par')!;
    convertRivalBranch(s, bank, rb, stream(s, 'test:acq'));
    expect(s.company.companyPrices.EA).toBeDefined();
  });
});

describe('news and names across cities', () => {
  it("reads your home and branch cities, not wherever you're standing", () => {
    const { s, branches } = worldBank();
    fly(s, 'tyo');
    const ctx = newsContext(s, []);
    expect([...ctx.yourCities].sort()).toEqual(['cal', 'lon', 'nyc']);
    expect(ctx.operated).toEqual(new Set(['CA', 'US', 'UK']));
    expect(s.branches[branches.nyc]!.name).toBe('New York Midtown');
    expect(s.branches[branches.lon]!.name).toBe('London Midtown');
    expect(s.branches[branches.cal]!.name).toBe('Midtown');
    // The rate watch covers your busiest city: growing the New York office makes it New York.
    addCapital(s, 5_000_000);
    advanceWeeks(s, 8);
    expect(cmd.upgradeBlocker(s, branches.nyc!)).toBeUndefined();
    cmd.upgradeOffice(s, branches.nyc!);
    advanceWeeks(s, 2);
    expect(rateWatchStory(newsContext(s, []))?.tokens.city).toBe(CITIES.nyc!.name);
  });

  it('refreshes listings and manager candidates in a city visited later', () => {
    const s = game();
    fly(s, 'nyc');
    fly(s, 'cal');
    const pool = s.people.managerCandidates.nyc!.map((m) => m.id);
    const due = s.realEstate.listingsRefreshWeek.nyc!;
    advanceWeeks(s, Math.max(REAL_ESTATE.refreshWeeks, 30) + 1);
    expect(s.realEstate.listingsRefreshWeek.nyc).toBeGreaterThan(due);
    expect(s.people.managerCandidates.nyc!.map((m) => m.id)).not.toEqual(pool);
  });
});
