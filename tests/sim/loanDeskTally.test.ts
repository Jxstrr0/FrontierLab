import { SCHEMA_VERSION } from '../../src/sim/state';
import { describe, expect, it } from 'vitest';
import { deskWeek, recordDesk } from '../../src/sim/branch/loanDesk';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { openScriptedBranch, runScript } from '../helpers/scenario';

describe('loan desk weekly tally', () => {
  it('counts this week only and resets when the week turns', () => {
    const s = newGame({ seed: 7, cityId: 'cal' });
    const id = openScriptedBranch(s, 'midtown');
    recordDesk(s, id, 'approved');
    recordDesk(s, id, 'declined');
    expect(deskWeek(s, s.branches[id]!)).toMatchObject({ approved: 1, declined: 1 });
    s.clock.week += 1;
    expect(deskWeek(s, s.branches[id]!)).toMatchObject({ approved: 0, declined: 0 });
    recordDesk(s, id, 'refused');
    expect(s.branches[id]!.desk).toMatchObject({ approved: 0, refused: 1 });
  });

  it('fills from the weekly tick in a scripted run', () => {
    let seen = 0;
    runScript(30, (st) => {
      for (const b of Object.values(st.branches)) {
        const d = deskWeek(st, b);
        seen += d.approved + d.refused + d.declined + d.expired;
      }
    });
    expect(seen).toBeGreaterThan(0);
  });

  it('migrates a v2 save by giving each branch an empty tally', () => {
    const s = runScript(4) as unknown as Record<string, unknown>;
    const branches = s.branches as Record<string, Record<string, unknown>>;
    for (const b of Object.values(branches)) delete b.desk;
    s.schemaVersion = 2;
    const up = migrate(s as Record<string, unknown> & { schemaVersion: number });
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    for (const b of Object.values(up.branches as Record<string, Record<string, unknown>>)) {
      expect(b.desk).toEqual({
        week: 0,
        arrived: 0,
        approved: 0,
        refused: 0,
        declined: 0,
        expired: 0,
      });
    }
  });
});
