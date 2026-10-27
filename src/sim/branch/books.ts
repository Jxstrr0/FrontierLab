// Sales office books (SIMULATION §10): one Book per product. Plans and usage
// products (stage C3a) keep their ARR in `balance`, priced at `bookRate`, and
// bill a 52nd of it each week; nothing touches the balance sheet. The bank
// paths below (deposits, loans, wealth, services) no longer have products in
// the catalog and go in stage C3c. Income and costs go into the BranchWeek.
import {
  ADVERSE,
  APPROVAL_FLOOR_FOR_APPS,
  GIC_RENEW_BASE,
  GIC_RENEW_CAP,
  INTEREST_PERIODS,
  INTERCHANGE,
  FX_PER_CUSTOMER,
  MODEL_PD,
  MORTGAGE_REPRICE_WEEKS,
  OVERALL_CHURN,
  PREPAY_BASE,
  PREPAY_REFI,
  PRODUCTS_PER_CUSTOMER,
  RECESSION_DRAW_MULT,
  REO_LTV,
  REVOLVING_EMA,
  RISK_APPETITE,
  STUDENT_CONVERSION,
  WEALTH_MARKET_BETA,
  WEEKS_PER_YEAR,
} from '../../config/balance';
import { CITIES } from '../../data/cities';
import { isRecurring, needsApproval, PRODUCTS, type ProductSpec } from '../../data/products';
import { SEGMENTS } from '../../data/types';
import { creditCycle, depositGrowth, mortgageLgdMult, nominalWeeklyGrowth } from '../macro';
import { nominalIndex } from '../nominal';
import { clamp } from '../math';
import { countryOfCity, ftpFor, marketRef } from '../rates';
import type { Book, Branch, CountryState, GameState } from '../state';
import { riskPdMult } from '../hq';
import { recordLoss } from '../riskFloor';
import { activeModel, appCost, RADAR } from '../underwriting';
import type { DemandResult, Origination } from './demand';
import { signupChurnMult, type CampaignEffects } from './marketing';
import { branchPrice, churnGap, isOffered, priceFactor } from './pricing';
import type { BranchWeek } from './week';
import { difficultyOf } from '../difficulty';
import { bankRunMult } from '../incident/effects';
import { allProducts, baseId } from '../products';

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
  country: CountryState;
  wk: BranchWeek;
  fx: CampaignEffects;
  creditCycle: number;
  /** Risk floor shortfall: PD × (1 + 0.4(1 − k′)) (CONTENT §9). */
  riskPd: number;
}

export function runBooks(
  state: GameState,
  branch: Branch,
  demand: DemandResult,
  fx: CampaignEffects,
  wk: BranchWeek,
): void {
  const country = countryOfCity(state, branch.cityId);
  const ctx: Ctx = {
    state,
    branch,
    country,
    wk,
    fx,
    creditCycle: creditCycle(country),
    riskPd: riskPdMult(state),
  };
  let applications = 0;

  for (const spec of allProducts(state)) {
    if (spec.kind === 'sbl' || spec.kind === 'fx') continue;
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
    if (isRecurring(spec)) runRecurring(ctx, spec, book, orig);
    else if (spec.kind === 'deposit') {
      if (spec.termWeeks) runTermDeposit(ctx, spec, book, orig);
      else runDeposit(ctx, spec, book, orig);
    } else if (spec.kind === 'amortizing') runAmortizing(ctx, spec, book, orig);
    else if (spec.kind === 'revolving') runRevolving(ctx, spec, book, orig);
    else if (spec.kind === 'wealth') runWealth(ctx, spec, book, orig);
    else if (spec.kind === 'safebox') runSafeBox(ctx, spec, book, orig);
    book.last.deltaAccounts = book.accounts - before;
    if (needsApproval(spec)) {
      applications += orig.newAccounts / Math.max(orig.approval, APPROVAL_FLOOR_FOR_APPS);
      state.underwriting.loansBooked += orig.newAccounts;
    }
    // Plans and usage run on compute (C3b); the old bank books still pay servicing.
    if (isRecurring(spec)) wk.compute += book.accounts * spec.servicing;
    else wk.servicing += book.accounts * spec.servicing;
  }

  convertFreeTiers(state, branch);
  convertStudents(branch);
  runFx(ctx);

  // §10.6 underwriting cost and per-account campaign costs (Paperless Pledge)
  wk.underwriting += applications * appCost(state);
  const accounts = Object.values(branch.books).reduce((sum, b) => sum + b.accounts, 0);
  wk.marketing += accounts * fx.perAccount;
  branch.customers = Math.round(accounts / PRODUCTS_PER_CUSTOMER);
}

const perWeek = (annual: number) => annual / WEEKS_PER_YEAR;

/** Mix-weighted average price factor for a product at this lot. */
function avgPriceFactor(ctx: Ctx, spec: ProductSpec, price: number, m: number): number {
  const lot = ctx.state.world.lots[ctx.branch.lotId];
  if (!lot) return 1;
  return SEGMENTS.reduce((sum, s) => sum + lot.mix[s] * priceFactor(spec, s, price, m), 0);
}

function moveReserves(ctx: Ctx, amount: number): void {
  ctx.state.treasury.reserves += amount;
}

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
  const m = marketRef(state, branch.cityId, spec.id);
  const periods = periodsPerYear(spec);
  const k =
    perWeek(spec.churn) *
    (1 + (spec.rateChurnSens ?? 0) * churnGap(spec, price, m)) *
    (1 + OVERALL_CHURN.slope * Math.max(0, OVERALL_CHURN.pivot - branch.ratings.overall)) *
    signupChurnMult(branch) *
    bankRunMult(state);
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
    if (price > 0) wk.compute += ((spec.unitCost ?? 0) * book.balance) / (price * WEEKS_PER_YEAR);
  }
  book.bookRate = price;
  const revenue = perWeek(book.balance);
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

// ─── Deposits (§10.1) ─────────────────────────────────────────────────────────

function runDeposit(ctx: Ctx, spec: ProductSpec, book: Book, orig: Origination): void {
  const { state, branch, wk } = ctx;
  const price = branchPrice(state, branch, spec.id);
  const m = marketRef(state, branch.cityId, spec.id);
  book.balance += orig.newVolume;
  book.accounts += orig.newAccounts;
  moveReserves(ctx, orig.newVolume);
  book.bookRate = spec.priceType === 'rate' ? price : (spec.payRate ?? 0);

  // Organic growth (chequing) plus the drift of every balance with incomes (§4.6).
  const organic =
    book.balance *
    (((spec.organic ?? 0) * depositGrowth(ctx.country)) / WEEKS_PER_YEAR +
      nominalWeeklyGrowth(ctx.country));
  book.balance += organic;
  moveReserves(ctx, organic);

  const k =
    perWeek(spec.churn) *
    (1 + (spec.rateChurnSens ?? 0) * churnGap(spec, price, m)) *
    (1 + OVERALL_CHURN.slope * Math.max(0, OVERALL_CHURN.pivot - branch.ratings.overall)) *
    signupChurnMult(branch) *
    bankRunMult(state); // runMult during a bank run (§13.8)
  const out = book.balance * k;
  book.balance -= out;
  book.last.churned = book.accounts * k;
  book.accounts -= book.last.churned;
  moveReserves(ctx, -out);

  wk.depositInterest += perWeek(book.balance * book.bookRate);
  if (spec.priceType === 'feeMonthly')
    wk.accountFees += (price * book.accounts * INTEREST_PERIODS.monthsPerYear) / WEEKS_PER_YEAR;
  wk.fundingCredit += perWeek(book.balance * ftpFor(spec, ctx.country));
}

/** GICs: a 52-week term, 1/52 maturing each week with a renewal chance. */
function runTermDeposit(ctx: Ctx, spec: ProductSpec, book: Book, orig: Origination): void {
  const { state, branch, wk } = ctx;
  const price = branchPrice(state, branch, spec.id);
  const m = marketRef(state, branch.cityId, spec.id);
  if (orig.newVolume > 0) {
    book.bookRate =
      (book.balance * book.bookRate + orig.newVolume * price) / (book.balance + orig.newVolume);
  }
  book.balance += orig.newVolume;
  book.accounts += orig.newAccounts;
  moveReserves(ctx, orig.newVolume);

  if (book.balance > 0) {
    const maturing = book.balance / (spec.termWeeks ?? WEEKS_PER_YEAR);
    const renewProb = isOffered(branch, spec.id)
      ? clamp(GIC_RENEW_BASE * avgPriceFactor(ctx, spec, price, m), 0, GIC_RENEW_CAP)
      : 0;
    const renewed = maturing * renewProb;
    const leaving = maturing - renewed;
    const frac = leaving / book.balance;
    book.bookRate =
      ((book.balance - maturing) * book.bookRate + renewed * price) / (book.balance - leaving);
    book.balance -= leaving;
    book.last.churned = book.accounts * frac;
    book.accounts -= book.last.churned;
    moveReserves(ctx, -leaving);
  }
  wk.depositInterest += perWeek(book.balance * book.bookRate);
  wk.fundingCredit += perWeek(book.balance * ftpFor(spec, ctx.country));
}

/** 8% of student accounts a year graduate to chequing, keeping their balances. */
function convertStudents(branch: Branch): void {
  const student = branch.books.student;
  const chequing = branch.books.chequing;
  if (!student || !chequing || student.accounts <= 0) return;
  const frac = perWeek(STUDENT_CONVERSION);
  const acc = student.accounts * frac;
  const bal = student.balance * frac;
  student.accounts -= acc;
  student.balance -= bal;
  chequing.accounts += acc;
  chequing.balance += bal;
}

// ─── Loans (§10.2, §10.3) ─────────────────────────────────────────────────────

/** PD of new loans: model, appetite and adverse selection (§10.2). */
export function newLoanPd(state: GameState, spec: ProductSpec, price: number, m: number): number {
  const model = activeModel(state);
  const appetite = state.company.riskAppetite - 1;
  const adverse = Math.max(
    ADVERSE.floor,
    1 +
      ADVERSE.above * Math.max(0, (price - m) / ADVERSE.step) -
      ADVERSE.below * Math.max(0, (m - price) / ADVERSE.step),
  );
  return (
    (spec.basePd ?? 0) *
    (RISK_APPETITE.pdMult[appetite] ?? 1) *
    difficultyOf(state).lossMult *
    (MODEL_PD.base - MODEL_PD.accuracy * model.radar[RADAR.accuracy]) *
    (1 + MODEL_PD.inclusion * (model.radar[RADAR.inclusion] - 5)) *
    adverse
  );
}

/** Weighted blend of an existing balance's rate with new volume at a new rate. */
const blend = (bal: number, rate: number, add: number, addRate: number) =>
  bal + add > 0 ? (bal * rate + add * addRate) / (bal + add) : addRate;

function defaults(ctx: Ctx, spec: ProductSpec, book: Book): void {
  const dRate = (book.pd * ctx.creditCycle * ctx.riskPd) / WEEKS_PER_YEAR;
  const defaulted = book.balance * dRate;
  const isMortgage = baseId(spec) === 'mortgage';
  const lgdMult = isMortgage ? mortgageLgdMult(ctx.country) : 1;
  const loss = Math.min(defaulted, defaulted * book.lgd * lgdMult);
  const recovery = defaulted - loss;
  recordLoss(ctx.state, spec.id, {
    balance: book.balance,
    defaulted,
    loss,
    pd: book.pd,
    lgd: Math.min(1, book.lgd * lgdMult),
  });
  book.balance -= defaulted;
  book.accounts -= book.accounts * dRate;
  book.last.defaulted = defaulted;
  ctx.wk.losses += loss;
  if (isMortgage) addReo(ctx, recovery);
  else moveReserves(ctx, recovery);
}

function addReo(ctx: Ctx, value: number): void {
  if (value <= 0) return;
  const cityId = ctx.branch.cityId;
  const country = CITIES[cityId]?.country;
  const hpi = (country && ctx.state.world.countries[country]?.hpi) || 100;
  const pool = (ctx.state.reo[cityId] ??= { units: 0, value: 0, mode: 'rent', hpiRef: hpi });
  const homeValue =
    ((PRODUCTS.mortgage?.ticket ?? 1) * (CITIES[cityId]?.incomeIndex ?? 1)) / REO_LTV;
  pool.value += value;
  pool.units += value / homeValue;
}

function runAmortizing(ctx: Ctx, spec: ProductSpec, book: Book, orig: Origination): void {
  const { state, branch, wk } = ctx;
  const price = branchPrice(state, branch, spec.id);
  const m = marketRef(state, branch.cityId, spec.id);
  if (orig.newVolume > 0) {
    book.pd = blend(book.balance, book.pd, orig.newVolume, newLoanPd(state, spec, price, m));
    book.bookRate = blend(book.balance, book.bookRate, orig.newVolume, price);
    book.balance += orig.newVolume;
    book.accounts += orig.newAccounts;
    moveReserves(ctx, -orig.newVolume);
    wk.originationFees += orig.newVolume * (spec.originationFee ?? 0);
  }
  book.lgd = spec.lgd ?? 0;
  // Loan balances drift with incomes like deposits (§4.6): borrowers refinance and
  // top up as the price level rises, so the loan-to-deposit ratio holds.
  const drift = book.balance * nominalWeeklyGrowth(ctx.country);
  book.balance += drift;
  moveReserves(ctx, -drift);

  if (book.balance > 0) {
    const principal = book.balance / (spec.termWeeks ?? WEEKS_PER_YEAR);
    const prepayRate =
      baseId(spec) === 'mortgage' || baseId(spec) === 'auto_loan'
        ? PREPAY_BASE +
          PREPAY_REFI.slope *
            Math.max(0, (book.bookRate - m - PREPAY_REFI.threshold) / ADVERSE.step)
        : 0;
    const out = Math.min(book.balance, principal + book.balance * prepayRate);
    book.accounts *= 1 - out / book.balance;
    book.balance -= out;
    moveReserves(ctx, out);
  }
  if (baseId(spec) === 'mortgage')
    book.bookRate += (price - book.bookRate) / MORTGAGE_REPRICE_WEEKS;
  defaults(ctx, spec, book);
  wk.loanInterest += perWeek(book.balance * book.bookRate);
  wk.fundingCharge += perWeek(book.balance * ftpFor(spec, ctx.country));
}

function runRevolving(ctx: Ctx, spec: ProductSpec, book: Book, orig: Origination): void {
  const { state, branch, wk } = ctx;
  const price = branchPrice(state, branch, spec.id);
  const m = marketRef(state, branch.cityId, spec.id);
  const lot = state.world.lots[branch.lotId];
  if (orig.newAccounts > 0) {
    book.pd = blend(book.balance, book.pd, orig.newVolume, newLoanPd(state, spec, price, m));
    book.accounts += orig.newAccounts;
  }
  book.lgd = spec.lgd ?? 0;
  book.last.churned = book.accounts * perWeek(spec.churn);
  book.accounts -= book.last.churned;
  defaults(ctx, spec, book);

  const level = nominalIndex(state, branch.cityId);
  const target =
    book.accounts *
    spec.ticket *
    (lot?.incomeIndex ?? 1) *
    level *
    (ctx.country.phase === 'recession' ? RECESSION_DRAW_MULT : 1);
  const next = book.balance + REVOLVING_EMA * (target - book.balance);
  moveReserves(ctx, -(next - book.balance));
  book.balance = next;
  book.bookRate = price;

  wk.loanInterest += perWeek(book.balance * price);
  wk.fundingCharge += perWeek(book.balance * ftpFor(spec, ctx.country));
  // Card spend and annual fees are quoted at today's price level too (§4.6).
  if (spec.spendPerMonth) {
    wk.cardFees +=
      (book.accounts *
        spec.spendPerMonth *
        level *
        INTEREST_PERIODS.monthsPerYear *
        (spec.interchange ?? INTERCHANGE)) /
      WEEKS_PER_YEAR;
  }
  if (spec.annualFee) wk.cardFees += perWeek(book.accounts * spec.annualFee * level);
}

// ─── Wealth and services (§10.4, §10.5) ───────────────────────────────────────

function runWealth(ctx: Ctx, spec: ProductSpec, book: Book, orig: Origination): void {
  const { state, branch, wk } = ctx;
  book.balance += orig.newVolume;
  book.accounts += orig.newAccounts;
  book.balance *= 1 + WEALTH_MARKET_BETA * ctx.country.marketReturn;
  const k =
    perWeek(spec.churn) *
    (1 + OVERALL_CHURN.slope * Math.max(0, OVERALL_CHURN.pivot - branch.ratings.service));
  book.balance -= book.balance * k;
  book.last.churned = book.accounts * k;
  book.accounts -= book.last.churned;
  wk.wealthFees += perWeek(book.balance * branchPrice(state, branch, spec.id));
}

function runSafeBox(ctx: Ctx, spec: ProductSpec, book: Book, orig: Origination): void {
  const { state, branch, wk } = ctx;
  book.accounts += orig.newAccounts;
  book.last.churned = book.accounts * perWeek(spec.churn);
  book.accounts -= book.last.churned;
  wk.serviceFees += perWeek(book.accounts * branchPrice(state, branch, spec.id));
}

/** FX & Wires: volume-based, no accounts (§10.5). */
function runFx(ctx: Ctx): void {
  const { state, branch, wk } = ctx;
  const spec = PRODUCTS.fx;
  if (!spec || !isOffered(branch, spec.id)) return;
  const lot = state.world.lots[branch.lotId];
  const price = branchPrice(state, branch, spec.id);
  const m = marketRef(state, branch.cityId, spec.id);
  const volume =
    branch.customers *
    FX_PER_CUSTOMER *
    (lot?.incomeIndex ?? 1) *
    avgPriceFactor(ctx, spec, price, m);
  wk.serviceFees += perWeek(volume * price);
}
