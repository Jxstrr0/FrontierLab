// The board's arithmetic (DESIGN §5.13, SIMULATION §15): the regulator's
// dividend cap by safety tier, how outside shareholders vote on a dividend and
// on the CEO's pay (BOARD_VOTE; the docs give no formula, decision log), and the
// CFO's dividend proposal. Pure functions of the state; nothing is mutated.
import {
  BOARD_VOTE as V,
  COE,
  EXEC_DELEGATION,
  GOVERNANCE,
  QUARTERS_PER_YEAR,
} from '../config/balance';
import { execMarketSalary } from './execSeats';
import { clamp, roundToStep } from './math';
import { FOUNDER_ID } from './shares';
import type { GameState } from './state';
import { netIncomeTtm, roeTtm } from './valuation';

/**
 * §15: the most the board may pay per share this quarter, or null when the
 * tier sets no cap. Watch: watchCap × trailing-4-quarter net income ÷ 4, spread
 * over the shares; Restricted and Critical: nothing.
 */
export function dividendCapPerShare(state: GameState): number | null {
  const tier = state.company.tier;
  if (tier === 'restricted' || tier === 'critical') return 0;
  if (tier !== 'watch') return null;
  const quarterCap = (GOVERNANCE.watchCap * Math.max(0, netIncomeTtm(state))) / QUARTERS_PER_YEAR;
  return quarterCap / Math.max(1, state.company.sharesOutstanding);
}

/** The modal's cap note, or undefined when the tier leaves dividends free. */
export function dividendCapNote(state: GameState): string | undefined {
  const tier = state.company.tier;
  if (tier === 'restricted' || tier === 'critical')
    return 'The regulator forbids dividends while the safety tier is Restricted or Critical.';
  if (tier === 'watch')
    return `The safety tier is Watch: dividends are capped at ${GOVERNANCE.watchCap * 100}% of trailing net income.`;
  return undefined;
}

/** Share of votes held by the founder and executives, who always vote For. */
export function insiderShare(state: GameState): number {
  const total = Math.max(1, state.company.sharesOutstanding);
  const insiders = state.stock.holders
    .filter((h) => h.id === FOUNDER_ID || h.kind === 'founder' || h.kind === 'executive')
    .reduce((s, h) => s + h.shares, 0);
  return clamp(insiders / total, 0, 1);
}

/** forShare = insiders + (1 − insiders) × a. */
export function forShare(insiders: number, approval: number): number {
  return insiders + (1 - insiders) * clamp(approval, 0, 1);
}

export const passes = (share: number) => share >= V.passShare;

/** Annual payout ratio of a quarterly dividend: dps × shares × 4 ÷ max(NI_ttm, 1). */
export function payoutRatio(state: GameState, dps: number): number {
  return (
    (dps * state.company.sharesOutstanding * QUARTERS_PER_YEAR) / Math.max(netIncomeTtm(state), 1)
  );
}

/** Outside approval of a dividend per share (BOARD_VOTE). */
export function dividendApproval(state: GameState, dps: number): number {
  if (netIncomeTtm(state) <= 0) return dps > 0 ? V.lossPaid : V.lossZero;
  if (dps <= 0) return V.zero;
  const payout = payoutRatio(state, dps);
  if (payout <= V.comfortablePayout) return V.comfortable;
  const t = (payout - V.comfortablePayout) / (V.maxPayout - V.comfortablePayout);
  return clamp(V.comfortable + (V.atMax - V.comfortable) * t, V.atMax, V.comfortable);
}

/** The market rate for a CEO: ceoMarketMult × the executive market salary. */
export function ceoMarketSalary(state: GameState): number {
  return V.ceoMarketMult * execMarketSalary(state);
}

/** Outside approval of a new CEO salary (BOARD_VOTE). */
export function salaryApproval(state: GameState, salary: number): number {
  const market = ceoMarketSalary(state);
  const current = state.governance.ceoSalary;
  let a =
    salary > market ? clamp(V.atMarket - V.slope * (salary / market - 1), ...V.range) : V.atMarket;
  if (salary - current > V.bigRaise * current) a -= V.bigRaisePenalty;
  if (roeTtm(state) < COE) a -= V.weakRoePenalty;
  return clamp(a, 0, 1);
}

/** The CFO's proposal: dividendPayout of trailing net income, within the regulator's cap. */
export function cfoDividendProposal(state: GameState): number {
  const ni = netIncomeTtm(state);
  if (ni <= 0) return 0;
  const raw =
    (EXEC_DELEGATION.dividendPayout * ni) /
    QUARTERS_PER_YEAR /
    Math.max(1, state.company.sharesOutstanding);
  const cap = dividendCapPerShare(state);
  const capped = cap === null ? raw : Math.min(raw, cap);
  // Round down to whole cents (the epsilon keeps 0.07 from flooring to 0.06).
  return roundToStep(Math.floor(capped / V.dpsStep + 1e-9) * V.dpsStep, V.dpsStep);
}
