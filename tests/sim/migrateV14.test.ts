// Migration 14 → 15, the content trim (DESIGN decision log 2026-10-25): held
// foreclosed homes start renting, dealer financing deals and their P&L line go
// (the fees fold into marketing, so totals don't move), brokered deposits and
// senior bonds become term interbank and covered bonds, and a running Grand
// Opening Week package carries on as Street Team. The game keeps playing.
import { describe, expect, it } from 'vitest';
import { FUNDING_TYPES } from '../../src/data/fundingTypes';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { advanceWeeks } from '../../src/sim/engine';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { bankWithFloors } from '../helpers/scenario';

type Raw = Record<string, unknown> & { schemaVersion: number };

/** A v14-shaped save: the fields this migration rewrites, as v14 stored them. */
function v14Save(): Raw {
  const s = bankWithFloors(['treasury'], { weeks: 52 });
  const raw = JSON.parse(JSON.stringify(s)) as Raw;
  const state = raw as unknown as GameState;
  // A held pool: the bank's own foreclosures if it has any, else an empty one.
  const pool = state.reo.cal ?? { units: 0, value: 0, mode: 'rent', hpiRef: 100 };
  state.reo.cal = { ...pool, mode: 'hold' as 'rent' };
  raw.dealerDeals = { site_x: { siteId: 'site_x', cityId: 'cal', signedWeek: 1, endWeek: 200 } };
  // Part of each week's marketing spend recorded as dealer fees, as a v14 save
  // that paid a referral fee would hold it (same totals, one more line).
  for (const pnl of [state.ledger.pnl, ...state.history.weekly.map((w) => w.pnl)]) {
    const p = pnl as Record<string, number>;
    p.dealerFees = Math.min(500, p.marketing!);
    p.marketing! -= p.dealerFees;
  }
  state.events.log.push({ week: 1, type: 'DEALER_SIGNED', payload: {}, priority: 1 });
  const lot = {
    counterparty: 'X',
    amount: 1e6,
    rate: 0.05,
    startWeek: 0,
    maturityWeek: 999,
    radar: [1, 1, 1, 1, 1] as [number, number, number, number, number],
  };
  state.treasury.lots.push(
    { ...lot, id: 'a', type: 'brokered' },
    { ...lot, id: 'b', type: 'senior_bond' },
  );
  state.treasury.reserves += 2 * lot.amount; // the borrowed cash, so the books balance
  state.marketing.packages.push({
    id: 'pk',
    agencyId: 'northwind_pike',
    packageId: 'grand_opening',
    cityId: 'cal',
    weeksLeft: 1,
    weeksTotal: 2,
    boostPerWeek: 0.05,
  });
  raw.schemaVersion = 14;
  return raw;
}

describe('migration 14 → 15', () => {
  it('trims the removed content without moving the books', () => {
    const raw = v14Save();
    const pnl = (raw as unknown as GameState).ledger.pnl as Record<string, number>;
    const marketingBefore = pnl.marketing! + pnl.dealerFees!;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.reo.cal!.mode).toBe('rent');
    expect('dealerDeals' in up).toBe(false);
    expect('dealerFees' in up.ledger.pnl).toBe(false);
    expect(up.ledger.pnl.marketing).toBe(marketingBefore);
    expect(up.history.weekly.every((w) => !('dealerFees' in w.pnl))).toBe(true);
    expect(up.events.log.some((e) => e.type.startsWith('DEALER_'))).toBe(false);
    const types = Object.fromEntries(up.treasury.lots.map((l) => [l.id, l.type]));
    expect(types).toMatchObject({ a: 'term_interbank', b: 'covered_bond' });
    expect(up.treasury.lots.find((l) => l.id === 'b')!.radar).toEqual(
      FUNDING_TYPES.covered_bond!.radar,
    );
    expect(up.marketing.packages.at(-1)!.packageId).toBe('street_team');
  });

  it('keeps playing with the balance identity intact', () => {
    const up = migrate(v14Save()) as unknown as GameState;
    advanceWeeks(up, 4);
    expect(up.flags.gameOver).toBeUndefined();
    const bs = balanceSheet(up);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });
});
