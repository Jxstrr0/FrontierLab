// Contracts over time (stage C5b, SIMULATION §11.2): the quarterly renewal season,
// business failures and outage losses, closing an office, and the 12 → 13 save
// migration.
import { describe, expect, it } from 'vitest';
import { BUSINESS, DEAL } from '../../src/config/balance';
import { contractsOf } from '../../src/sim/branch/dealDesk';
import { isQuarterStart } from '../../src/sim/calendar';
import {
  endOfficeContracts,
  moveOfficeContracts,
  officeContractArr,
  renewalSeason,
  runContracts,
} from '../../src/sim/contracts';
import * as cmd from '../../src/sim/commands';
import { businessesIn } from '../../src/sim/businesses';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import {
  addRfp,
  dealGame,
  giveContract,
  giveRivalContract,
  lotBusinesses,
  setRivals,
} from '../helpers/deals';

const lost = (s: GameState) => s.events.log.filter((e) => e.type === 'CONTRACT_LOST');
const won = (s: GameState) => s.events.log.filter((e) => e.type === 'CONTRACT_WON');

describe('renewalSeason: your own contracts', () => {
  it('keeps most when you are ahead and offer a deep discount', () => {
    const { s, id } = dealGame();
    setRivals(s, 1);
    s.branches[id]!.ratings.overall = 5;
    const mine = lotBusinesses(s).slice(0, 15);
    mine.forEach((b) => giveContract(s, id, b, DEAL.discountMax));
    const week = s.clock.week;
    for (const b of mine) b.renewalWeek = week;
    renewalSeason(s);
    const kept = mine.filter((b) => b.vendor?.type === 'player');
    expect(kept.length).toBeGreaterThanOrEqual(12);
    for (const b of kept) {
      expect(b.renewalWeek).toBeGreaterThan(week);
      expect(isQuarterStart(s.meta.startDate, b.renewalWeek! * 7)).toBe(true);
      expect(b.contractValue).toBe(Math.round((b.budget * (1 - DEAL.discountMax)) / 100) * 100);
    }
    expect(lost(s)).toHaveLength(mine.length - kept.length);
  });

  it('loses most when a better rival is in town, handing them to that rival', () => {
    const { s, id } = dealGame();
    const rival = setRivals(s, 5)!;
    s.branches[id]!.ratings.overall = 1;
    const mine = lotBusinesses(s).slice(0, 15);
    mine.forEach((b) => {
      giveContract(s, id, b, 0);
      b.pentagon[3] = 1; // nothing keeps them
    });
    const before = officeContractArr(s, id);
    for (const b of mine) b.renewalWeek = s.clock.week;
    renewalSeason(s);
    const gone = mine.filter((b) => b.vendor?.type !== 'player');
    expect(gone.length).toBeGreaterThanOrEqual(12);
    for (const b of gone) {
      expect(b.vendor).toEqual({ type: 'rival', id: rival });
      const ev = lost(s).find((e) => e.payload.businessId === b.id)!;
      expect(ev.payload).toMatchObject({
        reason: 'renewal',
        branchId: id,
        to: s.rivals[rival]!.name,
      });
    }
    expect(officeContractArr(s, id)).toBeLessThan(before);
  });

  it('drops a contract with no rival to go to, leaving the business unserved', () => {
    const { s, id } = dealGame();
    setRivals(s);
    s.branches[id]!.ratings.overall = 1;
    // No rival, no discount, easy to leave: keep chance 0.8 + 0.2 − 0.16 = 0.84.
    const mine = lotBusinesses(s);
    mine.forEach((b) => {
      giveContract(s, id, b, 0);
      b.pentagon[3] = 1;
      b.renewalWeek = s.clock.week;
    });
    renewalSeason(s);
    const gone = mine.filter((b) => b.vendor?.type !== 'player');
    expect(gone.length).toBeGreaterThan(0);
    expect(gone.length).toBeLessThan(mine.length / 2);
    for (const b of gone) {
      expect(b.vendor).toBeUndefined();
      expect(b.contractValue).toBeUndefined();
      expect(b.renewalWeek).toBeUndefined();
      const ev = lost(s).find((e) => e.payload.businessId === b.id)!;
      expect(ev.payload.reason).toBe('renewal');
      expect(ev.payload.to).toBeUndefined();
    }
  });
});

describe('renewalSeason: rival contracts', () => {
  it('goes to you when you bid and win, naming the rival you took it from', () => {
    const { s, id } = dealGame();
    const rival = setRivals(s, 1)!;
    s.branches[id]!.ratings.overall = 5;
    const targets = lotBusinesses(s).slice(0, 15);
    for (const b of targets) {
      giveRivalContract(s, rival, b);
      b.pentagon[3] = 1;
      b.renewalWeek = s.clock.week;
      addRfp(s, id, b, 'renewal', { dueWeek: s.clock.week, offer: DEAL.discountMax });
    }
    renewalSeason(s);
    const mine = targets.filter((b) => b.vendor?.type === 'player');
    expect(mine.length).toBeGreaterThanOrEqual(12);
    for (const b of mine) {
      expect(b.vendor!.id).toBe(id);
      expect(b.contractValue).toBe(Math.round((b.budget * (1 - DEAL.discountMax)) / 100) * 100);
      const ev = won(s).find((e) => e.payload.businessId === b.id)!;
      expect(ev.payload.from).toBe(s.rivals[rival]!.name);
    }
    expect(Object.values(s.dealDesk.rfps).filter((r) => r.kind === 'renewal')).toHaveLength(0);
  });

  it('stays with the rival, on a new term, when you made no bid', () => {
    const { s } = dealGame();
    const rival = setRivals(s, 3)!;
    const b = lotBusinesses(s)[0]!;
    giveRivalContract(s, rival, b);
    const due = (b.renewalWeek = s.clock.week);
    renewalSeason(s);
    expect(b.vendor).toEqual({ type: 'rival', id: rival });
    expect(b.renewalWeek).toBeGreaterThan(due);
    expect(isQuarterStart(s.meta.startDate, b.renewalWeek! * 7)).toBe(true);
    expect(won(s)).toHaveLength(0);
  });

  it('leaves the business unserved when the rival has left the city and you did not bid', () => {
    const { s } = dealGame();
    const rival = setRivals(s, 3)!;
    const b = lotBusinesses(s)[0]!;
    giveRivalContract(s, rival, b);
    b.renewalWeek = s.clock.week;
    s.rivals[rival]!.branches = [];
    renewalSeason(s);
    expect(b.vendor).toBeUndefined();
  });
});

describe('runContracts', () => {
  it('lets a business with very low Financial health fail: re-rolled in place, no vendor', () => {
    const { s, id } = dealGame();
    setRivals(s, 3);
    const targets = lotBusinesses(s).slice(0, 8);
    const names = new Map(targets.map((b) => [b.id, b.name]));
    for (const b of targets) {
      giveContract(s, id, b, 0, 3);
      b.pentagon[4] = 1;
    }
    for (let i = 0; i < 6000 && targets.some((b) => b.name === names.get(b.id)); i++)
      runContracts(s);
    for (const b of targets) {
      expect(s.businesses[b.id]).toBe(b); // same id, same object: re-rolled in place
      expect(b.name).not.toBe(names.get(b.id));
      expect(b.vendor).toBeUndefined();
      expect(b.contractValue).toBeUndefined();
    }
    const failed = lost(s).filter((e) => e.payload.reason === 'failed');
    expect(failed).toHaveLength(targets.length);
    expect(contractsOf(s, id)).toHaveLength(0);
  });

  it('never fails an anchor account, and loses contracts to outages only while one runs', () => {
    const { s, id } = dealGame();
    setRivals(s);
    const anchor = businessesIn(s, 'cal').find((b) => b.size === 'anchor')!;
    giveContract(s, id, anchor, 0, 3);
    anchor.pentagon[4] = 1;
    anchor.pentagon[2] = 5;
    s.compute.outageWeeksLeft = 0;
    for (let i = 0; i < 1500; i++) runContracts(s);
    expect(anchor.vendor).toEqual({ type: 'player', id });
    expect(lost(s)).toHaveLength(0);

    s.compute.outageWeeksLeft = 3;
    for (let i = 0; i < 1500 && anchor.vendor; i++) runContracts(s);
    expect(anchor.vendor).toBeUndefined();
    expect(lost(s)).toHaveLength(1);
    expect(lost(s)[0]!.payload).toMatchObject({ reason: 'outage', businessId: anchor.id });
  });
});

describe('closing an office', () => {
  it('endOfficeContracts ends every contract and RFP the office has', () => {
    const { s, id } = dealGame();
    setRivals(s);
    const [a, b, c] = lotBusinesses(s);
    giveContract(s, id, a!);
    giveContract(s, id, b!);
    addRfp(s, id, c!);
    endOfficeContracts(s, id);
    expect(contractsOf(s, id)).toHaveLength(0);
    expect(Object.values(s.dealDesk.rfps).filter((r) => r.branchId === id)).toHaveLength(0);
    expect(lost(s).map((e) => e.payload.reason)).toEqual(['office', 'office']);
  });

  it('closing the only office ends its contracts', () => {
    const { s, id } = dealGame();
    const b = lotBusinesses(s)[0]!;
    giveContract(s, id, b);
    expect(cmd.closeBranch(s, id).ok).toBe(true);
    expect(b.vendor?.type === 'player' && b.vendor.id === id).toBe(false);
    expect(lost(s).some((e) => e.payload.reason === 'office')).toBe(true);
  });

  it('moveOfficeContracts hands contracts and RFPs to the office that absorbs this one', () => {
    const { s, id } = dealGame();
    const [a, b] = lotBusinesses(s);
    giveContract(s, id, a!);
    const rfp = addRfp(s, id, b!);
    moveOfficeContracts(s, id, 'br_other');
    expect(a!.vendor).toEqual({ type: 'player', id: 'br_other' });
    expect(s.dealDesk.rfps[rfp.id]!.branchId).toBe('br_other');
  });
});

describe('save migration 12 → 13', () => {
  it('repays loans into reserves, renames the desk, adds the limit and rescales budgets', () => {
    const { s, id } = dealGame();
    const raw = s as unknown as Record<string, unknown>;
    // Back to a schema-12 save.
    raw.loanDesk = {
      loans: {
        l1: { id: 'l1', balance: 250_000, status: 'current' },
        l2: { id: 'l2', balance: 90_000, status: 'current' },
        l3: { id: 'l3', balance: 40_000, status: 'repaid' },
      },
      applications: {},
    };
    delete raw.dealDesk;
    const branch = s.branches[id]!;
    (branch as unknown as Record<string, unknown>).desk = {
      week: 3,
      arrived: 5,
      approved: 4,
      refused: 2,
      declined: 1,
      expired: 0,
    };
    delete (branch as unknown as Record<string, unknown>).discountLimit;
    const orig = new Map<string, number>();
    for (const b of Object.values(s.businesses)) {
      orig.set(b.id, b.budget);
      b.budget =
        Math.round((b.budget * BUSINESS.oldBudgets[b.size]) / BUSINESS.sizes[b.size].budget / 100) *
        100;
    }
    const reserves = s.treasury.reserves;
    migrations[12]!(raw as never);

    expect(s.treasury.reserves).toBe(reserves + 340_000);
    expect(raw.loanDesk).toBeUndefined();
    expect(s.dealDesk).toEqual({ rfps: {} });
    expect(branch.desk).toEqual({ week: 3, arrived: 5, won: 4, lost: 2, declined: 1, expired: 0 });
    expect(branch.discountLimit).toBe(DEAL.defaultLimit);
    for (const b of Object.values(s.businesses)) {
      expect(Math.abs(b.budget - orig.get(b.id)!)).toBeLessThanOrEqual(100);
      if (b.contractValue !== undefined) expect(b.contractValue).toBeLessThanOrEqual(b.budget);
    }
  });

  it('migrates a fresh game’s untouched fields without loss', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    const raw = s as unknown as Record<string, unknown>;
    delete raw.dealDesk;
    migrations[12]!(raw as never);
    expect(s.dealDesk.rfps).toEqual({});
  });
});
