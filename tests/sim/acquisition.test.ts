// ROADMAP Stage 6 acceptance: buy a rival in Calgary, then for 20 weekly
// ticks the balance identity holds, the branches convert after 8 weeks,
// goodwill is deducted from CET1 and the rival is gone (SIMULATION §19.8, §15).
import { describe, expect, it } from 'vitest';
import { MERGERS } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { capitalSnapshot } from '../../src/sim/capital';
import { advanceWeeks } from '../../src/sim/engine';
import { referencePrice } from '../../src/sim/mergerPricing';
import type { GameEvent } from '../../src/sim/state';
import { capitalisedBank, cmd, identityGap, smallestRival } from '../helpers/mergers';

describe('acquiring a rival bank', () => {
  it('merges the books, converts the branches over 8 weeks and keeps the identity', () => {
    const s = capitalisedBank();
    const target = smallestRival(s);
    const rbs = target.branches.map((b) => ({ lotId: b.lotId, deposits: b.deposits }));
    const offer = cmd.offerMerger(s, target.id, referencePrice(target) * 1.6);
    expect(offer.ok).toBe(true);
    expect(identityGap(s)).toBeLessThan(1);

    const seen: GameEvent[] = [];
    let closedWeek = -1;
    for (let i = 0; i < 20; i++) {
      advanceWeeks(s, 1);
      seen.push(...s.events.log.filter((e) => e.week === s.clock.week));
      expect(identityGap(s)).toBeLessThan(1);
      if (closedWeek < 0 && seen.some((e) => e.type === 'ACQUISITION_CLOSED')) {
        closedWeek = s.clock.week;
        // Goodwill sits on the balance sheet and comes off CET1 (§15).
        const bs = balanceSheet(s);
        expect(bs.goodwill).toBeGreaterThan(0);
        expect(capitalSnapshot(s).cet1).toBeCloseTo(bs.equity - bs.intangibles - bs.goodwill, 0);
        for (const r of rbs) {
          const occ = s.world.lots[r.lotId]!.occupant!;
          expect(occ.type).toBe('player');
          expect(s.branches[occ.id]!.converting?.rivalId).toBe(target.id);
        }
      }
      if (closedWeek > 0 && s.clock.week === closedWeek + MERGERS.conversionWeeks - 1) {
        expect(Object.values(s.branches).some((b) => b.converting)).toBe(true);
      }
    }
    expect(closedWeek).toBe(offer.ok ? s.mergers.offers[0]!.respondWeek : -1);
    expect(s.rivals[target.id]!.status).toBe('acquired');
    expect(s.rivals[target.id]!.branches).toHaveLength(0);
    // Converted after 8 weeks: no branch still converting, CONVERSION_DONE pushed, lots yours.
    expect(Object.values(s.branches).some((b) => b.converting)).toBe(false);
    const done = seen.find((e) => e.type === 'CONVERSION_DONE');
    expect(done?.week).toBe(closedWeek + MERGERS.conversionWeeks);
    for (const r of rbs) {
      const occ = s.world.lots[r.lotId]!.occupant!;
      expect(occ.type).toBe('player');
      const b = s.branches[occ.id]!;
      expect(b.status).toBe('open');
      expect(b.managerId).toBeDefined();
    }
    expect(s.company.goodwill).toBeGreaterThan(0);
    expect(s.mergers.deals).toHaveLength(1);
  });
});
