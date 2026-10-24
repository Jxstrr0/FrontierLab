// Trading (SIMULATION §19.7): average cost, commission, cash-flow categories,
// mark-to-market gains on company holdings with the balance identity intact,
// limits, and personal trades in your own listed bank.
import { describe, expect, it } from 'vitest';
import { COMMISSION, TRADING } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { runMarkets } from '../../src/sim/market';
import { newGame } from '../../src/sim/newGame';
import { holdingsValue } from '../../src/sim/securities';
import { sharesHeld } from '../../src/sim/shares';
import { addCapital, capTableGap, identityGap, publicBank } from '../helpers/markets';
import { openScriptedBranch } from '../helpers/scenario';

const game = () => {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
  addCapital(s, 10_000_000);
  return s;
};

describe('company trades', () => {
  it('buys at price plus commission: investing cash out, commission expensed', () => {
    const s = game();
    const price = s.market.companies.kslr!.price;
    const cash0 = s.company.cash;
    expect(cmd.trade(s, 'company', 'kslr', 1_000).ok).toBe(true);
    const value = 1_000 * price;
    expect(s.company.cash).toBeCloseTo(cash0 - value * (1 + COMMISSION), 6);
    expect(s.ledger.cash.investing).toBeCloseTo(-value, 6);
    expect(s.ledger.cash.ops).toBeCloseTo(-value * COMMISSION, 6);
    expect(s.ledger.pnl.commissions).toBeCloseTo(value * COMMISSION, 6);
    expect(balanceSheet(s).investments).toBeCloseTo(value, 6);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('tracks average cost across buys and keeps it on a sale', () => {
    const s = game();
    const c = s.market.companies.kslr!;
    const p1 = c.price;
    cmd.trade(s, 'company', 'kslr', 1_000);
    c.price = p1 * 1.5; // a direct poke: book the mark by hand below
    s.ledger.pnl.investmentGains += 1_000 * (c.price - p1);
    cmd.trade(s, 'company', 'kslr', 1_000);
    const h = s.market.holdings.company.kslr!;
    expect(h.avgCost).toBeCloseTo((p1 + p1 * 1.5) / 2, 9);
    expect(cmd.trade(s, 'company', 'kslr', -500).ok).toBe(true);
    expect(s.market.holdings.company.kslr!.avgCost).toBeCloseTo((p1 + p1 * 1.5) / 2, 9);
    expect(s.market.holdings.company.kslr!.shares).toBe(1_500);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('marks holdings to market every week and keeps the identity', () => {
    const s = game();
    openScriptedBranch(s, 'midtown');
    expect(cmd.trade(s, 'company', 'cbai', 5_000).ok).toBe(true);
    const r = Object.values(s.rivals).find((x) => x.listed)!;
    expect(cmd.trade(s, 'company', r.id, 20_000).ok).toBe(true);
    let gains = 0;
    for (let w = 0; w < 30; w++) {
      const v0 = holdingsValue(s, 'company');
      advanceWeeks(s, 1);
      gains += holdingsValue(s, 'company') - v0;
      expect(identityGap(s)).toBeLessThan(1);
    }
    const booked = s.history.weekly.slice(-30).reduce((t, w) => t + w.pnl.investmentGains, 0);
    // The last tick's marks are still in the open ledger.
    expect(booked + s.ledger.pnl.investmentGains).toBeCloseTo(gains, 0);
    expect(cmd.trade(s, 'company', 'cbai', -5_000).ok).toBe(true);
    expect(s.market.holdings.company.cbai).toBeUndefined();
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('refuses own shares, unlisted rivals, short sales and stakes over the cap', () => {
    const s = game();
    expect(cmd.trade(s, 'company', 'self', 10).ok).toBe(false);
    const priv = Object.values(s.rivals).find((x) => !x.listed);
    if (priv) expect(cmd.trade(s, 'company', priv.id, 10).ok).toBe(false);
    expect(cmd.trade(s, 'company', 'kslr', -10).ok).toBe(false);
    expect(cmd.trade(s, 'company', 'kslr', 1.5).ok).toBe(false);
    addCapital(s, 1e12);
    const c = s.market.companies.trhd!;
    expect(cmd.trade(s, 'company', 'trhd', Math.floor(c.shares * TRADING.maxStake) + 1).ok).toBe(
      false,
    );
  });

  it('a seized rival writes the holding down to zero through the P&L', () => {
    const s = game();
    const r = Object.values(s.rivals).find((x) => x.listed)!;
    cmd.trade(s, 'company', r.id, 10_000);
    r.status = 'seized';
    runMarkets(s);
    expect(holdingsValue(s, 'company')).toBe(0);
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('personal trades', () => {
  it('moves personal cash only', () => {
    const s = game();
    const price = s.market.companies.nre!.price;
    const corp = s.company.cash;
    const mine = s.personal.cash;
    expect(cmd.trade(s, 'personal', 'nre', 100).ok).toBe(true);
    expect(s.personal.cash).toBeCloseTo(mine - 100 * price * (1 + COMMISSION), 6);
    expect(s.company.cash).toBe(corp);
    expect(cmd.trade(s, 'personal', 'nre', -100).ok).toBe(true);
    expect(s.personal.cash).toBeCloseTo(mine - 200 * price * COMMISSION, 6);
    expect(cmd.trade(s, 'personal', 'nre', 1e9).ok).toBe(false);
  });

  it('trades your own listed bank between you and the public float', () => {
    const priv = game();
    expect(cmd.trade(priv, 'personal', 'self', 10).ok).toBe(false);
    const s = publicBank();
    const founder = sharesHeld(s, 'founder');
    const float = sharesHeld(s, 'public');
    expect(cmd.trade(s, 'personal', 'self', 1_000).ok).toBe(true);
    expect(sharesHeld(s, 'founder')).toBe(founder + 1_000);
    expect(sharesHeld(s, 'public')).toBe(float - 1_000);
    expect(s.market.holdings.personal.self).toBeUndefined();
    expect(cmd.trade(s, 'personal', 'self', -2_000).ok).toBe(true);
    expect(sharesHeld(s, 'founder')).toBe(founder - 1_000);
    expect(capTableGap(s)).toBe(0);
  });
});
