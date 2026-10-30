// Public-sector tenders (SIMULATION §11.7, owner's review A4): quarterly
// tenders for labs rated Adequate or better, sealed bids judged mostly on the
// AI model's Safety axis, long contracts that earn like enterprise contracts,
// and cancellation when the safety tier falls below Adequate.
import { describe, expect, it } from 'vitest';
import { DEAL, TENDER, WEEKS_PER_YEAR } from '../../src/config/balance';
import { companyArr } from '../../src/sim/arr';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { migrations } from '../../src/sim/save/migrations';
import { exportCode, importCode } from '../../src/sim/save/serialize';
import type { GameState, Tender } from '../../src/sim/state';
import {
  officeTenderArr,
  runTenders,
  tenderChance,
  tendersQuarter,
  tenderValueAt,
} from '../../src/sim/tenders';
import { activeModel, modelQuality, RADAR } from '../../src/sim/underwriting';
import { openBank } from '../helpers/incidents';
import { identityGap } from '../helpers/mergers';

/** A game past the first-tender week with a deal-taking office, rated Adequate. */
function game() {
  const { s, b } = openBank();
  b.offered.sbl = { price: 0, ...b.offered.sbl, on: true };
  s.clock.week = TENDER.firstWeek;
  s.company.tier = 'adequate';
  return { s, b };
}

function tender(s: GameState, branchId: string, over: Partial<Tender> = {}): Tender {
  const t: Tender = {
    id: `tender_${Object.keys(s.dealDesk.tenders).length}`,
    name: 'Calgary Transit Commission',
    bodyId: 'transit',
    cityId: 'cal',
    branchId,
    budget: 1_000_000,
    termWeeks: 3 * WEEKS_PER_YEAR,
    status: 'open',
    openWeek: s.clock.week,
    closeWeek: s.clock.week,
    ...over,
  };
  s.dealDesk.tenders[t.id] = t;
  return t;
}

const setSafety = (s: GameState, v: number) => (activeModel(s).radar[RADAR.safety] = v);
const events = (s: GameState, type: string) => s.events.log.filter((e) => e.type === type);

describe('public tenders', () => {
  it('opens tenders at a quarter start only for labs rated Adequate or better', () => {
    const { s } = game();
    s.company.tier = 'watch';
    for (let i = 0; i < 40; i++) tendersQuarter(s);
    expect(Object.keys(s.dealDesk.tenders)).toHaveLength(0);
    s.company.tier = 'adequate';
    for (let i = 0; i < 40 && Object.keys(s.dealDesk.tenders).length === 0; i++) tendersQuarter(s);
    const [t] = Object.values(s.dealDesk.tenders);
    expect(t?.status).toBe('open');
    expect(t?.closeWeek).toBe(s.clock.week + TENDER.bidWeeks);
    expect(t?.name).toMatch(/^Calgary /);
    expect(t!.budget).toBeGreaterThan(0);
    expect(events(s, 'TENDER_OPENED')).toHaveLength(1);
    // One tender per city at a time.
    for (let i = 0; i < 40; i++) tendersQuarter(s);
    expect(Object.keys(s.dealDesk.tenders)).toHaveLength(1);
  });

  it('opens none before the first-tender week', () => {
    const { s } = game();
    s.clock.week = TENDER.firstWeek - 1;
    for (let i = 0; i < 40; i++) tendersQuarter(s);
    expect(Object.keys(s.dealDesk.tenders)).toHaveLength(0);
  });

  it('weighs the Safety axis heavily, and is shut below Adequate', () => {
    const { s } = game();
    setSafety(s, 4);
    const low = tenderChance(s, 0);
    const q4 = modelQuality(activeModel(s));
    setSafety(s, 8);
    const high = tenderChance(s, 0);
    // Safety counts directly and again through the model's overall quality.
    const dq = modelQuality(activeModel(s)) - q4;
    expect(high - low).toBeCloseTo(4 * TENDER.safetySlope + dq * TENDER.qualitySlope, 10);
    expect(tenderChance(s, 0.1) - high).toBeCloseTo(0.1 * TENDER.discountSlope, 10);
    s.company.tier = 'strong';
    expect(tenderChance(s, 0) - high).toBeCloseTo(TENDER.tierEdge.strong!, 10);
    s.company.tier = 'watch';
    expect(tenderChance(s, 0.2)).toBe(0);
  });

  it('awards sealed bids when bids close', () => {
    const { s, b } = game();
    setSafety(s, 10);
    s.company.tier = 'strong';
    const ts = Array.from({ length: 20 }, () => tender(s, b.id, { bid: 0.2 }));
    runTenders(s);
    const won = ts.filter((t) => s.dealDesk.tenders[t.id]?.status === 'active');
    expect(won.length).toBeGreaterThan(0);
    expect(won.length + events(s, 'TENDER_LOST').length).toBe(20);
    expect(events(s, 'TENDER_WON')).toHaveLength(won.length);
    const t = won[0]!;
    expect(t.value).toBe(tenderValueAt(t, 0.2));
    expect(t.endWeek).toBe(s.clock.week + t.termWeeks);
    expect(t.bid).toBeUndefined();
  });

  it('drops a tender nobody bid on, and lets a delegated desk bid', () => {
    const { s, b } = game();
    const quiet = tender(s, b.id);
    runTenders(s);
    expect(s.dealDesk.tenders[quiet.id]).toBeUndefined();
    expect(events(s, 'TENDER_LOST')).toHaveLength(0);
    // A manager with Deal Desk delegation seals a bid at the close.
    setSafety(s, 10);
    s.company.tier = 'strong';
    b.managerId = 'mgr_test';
    b.delegation.loans = true;
    b.discountLimit = DEAL.discountMax;
    const t = tender(s, b.id);
    runTenders(s);
    const decided =
      s.dealDesk.tenders[t.id]?.status === 'active' || events(s, 'TENDER_LOST').length;
    expect(decided).toBeTruthy();
  });

  it('earns its value weekly and counts in ARR, books balanced', () => {
    const { s, b } = game();
    const t = tender(s, b.id, { status: 'active', value: 520_000, endWeek: s.clock.week + 200 });
    expect(officeTenderArr(s, b.id)).toBe(520_000);
    const before = companyArr(s);
    delete s.dealDesk.tenders[t.id];
    expect(before - companyArr(s)).toBe(520_000);
    s.dealDesk.tenders[t.id] = t;
    s.company.tier = 'strong';
    advanceWeeks(s, 4);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('cancels contracts when the tier falls to Restricted, and ends them at term', () => {
    const { s, b } = game();
    const held = tender(s, b.id, { status: 'active', value: 400_000, endWeek: s.clock.week + 50 });
    const due = tender(s, b.id, { status: 'active', value: 300_000, endWeek: s.clock.week });
    runTenders(s);
    expect(s.dealDesk.tenders[due.id]).toBeUndefined();
    expect(events(s, 'TENDER_ENDED')).toHaveLength(1);
    // Watch stops new awards but keeps contracts; Restricted cancels them.
    s.company.tier = 'watch';
    runTenders(s);
    expect(s.dealDesk.tenders[held.id]?.status).toBe('active');
    s.company.tier = 'restricted';
    runTenders(s);
    expect(s.dealDesk.tenders[held.id]).toBeUndefined();
    expect(events(s, 'TENDER_CANCELLED')[0]?.payload.reason).toBe('tier');
  });

  it('seals, replaces and withdraws a bid; refuses one below Adequate', () => {
    const { s, b } = game();
    const t = tender(s, b.id, { closeWeek: s.clock.week + 3 });
    expect(cmd.bidOnTender(s, t.id, 0.123).ok).toBe(true);
    expect(t.bid).toBeCloseTo(0.12, 10);
    expect(cmd.bidOnTender(s, t.id, 0.05).ok).toBe(true);
    expect(t.bid).toBeCloseTo(0.05, 10);
    expect(cmd.withdrawTenderBid(s, t.id).ok).toBe(true);
    expect(t.bid).toBeUndefined();
    expect(cmd.withdrawTenderBid(s, t.id).ok).toBe(false);
    s.company.tier = 'watch';
    expect(cmd.bidOnTender(s, t.id, 0.1).ok).toBe(false);
  });

  it('adds an empty tender book to older saves and round-trips', () => {
    const { s, b } = game();
    const raw = s as unknown as { dealDesk: { tenders?: unknown } };
    delete raw.dealDesk.tenders;
    migrations[34]!(s as never);
    expect(s.dealDesk.tenders).toEqual({});
    tender(s, b.id, { bid: 0.1, closeWeek: s.clock.week + 2 });
    expect(importCode(exportCode(s))).toEqual(s);
  });
});
