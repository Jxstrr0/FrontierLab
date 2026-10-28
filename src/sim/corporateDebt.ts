// Corporate debt from investment banks (SIMULATION §19.9): venture debt (term
// loan) offers and revolving credit lines at the investment bank offices in
// cities where you run a sales office. Corporate cash, never deposits: interest
// is a P&L expense paid from corporate cash, principal moves in the financing
// category, and the balances sit on the balance sheet as corporate debt
// (balanceSheet.ts). Lender ids are investment bank site ids; saves from before
// the move may still hold rival lab ids, which keep accruing and can be repaid.
import { CORPORATE_LENDING, WEEKS_PER_YEAR } from '../config/balance';
import { INVESTMENT_BANKS } from '../data/investmentBanks';
import { companyArr } from './arr';
import { balanceSheet, corporateDebtTotal } from './balanceSheet';
import { dpow } from './detmath';
import { postCash, spend } from './ledger';
import { clamp, roundToStep } from './math';
import { stream } from './rng';
import { runwaySnapshot } from './runway';
import type { CorporateDebt, GameState, Site } from './state';
import { homeCountry } from './treasury';

export function emptyCorporateDebt(): CorporateDebt {
  return { loans: {}, lines: {}, offers: [], offersRefreshWeek: -1 };
}

/** Your equity today (assets − liabilities), floored at zero. */
function equityNow(state: GameState): number {
  return Math.max(0, balanceSheet(state).equity);
}

/** The credit limit shared by all your lines: lineEquityShare of equity, computed live (§19.9). */
export function creditLimit(state: GameState): number {
  return CORPORATE_LENDING.lineEquityShare * equityNow(state);
}

/** Undrawn credit you could draw today across every lender near you (DESIGN §5.18). */
export function creditAvailable(state: GameState): number {
  return lendersNearYou(state).length > 0 ? creditRoom(state) : 0;
}

/** Credit left to draw: one limit shared by all your lines, less what they have drawn (§19.9). */
export function creditRoom(state: GameState): number {
  const drawn = Object.values(state.corporateDebt.lines).reduce((sum, l) => sum + l.drawn, 0);
  return Math.max(0, creditLimit(state) - drawn);
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

/** Cities where you run an open sales office. */
function yourCities(state: GameState): Set<string> {
  const cities = new Set<string>();
  for (const b of Object.values(state.branches)) if (b.status !== 'closed') cities.add(b.cityId);
  return cities;
}

/** Investment bank offices in a city where you run a sales office, by site id. */
export function lendersNearYou(state: GameState): Site[] {
  const cities = yourCities(state);
  return Object.values(state.world.sites)
    .filter((site) => site.kind === 'investmentBank' && cities.has(site.cityId))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** True when the investment bank office `siteId` lends to you today. */
export function isLenderNearYou(state: GameState, siteId: string): boolean {
  const site = state.world.sites[siteId];
  return site?.kind === 'investmentBank' && yourCities(state).has(site.cityId);
}

/**
 * Display name for a loan's lender: the investment bank for a site id, the rival
 * lab for a loan taken before lending moved to investment banks, else a generic label.
 */
export function lenderName(state: GameState, lenderId: string): string {
  const site = state.world.sites[lenderId];
  const bank = site?.kind === 'investmentBank' ? INVESTMENT_BANKS[site.refId] : undefined;
  if (bank) return bank.name;
  return state.rivals[lenderId]?.name ?? 'your lenders';
}

/**
 * Rate spread by runway and ARR (§19.9): the score averages runway (full at
 * bestRunwayMonths, or with no burn) and ARR (full at bestArr), and moves the
 * spread from spreadWorst (5%) at 0 to spreadBest (2.5%) at 1.
 */
export function loanSpread(state: GameState): number {
  const c = CORPORATE_LENDING;
  const { months } = runwaySnapshot(state);
  const runway = months === null ? 1 : clamp(months / c.bestRunwayMonths, 0, 1);
  const arr = clamp(companyArr(state) / c.bestArr, 0, 1);
  const t = (runway + arr) / 2;
  return c.spreadWorst + t * (c.spreadBest - c.spreadWorst);
}

/** Every 4 weeks: 2–3 fresh venture debt offers from each nearby investment bank office. */
function refreshOffers(state: GameState): void {
  const d = state.corporateDebt;
  const c = CORPORATE_LENDING;
  const week = state.clock.week;
  // Offers still held from rival labs (saves from before lending moved) refresh at once.
  const stale = d.offers.some((o) => state.world.sites[o.lenderId]?.kind !== 'investmentBank');
  if (!stale && d.offersRefreshWeek >= 0 && week - d.offersRefreshWeek < c.refreshWeeks) return;
  d.offersRefreshWeek = week;
  d.offers = [];
  const rng = stream(state, 'corporateDebt');
  const room = loanRoom(state);
  const policy = homeCountry(state).policyRate;
  const spread = loanSpread(state);
  for (const lender of lendersNearYou(state)) {
    const n = rng.int(...c.offersPerLender);
    for (let i = 0; i < n; i++) {
      const amount = roundToStep(room * rng.range(...c.sizeRange), c.amountStep);
      const noise = rng.range(-c.spreadNoise, c.spreadNoise);
      const termWeeks = rng.pick(c.terms);
      if (amount < c.minAmount) continue;
      const rate = policy + clamp(spread + noise, c.spreadBest, c.spreadWorst);
      d.offers.push({
        id: `co_${lender.id}_${week}_${i}`,
        lenderId: lender.id,
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
