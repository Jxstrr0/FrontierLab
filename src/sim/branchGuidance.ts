// Branch guidance (SIMULATION §17.2): the CFO and CRO jointly steer the branch
// managers you've delegated pricing and lending to. The CFO owns the deposit
// half (liquidity), the CRO the loan half (capital and losses). Each half is a
// whole step in GUIDANCE.min..max, moved one step every GUIDANCE.everyWeeks;
// a half whose delegation is off (or whose seat is empty) returns to 0.
// delegatedPrice (branch/delegation.ts) and the delegated Loan Desk read it.
import { EXEC_DELEGATION as X, GUIDANCE } from '../config/balance';
import { companyLossRate } from './riskFloor';
import { delegationOn } from './execSeats';
import { clamp } from './math';
import type { BranchGuidance, GameState } from './state';

const step = (v: number, by: number) => clamp(v + by, GUIDANCE.min, GUIDANCE.max);

/** The guidance in force (zeros for saves without it). */
export function guidanceOf(state: GameState): BranchGuidance {
  return state.company.guidance ?? { deposits: 0, loans: 0 };
}

/** Rate offset a delegated manager adds to a deposit or loan rate. */
export function guidanceRateOffset(state: GameState, category: 'deposits' | 'loans'): number {
  const g = guidanceOf(state);
  return (category === 'deposits' ? g.deposits : g.loans) * GUIDANCE.rateStep;
}

/** Multiplier on the delegated Loan Desk's PD threshold: below 1 approves less. */
export function guidanceThresholdMult(state: GameState): number {
  return Math.max(0, 1 - GUIDANCE.thresholdStep * guidanceOf(state).loans);
}

/** Tick step 8, after the delegations: both halves of the guidance. */
export function runBranchGuidance(state: GameState): void {
  const g = (state.company.guidance ??= { deposits: 0, loans: 0 });
  const cfo = delegationOn(state, 'cfo', 'guidance');
  const cro = delegationOn(state, 'cro', 'guidance');
  if (!cfo) g.deposits = 0;
  if (!cro) g.loans = 0;
  if (state.clock.week % GUIDANCE.everyWeeks !== 0) return;
  if (cfo) {
    const lr = state.company.liquidityRatio;
    const target = state.treasury.liqTarget;
    if (lr !== null && lr < target - GUIDANCE.liqLow) g.deposits = step(g.deposits, 1);
    else if (lr !== null && lr > target + GUIDANCE.liqHigh) g.deposits = step(g.deposits, -1);
  }
  if (cro) {
    // The CRO's appetite marks (§17.2): tighten on a miss, loosen when both are healthy.
    const cr = state.company.capitalRatio;
    const loss = companyLossRate(state);
    if (cr < X.croMinCr || loss > X.croMaxLoss) g.loans = step(g.loans, 1);
    else if (cr >= X.croRaiseCr && loss <= X.croRaiseLoss) g.loans = step(g.loans, -1);
  }
}
