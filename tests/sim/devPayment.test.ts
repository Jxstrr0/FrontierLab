// Developer tools (SCREENS §26): the one-tap payment adds DEV_PAYMENT to
// corporate cash as paid-in capital, keeping the books balanced.
import { describe, expect, it } from 'vitest';
import { DEV_PAYMENT, START_CASH } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';

describe('devPayment', () => {
  it('adds the payment to cash and equity without issuing shares', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const shares = s.company.sharesOutstanding;
    expect(cmd.devPayment(s).ok).toBe(true);
    expect(s.company.cash).toBe(START_CASH + DEV_PAYMENT);
    expect(s.company.sharesOutstanding).toBe(shares);
    const b = balanceSheet(s);
    expect(Math.abs(b.equity - b.expectedEquity)).toBeLessThan(1);
  });
});
