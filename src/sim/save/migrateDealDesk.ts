// Save migration 12 → 13 (stage C5b): the Loan Desk becomes the Deal Desk.
// Business loans still on the books are repaid into treasury reserves at their
// balance (an asset swap, so equity is unchanged); waiting applications lapse.
// Offices get a discount limit and the new weekly desk tally, and business
// budgets (and rival contracts) move to the C5b size bases.
import { BUSINESS, DEAL } from '../../config/balance';
import type { GameState } from '../state';

interface OldDesk {
  week?: number;
  arrived?: number;
  approved?: number;
  refused?: number;
  declined?: number;
  expired?: number;
}

export function migrateDealDesk(state: GameState): void {
  const raw = state as unknown as {
    loanDesk?: { loans?: Record<string, { balance?: number; status?: string }> };
  };
  for (const loan of Object.values(raw.loanDesk?.loans ?? {}))
    if (loan.status === 'current') state.treasury.reserves += loan.balance ?? 0;
  delete raw.loanDesk;
  // Tenders arrive with migration 34 → 35.
  state.dealDesk = { rfps: {} } as unknown as GameState['dealDesk'];
  for (const b of Object.values(state.businesses ?? {})) {
    const k = BUSINESS.sizes[b.size].budget / BUSINESS.oldBudgets[b.size];
    b.budget = Math.round((b.budget * k) / 100) * 100;
    if (b.contractValue !== undefined)
      b.contractValue = Math.min(b.budget, Math.round((b.contractValue * k) / 100) * 100);
  }
  for (const b of Object.values(state.branches)) {
    const old = b.desk as unknown as OldDesk;
    b.desk = {
      week: old.week ?? 0,
      arrived: old.arrived ?? 0,
      won: old.approved ?? 0,
      lost: old.refused ?? 0,
      declined: old.declined ?? 0,
      expired: old.expired ?? 0,
    };
    b.discountLimit ??= DEAL.defaultLimit;
    const sbl = b.books.sbl;
    if (sbl) {
      sbl.accounts = 0;
      sbl.balance = 0;
    }
  }
}
