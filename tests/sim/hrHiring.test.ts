// HR fills manager vacancies (SIMULATION §16.11): with an HR floor and the
// switch on, each week an open branch without a manager gets the strongest
// candidate in its city; delegations stay as they were; nothing happens
// without the floor, with the switch off, or while the branch is still being
// built; the COO's Branch operations hires first.
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { weeklyTick } from '../../src/sim/engine';
import { hrFillVacancies, strongestCandidate } from '../../src/sim/hrHiring';
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

describe('HR hiring branch managers', () => {
  it('hires the strongest candidate and leaves delegation alone', () => {
    const s = execGame(['hr']);
    const b = openBranch(s);
    const before = { ...b.delegation };
    const best = Math.max(...s.people.managerCandidates[b.cityId]!.map(score));
    expect(hrFillVacancies(s)).toBe(1);
    expect(score(s.people.managers[b.managerId!]!)).toBe(best);
    expect(b.delegation).toEqual(before);
    // Nothing left to fill.
    expect(hrFillVacancies(s)).toBe(0);
  });

  it('does nothing without an HR floor, with the switch off, or before opening', () => {
    const noFloor = execGame();
    openBranch(noFloor);
    expect(hrFillVacancies(noFloor)).toBe(0);

    const off = execGame(['hr']);
    openBranch(off);
    expect(cmd.setHrHiring(off, false).ok).toBe(true);
    expect(hrFillVacancies(off)).toBe(0);

    const building = execGame(['hr']);
    const b = Object.values(building.branches)[0]!;
    expect(b.status).not.toBe('open');
    expect(hrFillVacancies(building)).toBe(0);
    expect(b.managerId).toBeUndefined();
  });

  it('refuses the switch without an HR floor', () => {
    const s = newGame({ seed: 1, cityId: 'cal' });
    expect(s.people.hrHiring).toBe(true);
    expect(cmd.setHrHiring(s, false).ok).toBe(false);
  });

  it('runs in the weekly tick, after a COO who hires first', () => {
    const s = execGame(['hr']);
    const b = openBranch(s);
    weeklyTick(s);
    expect(b.managerId).toBeDefined();

    const withCoo = execGame(['hr']);
    hire(withCoo, 'coo');
    const b2 = openBranch(withCoo);
    weeklyTick(withCoo);
    expect(b2.managerId).toBeDefined();
    expect(b2.delegation).toEqual(EXEC_DELEGATION.cooDelegation);
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
