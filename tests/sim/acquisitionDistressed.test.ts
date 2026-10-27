// Distressed sales (SIMULATION §18.5, §19.8): a failed rival's network goes on
// sale at ARR × a distressed multiple 0.5–0.8 (floored per share); you can buy
// it, and a network you buy (or are still bidding for) is never split among the
// others.
import { describe, expect, it } from 'vitest';
import { MERGERS, RIVAL_FAILURE } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import { askFromMultiple } from '../../src/sim/mergerPricing';
import { rivalArr } from '../../src/sim/rivalFinance';
import { runRivalQuarter } from '../../src/sim/rivalQuarter';
import type { GameEvent, GameState, RivalBank } from '../../src/sim/state';
import { capitalisedBank, cmd, identityGap, smallestRival } from '../helpers/mergers';

/** Drives a rival's cash deep below zero and runs a quarter-end so it fails. */
function fail(s: GameState, bank: RivalBank): void {
  bank.cash = -(RIVAL_FAILURE.maxDebtWeeks + 1) * bank.costs;
  runRivalQuarter(s);
}

function eventsSince(s: GameState, week: number): GameEvent[] {
  return s.events.log.filter((e) => e.week >= week);
}

describe('distressed sales', () => {
  it('asks ARR × a multiple in 0.5–0.8 when a rival fails, floored per share', () => {
    const s = capitalisedBank();
    const bank = smallestRival(s);
    fail(s, bank);
    expect(bank.status).toBe('distressed');
    const ask = bank.distressedAsk!;
    const [lo, hi] = MERGERS.distressedMultiple;
    expect(ask).toBeGreaterThanOrEqual(askFromMultiple(bank, lo) - 1e-9);
    expect(ask).toBeLessThanOrEqual(askFromMultiple(bank, hi) + 1e-9);
    expect(ask).toBeGreaterThanOrEqual(MERGERS.distressedMinAsk);
    const sale = s.events.log.find((e) => e.type === 'DISTRESSED_SALE')!;
    expect(sale.payload.ask).toBe(ask);
    expect(sale.payload.weeks).toBe(RIVAL_FAILURE.distressWeeks);
    expect(sale.payload.multiple as number).toBeCloseTo((ask * bank.shares) / rivalArr(bank), 6);
    // No ARR left: the floor holds.
    for (const b of bank.branches) b.arr = 0;
    expect(askFromMultiple(bank, 0.5)).toBe(MERGERS.distressedMinAsk);
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
    // C2a: folded into your office (lot freed) or kept as your office in its city.
    for (const id of lots) expect(s.world.lots[id]!.occupant?.type ?? 'player').toBe('player');
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
