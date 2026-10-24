// The Loan Desk (SIMULATION §11): local businesses apply each week with a
// pentagon profile and a hidden PD. The player (or a delegated manager) approves
// at a rate or declines; booked loans amortize and default one by one.
import {
  AWARENESS_FLOOR,
  LOANDESK,
  LOANDESK_BASE,
  LOANDESK_WEIGHTS,
  SBL_BASE_PD,
  SECTOR_DISTRICT_WEIGHT,
  WEEKS_PER_YEAR,
} from '../../config/balance';
import { CITIES } from '../../data/cities';
import { BUSINESS_PREFIXES, LOAN_SECTORS } from '../../data/loanSectors';
import { PRODUCTS } from '../../data/products';
import type { Pentagon } from '../../data/types';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { creditCycle, loanDemand } from '../macro';
import { clamp, roundToStep } from '../math';
import { countryOfCity, ftpShort } from '../rates';
import { stream, type Rng } from '../rng';
import type { Branch, BusinessLoan, GameState, LoanApplication } from '../state';
import { effectiveAwareness, type CampaignEffects } from './marketing';
import { branchPrice } from './pricing';
import { managerOf } from './staff';
import type { BranchWeek } from './week';

type Collateral = LoanApplication['collateral'];

/** Weighted pentagon score (Mgmt, Track, Market, Comp, FinHealth). */
export function pentagonScore(p: Pentagon): number {
  return p.reduce((sum, v, i) => sum + v * (LOANDESK_WEIGHTS[i] ?? 0), 0);
}

/** PD before the credit cycle: 0.025 × exp(−0.22 × (avg − 5)) × collateral factor. */
export function pdFromScore(avg: number, collateral: Collateral): number {
  return SBL_BASE_PD * Math.exp(-LOANDESK.pdSlope * (avg - 5)) * LOANDESK.collateralPd[collateral];
}

/** Estimator skill: the manager's Product skill (a Risk floor adds 40 + 50 × coverage in Stage 4). */
export function estimatorSkill(state: GameState, branch: Branch): number {
  return managerOf(state, branch)?.skills.product ?? 0;
}

/** Whether the player sees a risk band on this branch's applications (§11). */
export function riskBandVisible(state: GameState, branch: Branch): boolean {
  return estimatorSkill(state, branch) >= LOANDESK.riskBandVisibleProduct;
}

export function riskBand(estPd: number): 'low' | 'medium' | 'high' {
  if (estPd < LOANDESK.riskBands.low) return 'low';
  if (estPd < LOANDESK.riskBands.high) return 'medium';
  return 'high';
}

/** New applications, expiry, delegated decisions and booked loans for one branch. */
export function runLoanDesk(
  state: GameState,
  branch: Branch,
  fx: CampaignEffects,
  wk: BranchWeek,
): void {
  const rng = stream(state, 'loanDesk');
  const week = state.clock.week;
  for (const app of Object.values(state.loanDesk.applications)) {
    if (app.branchId === branch.id && week >= app.expiresWeek)
      delete state.loanDesk.applications[app.id];
  }

  const lot = state.world.lots[branch.lotId];
  const country = countryOfCity(state, branch.cityId);
  if (lot && !state.treasury.freeze) {
    const lambda =
      LOANDESK_BASE +
      LOANDESK.bizSlope *
        lot.mix.BIZ *
        (lot.footTraffic / LOANDESK.trafficRef) *
        (AWARENESS_FLOOR + (1 - AWARENESS_FLOOR) * effectiveAwareness(state, branch)) *
        loanDemand(country) *
        fx.loanDesk;
    const n = rng.poisson(lambda);
    for (let i = 0; i < n; i++) {
      const app = generateApplication(state, branch, rng);
      state.loanDesk.applications[app.id] = app;
    }
    wk.underwriting +=
      n * (state.underwriting.models[state.underwriting.activeModelId]?.costPerApp ?? 0);
  }

  if (branch.delegation.loans && branch.managerId) {
    for (const app of Object.values(state.loanDesk.applications)) {
      if (app.branchId === branch.id) decideDelegated(state, branch, app);
    }
  }
  runBusinessLoans(state, branch, wk, rng);
}

function generateApplication(state: GameState, branch: Branch, rng: Rng): LoanApplication {
  const lot = state.world.lots[branch.lotId]!;
  const city = CITIES[branch.cityId]!;
  const country = countryOfCity(state, branch.cityId);
  const small = city.size === 'S' || city.size === 'M';
  const sector = rng.pickWeighted(
    LOAN_SECTORS.filter((s) => small || !s.smallCitiesOnly).map((s) => ({
      item: s,
      weight: s.districts.includes(lot.district)
        ? SECTOR_DISTRICT_WEIGHT.match
        : SECTOR_DISTRICT_WEIGHT.other,
    })),
  );
  const pentagon = sector.profile.map((v) =>
    clamp(Math.round(rng.normal(v, LOANDESK.pentagonSigma)), 1, 10),
  ) as Pentagon;
  if (country.phase === 'recession')
    pentagon[4] = clamp(pentagon[4] + LOANDESK.recessionFinHealth, 1, 10);
  const collateral = rng.pickWeighted<Collateral>(
    (Object.entries(LOANDESK.collateralOdds) as [Collateral, number][]).map(([item, weight]) => ({
      item,
      weight,
    })),
  );
  const avg = pentagonScore(pentagon);
  const amount = clamp(
    Math.round(
      rng.lognormal(
        LOANDESK.amountMedian * lot.incomeIndex * sector.amountMult,
        LOANDESK.amountSigma,
      ) / 1000,
    ) * 1000,
    LOANDESK.amountMin,
    LOANDESK.amountMax,
  );
  const sigma = LOANDESK.estimateSigma * (1 - estimatorSkill(state, branch) / 100);
  return {
    id: newId(state, 'app'),
    branchId: branch.id,
    business: `${rng.pick(BUSINESS_PREFIXES)} ${rng.pick(sector.types)}`,
    sector: sector.id,
    amount,
    termWeeks: rng.int(sector.termYears[0], sector.termYears[1]) * WEEKS_PER_YEAR,
    collateral,
    maxRate:
      ftpShort(country) +
      LOANDESK.maxRateSpread +
      LOANDESK.maxRateSlope * (5 - avg) +
      rng.normal(0, LOANDESK.maxRateSigma),
    pentagon,
    hiddenPd: pdFromScore(avg, collateral),
    lgd: LOANDESK.collateralLgd[collateral],
    estPd: pdFromScore(avg + rng.normal(0, sigma), collateral) * creditCycle(country),
    createdWeek: state.clock.week,
    expiresWeek: state.clock.week + LOANDESK.expiryWeeks,
  };
}

/** Chance the business accepts an offer at rate r (§11). */
export function acceptanceProb(app: LoanApplication, rate: number): number {
  if (rate <= app.maxRate) return LOANDESK.acceptBelowMax;
  return clamp(
    LOANDESK.acceptBelowMax - (LOANDESK.acceptSlope * (rate - app.maxRate)) / LOANDESK.acceptStep,
    0,
    LOANDESK.acceptBelowMax,
  );
}

/** Offers a loan at `rate`; returns whether the business accepted. Removes the application. */
export function offerLoan(state: GameState, app: LoanApplication, rate: number): boolean {
  delete state.loanDesk.applications[app.id];
  const rng = stream(state, 'loanDesk');
  if (!rng.chance(acceptanceProb(app, rate))) return false;
  const r = rate / WEEKS_PER_YEAR;
  const payment =
    r > 0 ? (app.amount * r) / (1 - (1 + r) ** -app.termWeeks) : app.amount / app.termWeeks;
  const loan: BusinessLoan = {
    id: newId(state, 'bl'),
    branchId: app.branchId,
    business: app.business,
    sector: app.sector,
    principal: app.amount,
    balance: app.amount,
    rate,
    pd: app.hiddenPd,
    lgd: app.lgd,
    termWeeks: app.termWeeks,
    weeksLeft: app.termWeeks,
    payment,
    status: 'current',
  };
  state.loanDesk.loans[loan.id] = loan;
  state.treasury.reserves -= app.amount;
  state.underwriting.loansBooked += 1;
  pushEvent(
    state,
    'LOAN_BOOKED',
    { branchId: app.branchId, business: app.business, amount: app.amount, rate },
    3,
    app.branchId,
  );
  return true;
}

/** A delegated manager approves when the estimated PD clears the appetite threshold (§11). */
function decideDelegated(state: GameState, branch: Branch, app: LoanApplication): void {
  const threshold = LOANDESK.delegatedThresholds[state.company.riskAppetite - 1] ?? 0;
  if (app.estPd > threshold) {
    delete state.loanDesk.applications[app.id];
    return;
  }
  const country = countryOfCity(state, branch.cityId);
  const spec = PRODUCTS.sbl!;
  const rate = roundToStep(
    Math.max(
      branchPrice(state, branch, 'sbl'),
      ftpShort(country) + app.estPd * app.lgd + LOANDESK.delegatedMargin,
    ),
    spec.step,
  );
  offerLoan(state, app, rate);
}

/** Amortizes and defaults each booked business loan; keeps the SBL book's totals. */
function runBusinessLoans(state: GameState, branch: Branch, wk: BranchWeek, rng: Rng): void {
  const country = countryOfCity(state, branch.cityId);
  const cycle = creditCycle(country);
  const spec = PRODUCTS.sbl!;
  let count = 0;
  let balance = 0;
  let defaulted = 0;
  for (const loan of Object.values(state.loanDesk.loans)) {
    if (loan.branchId !== branch.id || loan.status !== 'current') continue;
    if (rng.chance((loan.pd * cycle) / WEEKS_PER_YEAR)) {
      const loss = loan.balance * loan.lgd;
      wk.losses += loss;
      state.treasury.reserves += loan.balance - loss;
      defaulted += loan.balance;
      if (loan.balance >= LOANDESK.bigDefault) {
        pushEvent(
          state,
          'BIG_DEFAULT',
          { business: loan.business, sector: loan.sector, amount: loan.balance },
          2,
          branch.id,
        );
      }
      loan.balance = 0;
      loan.status = 'defaulted';
      continue;
    }
    const interest = (loan.balance * loan.rate) / WEEKS_PER_YEAR;
    const principal =
      loan.weeksLeft <= 1
        ? loan.balance
        : Math.min(loan.balance, Math.max(0, loan.payment - interest));
    wk.loanInterest += interest;
    wk.fundingCharge += (loan.balance * ftpShort(country)) / WEEKS_PER_YEAR;
    loan.balance -= principal;
    loan.weeksLeft -= 1;
    state.treasury.reserves += principal;
    if (loan.balance <= LOANDESK.dustBalance || loan.weeksLeft <= 0) {
      loan.balance = 0;
      loan.status = 'repaid';
      continue;
    }
    count += 1;
    balance += loan.balance;
  }
  wk.servicing += count * spec.servicing;
  const book = branch.books.sbl;
  if (book) {
    book.accounts = count;
    book.balance = balance;
    book.last.defaulted = defaulted;
  }
}

/** Removes finished loans from state to keep saves small. */
export function pruneLoans(state: GameState): void {
  for (const loan of Object.values(state.loanDesk.loans)) {
    if (loan.status !== 'current') delete state.loanDesk.loans[loan.id];
  }
}
