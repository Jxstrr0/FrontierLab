// The Loan Desk (SIMULATION §11): local businesses apply each week with a
// pentagon profile and a hidden PD. The player (or a delegated manager) approves
// at a rate or declines; booked loans amortize and default one by one.
import {
  HQ_EFFECTS,
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
import { riskPdMult, shortfall } from '../hq';
import { recordLoss } from '../riskFloor';
import { appCost } from '../underwriting';
import { delegationOn } from '../execSeats';
import { newId } from '../ids';
import { creditCycle, loanDemand } from '../macro';
import { clamp, roundToStep } from '../math';
import { countryOfCity, ftpShort } from '../rates';
import { stream, type Rng } from '../rng';
import type { Branch, BusinessLoan, DeskWeek, GameState, LoanApplication } from '../state';
import { effectiveAwareness, type CampaignEffects } from './marketing';
import { branchPrice } from './pricing';
import { raiseIncident } from '../incidents';
import { managerOf } from './staff';
import type { BranchWeek } from './week';
import { difficultyOf } from '../difficulty';
import { dexp, dpow } from '../detmath';

type Collateral = LoanApplication['collateral'];

/** Weighted pentagon score (Mgmt, Track, Market, Comp, FinHealth). */
export function pentagonScore(p: Pentagon): number {
  return p.reduce((sum, v, i) => sum + v * (LOANDESK_WEIGHTS[i] ?? 0), 0);
}

/** PD before the credit cycle: 0.025 × exp(−0.22 × (avg − 5)) × collateral factor. */
export function pdFromScore(avg: number, collateral: Collateral): number {
  return SBL_BASE_PD * dexp(-LOANDESK.pdSlope * (avg - 5)) * LOANDESK.collateralPd[collateral];
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

/** Counts a Loan Desk outcome in the branch's tally for the current week. */
export function recordDesk(
  state: GameState,
  branchId: string,
  what: Exclude<keyof DeskWeek, 'week'>,
): void {
  const branch = state.branches[branchId];
  if (!branch) return;
  if (branch.desk.week !== state.clock.week) {
    branch.desk = { week: state.clock.week, approved: 0, refused: 0, declined: 0, expired: 0 };
  }
  branch.desk[what] += 1;
}

/** This week's Loan Desk outcomes for a branch (zeros if nothing happened yet). */
export function deskWeek(state: GameState, branch: Branch): DeskWeek {
  return branch.desk.week === state.clock.week
    ? branch.desk
    : { week: state.clock.week, approved: 0, refused: 0, declined: 0, expired: 0 };
}

/**
 * Every booked business loan grouped by branch, in booking order. The weekly
 * tick builds it once so each branch walks only its own loans (a bank with
 * hundreds of branches across cities holds thousands of loans).
 */
export function loansByBranch(state: GameState): Map<string, BusinessLoan[]> {
  const out = new Map<string, BusinessLoan[]>();
  for (const loan of Object.values(state.loanDesk.loans)) {
    const list = out.get(loan.branchId);
    if (list) list.push(loan);
    else out.set(loan.branchId, [loan]);
  }
  return out;
}

/**
 * New applications, expiry, delegated decisions and booked loans for one
 * branch. `loans` is this branch's entry in loansByBranch, when the caller has one.
 */
export function runLoanDesk(
  state: GameState,
  branch: Branch,
  fx: CampaignEffects,
  wk: BranchWeek,
  loans?: BusinessLoan[],
): void {
  const rng = stream(state, 'loanDesk');
  const week = state.clock.week;
  for (const app of Object.values(state.loanDesk.applications)) {
    if (app.branchId === branch.id && week >= app.expiresWeek) {
      delete state.loanDesk.applications[app.id];
      recordDesk(state, branch.id, 'expired');
    }
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
    wk.underwriting += n * appCost(state);
  }

  // A delegated manager decides, or else the CRO's Loan Desk policy (§17.2).
  const booked: BusinessLoan[] = [];
  if ((branch.delegation.loans && branch.managerId) || delegationOn(state, 'cro', 'loanPolicy')) {
    for (const app of Object.values(state.loanDesk.applications)) {
      if (app.branchId !== branch.id) continue;
      const loan = decideDelegated(state, branch, app);
      if (loan) booked.push(loan);
    }
  }
  // Same loans in the same order as a scan of every loan: earlier bookings, then this week's.
  const mine = loans
    ? [...loans, ...booked]
    : Object.values(state.loanDesk.loans).filter((l) => l.branchId === branch.id);
  runBusinessLoans(state, branch, wk, rng, mine);
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
  const sigma =
    LOANDESK.estimateSigma *
    (1 - estimatorSkill(state, branch) / 100) *
    (1 + HQ_EFFECTS.riskEstimate * shortfall(state, 'risk'));
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
    hiddenPd: pdFromScore(avg, collateral) * difficultyOf(state).lossMult,
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
  return bookOffer(state, app, rate) !== undefined;
}

/** offerLoan's work: the booked loan, or undefined when the business refused. */
function bookOffer(state: GameState, app: LoanApplication, rate: number): BusinessLoan | undefined {
  delete state.loanDesk.applications[app.id];
  const rng = stream(state, 'loanDesk');
  if (!rng.chance(acceptanceProb(app, rate))) {
    recordDesk(state, app.branchId, 'refused');
    return undefined;
  }
  recordDesk(state, app.branchId, 'approved');
  const r = rate / WEEKS_PER_YEAR;
  const payment =
    r > 0 ? (app.amount * r) / (1 - dpow(1 + r, -app.termWeeks)) : app.amount / app.termWeeks;
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
  return loan;
}

/**
 * A delegated manager approves when the estimated PD clears the appetite
 * threshold (§11). Returns the loan when one is booked.
 */
function decideDelegated(
  state: GameState,
  branch: Branch,
  app: LoanApplication,
): BusinessLoan | undefined {
  const threshold = LOANDESK.delegatedThresholds[state.company.riskAppetite - 1] ?? 0;
  if (app.estPd > threshold) {
    delete state.loanDesk.applications[app.id];
    recordDesk(state, branch.id, 'declined');
    return undefined;
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
  return bookOffer(state, app, rate);
}

/** Amortizes and defaults each of the branch's booked business loans; keeps the SBL book's totals. */
function runBusinessLoans(
  state: GameState,
  branch: Branch,
  wk: BranchWeek,
  rng: Rng,
  loans: BusinessLoan[],
): void {
  const country = countryOfCity(state, branch.cityId);
  const cycle = creditCycle(country);
  const spec = PRODUCTS.sbl!;
  let count = 0;
  let balance = 0;
  let defaulted = 0;
  for (const loan of loans) {
    if (loan.status !== 'current') continue;
    const hit = rng.chance((loan.pd * cycle * riskPdMult(state)) / WEEKS_PER_YEAR);
    recordLoss(state, 'sbl', {
      balance: loan.balance,
      defaulted: hit ? loan.balance : 0,
      loss: hit ? loan.balance * loan.lgd : 0,
      pd: loan.pd,
      lgd: loan.lgd,
    });
    if (hit) {
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
        raiseIncident(state, 'BIG_DEFAULT', 'branch', branch.id, {
          business: loan.business,
          sector: loan.sector,
          amount: loan.balance,
        });
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
