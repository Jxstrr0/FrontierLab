// Sales office books (SIMULATION §10): one Book per product. Plans and usage
// products keep their ARR in `balance`, priced at `bookRate`, and bill a 52nd
// of it each week; nothing touches the balance sheet. The bank's deposit,
// loan, wealth and service paths were removed in stage C3c. Business loans run
// on the Loan Desk (loanDesk.ts). Income and costs go into the BranchWeek.
import {
  INTEREST_PERIODS,
  OVERALL_CHURN,
  PRODUCTS_PER_CUSTOMER,
  WEEKS_PER_YEAR,
} from '../../config/balance';
import { isRecurring, type ProductSpec } from '../../data/products';
import { marketRef } from '../rates';
import type { Book, Branch, GameState } from '../state';
import type { DemandResult, Origination } from './demand';
import { signupChurnMult, type CampaignEffects } from './marketing';
import { branchPrice, churnGap, isOffered } from './pricing';
import type { BranchWeek } from './week';
import { bankRunMult, isPulled } from '../incident/effects';
import { outageChurnMult } from '../compute';
import { allProducts } from '../products';
import { inferenceMult, modelCostPerCustomer, priceHeadroom } from '../underwriting';

const NONE: Origination = { newAccounts: 0, newVolume: 0, approval: 1 };

export function emptyBook(): Book {
  return {
    accounts: 0,
    balance: 0,
    bookRate: 0,
    pd: 0,
    lgd: 0,
    last: { newAccounts: 0, newVolume: 0, deltaAccounts: 0, churned: 0, defaulted: 0 },
  };
}

interface Ctx {
  state: GameState;
  branch: Branch;
  wk: BranchWeek;
}

export function runBooks(
  state: GameState,
  branch: Branch,
  demand: DemandResult,
  fx: CampaignEffects,
  wk: BranchWeek,
): void {
  const ctx: Ctx = { state, branch, wk };

  for (const spec of allProducts(state)) {
    if (!isRecurring(spec)) continue;
    const book = (branch.books[spec.id] ??= emptyBook());
    const before = book.accounts;
    const orig = demand.byProduct[spec.id] ?? NONE;
    book.last = {
      newAccounts: orig.newAccounts,
      newVolume: orig.newVolume,
      deltaAccounts: 0,
      churned: 0,
      defaulted: 0,
    };
    runRecurring(ctx, spec, book, orig);
    book.last.deltaAccounts = book.accounts - before;
    // Plans and usage run on compute (C3b), less with an efficient model (C6a).
    wk.compute += book.accounts * spec.servicing * inferenceMult(state);
  }

  convertFreeTiers(state, branch);

  // Per-account campaign costs (Paperless Pledge)
  const accounts = Object.values(branch.books).reduce((sum, b) => sum + b.accounts, 0);
  wk.marketing += accounts * fx.perAccount;
  branch.customers = Math.round(accounts / PRODUCTS_PER_CUSTOMER);
  // The model's data licences, per customer (C6a).
  wk.underwriting += perWeek(branch.customers * modelCostPerCustomer(state));
}

const perWeek = (annual: number) => annual / WEEKS_PER_YEAR;

// ─── Plans and usage (§10.7, C3a) ─────────────────────────────────────────────

/** Billing periods a year behind a price: 12 for monthly fees and usage, 1 for annual fees. */
export function periodsPerYear(spec: ProductSpec): number {
  return spec.priceType === 'feeAnnual' ? 1 : INTEREST_PERIODS.monthsPerYear;
}

/**
 * Plans count seats in `accounts` and re-bill every seat at today's price;
 * usage products keep ARR, re-scaled when the price changes, and grow as
 * customers build on them. Churn follows price, the overall rating and
 * sign-up quality like deposit churn did.
 */
function runRecurring(ctx: Ctx, spec: ProductSpec, book: Book, orig: Origination): void {
  const { state, branch, wk } = ctx;
  const price = branchPrice(state, branch, spec.id);
  // §16.7 (C6a): churn compares the price with the market the model allows.
  const m = marketRef(state, branch.cityId, spec.id) * priceHeadroom(state);
  const periods = periodsPerYear(spec);
  const k =
    perWeek(spec.churn) *
    (1 + (spec.rateChurnSens ?? 0) * churnGap(spec, price, m)) *
    (1 + OVERALL_CHURN.slope * Math.max(0, OVERALL_CHURN.pivot - branch.ratings.overall)) *
    signupChurnMult(branch) *
    bankRunMult(state) *
    outageChurnMult(state);
  if (spec.kind === 'plan') {
    // Seats sign up as the "volume" of a plan, so a Team sign-up brings its whole team.
    book.last.newAccounts = orig.newVolume;
    book.accounts += orig.newVolume;
    book.last.churned = book.accounts * k;
    book.accounts -= book.last.churned;
    book.balance = book.accounts * price * periods;
  } else {
    if (book.bookRate > 0) book.balance *= price / book.bookRate;
    book.balance += orig.newVolume * price * periods;
    book.accounts += orig.newAccounts;
    book.balance *= 1 + perWeek(spec.organic ?? 0);
    book.last.churned = book.accounts * k;
    book.accounts -= book.last.churned;
    book.balance -= book.balance * k;
    // Compute behind the usage: units used this week × cost per unit.
    if (price > 0)
      wk.compute +=
        ((spec.unitCost ?? 0) * book.balance * inferenceMult(state)) / (price * WEEKS_PER_YEAR);
  }
  book.bookRate = price;
  // §23: a product pulled from sale (DEEPFAKE) bills nothing while it is off the shelf.
  const revenue = isPulled(state, branch.id, spec.id) ? 0 : perWeek(book.balance);
  if (spec.category === 'deposits') wk.accountFees += revenue;
  else if (spec.category === 'lending') wk.serviceFees += revenue;
  else wk.cardFees += revenue;
}

/** Free tiers upgrade a share of their users each year to the paid plan, when it's offered (A8). */
function convertFreeTiers(state: GameState, branch: Branch): void {
  for (const spec of allProducts(state)) {
    if (!spec.convertsTo || !spec.conversion) continue;
    const from = branch.books[spec.id];
    const to = branch.books[spec.convertsTo];
    if (!from || !to || from.accounts <= 0 || !isOffered(branch, spec.convertsTo)) continue;
    const moving = from.accounts * perWeek(spec.conversion);
    from.accounts -= moving;
    to.accounts += moving;
  }
}
