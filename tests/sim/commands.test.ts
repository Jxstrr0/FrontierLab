import { describe, expect, it } from 'vitest';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import { freeLot } from '../helpers/scenario';

describe('commands', () => {
  it('builds a branch, paying parts, deposit and the first week of rent', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const lot = freeLot(s, 'midtown');
    const quote = cmd.buildQuote(s, lot.id, REFERENCE_BUILDS.mid);
    expect(quote.parts).toBe(332_000);
    const r = cmd.buildBranch(s, { lotId: lot.id, build: REFERENCE_BUILDS.mid });
    expect(r.ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(750_000 - quote.total);
    expect(s.company.leaseDeposits).toBe(lot.deposit);
    expect(lot.occupant?.type).toBe('player');
    expect(s.events.scheduled).toHaveLength(1);
  });

  it('explains why a build is refused', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const lot = freeLot(s);
    const taken = Object.values(s.world.lots).find((l) => l.occupant)!;
    expect(cmd.buildBranch(s, { lotId: taken.id, build: REFERENCE_BUILDS.mid })).toEqual({
      ok: false,
      reason: 'This storefront is already taken.',
    });
    s.company.cash = 1000;
    const r = cmd.buildBranch(s, { lotId: lot.id, build: REFERENCE_BUILDS.mid });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/^Not enough cash: you need \$/);
  });

  it('rounds and clamps prices to the product step', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const r = cmd.buildBranch(s, { lotId: freeLot(s).id, build: REFERENCE_BUILDS.basic });
    if (!r.ok) throw new Error(r.reason);
    expect(cmd.setPrice(s, r.branchId, 'savings', 0.03123)).toEqual({ ok: true, price: 0.031 });
    expect(cmd.setPrice(s, r.branchId, 'savings', 0.5)).toEqual({ ok: true, price: 0.08 });
  });

  it('moves corporate cash into treasury reserves one way only', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const reserves = s.treasury.reserves;
    expect(cmd.transferToTreasury(s, 50_000).ok).toBe(true);
    expect(s.treasury.reserves).toBe(reserves + 50_000);
    expect(s.company.cash).toBe(700_000);
    expect(cmd.transferToTreasury(s, 10_000_000).ok).toBe(false);
  });

  it('requires a manager before delegating', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const r = cmd.buildBranch(s, { lotId: freeLot(s).id, build: REFERENCE_BUILDS.basic });
    if (!r.ok) throw new Error(r.reason);
    expect(cmd.setDelegation(s, r.branchId, 'loans', true).ok).toBe(false);
    const cand = s.people.managerCandidates.cal![0]!;
    expect(cmd.hireManager(s, r.branchId, cand.id).ok).toBe(true);
    expect(cmd.setDelegation(s, r.branchId, 'loans', true).ok).toBe(true);
    expect(s.people.managerCandidates.cal).toHaveLength(2);
  });
});
