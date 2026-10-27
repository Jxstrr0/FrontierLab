// Turns an acquired rival branch into one of yours (SIMULATION §19.8, DESIGN
// §5.10). It stays on its lot and opens at once under your name, still wearing
// the old brand while it converts: the seller strategy's fit-out
// (ACQUIRED_BUILDS), a full staff, the old manager kept with delegation on,
// your products at company or default prices, and plan books seeded with its
// customers (C3a: its book deposits ÷ MERGERS.depositPerCustomer, split by
// ACQUIRED_PLAN_MIX). Plan ARR is not on the balance sheet, so nothing is
// paired with reserves.
import {
  DEAL,
  MERGERS,
  PRODUCTS_PER_CUSTOMER,
  START_STAFF_MORALE,
  WAGE_STEP,
} from '../config/balance';
import { EQUIPMENT } from '../data/equipment';
import { ACQUIRED_BUILDS, ACQUIRED_PLAN_MIX } from '../data/mergers';
import { PRODUCTS, type ProductSpec } from '../data/products';
import { splitByMix } from './acquisitionPlan';
import { emptyBook, periodsPerYear } from './branch/books';
import { companyPrice } from './branch/pricing';
import { marketWage, skillTarget, staffNeeded } from './branch/staff';
import { defaultName } from './commands/branches';
import { seedCountryPrices } from './commands/products';
import { newId } from './ids';
import { clamp, roundToStep } from './math';
import { generateManager } from './people';
import { allProducts } from './products';
import { countryOfCity, defaultPrice } from './rates';
import type { Rng } from './rng';
import { overallOf } from './rivals';
import type { Book, Branch, GameState, RivalBank, RivalBranch } from './state';
import { rivalMult } from './rivalOffices';

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

/** A plan book seeded with acquired seats, billed at the office's price. */
function seededBook(spec: ProductSpec, seats: number, price: number): Book {
  const book = emptyBook();
  if (seats <= 0) return book;
  book.accounts = seats;
  book.balance = seats * price * periodsPerYear(spec);
  book.bookRate = price;
  return book;
}

/** Builds and registers your branch on a rival branch's lot; returns its id. */
export function convertRivalBranch(
  state: GameState,
  bank: RivalBank,
  rb: RivalBranch,
  rng: Rng,
): string {
  const lot = state.world.lots[rb.lotId]!;
  const id = newId(state, 'br');
  const branch: Branch = {
    id,
    cityId: rb.cityId,
    lotId: lot.id,
    name: defaultName(state, lot.district, rb.cityId),
    builtDay: state.clock.day,
    openedWeek: state.clock.week,
    status: 'open',
    build: { ...ACQUIRED_BUILDS[bank.strategy] },
    // The rival's office keeps its size (C2b); the lease scales with it.
    size: rb.size,
    lease: { weeklyRent: lot.weeklyRent * rivalMult(rb), deposit: lot.deposit * rivalMult(rb) },
    staff: {
      count: 0,
      target: 0,
      wage: roundToStep(marketWage(state, rb.cityId), WAGE_STEP),
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
    ownPrices: false,
    books: {},
    campaigns: {},
    signupChurn: { mult: 1, weeksLeft: 0, weeksTotal: 0 },
    customers: 0,
    waitIndex: 0,
    capacity: 0,
    last: { prospects: 0, captured: 0, served: 0, share: 0 },
    pnl: [],
    desk: { week: state.clock.week, arrived: 0, won: 0, lost: 0, declined: 0, expired: 0 },
    discountLimit: DEAL.defaultLimit,
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

  const seats = splitByMix(rb.deposits / MERGERS.depositPerCustomer, ACQUIRED_PLAN_MIX);
  for (const spec of allProducts(state)) {
    const price = startPrice(state, spec, rb.cityId);
    branch.offered[spec.id] = { on: startsOn(state, spec, branch), price };
    branch.books[spec.id] = seededBook(spec, seats[spec.id] ?? 0, price);
  }
  // The mix only names base products, so every seeded seat has a book.
  for (const pid of Object.keys(seats)) {
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
