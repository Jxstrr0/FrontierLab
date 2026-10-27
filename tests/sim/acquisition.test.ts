// ROADMAP Stage 6 acceptance: buy a rival in Calgary, then for 20 weekly
// ticks the balance identity holds, the branches convert after 8 weeks,
// goodwill is deducted from CET1 and the rival is gone (SIMULATION §19.8, §15).
// C2a: one office per city, so its Calgary branches fold into your office and
// elsewhere one branch per city carries on as your office there.
import { describe, expect, it } from 'vitest';
import { MERGERS } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { advanceWeeks } from '../../src/sim/engine';
import { referencePrice } from '../../src/sim/mergerPricing';
import type { GameEvent } from '../../src/sim/state';
import { capitalisedBank, cmd, identityGap, smallestRival } from '../helpers/mergers';

describe('acquiring a rival bank', () => {
  it('merges the books, converts the branches over 8 weeks and keeps the identity', () => {
    const s = capitalisedBank();
    const target = smallestRival(s);
    const rbs = target.branches.map((b) => ({ lotId: b.lotId, cityId: b.cityId }));
    const home = Object.keys(s.branches)[0]!;
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
        // Goodwill sits on the balance sheet (§19.8).
        expect(balanceSheet(s).goodwill).toBeGreaterThan(0);
        for (const r of rbs) {
          const occ = s.world.lots[r.lotId]!.occupant;
          // Folded into an office (lot freed), or kept as the office in its city.
          if (r.cityId === 'cal' || !occ) expect(occ).toBeUndefined();
          else expect(s.branches[occ.id]!.converting?.rivalId).toBe(target.id);
        }
        expect(s.branches[home]!.status).toBe('open');
      }
    }
    expect(closedWeek).toBe(offer.ok ? s.mergers.offers[0]!.respondWeek : -1);
    expect(s.rivals[target.id]!.status).toBe('acquired');
    expect(s.rivals[target.id]!.branches).toHaveLength(0);
    // Converted after 8 weeks: no branch still converting, CONVERSION_DONE pushed, lots yours.
    expect(Object.values(s.branches).some((b) => b.converting)).toBe(false);
    const done = seen.find((e) => e.type === 'CONVERSION_DONE');
    expect(done?.week).toBe(closedWeek + MERGERS.conversionWeeks);
    const cities = Object.values(s.branches).map((b) => b.cityId);
    expect(new Set(cities).size).toBe(cities.length);
    for (const b of Object.values(s.branches)) {
      expect(b.status).toBe('open');
      expect(b.managerId).toBeDefined();
    }
    expect(s.company.goodwill).toBeGreaterThan(0);
    expect(s.mergers.deals).toHaveLength(1);
  });
});
