// The Deal Desk (stage C5b, SIMULATION §11): RFP arrival and expiry, renewal
// notices, bidding through the command, contract revenue in the office P&L,
// and determinism of the whole thing.
import { describe, expect, it } from 'vitest';
import { DEAL, WEEKS_PER_YEAR } from '../../src/config/balance';
import { contractsOf, deskWeek } from '../../src/sim/branch/dealDesk';
import { isQuarterStart, quarterStartWeek } from '../../src/sim/calendar';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { officeContractArr } from '../../src/sim/contracts';
import type { GameState } from '../../src/sim/state';
import {
  addRfp,
  dealGame,
  giveContract,
  lotBusinesses,
  setRivals,
  unserved,
} from '../helpers/deals';

const newRfps = (s: GameState) => Object.values(s.dealDesk.rfps).filter((r) => r.kind === 'new');

describe('RFPs arrive', () => {
  it('for unserved businesses while Enterprise contracts is on', () => {
    const { s, id } = dealGame();
    setRivals(s);
    const seen = new Set<string>();
    for (let w = 0; w < 40; w++) {
      advanceWeeks(s, 1);
      for (const r of newRfps(s)) {
        seen.add(r.businessId);
        expect(r.branchId).toBe(id);
        expect(s.businesses[r.businessId]!.cityId).toBe('cal');
        expect(s.businesses[r.businessId]!.vendor).toBeUndefined();
        expect(r.dueWeek).toBe(r.createdWeek + DEAL.expiryWeeks);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('not while the product is off', () => {
    const { s, id } = dealGame();
    setRivals(s);
    cmd.setOffered(s, id, 'sbl', false);
    expect(s.branches[id]!.offered.sbl!.on).toBe(false);
    for (let w = 0; w < 40; w++) {
      advanceWeeks(s, 1);
      expect(newRfps(s)).toHaveLength(0);
    }
  });

  it('not from businesses on a cooldown', () => {
    const { s } = dealGame();
    setRivals(s);
    for (const b of lotBusinesses(s)) b.quietUntil = s.clock.week + 1000;
    advanceWeeks(s, 30);
    expect(newRfps(s).filter((r) => s.businesses[r.businessId]!.lotId)).toHaveLength(0);
  });
});

describe('RFPs expire', () => {
  it('after expiryWeeks, sending the business into a cooldown', () => {
    const { s, id } = dealGame();
    setRivals(s); // no rival can sign it meanwhile
    const b = unserved(s)[0]!;
    // Keep the dice from adding others for this business.
    const rfp = addRfp(s, id, b);
    advanceWeeks(s, DEAL.expiryWeeks - 1);
    expect(s.dealDesk.rfps[rfp.id]).toBeDefined();
    advanceWeeks(s, 2);
    expect(s.dealDesk.rfps[rfp.id]).toBeUndefined();
    expect(b.vendor).toBeUndefined();
    expect(b.quietUntil).toBeGreaterThanOrEqual(rfp.dueWeek + DEAL.cooldownWeeks);
  });

  it('and vanish when another vendor signs the business first', () => {
    const { s, id } = dealGame();
    const b = unserved(s)[0]!;
    const rfp = addRfp(s, id, b);
    b.vendor = { type: 'rival', id: Object.keys(s.rivals)[0]! };
    advanceWeeks(s, 1);
    expect(s.dealDesk.rfps[rfp.id]).toBeUndefined();
    expect(b.quietUntil).toBeUndefined();
  });
});

describe('renewal notices', () => {
  it('appear exactly renewalNoticeWeeks before the renewal week and carry the current discount', () => {
    const { s, id } = dealGame();
    const b = lotBusinesses(s)[0]!;
    b.size = 'anchor'; // anchors never fail, so the contract is still there to renew
    giveContract(s, id, b, 0.1, 2);
    const due = b.renewalWeek!;
    expect(isQuarterStart(s.meta.startDate, due * 7)).toBe(true);
    let first: number | undefined;
    while (s.clock.week < due - 1) {
      advanceWeeks(s, 1);
      const rfp = Object.values(s.dealDesk.rfps).find((r) => r.businessId === b.id);
      if (rfp && first === undefined) {
        first = s.clock.week;
        expect(rfp.kind).toBe('renewal');
        expect(rfp.dueWeek).toBe(due);
        expect(rfp.offer).toBeCloseTo(0.1);
      }
      if (first === undefined) expect(due - s.clock.week).toBeGreaterThan(DEAL.renewalNoticeWeeks);
    }
    expect(first).toBe(due - DEAL.renewalNoticeWeeks);
  });

  it('are made for a rival’s contract only while Enterprise contracts is on', () => {
    for (const on of [true, false]) {
      const { s, id } = dealGame();
      const rival = setRivals(s, 3)!;
      cmd.setOffered(s, id, 'sbl', on);
      const b = lotBusinesses(s)[0]!;
      b.vendor = { type: 'rival', id: rival };
      b.renewalWeek = quarterStartWeek(s.meta.startDate, s.clock.week, 1);
      advanceWeeks(s, Math.max(0, b.renewalWeek - DEAL.renewalNoticeWeeks - s.clock.week));
      const open = Object.values(s.dealDesk.rfps).some((r) => r.businessId === b.id);
      expect(open).toBe(on);
    }
  });
});

describe('bidOnRfp', () => {
  it('a win signs the contract at the discounted budget, rounded to $100', () => {
    const { s, id } = dealGame();
    setRivals(s);
    s.branches[id]!.ratings.overall = 5;
    const before = s.underwriting.loansBooked;
    const won = unserved(s)
      .slice(0, 6)
      .filter((b) => {
        const budget = b.budget;
        const rfp = addRfp(s, id, b);
        const r = cmd.bidOnRfp(s, rfp.id, 0.4); // 95% to win
        expect(r.ok).toBe(true);
        expect(s.dealDesk.rfps[rfp.id]).toBeUndefined();
        if (!r.ok || !r.won) return false;
        expect(b.vendor).toEqual({ type: 'player', id });
        expect(b.contractValue).toBe(Math.round((budget * 0.6) / 100) * 100);
        expect(b.contractValue! % 100).toBe(0);
        expect(b.renewalWeek).toBeGreaterThan(s.clock.week);
        expect(isQuarterStart(s.meta.startDate, b.renewalWeek! * 7)).toBe(true);
        expect(b.startWeek).toBe(s.clock.week);
        const ev = s.events.log.filter(
          (e) => e.type === 'CONTRACT_WON' && e.payload.businessId === b.id,
        );
        expect(ev).toHaveLength(1);
        expect(ev[0]!.payload).toMatchObject({ branchId: id, value: b.contractValue });
        return true;
      });
    expect(won.length).toBeGreaterThanOrEqual(4);
    expect(s.underwriting.loansBooked).toBe(before + won.length);
    expect(deskWeek(s, s.branches[id]!).won).toBe(won.length);
  });

  it('a loss leaves the business unserved and quiet for the cooldown', () => {
    const { s, id } = dealGame();
    setRivals(s, 5);
    s.branches[id]!.ratings.overall = 1; // 5% to win
    const b = unserved(s)[0]!;
    const rfp = addRfp(s, id, b);
    const r = cmd.bidOnRfp(s, rfp.id, 0);
    expect(r).toMatchObject({ ok: true, won: false });
    expect(b.vendor).toBeUndefined();
    expect(b.quietUntil).toBe(s.clock.week + DEAL.cooldownWeeks);
    expect(deskWeek(s, s.branches[id]!).lost).toBe(1);
    expect(s.events.log.some((e) => e.type === 'CONTRACT_WON')).toBe(false);
  });

  it('refuses an expired request and a renewal', () => {
    const { s, id } = dealGame();
    expect(cmd.bidOnRfp(s, 'rfp_none', 0.1).ok).toBe(false);
    const b = unserved(s)[0]!;
    const renewal = addRfp(s, id, b, 'renewal');
    expect(cmd.bidOnRfp(s, renewal.id, 0.1).ok).toBe(false);
  });

  it('declining sets the cooldown too', () => {
    const { s, id } = dealGame();
    const b = unserved(s)[0]!;
    const rfp = addRfp(s, id, b);
    expect(cmd.declineApplication(s, rfp.id).ok).toBe(true);
    expect(b.quietUntil).toBe(s.clock.week + DEAL.cooldownWeeks);
  });
});

describe('contract revenue', () => {
  it('lands in the office P&L (the Deal Desk line) at contractValue / 52 a week', () => {
    const { s, id } = dealGame();
    setRivals(s);
    const bs = lotBusinesses(s);
    bs.slice(0, 3).forEach((b, i) => {
      b.size = 'anchor'; // no failures during the week
      giveContract(s, id, b, 0, 3 + i);
    });
    const arr = officeContractArr(s, id);
    expect(contractsOf(s, id)).toHaveLength(3);
    expect(arr).toBeGreaterThan(0);
    advanceWeeks(s, 1);
    const row = s.branches[id]!.pnl.at(-1)!;
    expect(row.lines.loanDesk).toBeGreaterThanOrEqual(arr / WEEKS_PER_YEAR - 1);
    expect(row.lines.loanDesk).toBeLessThan((arr * 1.5) / WEEKS_PER_YEAR);
    expect(row.revenue).toBeGreaterThanOrEqual(row.lines.loanDesk);
  });
});

describe('determinism', () => {
  const run = () => {
    const { s, id } = dealGame(7);
    for (let w = 0; w < 60; w++) {
      advanceWeeks(s, 1);
      for (const r of Object.values(s.dealDesk.rfps))
        if (r.kind === 'new') cmd.bidOnRfp(s, r.id, 0.1);
    }
    return { s, id };
  };

  it('gives the same businesses, RFPs and events for the same seed and commands', () => {
    const a = run().s;
    const b = run().s;
    expect(a.businesses).toEqual(b.businesses);
    expect(a.dealDesk).toEqual(b.dealDesk);
    expect(a.events.log).toEqual(b.events.log);
    expect(Object.values(a.businesses).some((x) => x.vendor?.type === 'player')).toBe(true);
  });
});
