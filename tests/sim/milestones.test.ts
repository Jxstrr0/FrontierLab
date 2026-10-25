import { describe, expect, it } from 'vitest';
import { advanceWeeks } from '../../src/sim/engine';
import { checkMilestones } from '../../src/sim/milestones';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { openScriptedBranch } from '../helpers/scenario';

describe('milestones', () => {
  it('records the first branch and first loan once, with a news event', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    expect(s.milestones).toEqual({});
    openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 6);
    expect(s.milestones.first_branch).toBeTypeOf('number');
    expect(s.milestones.first_loan).toBeTypeOf('number');
    const first = s.milestones.first_branch;
    advanceWeeks(s, 2);
    expect(s.milestones.first_branch).toBe(first);
    expect(s.events.log.filter((e) => e.type === 'MILESTONE').length).toBeLessThanOrEqual(2);
  });

  it('catches up an older save quietly during migration', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 3);
    s.milestones = {};
    s.events.log = [];
    const raw = s as unknown as Record<string, unknown> & { schemaVersion: number };
    raw.schemaVersion = 11;
    const up = migrate(raw) as unknown as typeof s;
    expect(up.milestones.first_branch).toBe(up.clock.week);
    expect(up.events.log.some((e) => e.type === 'MILESTONE')).toBe(false);
  });

  it('counts five countries only from open branches', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    checkMilestones(s);
    expect(s.milestones.five_countries).toBeUndefined();
  });
});
