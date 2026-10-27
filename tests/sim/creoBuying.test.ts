// The CREO's occupancy dials and Buying switches (SIMULATION §21.1, §21.2,
// §17.2; DESIGN decision log 2026-10-26): a dial stop prices each managed
// building to hold that occupancy (100% = bestRent), at once when changed;
// Buying buys the best-yield listing at asking for the bank or for you, within
// each budget.
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION, REAL_ESTATE } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { refreshExecCandidates } from '../../src/sim/execCandidates';
import { creoBuy, creoRent, nextPurchase, personalBuyLimit } from '../../src/sim/execBuying';
import { occupancyEstimate } from '../../src/sim/execDelegationsProperty';
import { rentPricingPower } from '../../src/sim/execSeats';
import { postCash } from '../../src/sim/ledger';
import { bestRent, occupancyTarget, rentForOccupancy } from '../../src/sim/propertyMath';
import { type GameState } from '../../src/sim/state';
import { execGame, hire, identityGap, staffSafety } from '../helpers/executives';

function fund(s: GameState, amount: number) {
  postCash(s, amount, 'financing');
  s.company.paidInCapital += amount;
}

/** A game with a seated CREO whose four switches are as given. */
function chiefGame(on: Partial<Record<string, boolean>> = {}): GameState {
  const s = execGame();
  refreshExecCandidates(s, true);
  hire(s, 'creo');
  for (const id of ['bankRents', 'privateRents', 'bankBuys', 'privateBuys'])
    cmd.setExecDelegation(s, 'creo', id, on[id] ?? false);
  return s;
}

const owned = (s: GameState, owner: 'company' | 'personal') =>
  Object.values(s.realEstate.properties).filter((p) => p.owner === owner);

describe('occupancy dial', () => {
  it('solves the occupancy curve for rent; 100% is the best rent', () => {
    const market = 400;
    const power = 0.07;
    expect(rentForOccupancy(market, power, 1)).toBe(bestRent(market, power));
    let prev = rentForOccupancy(market, power, 1);
    for (const t of [0.95, 0.9, 0.85, 0.8]) {
      const rent = rentForOccupancy(market, power, t);
      expect(rent).toBeGreaterThan(prev);
      const occ = occupancyTarget(rent, market, power);
      // Rounding the rent down to the step leaves occupancy at or a hair above the stop.
      expect(occ).toBeGreaterThanOrEqual(t - 1e-12);
      expect(occ - t).toBeLessThan((REAL_ESTATE.occSlope * REAL_ESTATE.rentStep) / market);
      prev = rent;
    }
  });

  it('reprices managed buildings at once and earns less below 100%', () => {
    const s = chiefGame({ bankRents: true });
    fund(s, 1_000_000_000);
    const pick = creoBuy(s, 'company')!;
    const p = s.realEstate.properties[pick.siteId]!;
    const power = rentPricingPower(s, 'company');
    expect(p.rent).toBe(bestRent(p.marketRent, power));
    expect(cmd.setOccupancyTarget(s, 'company', 0.9).ok).toBe(true);
    expect(p.rent).toBe(rentForOccupancy(p.marketRent, power, 0.9));
    const e = occupancyEstimate(s, 'company', 0.9);
    expect(e.buildings).toBe(1);
    expect(e.rentUp).toBeGreaterThan(0.04);
    expect(e.net).toBeLessThan(e.netFull);
    expect(cmd.setOccupancyTarget(s, 'company', 0.75).ok).toBe(false);
    // Your own buildings keep their own stop.
    expect(s.executives.occTargets.personal).toBe(EXEC_DELEGATION.occTarget);
  });
});

describe('buying for the bank', () => {
  it('buys the best-yield listing at asking every 4 weeks, in any city', () => {
    const s = chiefGame({ bankRents: true, bankBuys: true });
    fund(s, 1_000_000_000);
    staffSafety(s); // past founder mode the regulator wants a Safety floor (C7a)
    const before = owned(s, 'company').length;
    const plan = nextPurchase(s, 'company');
    expect(plan.pick).toBeDefined();
    const cash = s.company.cash;
    const pick = creoBuy(s, 'company')!;
    expect(pick.siteId).toBe(plan.pick!.siteId);
    expect(s.company.cash).toBeCloseTo(cash - pick.asking, 2);
    const p = s.realEstate.properties[pick.siteId]!;
    expect(p.owner).toBe('company');
    expect(p.purchasePrice).toBe(pick.asking);
    expect(p.rent).toBe(creoRent(s, 'company', p.marketRent));
    expect(s.realEstate.listings[pick.siteId]).toBeUndefined();
    expect(identityGap(s)).toBeLessThan(1);
    // Over a couple of reviews the switch keeps buying by itself.
    advanceWeeks(s, EXEC_DELEGATION.buyEveryWeeks * 2);
    expect(owned(s, 'company').length).toBeGreaterThanOrEqual(before + 2);
    expect(identityGap(s)).toBeLessThan(1);
    expect(owned(s, 'personal')).toHaveLength(0);
  });

  it('waits for spare cash and never buys at a restricted capital tier', () => {
    const s = chiefGame({ bankBuys: true });
    expect(nextPurchase(s, 'company').blocker).toMatch(/spare cash|assets|capital ratio/);
    fund(s, 1_000_000_000);
    expect(nextPurchase(s, 'company').pick).toBeDefined();
    s.company.tier = 'restricted';
    expect(nextPurchase(s, 'company').blocker).toMatch(/regulator/);
  });

  it('keeps the bank’s buildings under 5% of its assets', () => {
    const s = chiefGame({ bankBuys: true });
    fund(s, 300_000_000);
    for (let i = 0; i < 40 && creoBuy(s, 'company'); i++);
    const bs = balanceSheet(s);
    expect(bs.realEstate).toBeLessThanOrEqual(EXEC_DELEGATION.buyAssetCap * bs.assets + 1);
  });
});

describe('buying for you', () => {
  it('keeps a year of salary and spends at most half the rest on one building', () => {
    const s = chiefGame({ privateBuys: true });
    const reserve = EXEC_DELEGATION.buyReserveYears * s.governance.ceoSalary;
    s.personal.cash = reserve;
    expect(personalBuyLimit(s)).toBe(0);
    expect(nextPurchase(s, 'personal').blocker).toMatch(/salary/);
    s.personal.cash = reserve + 200_000_000;
    expect(personalBuyLimit(s)).toBeCloseTo(100_000_000, 2);
    const cash = s.personal.cash;
    const pick = creoBuy(s, 'personal')!;
    expect(pick.asking).toBeLessThanOrEqual(100_000_000);
    expect(s.personal.cash).toBeCloseTo(cash - pick.asking, 2);
    expect(s.realEstate.properties[pick.siteId]!.owner).toBe('personal');
    expect(pick.yield).toBeGreaterThan(0);
  });
});
