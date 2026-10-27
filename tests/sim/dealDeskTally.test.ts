import { describe, expect, it } from 'vitest';
import { deskWeek, recordDesk } from '../../src/sim/branch/dealDesk';
import { newGame } from '../../src/sim/newGame';
import { openScriptedBranch, runScript } from '../helpers/scenario';

describe('deal desk weekly tally', () => {
  it('counts this week only and resets when the week turns', () => {
    const s = newGame({ seed: 7, cityId: 'cal' });
    const id = openScriptedBranch(s, 'midtown');
    recordDesk(s, id, 'won');
    recordDesk(s, id, 'declined');
    expect(deskWeek(s, s.branches[id]!)).toMatchObject({ won: 1, declined: 1 });
    s.clock.week += 1;
    expect(deskWeek(s, s.branches[id]!)).toMatchObject({ won: 0, declined: 0 });
    recordDesk(s, id, 'lost');
    expect(s.branches[id]!.desk).toMatchObject({ won: 0, lost: 1 });
  });

  it('fills from the weekly tick in a scripted run', () => {
    let seen = 0;
    runScript(30, (st) => {
      for (const b of Object.values(st.branches)) {
        const d = deskWeek(st, b);
        seen += d.arrived + d.won + d.lost + d.declined + d.expired;
      }
    });
    expect(seen).toBeGreaterThan(0);
  });
});
