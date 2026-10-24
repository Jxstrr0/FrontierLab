// Foreclosed homes (SIMULATION §21.3): value follows hpi, Hold and Rent carry
// 6%/yr, Rent earns 4.5%/yr at 90% occupancy, Sell all settles at 90% of value
// in 1–4 weeks and can't be called off, and later foreclosures start a fresh
// Hold pool. The balance identity holds throughout.
import { describe, expect, it } from 'vitest';
import { REO } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import { reoWeek, runReo } from '../../src/sim/reo';
import type { GameState } from '../../src/sim/state';

function setup(mode: 'hold' | 'rent' = 'hold') {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Reo Bank' });
  const hpi = s.world.countries.CA!.hpi;
  s.reo.cal = { units: 20, value: 5_200_000, mode, hpiRef: hpi };
  s.company.paidInCapital += 5_200_000;
  return s;
}

function identity(s: GameState) {
  const bs = balanceSheet(s);
  expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
}

describe('foreclosed homes', () => {
  it('works out carrying cost and rent by mode', () => {
    const pool = { units: 1, value: 5_200_000, mode: 'hold' as const, hpiRef: 100 };
    expect(reoWeek(pool)).toEqual({ carrying: 6_000, rent: 0 });
    const rent = reoWeek({ ...pool, mode: 'rent' });
    expect(rent.carrying).toBeCloseTo(6_000, 9);
    expect(rent.rent).toBeCloseTo(((5_200_000 * 0.045) / 52) * 0.9, 9);
    expect(reoWeek({ ...pool, mode: 'selling' })).toEqual({ carrying: 0, rent: 0 });
  });

  it('marks the pool to house prices through propertyGains', () => {
    const s = setup();
    identity(s);
    s.world.countries.CA!.hpi = s.reo.cal!.hpiRef * 1.1;
    const cash = s.company.cash;
    runReo(s);
    expect(s.reo.cal!.value).toBeCloseTo(5_720_000, 4);
    expect(s.ledger.pnl.propertyGains).toBeCloseTo(520_000, 4);
    expect(s.ledger.pnl.propertyCosts).toBeCloseTo((5_720_000 * REO.carryingCost) / 52, 4);
    expect(s.company.cash).toBeCloseTo(cash - (5_720_000 * REO.carryingCost) / 52, 4);
    identity(s);
  });

  it('earns rent in Rent mode', () => {
    const s = setup('rent');
    runReo(s);
    expect(s.ledger.pnl.rentalIncome).toBeCloseTo(((5_200_000 * 0.045) / 52) * 0.9, 4);
    identity(s);
  });

  it('sells everything at 90% in 1–4 weeks and starts fresh afterwards', () => {
    const s = setup();
    expect(cmd.setReoMode(s, 'cal', 'selling').ok).toBe(true);
    const wait = s.reo.cal!.sellWeek! - s.clock.week;
    expect(wait).toBeGreaterThanOrEqual(REO.sellWeeks[0]);
    expect(wait).toBeLessThanOrEqual(REO.sellWeeks[1]);
    expect(cmd.setReoMode(s, 'cal', 'rent').ok).toBe(false);
    // New foreclosures arriving mid-sale join it.
    s.reo.cal!.value += 800_000;
    s.company.paidInCapital += 800_000;
    const cash = s.company.cash;
    for (let w = 0; w < wait; w++) {
      s.clock.week += 1;
      runReo(s);
      identity(s);
    }
    expect(s.reo.cal).toBeUndefined();
    expect(s.company.cash - cash).toBeCloseTo(6_000_000 * REO.sellPrice, 4);
    expect(s.ledger.cash.investing).toBeCloseTo(6_000_000 * REO.sellPrice, 4);
    expect(s.ledger.pnl.propertyGains).toBeCloseTo(-600_000, 4);
    expect(s.events.log.some((e) => e.type === 'REO_SOLD')).toBe(true);
    expect(cmd.setReoMode(s, 'cal', 'hold').ok).toBe(false);
  });
});
