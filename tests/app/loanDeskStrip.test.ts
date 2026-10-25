// Loan Desk summary strip (SCREENS §5.3): this week's arrivals, approved,
// declined, approval rate over decided applications, the business loan
// balance, last week's defaults and the waiting queue.
import { describe, expect, it } from 'vitest';
import { loanDeskStrip } from '../../src/app/branch/selectors';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import type { BusinessLoan, GameState } from '../../src/sim/state';

function withBranch(): { s: GameState; id: string } {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Desk Bank' });
  const lot = Object.values(s.world.lots).find((l) => !l.occupant && l.cityId === 'cal')!;
  const r = cmd.buildBranch(s, { lotId: lot.id, build: REFERENCE_BUILDS.basic });
  if (!r.ok) throw new Error(r.reason);
  return { s, id: r.branchId };
}

describe('loan desk strip', () => {
  it('starts empty, with no approval rate', () => {
    const { s, id } = withBranch();
    const strip = loanDeskStrip(s, s.branches[id]!);
    expect(strip).toEqual({
      arrived: 0,
      approved: 0,
      declined: 0,
      approvalRate: undefined,
      balance: 0,
      defaultedLoans: 0,
      defaulted: 0,
      waiting: 0,
    });
  });

  it("reads this week's desk counts, current loans and the queue", () => {
    const { s, id } = withBranch();
    const b = s.branches[id]!;
    b.desk = { week: s.clock.week, arrived: 7, approved: 3, refused: 1, declined: 2, expired: 0 };
    const loan = (n: number, status: BusinessLoan['status'], branchId = id) =>
      ({ id: `L${n}`, branchId, balance: 1000 * n, status }) as BusinessLoan;
    s.loanDesk.loans = {
      L1: loan(1, 'current'),
      L2: loan(2, 'current'),
      L3: loan(3, 'repaid'),
      L4: loan(4, 'current', 'elsewhere'),
    };
    s.loanDesk.applications = {
      A1: { id: 'A1', branchId: id } as never,
      A2: { id: 'A2', branchId: 'elsewhere' } as never,
    };
    if (b.books.sbl) Object.assign(b.books.sbl.last, { defaulted: 2500, defaultedLoans: 2 });
    const strip = loanDeskStrip(s, b);
    expect(strip.arrived).toBe(7);
    expect(strip.approved).toBe(3);
    expect(strip.declined).toBe(2);
    expect(strip.approvalRate).toBeCloseTo(3 / 6);
    expect(strip.balance).toBe(3000);
    expect(strip.waiting).toBe(1);
    expect(strip.defaulted).toBe(b.books.sbl ? 2500 : 0);
    expect(strip.defaultedLoans).toBe(b.books.sbl ? 2 : 0);
  });

  it("ignores last week's desk counts", () => {
    const { s, id } = withBranch();
    const b = s.branches[id]!;
    b.desk = {
      week: s.clock.week - 1,
      arrived: 9,
      approved: 4,
      refused: 0,
      declined: 1,
      expired: 0,
    };
    expect(loanDeskStrip(s, b).arrived).toBe(0);
  });
});
