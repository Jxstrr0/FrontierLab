// Developer tools (SCREENS §26): the "Top staff" switch holds every team's
// skill and morale at DEV_STAFF through the weekly updates, and the "No
// bankruptcy" switch keeps insolvency from ending the game.
import { describe, expect, it } from 'vitest';
import { DEV_STAFF, FAILURE } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { execGame } from '../helpers/executives';

describe('devStaff', () => {
  it('lifts every team at once and holds them through the weekly updates', () => {
    const s = execGame(['finance', 'hr']);
    const branch = Object.values(s.branches)[0]!;
    branch.status = 'open';
    for (const d of Object.values(s.departments)) if (d) d.skill = d.morale = 40;
    branch.staff.skill = branch.staff.morale = 40;
    expect(cmd.setDevStaff(s, true).ok).toBe(true);
    expect(branch.staff.skill).toBe(DEV_STAFF.skill);
    expect(s.departments.finance!.morale).toBe(DEV_STAFF.morale);
    advanceWeeks(s, 20);
    expect(branch.staff.skill).toBeGreaterThanOrEqual(DEV_STAFF.skill);
    expect(branch.staff.morale).toBeGreaterThanOrEqual(DEV_STAFF.morale);
    for (const d of Object.values(s.departments)) {
      if (!d || d.id === 'executive') continue;
      expect(d.skill).toBeGreaterThanOrEqual(DEV_STAFF.skill);
      expect(d.morale).toBeGreaterThanOrEqual(DEV_STAFF.morale);
    }
  });

  it('switches off again without touching other state', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    cmd.setDevStaff(s, true);
    expect(s.flags.devStaff).toBe(true);
    cmd.setDevStaff(s, false);
    expect(s.flags.devStaff).toBeUndefined();
  });
});

describe('devNoBankruptcy', () => {
  const broke = () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    s.company.cash = -5_000_000;
    return s;
  };

  it('ends the game after the usual weeks in the red without it', () => {
    const s = broke();
    advanceWeeks(s, FAILURE.insolvencyWeeks + 2);
    expect(s.flags.gameOver).toBe('insolvency');
  });

  it('keeps the game going with it on', () => {
    const s = broke();
    expect(cmd.setDevNoBankruptcy(s, true).ok).toBe(true);
    advanceWeeks(s, FAILURE.insolvencyWeeks + 6);
    expect(s.flags.gameOver).toBeUndefined();
    expect(s.company.negativeCashWeeks).toBeGreaterThan(FAILURE.insolvencyWeeks);
    expect(cmd.setDevNoBankruptcy(s, false).ok).toBe(true);
    expect(s.flags.devNoBankruptcy).toBeUndefined();
  });
});
