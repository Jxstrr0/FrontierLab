// One branch's flows for the current weekly tick, gathered by the books, Loan
// Desk and costs, then turned into the branch P&L and company postings.

export interface BranchWeek {
  loanInterest: number;
  /** Internal bank transfer pricing, still run by the legacy deposit/loan books (removed in C3c); not in the office P&L. */
  fundingCredit: number;
  accountFees: number;
  cardFees: number;
  originationFees: number;
  atmFees: number;
  wealthFees: number;
  serviceFees: number;
  depositInterest: number;
  fundingCharge: number;
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
    fundingCredit: 0,
    accountFees: 0,
    cardFees: 0,
    originationFees: 0,
    atmFees: 0,
    wealthFees: 0,
    serviceFees: 0,
    depositInterest: 0,
    fundingCharge: 0,
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
