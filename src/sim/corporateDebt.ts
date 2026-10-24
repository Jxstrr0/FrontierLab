// Corporate debt from rival banks (SIMULATION §19.9): business loan offers at
// rival head offices, amortized loans and lines of credit. Corporate cash, never
// deposits: interest is a P&L expense paid from corporate cash, principal moves
// in the financing category, and the balances sit on the balance sheet as
// corporate debt (balanceSheet.ts).
import { CORPORATE_LENDING, WEEKS_PER_YEAR } from '../config/balance';
import { balanceSheet, corporateDebtTotal } from './balanceSheet';
import { dpow } from './detmath';
import { postCash, spend } from './ledger';
import { clamp, roundToStep } from './math';
import { stream } from './rng';
import type { CorporateDebt, GameState, RivalBank } from './state';
import { homeCountry } from './treasury';

export function emptyCorporateDebt(): CorporateDebt {
  return { loans: {}, lines: {}, offers: [], offersRefreshWeek: -1 };
}

/** Your equity today (assets − liabilities), floored at zero. */
function equityNow(state: GameState): number {
  return Math.max(0, balanceSheet(state).equity);
}

/** A line of credit's limit from any one lender: 20% of equity, computed live (§19.9). */
export function creditLimit(state: GameState): number {
  return CORPORATE_LENDING.lineEquityShare * equityNow(state);
}

/** Line of credit rate: home policy + 4% (§19.9). */
export function lineRate(state: GameState): number {
  return homeCountry(state).policyRate + CORPORATE_LENDING.lineSpread;
}

/** Room left for new business loans: 40% of equity less corporate debt already owed. */
export function loanRoom(state: GameState): number {
  return Math.max(
    0,
    CORPORATE_LENDING.maxEquityShare * equityNow(state) - corporateDebtTotal(state),
  );
}

/** Weekly payment that repays `principal` over `weeks` at an annual `rate`. */
export function amortizedPayment(principal: number, rate: number, weeks: number): number {
  const r = rate / WEEKS_PER_YEAR;
  if (r <= 0) return principal / weeks;
  return (principal * r) / (1 - dpow(1 + r, -weeks));
}

/** Rivals whose head office stands in a city where you run a branch. */
export function lendersNearYou(state: GameState): RivalBank[] {
  const cities = new Set<string>();
  for (const b of Object.values(state.branches)) if (b.status !== 'closed') cities.add(b.cityId);
  const ids = new Set<string>();
  for (const site of Object.values(state.world.sites)) {
    if (site.kind === 'rivalHq' && cities.has(site.cityId)) ids.add(site.refId);
  }
  return [...ids]
    .sort()
    .map((id) => state.rivals[id])
    .filter((r): r is RivalBank => r !== undefined && r.status === 'active');
}

/** Rate spread by your capital ratio: 2.5% at a strong CR, 5% at a weak one (§19.9). */
function loanSpread(cr: number): number {
  const c = CORPORATE_LENDING;
  const t = clamp((cr - c.crWorst) / (c.crBest - c.crWorst), 0, 1);
  return c.spreadWorst + t * (c.spreadBest - c.spreadWorst);
}

/** Every 4 weeks: 2–3 fresh business loan offers from each nearby active rival. */
function refreshOffers(state: GameState): void {
  const d = state.corporateDebt;
  const c = CORPORATE_LENDING;
  const week = state.clock.week;
  if (d.offersRefreshWeek >= 0 && week - d.offersRefreshWeek < c.refreshWeeks) return;
  d.offersRefreshWeek = week;
  d.offers = [];
  const rng = stream(state, 'corporateDebt');
  const room = loanRoom(state);
  const policy = homeCountry(state).policyRate;
  const spread = loanSpread(state.company.capitalRatio);
  for (const rival of lendersNearYou(state)) {
    const n = rng.int(...c.offersPerRival);
    for (let i = 0; i < n; i++) {
      const amount = roundToStep(room * rng.range(...c.sizeRange), c.amountStep);
      const noise = rng.range(-c.spreadNoise, c.spreadNoise);
      const termWeeks = rng.pick(c.terms);
      if (amount < c.minAmount) continue;
      const rate = policy + clamp(spread + noise, c.spreadBest, c.spreadWorst);
      d.offers.push({
        id: `co_${rival.id}_${week}_${i}`,
        lenderId: rival.id,
        amount,
        rate,
        termWeeks,
        payment: amortizedPayment(amount, rate, termWeeks),
        expiresWeek: week + c.refreshWeeks,
      });
    }
  }
}

/** Tick step 8: interest and payments on corporate loans and lines, offer refresh. */
export function runCorporateDebt(state: GameState): void {
  const d = state.corporateDebt;
  for (const loan of Object.values(d.loans)) {
    const interest = (loan.balance * loan.rate) / WEEKS_PER_YEAR;
    const principal = Math.min(loan.balance, Math.max(0, loan.payment - interest));
    spend(state, 'corporateInterest', interest);
    loan.weeksLeft -= 1;
    // The final payment clears whatever is left.
    const pay = loan.weeksLeft <= 0 ? loan.balance : principal;
    postCash(state, -pay, 'financing');
    loan.balance -= pay;
    if (loan.balance <= CORPORATE_LENDING.dust) {
      if (loan.balance > 0) postCash(state, -loan.balance, 'financing');
      delete d.loans[loan.id];
    }
  }
  const rate = lineRate(state);
  for (const [lenderId, line] of Object.entries(d.lines)) {
    line.rate = rate;
    if (line.drawn <= CORPORATE_LENDING.dust) {
      if (line.drawn > 0) postCash(state, -line.drawn, 'financing');
      delete d.lines[lenderId];
      continue;
    }
    spend(state, 'corporateInterest', (line.drawn * line.rate) / WEEKS_PER_YEAR);
  }
  refreshOffers(state);
}
