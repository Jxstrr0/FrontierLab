// Developer tools (SCREENS §26): the "Top staff" switch holds every team's
// skill and morale at DEV_STAFF through the weekly updates, and the "No
// bankruptcy" switch keeps insolvency from ending the game, and "Free top
// rerolls" makes candidate rerolls free and deals DEV_REROLL skills.
import { describe, expect, it } from 'vitest';
import { DEV_REROLL, DEV_STAFF, FAILURE } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { execRerollFee, managerRerollFee } from '../../src/sim/candidateRerolls';
import { topSkill } from '../../src/sim/devStaff';
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

describe('devRerolls', () => {
  const inRange = (n: number) => n >= DEV_REROLL.minSkill && n <= DEV_REROLL.maxSkill;

  it('squeezes any roll into the top range', () => {
    expect(topSkill(0)).toBe(DEV_REROLL.minSkill);
    expect(topSkill(100)).toBe(DEV_REROLL.maxSkill);
    expect(inRange(topSkill(57))).toBe(true);
  });

  it('makes manager rerolls free and every candidate top-rated', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const city = s.world.currentCityId;
    expect(managerRerollFee(s, city)).toBeGreaterThan(0);
    cmd.setDevRerolls(s, true);
    expect(managerRerollFee(s, city)).toBe(0);
    const cash = s.company.cash;
    for (let i = 0; i < 3; i++) expect(cmd.rerollManagerCandidates(s, city).ok).toBe(true);
    expect(s.company.cash).toBe(cash);
    // Before the first hire, the guide keeps the first place on the list.
    for (const m of s.people.managerCandidates[city]!.slice(1)) {
      expect(Object.values(m.skills).every(inRange)).toBe(true);
    }
  });

  it('makes executive rerolls free and every candidate top-rated', () => {
    const s = execGame(['finance']);
    cmd.setDevRerolls(s, true);
    expect(execRerollFee(s, 'cfo')).toBe(0);
    const cash = s.company.cash;
    expect(cmd.rerollExecCandidates(s, 'cfo').ok).toBe(true);
    expect(s.company.cash).toBe(cash);
    for (const e of s.executives.candidates.cfo!) {
      expect([e.leadership, e.expertise, e.loyalty].every(inRange)).toBe(true);
    }
  });

  it('switches off again', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    cmd.setDevRerolls(s, true);
    cmd.setDevRerolls(s, false);
    expect(s.flags.devRerolls).toBeUndefined();
    expect(managerRerollFee(s, s.world.currentCityId)).toBeGreaterThan(0);
  });
});
