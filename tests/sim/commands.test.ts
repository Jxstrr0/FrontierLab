import { describe, expect, it } from 'vitest';
import { CANDIDATE_REROLL, MANAGER_BASE_SALARY, START_CASH } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { managerRerollFee } from '../../src/sim/candidateRerolls';
import { refreshManagerPool } from '../../src/sim/people';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import { defaultBuild } from '../../src/app/build/builds';
import { usualBuilds } from '../../src/sim/execDelegationsGrowth';
import { freeLot } from '../helpers/scenario';

describe('commands', () => {
  it('builds a branch, paying parts, deposit and the first week of rent', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const lot = freeLot(s, 'midtown');
    const quote = cmd.buildQuote(s, lot.id, REFERENCE_BUILDS.mid);
    expect(quote.parts).toBe(332_000);
    const r = cmd.buildBranch(s, { lotId: lot.id, build: REFERENCE_BUILDS.mid });
    expect(r.ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(START_CASH - quote.total);
    expect(s.company.leaseDeposits).toBe(lot.deposit);
    expect(lot.occupant?.type).toBe('player');
    expect(s.events.scheduled).toHaveLength(1);
  });

  it('remembers the fit-out you built with; the build sheet and the COO start from it', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    s.company.cash = 5_000_000;
    expect(defaultBuild(s, freeLot(s).id)).toEqual(REFERENCE_BUILDS.mid);
    const mine = { ...REFERENCE_BUILDS.basic, vault: REFERENCE_BUILDS.mid.vault };
    expect(cmd.buildBranch(s, { lotId: freeLot(s, 'midtown').id, build: mine }).ok).toBe(true);
    expect(s.company.lastBuild).toEqual(mine);
    const next = defaultBuild(s, freeLot(s).id);
    expect(next).toEqual(mine);
    expect(next).not.toBe(s.company.lastBuild); // a copy, so editing the sheet can't change it
    expect(usualBuilds(s)[0]).toEqual(mine);
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
    expect(cmd.setPrice(s, r.branchId, 'plus', 21.4)).toEqual({ ok: true, price: 21 });
    expect(cmd.setPrice(s, r.branchId, 'plus', 500)).toEqual({ ok: true, price: 60 });
  });

  it('moves corporate cash into treasury reserves one way only', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const reserves = s.treasury.reserves;
    expect(cmd.transferToTreasury(s, 50_000).ok).toBe(true);
    expect(s.treasury.reserves).toBe(reserves + 50_000);
    expect(s.company.cash).toBe(START_CASH - 50_000);
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

  it('deals paid manager candidates, keeping the guide until a first hire', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const r = cmd.buildBranch(s, { lotId: freeLot(s).id, build: REFERENCE_BUILDS.basic });
    if (!r.ok) throw new Error(r.reason);
    const ids = () => s.people.managerCandidates.cal!.map((m) => m.id);
    const before = ids();
    const fee = managerRerollFee(s, 'cal');
    expect(fee).toBe(
      Math.round((MANAGER_BASE_SALARY * CITIES.cal!.wageIndex * CANDIDATE_REROLL.feeShare) / 100) *
        100,
    );
    const cash = s.company.cash;
    const first = cmd.rerollManagerCandidates(s, 'cal');
    expect(first.ok && first.fee).toBe(fee);
    expect(s.company.cash).toBeCloseTo(cash - fee);
    const after = ids();
    expect(after).toHaveLength(3);
    expect(after[0]).toBe(before[0]); // the tutorial guide stays on the list
    expect(after.slice(1).some((id) => before.includes(id))).toBe(false);
    // The next one costs double, until the pool's free refresh.
    expect(
      Math.abs(managerRerollFee(s, 'cal') - fee * CANDIDATE_REROLL.growth),
    ).toBeLessThanOrEqual(100);
    expect(cmd.hireManager(s, r.branchId, after[1]!).ok).toBe(true);
    cmd.rerollManagerCandidates(s, 'cal');
    expect(ids().some((id) => after.includes(id))).toBe(false);
    refreshManagerPool(s, 'cal', true);
    expect(managerRerollFee(s, 'cal')).toBe(fee);
    s.company.cash = fee - 1;
    expect(cmd.rerollManagerCandidates(s, 'cal').ok).toBe(false);
    expect(cmd.rerollManagerCandidates(s, 'nowhere').ok).toBe(false);
  });
});
