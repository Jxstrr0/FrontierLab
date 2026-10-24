// Homes, cars and dealer financing (SIMULATION §22, SCREENS §19): asking price
// and the offer ramp, home values following hpi, upkeep, rebuilds and sales;
// car depreciation (classics gain) and resale; dealer deals billing the bank,
// lapsing at term, and lifting auto-loan demand in their city.
import { describe, expect, it } from 'vitest';
import { CARS_CFG, DEALER_FINANCING, HOMES_CFG, WEEKS_PER_YEAR } from '../../src/config/balance';
import { CARS } from '../../src/data/cars';
import { HOMES } from '../../src/data/homes';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { campaignEffects } from '../../src/sim/branch/marketing';
import { runDemand } from '../../src/sim/branch/demand';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import { runPersonalAssets } from '../../src/sim/personalAssets';
import {
  dealerBoost,
  homeAsking,
  homeOfferAcceptance,
  homeOfferBounds,
  homeSite,
} from '../../src/sim/personalValues';
import type { GameState } from '../../src/sim/state';
import { openBank } from '../helpers/incidents';

const game = () => {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Wealth Bank' });
  s.personal.cash = 50_000_000;
  return s;
};
const ranchSite = (s: GameState) => homeSite(s, 'bowvalley')!.id;
const dealerSite = (s: GameState) =>
  Object.values(s.world.sites).find((x) => x.kind === 'autoDealer' && x.cityId === 'cal')!.id;
const identityGap = (s: GameState) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

/** Buys the Bow Valley Ranch at asking (always accepted). */
function buyRanch(s: GameState) {
  const r = cmd.offerHome(s, ranchSite(s), homeAsking(s, 'bowvalley'));
  if (!r.ok || !r.accepted) throw new Error('ranch purchase failed');
  return s.personal.empire.homes[0]!;
}

describe('home offers', () => {
  it('asks the list price moved by the country hpi', () => {
    const s = game();
    s.world.countries.CA!.hpi = 110;
    expect(homeAsking(s, 'bowvalley')).toBe(Math.round(HOMES.bowvalley!.price * 1.1));
  });

  it('ramps acceptance linearly from offerMin of asking to asking', () => {
    expect(homeOfferAcceptance(HOMES_CFG.offerMin * 1e6, 1e6)).toBeCloseTo(0, 9);
    expect(homeOfferAcceptance(1e6, 1e6)).toBe(1);
    const mid = (HOMES_CFG.offerMin + 1) / 2;
    expect(homeOfferAcceptance(mid * 1e6, 1e6)).toBeCloseTo(0.5, 9);
    const b = homeOfferBounds(3_900_000);
    expect(b.max).toBe(3_900_000);
    expect(b.min).toBeGreaterThanOrEqual(3_900_000 * HOMES_CFG.offerMin);
  });

  it('buys at asking with personal cash only, valued at asking', () => {
    const s = game();
    const bank0 = s.company.cash;
    const asking = homeAsking(s, 'bowvalley');
    const home = buyRanch(s);
    expect(home.value).toBe(asking);
    expect(s.personal.cash).toBe(50_000_000 - asking);
    expect(s.company.cash).toBe(bank0);
    expect(cmd.offerHome(s, ranchSite(s), asking).ok).toBe(false); // already yours
  });

  it('requires being in the city and enough cash', () => {
    const s = game();
    const site = homeSite(s, 'bowvalley')!;
    s.world.currentCityId = 'sas';
    expect(cmd.offerHome(s, site.id, homeAsking(s, 'bowvalley')).ok).toBe(false);
    s.world.currentCityId = 'cal';
    s.personal.cash = 1_000;
    expect(cmd.offerHome(s, site.id, homeAsking(s, 'bowvalley')).ok).toBe(false);
  });

  it('locks the home for refusalWeeks after a refused offer', () => {
    const s = game();
    const asking = homeAsking(s, 'bowvalley');
    const r = cmd.offerHome(s, ranchSite(s), Math.floor(asking * HOMES_CFG.offerMin) - 1);
    expect(r.ok && r.accepted).toBe(false); // 0% at the floor
    expect(cmd.offerHome(s, ranchSite(s), asking).ok).toBe(false);
    s.clock.week += HOMES_CFG.refusalWeeks;
    expect(cmd.offerHome(s, ranchSite(s), asking)).toMatchObject({ ok: true, accepted: true });
  });
});

describe('owned homes', () => {
  it('track the hpi and pay 1%/yr upkeep from personal cash', () => {
    const s = game();
    const home = buyRanch(s);
    const v0 = home.value;
    s.world.countries.CA!.hpi *= 1.05;
    const cash0 = s.personal.cash;
    runPersonalAssets(s);
    expect(home.value).toBeCloseTo(v0 * 1.05, 6);
    expect(cash0 - s.personal.cash).toBeCloseTo(
      (home.value * HOMES_CFG.upkeepRate) / WEEKS_PER_YEAR,
      6,
    );
  });

  it('rebuild: 25% of value now, +20% after 8 weeks, one at a time', () => {
    const s = game();
    const home = buyRanch(s);
    const v0 = home.value;
    const cash0 = s.personal.cash;
    const r = cmd.rebuildHome(s, 'bowvalley');
    expect(r).toMatchObject({ ok: true, cost: v0 * HOMES_CFG.rebuildCost });
    expect(s.personal.cash).toBeCloseTo(cash0 - v0 * HOMES_CFG.rebuildCost, 6);
    expect(cmd.rebuildHome(s, 'bowvalley').ok).toBe(false);
    for (let w = 1; w < HOMES_CFG.rebuildWeeks; w++) {
      s.clock.week += 1;
      runPersonalAssets(s);
      expect(home.value).toBeCloseTo(v0, 6);
    }
    s.clock.week += 1;
    runPersonalAssets(s);
    expect(home.value).toBeCloseTo(v0 * (1 + HOMES_CFG.rebuildGain), 6);
    expect(home.rebuildDoneWeek).toBeUndefined();
    expect(home.rebuilds).toBe(1);
  });

  it('sell from anywhere for value less the fee', () => {
    const s = game();
    const home = buyRanch(s);
    s.world.currentCityId = 'sas';
    const cash0 = s.personal.cash;
    const r = cmd.sellHome(s, 'bowvalley');
    expect(r).toMatchObject({ ok: true, price: home.value * (1 - HOMES_CFG.sellFee) });
    expect(s.personal.cash).toBeCloseTo(cash0 + home.value * (1 - HOMES_CFG.sellFee), 6);
    expect(s.personal.empire.homes).toHaveLength(0);
  });
});

describe('cars', () => {
  it('lose 12%/yr (classics gain 3%), cost 2%/yr upkeep and resell at a haircut', () => {
    const s = game();
    expect(cmd.buyCar(s, dealerSite(s), 'arcadia').ok).toBe(true);
    expect(cmd.buyCar(s, dealerSite(s), 'castellan').ok).toBe(true);
    const [modern, classic] = s.personal.empire.cars;
    const cash0 = s.personal.cash;
    runPersonalAssets(s);
    expect(modern!.value).toBeCloseTo(
      CARS.arcadia!.price * (1 - CARS_CFG.depreciation / WEEKS_PER_YEAR),
      6,
    );
    expect(classic!.value).toBeCloseTo(
      CARS.castellan!.price * (1 + CARS_CFG.classicGain / WEEKS_PER_YEAR),
      6,
    );
    const upkeep = ((modern!.value + classic!.value) * CARS_CFG.upkeepRate) / WEEKS_PER_YEAR;
    expect(cash0 - s.personal.cash).toBeCloseTo(upkeep, 6);
    const value = modern!.value;
    const r = cmd.sellCar(s, modern!.id);
    expect(r).toMatchObject({ ok: true, price: value * (1 - CARS_CFG.resaleHaircut) });
  });

  it('limited cars are one per owner; buying needs the city', () => {
    const s = game();
    expect(cmd.buyCar(s, dealerSite(s), 'valkyr').ok).toBe(true);
    expect(cmd.buyCar(s, dealerSite(s), 'valkyr').ok).toBe(false);
    s.world.currentCityId = 'sas';
    expect(cmd.buyCar(s, dealerSite(s), 'kestrel').ok).toBe(false);
  });
});

describe('dealer financing', () => {
  it('needs a branch in the city; the bank pays the weekly fee; the deal lapses at term', () => {
    const { s, b } = openBank();
    const site = dealerSite(s);
    b.status = 'fitout';
    expect(cmd.signDealerDeal(s, site).ok).toBe(false);
    b.status = 'open';
    expect(cmd.signDealerDeal(s, site).ok).toBe(true);
    const cash0 = s.company.cash;
    const fees0 = s.ledger.pnl.dealerFees;
    runPersonalAssets(s);
    const weekly = DEALER_FINANCING.feePerYear / WEEKS_PER_YEAR;
    expect(s.company.cash).toBeCloseTo(cash0 - weekly, 6);
    expect(s.ledger.pnl.dealerFees - fees0).toBeCloseTo(weekly, 6);
    expect(identityGap(s)).toBeLessThan(1);
    s.clock.week += DEALER_FINANCING.termWeeks;
    runPersonalAssets(s);
    expect(s.dealerDeals[site]).toBeUndefined();
    expect(s.events.log.at(-1)).toMatchObject({ type: 'DEALER_ENDED' });
  });

  it('lifts auto-loan demand at branches in that city by demandBoost', () => {
    const { s, b } = openBank();
    cmd.setOffered(s, b.id, 'auto_loan', true);
    const signed = structuredClone(s);
    expect(cmd.signDealerDeal(signed, dealerSite(signed)).ok).toBe(true);
    expect(dealerBoost(signed, 'cal', 'auto_loan')).toBe(1 + DEALER_FINANCING.demandBoost);
    expect(dealerBoost(signed, 'cal', 'mortgage')).toBe(1);
    expect(dealerBoost(signed, 'sas', 'auto_loan')).toBe(1);
    const base = runDemand(s, b, campaignEffects(b)).byProduct.auto_loan!;
    const sb = signed.branches[b.id]!;
    const boosted = runDemand(signed, sb, campaignEffects(sb)).byProduct.auto_loan!;
    expect(base.newAccounts).toBeGreaterThan(0);
    expect(boosted.newAccounts / base.newAccounts).toBeCloseTo(1 + DEALER_FINANCING.demandBoost, 6);
    // Other products are untouched.
    const m0 = runDemand(s, b, campaignEffects(b)).byProduct.chequing?.newAccounts;
    const m1 = runDemand(signed, sb, campaignEffects(sb)).byProduct.chequing?.newAccounts;
    expect(m1).toBeCloseTo(m0!, 6);
  });
});
