// Rival AI (SIMULATION §18): books, expansion within the city's room, closures
// that free lots, recession failures with the 8-week distressed window and the
// network split, and quarterly earnings reports.
import { describe, expect, it } from 'vitest';
import { RIVAL_EXPANSION, RIVAL_FAILURE } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { rampShare } from '../../src/sim/rivalBooks';
import { runClosures } from '../../src/sim/rivalExpansion';
import { rivalReviewCards } from '../../src/sim/rivalReviews';
import type { GameEvent, GameState } from '../../src/sim/state';

const game = (competitors = 5, seed = 42) =>
  newGame({ seed, cityId: 'cal', bankName: 'Test Bank', competitors });

/** Runs weeks one at a time, collecting this week's events (the log keeps only 8 weeks). */
function run(s: GameState, weeks: number, each?: (s: GameState) => void): GameEvent[] {
  const seen: GameEvent[] = [];
  for (let i = 0; i < weeks; i++) {
    advanceWeeks(s, 1);
    seen.push(...s.events.log.filter((e) => e.week === s.clock.week));
    each?.(s);
  }
  return seen;
}

/** Every rival branch sits on a lot that names its bank, and no lot names a bank without one. */
function expectConsistentLots(s: GameState) {
  const byLot = new Map<string, string>();
  for (const bank of Object.values(s.rivals))
    for (const b of bank.branches) {
      expect(byLot.has(b.lotId)).toBe(false);
      byLot.set(b.lotId, bank.id);
      expect(s.world.lots[b.lotId]?.occupant).toEqual({ type: 'rival', id: bank.id });
    }
  for (const lot of Object.values(s.world.lots))
    if (lot.occupant?.type === 'rival') expect(byLot.get(lot.id)).toBe(lot.occupant.id);
}

describe('rival books', () => {
  it('ramps new branches concavely to full size at 156 weeks', () => {
    expect(rampShare(0)).toBe(0);
    expect(rampShare(52)).toBeGreaterThan(0.65);
    expect(rampShare(52)).toBeLessThan(0.75);
    expect(rampShare(156)).toBe(1);
    expect(rampShare(400)).toBe(1);
  });

  it('keeps seeded books near mature size and tracks equity and capital', () => {
    const s = game();
    run(s, 26);
    for (const bank of Object.values(s.rivals)) {
      expect(bank.equity).toBeGreaterThan(0);
      expect(bank.capitalRatio).toBeGreaterThan(0.04);
      for (const b of bank.branches) {
        expect(b.deposits).toBeGreaterThan(0);
        expect(b.loans / b.deposits).toBeGreaterThan(0.6);
        expect(b.loans / b.deposits).toBeLessThan(1);
      }
    }
  });
});

describe('rival expansion and closures', () => {
  it('opens branches over five years without overflowing the city', () => {
    const s = game();
    const lots = Object.values(s.world.lots);
    const events = run(s, 260);
    const opened = events.filter((e) => e.type === 'RIVAL_BRANCH_OPENED');
    expect(opened.length).toBeGreaterThan(0);
    const newBranches = Object.values(s.rivals).flatMap((r) =>
      r.branches.filter((b) => b.openedWeek > 0),
    );
    expect(newBranches.length).toBeGreaterThan(0);
    const rivalLots = lots.filter((l) => l.occupant?.type === 'rival').length;
    expect(rivalLots).toBeLessThanOrEqual(
      Math.ceil(RIVAL_EXPANSION.maxRivalLotShare * lots.length),
    );
    expectConsistentLots(s);
  }, 30_000);

  it('closes a branch after 26 negative weeks and frees its lot', () => {
    const s = game();
    const bank = Object.values(s.rivals).find((r) => r.branches.length > 1)!;
    const branch = bank.branches[0]!;
    s.clock.week = 60;
    branch.contribution = -1;
    branch.negativeWeeks = 25;
    runClosures(s);
    expect(bank.branches.some((b) => b.id === branch.id)).toBe(false);
    expect(s.world.lots[branch.lotId]?.occupant).toBeUndefined();
    expect(s.events.log.some((e) => e.type === 'RIVAL_BRANCH_CLOSED')).toBe(true);
  });

  it('ignores negative weeks during the first year', () => {
    const s = game();
    const bank = Object.values(s.rivals).find((r) => r.branches.length > 1)!;
    const branch = bank.branches[0]!;
    s.clock.week = 30;
    branch.contribution = -1;
    branch.negativeWeeks = 25;
    runClosures(s);
    expect(bank.branches).toContain(branch);
  });
});

describe('rival failures', () => {
  it('a thin-capital rival fails in a recession, is distressed for 8 weeks, then split', () => {
    const s = game();
    const nimbus = s.rivals.nimbus!;
    expect(nimbus.strategy).toBe('disruptor');
    const lotIds = nimbus.branches.map((b) => b.lotId);
    const ca = s.world.countries.CA!;
    // Hold Canada in recession and the disruptor at a 4% capital ratio.
    const events = run(s, 520, (st) => {
      ca.phase = 'recession';
      ca.weeksInPhase = 0;
      const n = st.rivals.nimbus!;
      if (n.status === 'active') {
        const rwa = n.branches.reduce((x, b) => x + b.loans, 0) * 0.75;
        n.equity = rwa * 0.04;
        n.capitalRatio = 0.04;
      }
    });
    const failure = events.find((e) => e.type === 'BANK_FAILURE');
    expect(failure).toBeDefined();
    expect(failure!.payload.rivalId).toBe('nimbus');
    const split = events.find((e) => e.type === 'RIVAL_NETWORK_SPLIT');
    expect(split).toBeDefined();
    expect(split!.week - failure!.week).toBe(RIVAL_FAILURE.distressWeeks);
    expect(nimbus.status).toBe('seized');
    expect(nimbus.branches).toHaveLength(0);
    for (const id of lotIds) {
      const occ = s.world.lots[id]?.occupant;
      expect(occ?.id).not.toBe('nimbus');
    }
    expectConsistentLots(s);
  }, 60_000);

  it('marks a failed rival distressed with the 8-week deadline', () => {
    const s = game();
    const ca = s.world.countries.CA!;
    let seen: { week: number; until?: number } | undefined;
    run(s, 260, (st) => {
      ca.phase = 'recession';
      const n = st.rivals.nimbus!;
      if (n.status === 'active') n.equity = 0;
      if (n.status === 'distressed' && !seen)
        seen = { week: st.clock.week, until: n.distressedUntil };
    });
    expect(seen).toBeDefined();
    expect(seen!.until).toBe(seen!.week + RIVAL_FAILURE.distressWeeks);
  }, 30_000);

  it('leaves healthy incumbents standing through a long recession', () => {
    const s = game(3);
    const ca = s.world.countries.CA!;
    const events = run(s, 104, () => {
      ca.phase = 'recession';
    });
    expect(events.some((e) => e.type === 'BANK_FAILURE')).toBe(false);
  }, 30_000);
});

describe('rival quarters', () => {
  it('reports earnings with the change from the previous quarter', () => {
    const s = game(3);
    const events = run(s, 40).filter((e) => e.type === 'RIVAL_EARNINGS');
    const bank = Object.values(s.rivals)[0]!;
    const mine = events.filter((e) => e.payload.rivalId === bank.id);
    expect(mine.length).toBeGreaterThanOrEqual(2);
    for (const e of mine) expect(e.payload.quarter).toMatch(/^Q[1-4] \d{4}$/);
    const [a, b] = mine.slice(-2) as [GameEvent, GameEvent];
    const prev = a.payload.revenue as number;
    const rev = b.payload.revenue as number;
    expect(b.payload.prevRevenue).toBeCloseTo(prev, 6);
    expect(b.payload.pct as number).toBeCloseTo(((rev - prev) / prev) * 100, 6);
    expect(bank.quarters.at(-1)!.revenue).toBeCloseTo(rev, 6);
    expect(mine[0]!.payload.quarter).toBe('Q1 2027');
  });

  it('listed rivals announce dividends with a sensible yield', () => {
    const s = game(3);
    const divs = run(s, 60).filter((e) => e.type === 'RIVAL_DIVIDEND');
    expect(divs.length).toBeGreaterThan(0);
    for (const d of divs) {
      expect(s.rivals[d.payload.rivalId as string]?.listed).toBe(true);
      expect(d.payload.yieldPct as number).toBeGreaterThan(0);
      expect(d.payload.yieldPct as number).toBeLessThan(15);
    }
  });
});

describe('rival review cards', () => {
  it('are deterministic and follow the branch quality', () => {
    const s = game();
    const branch = Object.values(s.rivals)[0]!.branches[0]!;
    const a = rivalReviewCards(branch, 30);
    const b = rivalReviewCards(branch, 30);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    for (const c of a) {
      expect(c.stars).toBeGreaterThanOrEqual(1);
      expect(c.stars).toBeLessThanOrEqual(5);
      expect(c.text.length).toBeGreaterThan(0);
    }
  });
});
