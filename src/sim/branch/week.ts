// One branch's flows for the current weekly tick, gathered by the books, Loan
// Desk and costs, then turned into the branch P&L and company postings.

export interface BranchWeek {
  loanInterest: number;
  accountFees: number;
  cardFees: number;
  atmFees: number;
  serviceFees: number;
  losses: number;
  staff: number;
  manager: number;
  rent: number;
  marketing: number;
  equipment: number;
  overhead: number;
  servicing: number;
  /** Compute behind plan seats and API usage (C3b). */
  compute: number;
  underwriting: number;
}

export function emptyWeek(): BranchWeek {
  return {
    loanInterest: 0,
    accountFees: 0,
    cardFees: 0,
    atmFees: 0,
    serviceFees: 0,
    losses: 0,
    staff: 0,
    manager: 0,
    rent: 0,
    marketing: 0,
    equipment: 0,
    overhead: 0,
    servicing: 0,
    compute: 0,
    underwriting: 0,
  };
}
