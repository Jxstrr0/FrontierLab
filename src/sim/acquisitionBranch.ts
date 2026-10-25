// Turns an acquired rival branch into one of yours (SIMULATION §19.8, DESIGN
// §5.10). It stays on its lot and opens at once under your name, still wearing
// the old brand while it converts: the seller strategy's fit-out
// (ACQUIRED_BUILDS), a full staff, the old manager kept with delegation on,
// your products at company or default prices, and books seeded from its
// aggregate deposits and loans split by a mature product mix. Balances are
// booked by acquisition.ts, which pairs them with treasury reserves.
import { MERGERS, PRODUCTS_PER_CUSTOMER, START_STAFF_MORALE, WAGE_STEP } from '../config/balance';
import { EQUIPMENT } from '../data/equipment';
import { ACQUIRED_BUILDS, ACQUIRED_DEPOSIT_MIX, ACQUIRED_LOAN_MIX } from '../data/mergers';
import { PRODUCTS, type ProductSpec } from '../data/products';
import { splitByMix } from './acquisitionPlan';
import { emptyBook } from './branch/books';
import { companyPrice } from './branch/pricing';
import { marketWage, skillTarget, staffNeeded } from './branch/staff';
import { defaultName } from './commands/branches';
import { seedCountryPrices } from './commands/products';
import { newId } from './ids';
import { clamp, roundToStep } from './math';
import { generateManager } from './people';
import { allProducts } from './products';
import { countryOfCity, defaultPrice, marketRef } from './rates';
import type { Rng } from './rng';
import { overallOf } from './rivals';
import type { Book, Branch, GameState, RivalBank, RivalBranch } from './state';

/** Which of your products an acquired branch offers: everything it can serve (its customers had them). */
function startsOn(state: GameState, spec: ProductSpec, branch: Branch): boolean {
  const offices = EQUIPMENT[branch.build.lobby]?.advisorOffices ?? 0;
  const boxes = EQUIPMENT[branch.build.vault]?.boxes ?? 0;
  let on = true;
  if (spec.kind === 'wealth') on = offices > 0 || spec.noAdvisorOffice === true;
  if (spec.kind === 'safebox') on = boxes > 0;
  if (spec.base) on = false;
  const lineup = state.company.companyOffered?.[spec.id];
  return lineup ?? on;
}

/** Your price for a product: the HQ price when Apply-to-all is on, else the default. */
function startPrice(state: GameState, spec: ProductSpec, cityId: string): number {
  const hq = state.company.applyRatesToAll ? companyPrice(state, cityId, spec.id) : undefined;
  return hq ?? roundToStep(defaultPrice(spec, countryOfCity(state, cityId)), spec.step);
}

/**
 * A book seeded with an acquired balance: accounts from typical ticket sizes
 * (× the lot's income), rates at today's market reference (fee accounts at
 * their pay rate), PD and LGD from the product defaults.
 */
function seededBook(
  state: GameState,
  spec: ProductSpec,
  cityId: string,
  balance: number,
  income: number,
): Book {
  const book = emptyBook();
  if (balance <= 0) return book;
  book.balance = balance;
  book.accounts = balance / Math.max(1, spec.ticket * income);
  book.bookRate =
    spec.priceType === 'rate' ? marketRef(state, cityId, spec.id) : (spec.payRate ?? 0);
  book.pd = spec.basePd ?? 0;
  book.lgd = spec.lgd ?? 0;
  return book;
}

/** Builds and registers your branch on a rival branch's lot; returns its id. */
export function convertRivalBranch(
  state: GameState,
  bank: RivalBank,
  rb: RivalBranch,
  loanFactor: number,
  rng: Rng,
): string {
  const lot = state.world.lots[rb.lotId]!;
  const id = newId(state, 'br');
  const income = lot.incomeIndex;
  const branch: Branch = {
    id,
    cityId: rb.cityId,
    lotId: lot.id,
    name: defaultName(state, lot.district, rb.cityId),
    builtDay: state.clock.day,
    openedWeek: state.clock.week,
    status: 'open',
    build: { ...ACQUIRED_BUILDS[bank.strategy] },
    lease: { weeklyRent: lot.weeklyRent, deposit: lot.deposit },
    staff: {
      count: 0,
      target: 0,
      wage: roundToStep(marketWage(rb.cityId), WAGE_STEP),
      skill: 0,
      morale: Math.max(0, START_STAFF_MORALE - MERGERS.moraleHit),
      quitAccumulator: 0,
    },
    delegation: { staffing: true, products: true, marketing: true, troubles: true, loans: true },
    awareness: clamp(
      MERGERS.acquiredAwareness.perStar * rb.overall,
      MERGERS.acquiredAwareness.min,
      MERGERS.acquiredAwareness.max,
    ),
    grandOpeningWeeksLeft: 0,
    ratings: {
      rates: rb.quality[0],
      products: rb.quality[1],
      service: rb.quality[2],
      branch: rb.quality[3],
      overall: overallOf(rb.quality),
      reviewCount: Math.round(rb.reviewCount),
    },
    reviewCards: [],
    offered: {},
    books: {},
    campaigns: {},
    signupChurn: { mult: 1, weeksLeft: 0, weeksTotal: 0 },
    customers: 0,
    waitIndex: 0,
    capacity: 0,
    last: { prospects: 0, captured: 0, served: 0, share: 0 },
    pnl: [],
    desk: { week: state.clock.week, arrived: 0, approved: 0, refused: 0, declined: 0, expired: 0 },
    converting: {
      rivalId: bank.id,
      name: bank.name,
      ink: bank.ink,
      monogram: bank.monogram,
      weeksLeft: MERGERS.conversionWeeks,
    },
  };
  // A mature branch: every station staffed.
  branch.staff.count = branch.staff.target = staffNeeded(branch);

  // The manager is kept (§19.8 "managers kept"): generated from the M&A stream and assigned.
  const mgr = generateManager(state, rb.cityId, rng);
  mgr.branchId = id;
  state.people.managers[mgr.id] = mgr;
  branch.managerId = mgr.id;
  branch.staff.skill = skillTarget(state, branch);

  const deposits = splitByMix(rb.deposits, ACQUIRED_DEPOSIT_MIX);
  const loans = splitByMix(rb.loans * loanFactor, ACQUIRED_LOAN_MIX);
  for (const spec of allProducts(state)) {
    branch.offered[spec.id] = {
      on: startsOn(state, spec, branch),
      price: startPrice(state, spec, rb.cityId),
    };
    const balance = deposits[spec.id] ?? loans[spec.id] ?? 0;
    branch.books[spec.id] = seededBook(state, spec, rb.cityId, balance, income);
  }
  // Mixes only name base products, so every seeded balance has a book.
  for (const pid of [...Object.keys(deposits), ...Object.keys(loans)]) {
    if (!PRODUCTS[pid]) throw new Error(`Acquired mix names unknown product ${pid}`);
  }
  const accounts = Object.values(branch.books).reduce((s, b) => s + b.accounts, 0);
  branch.customers = Math.round(accounts / PRODUCTS_PER_CUSTOMER);

  state.branches[id] = branch;
  lot.occupant = { type: 'player', id };
  // First branch in a new country under Apply-to-all: that country gets its own HQ list.
  const country = countryOfCity(state, rb.cityId).id;
  if (state.company.applyRatesToAll && !state.company.companyPrices[country]) {
    seedCountryPrices(state, country, branch);
  }
  return id;
}
