// Real estate formulas and commands (SIMULATION §21.1–21.2): estimate and
// asking price, offer acceptance, occupancy EMA, the weekly income and cost
// lines against the §21.2 reference (~8.7% ROI at ~85% occupancy), listings
// refresh, offers, rent and For Sale.
import { describe, expect, it } from 'vitest';
import { REAL_ESTATE } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { postCash } from '../../src/sim/ledger';
import { newGame } from '../../src/sim/newGame';
import { propertySites, refreshListings } from '../../src/sim/propertyListings';
import {
  estimateValue,
  marketRentFor,
  occupancyTarget,
  offerAcceptance,
  propertyRoi,
  propertyWeek,
} from '../../src/sim/propertyMath';
import type { GameState, Property } from '../../src/sim/state';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Estate Bank' });

function fund(s: GameState, amount: number) {
  postCash(s, amount, 'financing');
  s.company.paidInCapital += amount;
}

const firstListing = (s: GameState) =>
  Object.values(s.realEstate.listings).sort((a, b) => a.siteId.localeCompare(b.siteId))[0]!;

describe('real estate formulas', () => {
  it('values a building at size × market rent × 3.2 × cre / 100', () => {
    expect(estimateValue(7990, 1205, 100)).toBeCloseTo(7990 * 1205 * 3.2, 6);
    expect(estimateValue(1000, 400, 110)).toBeCloseTo(1_408_000, 6);
  });

  it('accepts offers on a linear ramp from 85% to 100% of asking', () => {
    expect(offerAcceptance(80, 100)).toBe(0);
    expect(offerAcceptance(85, 100)).toBe(0);
    expect(offerAcceptance(92.5, 100)).toBeCloseTo(0.5, 9);
    expect(offerAcceptance(100, 100)).toBe(1);
    expect(offerAcceptance(120, 100)).toBe(1);
  });

  it('settles occupancy by rent: 97% at market, clamped 30–98%', () => {
    expect(occupancyTarget(100, 100)).toBeCloseTo(0.97, 9);
    expect(occupancyTarget(110, 100)).toBeCloseTo(0.81, 9);
    expect(occupancyTarget(50, 100)).toBe(0.98);
    expect(occupancyTarget(200, 100)).toBe(0.3);
  });

  it('matches the §21.2 reference: about 8.7% ROI at about 85% occupancy', () => {
    // REFERENCE_NOTES §8: 7,990 m² at 1,205 a m², 85.3% occupied, value ≈ 31.6M.
    const p: Property = {
      id: 'x',
      cityId: 'cal',
      owner: 'company',
      sqm: 7990,
      purchasePrice: 31_600_000,
      boughtWeek: 0,
      value: 31_600_000,
      rent: 1205,
      marketRent: 1205,
      occupancy: 0.853,
      forSale: false,
    };
    const wk = propertyWeek(p);
    expect(wk.revenue).toBeCloseTo((7990 * 1205 * 0.853) / 52, 6);
    expect(wk.maintenance).toBeCloseTo((7990 * 1205 * 0.55) / 52, 6);
    expect(wk.vacancy).toBeCloseTo((7990 * 0.147 * 2) / 52, 6);
    expect(wk.net).toBeCloseTo(wk.revenue - wk.maintenance - wk.vacancy, 6);
    // Maintenance runs about two thirds of revenue at this occupancy.
    expect(wk.maintenance / wk.revenue).toBeGreaterThan(0.6);
    expect(wk.maintenance / wk.revenue).toBeLessThan(0.7);
    const roi = propertyRoi(p);
    expect(roi).toBeGreaterThan(0.08);
    expect(roi).toBeLessThan(0.1);
  });
});

describe('listings', () => {
  it('lists a share (at least one) of unowned buildings with estimate and asking price', () => {
    const s = game();
    const sites = propertySites(s, 'cal');
    const listed = Object.values(s.realEstate.listings);
    expect(listed).toHaveLength(Math.max(1, Math.round(sites.length * REAL_ESTATE.listedShare)));
    const cre = s.world.countries.CA!.cre;
    for (const l of listed) {
      const site = s.world.sites[l.siteId]!;
      expect(l.estimate).toBeCloseTo(estimateValue(site.property!.sqm, marketRentFor(site), cre));
      expect(l.asking / l.estimate).toBeGreaterThanOrEqual(REAL_ESTATE.askRange[0]);
      expect(l.asking / l.estimate).toBeLessThanOrEqual(REAL_ESTATE.askRange[1]);
      expect(l.occupancy).toBeGreaterThanOrEqual(REAL_ESTATE.startOcc[0]);
      expect(l.occupancy).toBeLessThanOrEqual(REAL_ESTATE.startOcc[1]);
    }
    expect(s.realEstate.listingsRefreshWeek.cal).toBe(REAL_ESTATE.refreshWeeks);
  });

  it('refreshes every 4 weeks, never lists owned buildings, and lists one even when few are left', () => {
    const s = game();
    const sites = propertySites(s, 'cal');
    // Pretend you own all but one building.
    for (const site of sites.slice(1)) {
      s.realEstate.properties[site.id] = {
        id: site.id,
        cityId: 'cal',
        owner: 'personal',
        sqm: site.property!.sqm,
        purchasePrice: 1,
        boughtWeek: 0,
        value: 1,
        rent: 1,
        marketRent: 1,
        occupancy: 0.9,
        forSale: false,
      };
    }
    refreshListings(s, 'cal');
    expect(Object.keys(s.realEstate.listings)).toEqual([sites[0]!.id]);
    for (const site of sites.slice(1)) delete s.realEstate.properties[site.id];
    advanceWeeks(s, REAL_ESTATE.refreshWeeks - 1);
    expect(Object.keys(s.realEstate.listings)).toEqual([sites[0]!.id]);
    advanceWeeks(s, 1);
    expect(Object.keys(s.realEstate.listings).length).toBeGreaterThan(1);
  });
});

describe('buying and running a building', () => {
  it('turns down low offers and locks the listing until the next refresh', () => {
    const s = game();
    fund(s, 50_000_000);
    const l = firstListing(s);
    const r = cmd.offerProperty(s, l.siteId, l.asking * 0.84, 'company');
    expect(r).toEqual({ ok: true, accepted: false });
    expect(s.realEstate.listings[l.siteId]!.rejectedOffer).toBeCloseTo(l.asking * 0.84);
    expect(cmd.offerProperty(s, l.siteId, l.asking, 'company').ok).toBe(false);
    expect(s.events.log.some((e) => e.type === 'PROPERTY_OFFER_REJECTED')).toBe(true);
  });

  it('needs the cash, the listing and you in the city', () => {
    const s = game();
    const l = firstListing(s);
    expect(cmd.offerProperty(s, l.siteId, l.asking, 'company').ok).toBe(false);
    s.personal.cash = 0;
    expect(cmd.offerProperty(s, l.siteId, l.asking, 'personal').ok).toBe(false);
    fund(s, 50_000_000);
    s.world.currentCityId = 'van';
    expect(cmd.offerProperty(s, l.siteId, l.asking, 'company').ok).toBe(false);
    s.world.currentCityId = 'cal';
    const unlisted = propertySites(s, 'cal').find((x) => !s.realEstate.listings[x.id])!;
    expect(cmd.offerProperty(s, unlisted.id, 1_000_000, 'company').ok).toBe(false);
  });

  it('books a company purchase at value, with the price difference as a property gain', () => {
    const s = game();
    fund(s, 50_000_000);
    const l = firstListing(s);
    const cash = s.company.cash;
    expect(cmd.offerProperty(s, l.siteId, l.asking, 'company').ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(cash - l.asking, 6);
    expect(s.ledger.cash.investing).toBeCloseTo(-l.asking, 6);
    expect(s.ledger.pnl.propertyGains).toBeCloseTo(l.estimate - l.asking, 6);
    const p = s.realEstate.properties[l.siteId]!;
    expect(p.value).toBeCloseTo(l.estimate, 6);
    expect(p.rent).toBeCloseTo(p.marketRent, 9);
    expect(s.realEstate.listings[l.siteId]).toBeUndefined();
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });

  it('eases occupancy toward the rent target and books rent and costs weekly', () => {
    const s = game();
    fund(s, 50_000_000);
    const l = firstListing(s);
    cmd.offerProperty(s, l.siteId, l.asking, 'company');
    const p = s.realEstate.properties[l.siteId]!;
    expect(cmd.setPropertyRent(s, l.siteId, p.marketRent * 1.1).ok).toBe(true);
    expect(cmd.setPropertyRent(s, l.siteId, p.marketRent * 5).ok).toBe(false);
    const occ0 = p.occupancy;
    const target = occupancyTarget(p.rent, p.marketRent);
    advanceWeeks(s, 1);
    const occ1 = occ0 + REAL_ESTATE.occEma * (target - occ0);
    expect(p.occupancy).toBeCloseTo(occ1, 9);
    const wk = propertyWeek(p);
    const last = s.history.weekly.at(-1)!;
    expect(last.pnl.rentalIncome).toBeCloseTo(wk.revenue, 6);
    expect(last.pnl.propertyCosts).toBeCloseTo(wk.maintenance + wk.vacancy, 6);
  });

  it('pays a private building’s net rent into personal cash', () => {
    const s = game();
    s.personal.cash = 50_000_000;
    const l = firstListing(s);
    cmd.offerProperty(s, l.siteId, l.asking, 'personal');
    const cash = s.personal.cash;
    const pnlBefore = s.ledger.pnl.rentalIncome;
    advanceWeeks(s, 1);
    const p = s.realEstate.properties[l.siteId]!;
    // CEO pay also arrives weekly; take it out.
    const pay = s.governance.ceoSalary / 52;
    expect(s.personal.cash - cash - pay).toBeCloseTo(propertyWeek(p).net, 4);
    expect(s.history.weekly.at(-1)!.pnl.rentalIncome).toBe(pnlBefore);
  });

  it('sells a For Sale building in 2–8 weeks near its value', () => {
    const s = game();
    fund(s, 50_000_000);
    const l = firstListing(s);
    cmd.offerProperty(s, l.siteId, l.asking, 'company');
    expect(cmd.setPropertyForSale(s, l.siteId, true).ok).toBe(true);
    const p = s.realEstate.properties[l.siteId]!;
    const weeks = p.saleWeek! - s.clock.week;
    expect(weeks).toBeGreaterThanOrEqual(REAL_ESTATE.saleWeeks[0]);
    expect(weeks).toBeLessThanOrEqual(REAL_ESTATE.saleWeeks[1]);
    expect(cmd.setPropertyForSale(s, l.siteId, false).ok).toBe(true);
    expect(s.realEstate.properties[l.siteId]!.saleWeek).toBeUndefined();
    cmd.setPropertyForSale(s, l.siteId, true);
    advanceWeeks(s, REAL_ESTATE.saleWeeks[1]);
    expect(s.realEstate.properties[l.siteId]).toBeUndefined();
    const sold = s.events.log.find((e) => e.type === 'PROPERTY_SOLD')!;
    expect(Number(sold.payload.price) / p.value).toBeGreaterThan(0.85);
    expect(Number(sold.payload.price) / p.value).toBeLessThan(1.15);
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });
});
