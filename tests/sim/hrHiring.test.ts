// Manager vacancies (SIMULATION §17.2): the COO's Sales office operations is
// the one way managers are hired for you since schema 22. Each week an open
// branch without a manager gets the strongest candidate in its city with
// default delegation; nothing happens without a COO or the switch, or while
// the branch is still being built. The HR floor's own switch is gone.
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { weeklyTick } from '../../src/sim/engine';
import { strongestCandidate, unstaffedBranches } from '../../src/sim/hrHiring';
import { newGame } from '../../src/sim/newGame';
import { refreshManagerPool } from '../../src/sim/people';
import { type GameState, type Manager } from '../../src/sim/state';
import { execGame, hire } from '../helpers/executives';

const score = (m: Manager) =>
  m.skills.people + m.skills.product + m.skills.marketing + m.skills.ethics;

/** The helper game's one branch, opened, with a fresh candidate pool. */
function openBranch(s: GameState) {
  const b = Object.values(s.branches)[0]!;
  b.status = 'open';
  refreshManagerPool(s, b.cityId, true);
  return b;
}

describe('hiring office managers', () => {
  it('has no HR floor switch any more', () => {
    const s = newGame({ seed: 1, cityId: 'cal' });
    expect('hrHiring' in s.people).toBe(false);
    expect('setHrHiring' in cmd).toBe(false);
  });

  it('nobody hires without a COO, even with an HR floor', () => {
    const s = execGame(['hr']);
    const b = openBranch(s);
    expect(unstaffedBranches(s)).toHaveLength(1);
    weeklyTick(s);
    expect(b.managerId).toBeUndefined();
  });

  it('the COO hires the strongest candidate with default delegation in the weekly tick', () => {
    const s = execGame(['hr']);
    hire(s, 'coo');
    const b = openBranch(s);
    const best = Math.max(...s.people.managerCandidates[b.cityId]!.map(score));
    weeklyTick(s);
    expect(b.managerId).toBeDefined();
    expect(score(s.people.managers[b.managerId!]!)).toBe(best);
    expect(b.delegation).toEqual(EXEC_DELEGATION.cooDelegation);
    expect(unstaffedBranches(s)).toHaveLength(0);
  });

  it('waits for the switch and for the branch to open', () => {
    const off = execGame();
    hire(off, 'coo');
    cmd.setExecDelegation(off, 'coo', 'branchOps', false);
    const b = openBranch(off);
    weeklyTick(off);
    expect(b.managerId).toBeUndefined();

    const building = execGame();
    hire(building, 'coo');
    const b2 = Object.values(building.branches)[0]!;
    expect(b2.status).not.toBe('open');
    expect(unstaffedBranches(building)).toHaveLength(0);
  });

  it('picks the first of equally strong candidates', () => {
    const s = execGame(['hr']);
    const b = openBranch(s);
    const pool = s.people.managerCandidates[b.cityId]!;
    for (const m of pool) m.skills = { people: 50, product: 50, marketing: 50, ethics: 50 };
    expect(strongestCandidate(pool)).toBe(pool[0]);
    expect(strongestCandidate([])).toBeUndefined();
  });
});
