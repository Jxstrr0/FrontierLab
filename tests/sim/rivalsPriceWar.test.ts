// Price wars (SIMULATION §18.6): eight weeks of a ≥ 4.0 Rates rating in a city
// start monthly 0.15pp deposit-rate bumps by the rivals there, which lift their
// savings rates above where they would otherwise be.
import { describe, expect, it } from 'vitest';
import { PRICE_WAR } from '../../src/config/balance';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import type { GameEvent, GameState } from '../../src/sim/state';
import { freeLot } from '../helpers/scenario';

function setup(): { s: GameState; branchId: string } {
  const s = newGame({ seed: 11, cityId: 'cal', bankName: 'War Bank', competitors: 3 });
  const r = cmd.buildBranch(s, { lotId: freeLot(s, 'midtown').id, build: REFERENCE_BUILDS.mid });
  if (!r.ok) throw new Error(r.reason);
  return { s, branchId: r.branchId };
}

/** Runs `weeks`, optionally pinning the branch's Rates rating after every tick. */
function run(s: GameState, branchId: string, weeks: number, rates?: number): GameEvent[] {
  const seen: GameEvent[] = [];
  for (let i = 0; i < weeks; i++) {
    advanceWeeks(s, 1);
    seen.push(...s.events.log.filter((e) => e.week === s.clock.week));
    if (rates !== undefined) s.branches[branchId]!.ratings.rates = rates;
  }
  return seen;
}

describe('price wars', () => {
  it('trigger after the streak and raise rival savings rates', () => {
    const war = setup();
    const calm = setup();
    const events = run(war.s, war.branchId, 40, 4.6);
    run(calm.s, calm.branchId, 40);

    expect(war.s.competition.ratesStreak.cal).toBeGreaterThanOrEqual(PRICE_WAR.streakWeeks);
    expect(calm.s.competition.ratesStreak.cal ?? 0).toBeLessThan(PRICE_WAR.streakWeeks);
    const wars = events.filter((e) => e.type === 'PRICE_WAR');
    expect(wars.length).toBeGreaterThan(0);
    // No bump before the streak has run for eight weeks.
    expect(Math.min(...wars.map((e) => e.week))).toBeGreaterThanOrEqual(PRICE_WAR.streakWeeks);

    let lifted = 0;
    for (const bank of Object.values(war.s.rivals)) {
      const bump = bank.priceWar.cal ?? 0;
      expect(bump).toBeLessThanOrEqual(PRICE_WAR.cap + 1e-12);
      if (bump <= 0) continue;
      lifted += 1;
      const calmSavings = calm.s.rivals[bank.id]!.prices.savings!;
      expect(bank.prices.savings!).toBeGreaterThan(calmSavings);
    }
    expect(lifted).toBeGreaterThan(0);
  }, 30_000);

  it('fades the bumps once the streak ends', () => {
    const { s, branchId } = setup();
    run(s, branchId, 40, 4.6);
    const before = Object.values(s.rivals).map((r) => r.priceWar.cal ?? 0);
    run(s, branchId, 6, 2.0);
    expect(s.competition.ratesStreak.cal).toBeUndefined();
    Object.values(s.rivals).forEach((r, i) => {
      if (before[i]! > 0) expect(r.priceWar.cal ?? 0).toBeLessThan(before[i]!);
    });
  }, 30_000);
});
