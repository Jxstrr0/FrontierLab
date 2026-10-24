// Bank runs (SIMULATION §13.8) and the emergency recapitalisation (§15): the
// run's trigger condition, start and end, the public statement's odds, the
// recapitalisation quote, accepting it, and the regulator takeover.
import { BANK_RUN, FAILURE, RECAP, RECAP_DISCOUNT } from '../../config/balance';
import { capitalSnapshot } from '../capital';
import { issueShares } from '../shares';
import { pushEvent } from '../events';
import { postCash } from '../ledger';
import type { GameState } from '../state';

// ─── Bank runs ────────────────────────────────────────────────────────────────

/** §13.8: average overall < 2.6 AND (tier Restricted/Critical OR liquidity ratio < 0.08). */
export function bankRunCondition(state: GameState): boolean {
  const open = Object.values(state.branches).filter((b) => b.status === 'open');
  if (open.length === 0) return false;
  const avg = open.reduce((s, b) => s + b.ratings.overall, 0) / open.length;
  if (avg >= BANK_RUN.maxOverall) return false;
  const tier = state.company.tier;
  const lr = state.company.liquidityRatio;
  return (
    tier === 'restricted' || tier === 'critical' || (lr !== null && lr < BANK_RUN.maxLiquidity)
  );
}

export function startBankRun(state: GameState, weeks: number): void {
  state.incidents.bankRunWeeksLeft = weeks;
  pushEvent(state, 'BANK_RUN', { bank: state.meta.bankName }, 1);
}

export function endBankRun(state: GameState): void {
  if (state.incidents.bankRunWeeksLeft === undefined) return;
  delete state.incidents.bankRunWeeksLeft;
  pushEvent(state, 'BANK_RUN_ENDED', { bank: state.meta.bankName }, 2);
}

/** Public statement: 30% + 5% per capital-ratio point above 8% (capped). */
export function statementOdds(state: GameState): number {
  const points = Math.max(0, (state.company.capitalRatio - BANK_RUN.statementFromCr) * 100);
  return Math.min(
    BANK_RUN.statementMax,
    BANK_RUN.statementBase + BANK_RUN.statementPerPoint * points,
  );
}

// ─── Emergency recapitalisation ───────────────────────────────────────────────

export interface RecapQuote {
  /** New capital raised (cash in). */
  amount: number;
  /** Price per new share: 50% of book value per share. */
  price: number;
  shares: number;
}

/** Shares worth enough to lift the capital ratio to 10.5%, at half of book value per share. */
export function recapQuote(state: GameState): RecapQuote {
  const snap = capitalSnapshot(state);
  // New cash carries no risk weight, so CR′ = (CET1 + amount) / RWA.
  const need = Math.max(0, RECAP.targetCr * snap.rwa - snap.cet1);
  const amount = Math.ceil(need / RECAP.roundTo) * RECAP.roundTo;
  const bookPerShare = snap.equity / Math.max(1, state.company.sharesOutstanding);
  const price = Math.max(RECAP.minPrice, RECAP_DISCOUNT * bookPerShare);
  return { amount, price, shares: Math.ceil(amount / price) };
}

/** Accepts the forced share issue: cash and paid-in capital rise together. */
export function acceptRecap(state: GameState): RecapQuote {
  const q = recapQuote(state);
  const c = state.company;
  postCash(state, q.amount, 'financing');
  c.paidInCapital += q.amount;
  issueShares(
    state,
    { id: 'regulator', name: 'Deposit Protection Fund', kind: 'regulator' },
    q.shares,
  );
  c.capitalRatio = capitalSnapshot(state).capitalRatio;
  c.lowCapitalWeeks = 0;
  const week = state.clock.week;
  state.incidents.recap = {
    offeredWeek: state.incidents.recap?.offeredWeek ?? week,
    acceptedWeek: week,
  };
  pushEvent(state, 'RECAP', { bank: state.meta.bankName, amount: q.amount, shares: q.shares }, 1);
  return q;
}

/** The regulator seizes the bank: game over. */
export function takeover(state: GameState): void {
  if (state.flags.gameOver) return;
  state.flags.gameOver = 'takeover';
  pushEvent(state, 'GAME_OVER', { reason: 'takeover' }, 3);
}

/** Tick step 10: after a recap is accepted, the ratio must be back over 4.5% in 5 weeks. */
export function checkRecapGrace(state: GameState): void {
  const r = state.incidents.recap;
  if (r?.acceptedWeek === undefined) return;
  if (state.clock.week < r.acceptedWeek + RECAP.graceWeeks) return;
  if (state.company.capitalRatio < FAILURE.takeoverCr) takeover(state);
  else delete state.incidents.recap;
}
