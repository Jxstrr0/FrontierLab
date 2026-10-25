// The CFO's Capital delegation (SIMULATION §17.2, §15): a weekly routine that
// steers a weak capital ratio back to a safe level using the player's own
// commands, in the order a careful finance chief would:
//   1. at Watch or worse, sell the company's stock holdings (risk weight 2.5×)
//   2. at Watch or worse, step risk appetite down every few weeks (unless a CRO
//      already runs appetite) so new lending carries less risk
//   3. at Restricted or Critical, or under the charter floor, sell new shares
//      through the cheapest investment bank: a private placement while private
//      (rounds and spacing permitting), a secondary offering once listed, sized
//      to reach the target ratio (12%, plus any regulator buffer in force)
import { CHARTER_MIN_EQUITY, EXEC_DELEGATION as X, PLACEMENT, SECONDARY } from '../config/balance';
import { INVESTMENT_BANKS } from '../data/investmentBanks';
import { capitalBufferPp, capitalSnapshot } from './capital';
import { trade } from './commands/markets';
import { privatePlacement, secondaryOffering } from './commands/marketsEquity';
import { setRiskAppetite } from './commands/products';
import { placementQuote, placementStatus, secondaryQuote } from './equityOffers';
import { delegationOn } from './execSeats';
import type { GameState } from './state';

/** The investment bank with the lowest fee (ties by id, so the pick is stable). */
function cheapestBank(): string {
  return Object.values(INVESTMENT_BANKS).sort(
    (a, b) => a.fee - b.fee || a.id.localeCompare(b.id),
  )[0]!.id;
}

/** Capital the bank must add to reach the target ratio and clear the charter floor. */
export function capitalNeeded(state: GameState): number {
  const cap = capitalSnapshot(state);
  const target = X.cfoTargetCr + capitalBufferPp(state) / 100;
  return Math.max(0, target * cap.rwa - cap.cet1, CHARTER_MIN_EQUITY - cap.equity);
}

/** Sells every stock the company holds. */
function sellCompanyStocks(state: GameState): void {
  for (const [id, h] of Object.entries(state.market.holdings.company)) {
    const shares = Math.floor(h.shares);
    if (shares > 0) trade(state, 'company', id, -shares);
  }
}

/** The smallest share of the bank (in raise steps, up to maxPct) whose net covers need. */
function raisePct(need: number, maxPct: number, netAt: (pct: number) => number): number {
  const perPct = netAt(maxPct) / maxPct;
  if (perPct <= 0) return 0;
  const pct = Math.ceil(need / perPct / X.cfoRaiseStep) * X.cfoRaiseStep;
  return Math.min(maxPct, Math.max(X.cfoRaiseStep, pct));
}

/** Sells new shares sized to the shortfall, if the market allows a raise this week. */
function raiseCapital(state: GameState): void {
  const need = capitalNeeded(state);
  if (need <= 0) return;
  const bank = cheapestBank();
  if (state.stock.status === 'public') {
    const pct = raisePct(need, SECONDARY.maxPct, (p) => secondaryQuote(state, bank, p).net);
    if (pct > 0) secondaryOffering(state, bank, pct);
    return;
  }
  const status = placementStatus(state);
  if (state.stock.ipo || status.left <= 0 || state.clock.week < status.nextWeek) return;
  const pct = raisePct(need, PLACEMENT.maxPct, (p) => placementQuote(state, bank, p).net);
  if (pct > 0) privatePlacement(state, bank, pct);
}

const WEAK = new Set(['watch', 'restricted', 'critical']);
const RAISE = new Set(['restricted', 'critical']);

/** Capital: brings a tier under Adequate back to the target ratio. */
export function cfoCapital(state: GameState): void {
  if (!WEAK.has(capitalSnapshot(state).tier)) return;
  sellCompanyStocks(state);
  const level = state.company.riskAppetite;
  if (
    level > 1 &&
    state.clock.week % X.croEveryWeeks === 0 &&
    !delegationOn(state, 'cro', 'appetite')
  )
    setRiskAppetite(state, level - 1);
  if (RAISE.has(capitalSnapshot(state).tier)) raiseCapital(state);
}
