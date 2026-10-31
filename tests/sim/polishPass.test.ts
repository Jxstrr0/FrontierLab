// Polish and bug pass (v0.1.49): the exploits and routine bugs a playtest read
// found — dividends past runway, buying a rival under your own offer, flipping
// homes and buildings, stacked credit lines, NaN discounts, the CMO's budget,
// growth cities reseeding, researchers without a Products floor.
import { describe, expect, it } from 'vitest';
import { CORPORATE_LENDING, OFFICE_SIZES, REAL_ESTATE } from '../../src/config/balance';
import { campaignCostIndex } from '../../src/sim/branch/marketing';
import * as cmd from '../../src/sim/commands';
import { creditLimit, creditRoom } from '../../src/sim/corporateDebt';
import { newGame } from '../../src/sim/newGame';
import { homeAsking, homeSite } from '../../src/sim/personalValues';
import { spendableCash } from '../../src/sim/runway';
import type { Branch } from '../../src/sim/state';
import { yourResearchers } from '../../src/sim/talent';
import { execGame, hire } from '../helpers/executives';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Test Lab' });

describe('dividends', () => {
  it('refuses a dividend that would spend cash below the runway gate', () => {
    const s = game();
    const room = spendableCash(s);
    const tooMuch = (room * 2 + 1_000_000) / s.company.sharesOutstanding;
    const problem = cmd.proposalProblem(s, tooMuch, s.governance.ceoSalary);
    expect(problem).toMatch(/runway|Cash allows/);
    expect(cmd.proposalProblem(s, 0, s.governance.ceoSalary)).toBeUndefined();
  });
});

describe('rival shares under your own offer', () => {
  it('blocks buying while the offer is pending', () => {
    const s = game();
    const rival = Object.values(s.rivals)[0]!;
    s.mergers.offers.push({
      id: 'o1',
      rivalId: rival.id,
      pricePerShare: 1,
      total: 1,
      premium: 0.5,
      respondWeek: 1,
      status: 'pending',
      distressed: false,
    });
    expect(cmd.offerPending(s, rival.id)).toBe(true);
    expect(cmd.maxBuy(s, 'personal', rival.id)).toBe(0);
  });
});

describe('vacation homes', () => {
  it('books a home at the price paid, so a quick resale loses the fee', () => {
    const s = game();
    s.personal.cash = 50_000_000;
    const site = homeSite(s, 'bowvalley')!.id;
    const asking = homeAsking(s, 'bowvalley');
    expect(cmd.offerHome(s, site, asking).ok).toBe(true);
    const home = s.personal.empire.homes[0]!;
    expect(home.value).toBe(home.price);
    const before = s.personal.cash;
    const r = cmd.sellHome(s, 'bowvalley');
    expect(r.ok).toBe(true);
    expect(s.personal.cash - before).toBeLessThan(asking);
  });
});

describe('buildings', () => {
  it('can be listed only after minHoldWeeks', () => {
    const s = game();
    s.company.cash += 50_000_000;
    s.company.paidInCapital += 50_000_000;
    const l = Object.values(s.realEstate.listings).sort((a, b) => a.asking - b.asking)[0]!;
    expect(cmd.offerProperty(s, l.siteId, l.asking, 'company').ok).toBe(true);
    const p = s.realEstate.properties[l.siteId]!;
    expect(cmd.saleWaitWeeks(s, p)).toBe(REAL_ESTATE.minHoldWeeks);
    expect(cmd.setPropertyForSale(s, l.siteId, true).ok).toBe(false);
    p.boughtWeek -= REAL_ESTATE.minHoldWeeks;
    expect(cmd.setPropertyForSale(s, l.siteId, true).ok).toBe(true);
  });
});

describe('credit lines', () => {
  it('share one limit across lenders', () => {
    const s = game();
    const limit = creditLimit(s);
    expect(CORPORATE_LENDING.lineEquityShare).toBeGreaterThan(0);
    s.corporateDebt.lines.a = { lenderId: 'a', drawn: limit * 0.75, rate: 0.05 };
    s.corporateDebt.lines.b = { lenderId: 'b', drawn: limit * 0.25, rate: 0.05 };
    expect(creditRoom(s)).toBe(0);
  });
});

describe('deal desk', () => {
  it('rejects a discount that is not a number', () => {
    const s = game();
    const rfp = Object.values(s.dealDesk.rfps).find((r) => r.kind === 'new');
    if (rfp) expect(cmd.bidOnRfp(s, rfp.id, NaN).ok).toBe(false);
    expect(cmd.bidOnRfp(s, 'missing', NaN).ok).toBe(false);
  });
});

describe('executives', () => {
  it('only reseeds growth cities when Expansion is switched on', () => {
    const s = execGame();
    hire(s, 'coo');
    s.executives.growthCities = {};
    cmd.setExecDelegation(s, 'coo', 'payReviews', false);
    expect(Object.keys(s.executives.growthCities)).toHaveLength(0);
  });

  it('refuses to fire an executive when severance would overdraw cash', () => {
    const s = execGame();
    hire(s, 'cfo');
    s.company.cash = 0;
    expect(cmd.fireExec(s, 'cfo').ok).toBe(false);
    expect(s.executives.seats.cfo).toBeDefined();
  });
});

describe('researchers', () => {
  it('go back on the market when the Products floor is released', () => {
    const s = execGame(['products']);
    const free = Object.values(s.talent.researchers).find((r) => !r.employer)!;
    s.company.cash += 10_000_000;
    s.company.paidInCapital += 10_000_000;
    expect(cmd.hireResearcher(s, free.id).ok).toBe(true);
    expect(yourResearchers(s)).toHaveLength(1);
    const office = Object.values(s.offices).find((o) => o.floors.includes('products'))!;
    for (let f = 0; f < office.floors.length; f++)
      if (office.floors[f] === 'products') expect(cmd.releaseFloor(s, office.id, f).ok).toBe(true);
    expect(s.departments.products).toBeUndefined();
    expect(yourResearchers(s)).toHaveLength(0);
  });
});

describe('office campaigns', () => {
  it('cost more as the office grows', () => {
    const s = game();
    const b = { cityId: 'cal', size: 0 } as unknown as Branch;
    const starter = campaignCostIndex(s, b);
    expect(campaignCostIndex(s, { ...b, size: 3 } as Branch)).toBeCloseTo(
      starter * OFFICE_SIZES[3].mult,
      6,
    );
  });
});
