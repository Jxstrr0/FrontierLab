// Governance stories in The Weekly Ledger (SIMULATION §24): a declared dividend,
// a rejected pay rise and executive comings and goings make the business pages;
// a routine meeting does not.
import { describe, expect, it } from 'vitest';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { issueShares } from '../../src/sim/shares';
import type { GameState } from '../../src/sim/state';
import { execGame, hire } from '../helpers/executives';

const issueText = (s: GameState) =>
  s.news.issues
    .at(-1)!
    .articles.map((a) => `${a.ref} ${a.headline} ${a.body}`)
    .join('\n');

describe('governance news', () => {
  it('covers a dividend and an executive hire', () => {
    const s = execGame();
    advanceWeeks(s, 1);
    s.history.quarterly = [1, 2, 3, 4].map((q) => ({
      endWeek: q,
      year: 2027,
      q: q as 1 | 2 | 3 | 4,
      revenue: 3_000_000,
      netIncome: 1_000_000,
      eps: 0,
    }));
    s.company.tier = 'strong';
    hire(s, 'cfo');
    expect(cmd.holdBoardMeeting(s, 0.02, s.governance.ceoSalary).ok).toBe(true);
    advanceWeeks(s, 1);
    const text = issueText(s);
    expect(text).toMatch(/DIVIDEND_DECLARED.*\$0\.02/);
    expect(text).toMatch(/EXEC_HIRED/);
    expect(text).not.toMatch(/BOARD_SALARY_VOTE/);
  });

  it('reports a rejected pay rise', () => {
    const s = execGame();
    advanceWeeks(s, 1);
    issueShares(s, { id: 'fund', name: 'Fund', kind: 'fund' }, s.company.sharesOutstanding * 9);
    const r = cmd.holdBoardMeeting(s, 0, cmd.maxCeoSalary(s));
    expect(r.ok && !r.meeting.salary.passed).toBe(true);
    advanceWeeks(s, 1);
    expect(issueText(s)).toMatch(/BOARD_SALARY_VOTE/);
  });
});
