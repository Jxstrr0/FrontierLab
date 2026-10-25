// Acceptance (Stage 7, real estate part of "portfolio ties out"): seed 42 in
// Calgary, buy a listed building as the company and another privately, then
// run 30 weeks with cre moving, a rent change, a sale and foreclosed homes in
// Hold, Rent and Sell all. Every week the balance sheet's real estate equals the
// company's buildings, RWA carries them at PROPERTY_RISK_WEIGHT, the balance
// identity holds, the private building never touches the bank's books, and
// portfolioBreakdown sums.
import { describe, expect, it } from 'vitest';
import { PROPERTY_RISK_WEIGHT } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { capitalSnapshot } from '../../src/sim/capital';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { postCash } from '../../src/sim/ledger';
import { newGame } from '../../src/sim/newGame';
import { portfolioBreakdown, realEstateValue } from '../../src/sim/portfolio';
import type { GameState } from '../../src/sim/state';
import { openScriptedBranch } from '../helpers/scenario';

/** New money from shareholders: cash in and paid-in capital up, so the identity holds. */
function raise(s: GameState, amount: number) {
  postCash(s, amount, 'financing');
  s.company.paidInCapital += amount;
}

function checkIdentity(s: GameState) {
  const bs = balanceSheet(s);
  expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  return bs;
}

/** RWA with and without the company's buildings differ by their value × the property weight. */
function propertyRwa(s: GameState): number {
  const without = structuredClone(s);
  for (const [id, p] of Object.entries(without.realEstate.properties)) {
    if (p.owner === 'company') delete without.realEstate.properties[id];
  }
  return capitalSnapshot(s).rwa - capitalSnapshot(without).rwa;
}

describe('real estate ties out', () => {
  it('keeps the books, RWA and portfolio consistent through a full cycle', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Ledger Test Bank' });
    openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 2);
    const listings = Object.values(s.realEstate.listings).sort((a, b) => a.asking - b.asking);
    expect(listings.length).toBeGreaterThanOrEqual(2);
    const [cheap, next] = listings;
    raise(s, cheap!.asking * 1.5);
    s.personal.cash = next!.asking * 1.2;

    const personalBefore = balanceSheet(s);
    expect(cmd.offerProperty(s, cheap!.siteId, cheap!.asking, 'company')).toEqual({
      ok: true,
      accepted: true,
    });
    checkIdentity(s);
    const afterCompany = balanceSheet(s);
    expect(afterCompany.realEstate).toBeCloseTo(cheap!.estimate, 6);
    expect(cmd.offerProperty(s, next!.siteId, next!.asking, 'personal')).toEqual({
      ok: true,
      accepted: true,
    });
    const afterPersonal = checkIdentity(s);
    // The private purchase moved neither the bank's assets nor its equity.
    expect(afterPersonal.assets).toBeCloseTo(afterCompany.assets, 6);
    expect(afterPersonal.equity).toBeCloseTo(afterCompany.equity, 6);
    expect(personalBefore.realEstate).toBe(0);

    // Foreclosed homes funded by shareholders, so the identity holds from the start.
    const reoValue = 3_000_000;
    const pool = (s.reo.cal ??= { units: 0, value: 0, mode: 'rent', hpiRef: 100 });
    pool.value += reoValue;
    pool.units += 10;
    s.company.paidInCapital += reoValue;
    checkIdentity(s);

    const companyId = cheap!.siteId;
    let sold = false;
    let reoSold = false;
    let cashBeforeReoSale = 0;
    for (let week = 1; week <= 30; week++) {
      if (week % 5 === 0) s.world.countries.CA!.cre *= week % 10 === 0 ? 0.96 : 1.05;
      if (week === 3) {
        const p = s.realEstate.properties[companyId]!;
        expect(cmd.setPropertyRent(s, companyId, p.marketRent * 1.2).ok).toBe(true);
      }
      if (week === 12) {
        expect(cmd.setPropertyForSale(s, companyId, true).ok).toBe(true);
      }
      if (week === 18 && s.reo.cal) {
        cashBeforeReoSale = s.company.cash;
        expect(cmd.setReoMode(s, 'cal', 'selling').ok).toBe(true);
        expect(cmd.setReoMode(s, 'cal', 'rent').ok).toBe(false);
      }
      checkIdentity(s);
      advanceWeeks(s, 1);

      const bs = checkIdentity(s);
      expect(bs.realEstate).toBeCloseTo(realEstateValue(s, 'company'), 6);
      expect(propertyRwa(s)).toBeCloseTo(realEstateValue(s, 'company') * PROPERTY_RISK_WEIGHT, 3);
      for (const account of ['company', 'personal'] as const) {
        const pb = portfolioBreakdown(s, account);
        expect(pb.total).toBeCloseTo(pb.stocks + pb.ventures + pb.realEstate + pb.ventureDebt, 6);
        expect(pb.realEstate).toBeCloseTo(realEstateValue(s, account), 6);
      }
      if (!s.realEstate.properties[companyId]) sold = true;
      if (week > 18 && !s.reo.cal && !reoSold) {
        reoSold = true;
        expect(s.company.cash).toBeGreaterThan(cashBeforeReoSale);
      }
    }
    expect(sold).toBe(true);
    expect(reoSold).toBe(true);
    // The private building is still held and never entered the bank's books.
    expect(s.realEstate.properties[next!.siteId]!.owner).toBe('personal');
    expect(balanceSheet(s).realEstate).toBe(0);
    expect(realEstateValue(s, 'personal')).toBeGreaterThan(0);
    // The building that was sold is back in the listable pool.
    expect(s.world.sites[companyId]!.property!.occupancy).toBeGreaterThan(0);
  }, 60_000);
});
