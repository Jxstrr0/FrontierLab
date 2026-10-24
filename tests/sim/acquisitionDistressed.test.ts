// Distressed sales (SIMULATION §18.5, §19.8): a failed rival's network goes on
// sale at BVPS × P/B 0.4–0.7 (floored per share); you can buy it, and a
// network you buy (or are still bidding for) is never split among the others.
import { describe, expect, it } from 'vitest';
import { MERGERS, RIVAL_FAILURE, RIVAL_LOAN_RISK_WEIGHT } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import { askFromPb, rivalBvps } from '../../src/sim/mergerPricing';
import { rivalLoans } from '../../src/sim/rivalBooks';
import { runRivalQuarter } from '../../src/sim/rivalQuarter';
import type { GameEvent, GameState, RivalBank } from '../../src/sim/state';
import { capitalisedBank, cmd, identityGap, smallestRival } from '../helpers/mergers';

/** Drives a rival below the insolvency line and runs a quarter-end so it fails. */
function fail(s: GameState, bank: RivalBank, cr = 0.01): void {
  bank.equity = rivalLoans(bank) * RIVAL_LOAN_RISK_WEIGHT * cr;
  bank.capitalRatio = cr;
  runRivalQuarter(s);
}

function eventsSince(s: GameState, week: number): GameEvent[] {
  return s.events.log.filter((e) => e.week >= week);
}

describe('distressed sales', () => {
  it('asks BVPS × P/B in 0.4–0.7 when a rival fails, floored per share', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    fail(s, bank, 0.015);
    expect(bank.status).toBe('distressed');
    const bvps = rivalBvps(bank);
    const ask = bank.distressedAsk!;
    expect(ask).toBeGreaterThanOrEqual(askFromPb(bank, MERGERS.distressedPb[0]) - 1e-9);
    expect(ask).toBeLessThanOrEqual(askFromPb(bank, MERGERS.distressedPb[1]) + 1e-9);
    expect(ask).toBeGreaterThanOrEqual(MERGERS.distressedMinAsk);
    const sale = s.events.log.find((e) => e.type === 'DISTRESSED_SALE')!;
    expect(sale.payload.ask).toBe(ask);
    expect(sale.payload.weeks).toBe(RIVAL_FAILURE.distressWeeks);
    // Negative equity: the floor holds.
    bank.equity = -1_000_000;
    expect(askFromPb(bank, 0.5)).toBe(MERGERS.distressedMinAsk);
    expect(bvps).toBeGreaterThan(0);
  });

  it('sells the network to you and never splits it', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    const lots = bank.branches.map((b) => b.lotId);
    fail(s, bank);
    expect(cmd.offerMerger(s, bank.id, bank.distressedAsk!).ok).toBe(true);
    expect(s.mergers.offers[0]!.distressed).toBe(true);
    const seen: GameEvent[] = [];
    for (let w = 0; w < RIVAL_FAILURE.distressWeeks + 4; w++) {
      advanceWeeks(s, 1);
      seen.push(...eventsSince(s, s.clock.week));
      expect(identityGap(s)).toBeLessThan(1);
    }
    expect(bank.status).toBe('acquired');
    expect(seen.some((e) => e.type === 'ACQUISITION_CLOSED' && e.payload.distressed)).toBe(true);
    expect(seen.some((e) => e.type === 'RIVAL_NETWORK_SPLIT')).toBe(false);
    expect(s.mergers.deals[0]!.distressed).toBe(true);
    for (const id of lots) expect(s.world.lots[id]!.occupant!.type).toBe('player');
    // Bought below book: the bargain shows as a gain rather than goodwill.
    expect(s.company.goodwill).toBe(s.mergers.deals[0]!.goodwill);
  });

  it('holds the split while your offer awaits an answer, then splits if it fails', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    fail(s, bank);
    // The sale ends at the next tick, when your offer is also answered.
    bank.distressedUntil = s.clock.week + 1;
    expect(cmd.offerMerger(s, bank.id, bank.distressedAsk! * 0.3).ok).toBe(true);
    advanceWeeks(s, 1);
    expect(s.mergers.offers[0]!.status).toBe('rejected');
    expect(bank.status).toBe('distressed');
    expect(bank.branches.length).toBeGreaterThan(0);
    advanceWeeks(s, 1);
    expect(bank.status).toBe('seized');
    expect(bank.branches).toHaveLength(0);
    expect(bank.distressedAsk).toBeUndefined();
  });
});
