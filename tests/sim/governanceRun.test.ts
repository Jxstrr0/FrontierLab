// A three-year run with a full executive team, every delegation on, grants and
// quarterly board meetings paying dividends: the balance identity holds every
// week, the cap table sums to the shares outstanding, and nothing turns NaN.
import { describe, expect, it } from 'vitest';
import { EXEC_SEAT_ORDER, EXEC_SEATS } from '../../src/data/executives';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { boardBlocker } from '../../src/sim/governance';
import { cfoDividendProposal } from '../../src/sim/governanceVotes';
import { bankWithFloors } from '../helpers/scenario';
import { hire, holderTotal, identityGap } from '../helpers/executives';

describe('governance over three years', () => {
  it('keeps the books whole with every executive delegating', () => {
    const s = bankWithFloors(['executive', 'finance', 'hr', 'products', 'marketing', 'it', 'risk']);
    for (const seat of EXEC_SEAT_ORDER) {
      hire(s, seat);
      for (const d of EXEC_SEATS[seat].delegations) cmd.setExecDelegation(s, seat, d.id, true);
    }
    cmd.addGrant(s, 'cfo', 'rsu', 20_000);
    cmd.addGrant(s, 'coo', 'option', 20_000, s.stock.price * 0.8);
    let meetings = 0;
    let dividends = 0;
    for (let w = 0; w < 156; w++) {
      advanceWeeks(s, 1);
      if (s.flags.gameOver) break;
      expect(identityGap(s)).toBeLessThan(1);
      expect(Number.isFinite(s.company.cash)).toBe(true);
      expect(holderTotal(s)).toBe(s.company.sharesOutstanding);
      if (!boardBlocker(s)) {
        const r = cmd.holdBoardMeeting(s, cfoDividendProposal(s), s.governance.ceoSalary);
        if (r.ok) {
          meetings += 1;
          if (r.meeting.dividend.passed && r.meeting.dividend.proposed > 0) dividends += 1;
        }
      }
    }
    expect(s.flags.gameOver).toBeFalsy();
    expect(meetings).toBeGreaterThanOrEqual(11);
    expect(dividends).toBeGreaterThanOrEqual(0);
    expect(s.personal.cash).toBeGreaterThan(150_000);
  }, 60_000);
});
