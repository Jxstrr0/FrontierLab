// Branch commands: lease a storefront and build a branch on it, rename or close a branch.
import {
  BRANCH_NAME_MAX,
  CLOSE_RECOVERY,
  CLOSE_RENT_WEEKS,
  CLOSE_RETENTION,
  EQUIPMENT_LIFE_WEEKS,
  FITOUT_DAYS,
  FITOUT_LIFE_WEEKS,
  START_AWARENESS,
  START_STAFF_MORALE,
  START_STAFF_SKILL,
  WAGE_STEP,
  GRAND_OPENING_WEEKS,
} from '../../config/balance';
import { DISTRICT_SPECS } from '../../data/districts';
import { BUILD_SLOTS, EQUIPMENT, isFitout, type BuildSpec } from '../../data/equipment';
import { isDeposit, isLoan } from '../../data/products';
import { allProducts, productSpec } from '../products';
import { assetBookValue } from '../balanceSheet';
import { tileDistance } from '../citygen';
import { emptyBook } from '../branch/books';
import { campaignEffects } from '../branch/marketing';
import { branchTarget, productsTarget, ratesTarget, serviceTarget } from '../branch/ratings';
import { marketWage, staffNeeded } from '../branch/staff';
import { overallOf } from '../rivals';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { postCash, postPnl, spend } from '../ledger';
import { roundToStep } from '../math';
import { countryOfCity, defaultPrice } from '../rates';
import type { Book, Branch, GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

/** Itemized cost of a build on a lot: parts, lease deposit and the first week's rent. */
export function buildQuote(state: GameState, lotId: string, build: BuildSpec) {
  const lot = state.world.lots[lotId];
  const parts = BUILD_SLOTS.reduce((sum, slot) => sum + (EQUIPMENT[build[slot]]?.cost ?? 0), 0);
  const deposit = lot?.deposit ?? 0;
  const rent = lot?.weeklyRent ?? 0;
  return { parts, deposit, rent, total: parts + deposit + rent };
}

/** Why a branch can't be built here right now, or undefined if it can. */
export function buildBlocker(
  state: GameState,
  lotId: string,
  build: BuildSpec,
): string | undefined {
  const lot = state.world.lots[lotId];
  if (!lot) return 'That storefront no longer exists.';
  if (lot.occupant) return 'This storefront is already taken.';
  if (lot.cityId !== state.world.currentCityId) return "You can only build in the city you're in.";
  for (const slot of BUILD_SLOTS) {
    const item = EQUIPMENT[build[slot]];
    if (!item || item.slot !== slot) return `Pick a valid ${slot} option.`;
  }
  const tier = state.company.tier;
  if (tier === 'restricted' || tier === 'critical') {
    return `The regulator won't allow new branches at the ${tier} capital tier.`;
  }
  const quote = buildQuote(state, lotId, build);
  if (state.company.cash < quote.total) return `Not enough cash: you need ${money(quote.total)}.`;
  return undefined;
}

/** The district's name, numbered when one of your branches already has it. */
export function defaultName(state: GameState, district: string): string {
  const base = DISTRICT_SPECS[district as keyof typeof DISTRICT_SPECS]?.name ?? 'Branch';
  const taken = new Set(Object.values(state.branches).map((b) => b.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
}

/** Leases the storefront and builds a branch; it opens after a one-week fit-out (DESIGN §5.3). */
export function buildBranch(
  state: GameState,
  args: { lotId: string; build: BuildSpec; name?: string },
): CommandResult<{ branchId: string }> {
  const blocker = buildBlocker(state, args.lotId, args.build);
  if (blocker) return fail(blocker);
  const lot = state.world.lots[args.lotId]!;
  const quote = buildQuote(state, args.lotId, args.build);
  const id = newId(state, 'br');
  const country = countryOfCity(state, lot.cityId);
  const offices = EQUIPMENT[args.build.lobby]?.advisorOffices ?? 0;
  const boxes = EQUIPMENT[args.build.vault]?.boxes ?? 0;

  const branch: Branch = {
    id,
    cityId: lot.cityId,
    lotId: lot.id,
    name: (args.name?.trim() || defaultName(state, lot.district)).slice(0, BRANCH_NAME_MAX),
    builtDay: state.clock.day,
    status: 'fitout',
    build: { ...args.build },
    lease: { weeklyRent: lot.weeklyRent, deposit: lot.deposit },
    staff: {
      count: 0,
      target: 0,
      wage: roundToStep(marketWage(lot.cityId), WAGE_STEP),
      skill: START_STAFF_SKILL,
      morale: START_STAFF_MORALE,
      quitAccumulator: 0,
    },
    delegation: {
      staffing: false,
      products: false,
      marketing: false,
      troubles: false,
      loans: false,
    },
    awareness: START_AWARENESS,
    grandOpeningWeeksLeft: GRAND_OPENING_WEEKS,
    ratings: { rates: 3, products: 3, service: 3, branch: 3, overall: 3, reviewCount: 0 },
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
    desk: { week: 0, approved: 0, refused: 0, declined: 0, expired: 0 },
  };
  branch.staff.count = branch.staff.target = staffNeeded(branch);
  const lineup = state.company.companyOffered;
  for (const spec of allProducts(state)) {
    // Deposits and everyday services start on; lending and cards wait for the player (SCREENS §27).
    let on = spec.category === 'deposits' || spec.kind === 'fx' || spec.kind === 'sbl';
    if (spec.kind === 'wealth') on = offices > 0 || spec.noAdvisorOffice === true;
    if (spec.kind === 'safebox') on = boxes > 0;
    // Developed products start off; the HQ lineup (setCompanyOffered) overrides either way.
    if (spec.base) on = false;
    if (lineup?.[spec.id] !== undefined) on = lineup[spec.id]!;
    branch.offered[spec.id] = { on, price: roundToStep(defaultPrice(spec, country), spec.step) };
    branch.books[spec.id] = emptyBook();
  }
  state.branches[id] = branch;
  lot.occupant = { type: 'player', id };

  // Start ratings at their targets so the first week reflects what was built.
  const fx = campaignEffects(branch);
  branch.ratings.rates = ratesTarget(state, branch, fx);
  branch.ratings.products = productsTarget(state, branch, fx);
  branch.ratings.service = serviceTarget(state, branch, fx);
  branch.ratings.branch = branchTarget(state, branch, fx);
  const r = branch.ratings;
  branch.ratings.overall = overallOf([r.rates, r.products, r.service, r.branch]);

  for (const slot of BUILD_SLOTS) {
    const item = EQUIPMENT[args.build[slot]]!;
    if (item.cost <= 0) continue;
    const fitout = isFitout(slot);
    state.company.fixedAssets.push({
      id: newId(state, 'fa'),
      kind: fitout ? 'fitout' : 'equipment',
      slot,
      cost: item.cost,
      lifeWeeks: fitout ? FITOUT_LIFE_WEEKS : EQUIPMENT_LIFE_WEEKS,
      ageWeeks: 0,
      ownerId: id,
    });
  }
  postCash(state, -quote.parts, 'investing');
  postCash(state, -quote.deposit, 'investing');
  state.company.leaseDeposits += quote.deposit;
  spend(state, 'rent', quote.rent);

  state.events.scheduled.push({
    day: state.clock.day + FITOUT_DAYS,
    type: 'fitoutDone',
    payload: { branchId: id },
  });
  pushEvent(
    state,
    'NEW_BRANCH',
    { branchId: id, city: lot.cityId, district: lot.district, address: lot.address },
    1,
    id,
  );
  return ok({ branchId: id });
}

export function renameBranch(state: GameState, branchId: string, name: string): CommandResult {
  const branch = state.branches[branchId];
  if (!branch) return fail('That branch no longer exists.');
  const trimmed = name.trim();
  if (!trimmed) return fail('Give the branch a name.');
  branch.name = trimmed.slice(0, BRANCH_NAME_MAX);
  return ok();
}

/** The nearest other branch in the same city, which takes over a closed branch's accounts. */
function successor(state: GameState, branch: Branch): Branch | undefined {
  const lot = state.world.lots[branch.lotId];
  let best: Branch | undefined;
  let bestD = Infinity;
  for (const other of Object.values(state.branches)) {
    if (other.id === branch.id || other.cityId !== branch.cityId) continue;
    const otherLot = state.world.lots[other.lotId];
    const d = lot && otherLot ? tileDistance(lot, otherLot) : Infinity;
    if (d < bestD || (d === bestD && best && other.id < best.id)) {
      best = other;
      bestD = d;
    }
  }
  return best;
}

function hasLoans(state: GameState, branch: Branch): boolean {
  const books = Object.entries(branch.books).some(([pid, b]) => {
    const spec = productSpec(state, pid);
    return spec && isLoan(spec) && b.balance > 0;
  });
  return books || Object.values(state.loanDesk.loans).some((l) => l.branchId === branch.id);
}

/** What closing a branch returns and where its accounts go (DESIGN §5.3). */
export function closeQuote(state: GameState, branchId: string) {
  const branch = state.branches[branchId];
  if (!branch) return undefined;
  const target = successor(state, branch);
  const book = state.company.fixedAssets
    .filter((a) => a.ownerId === branchId)
    .reduce((sum, a) => sum + assetBookValue(a), 0);
  const recovery = book * CLOSE_RECOVERY;
  const forfeit = Math.min(branch.lease.deposit, branch.lease.weeklyRent * CLOSE_RENT_WEEKS);
  const depositRefund = branch.lease.deposit - forfeit;
  const blocker =
    !target && hasLoans(state, branch)
      ? 'This is your only branch in the city, so its loans have nowhere to go.'
      : null;
  return {
    targetId: target?.id,
    targetName: target?.name,
    equipmentBook: book,
    recovery,
    depositRefund,
    forfeit,
    cashBack: recovery + depositRefund,
    retention: target ? CLOSE_RETENTION : 0,
    blocker,
  };
}

/** Moves a share of a book into another, blending rates and risk by balance. */
function mergeBook(into: Book, from: Book, share: number): void {
  const add = from.balance * share;
  const total = into.balance + add;
  if (total > 0) {
    into.bookRate = (into.balance * into.bookRate + add * from.bookRate) / total;
    into.pd = (into.balance * into.pd + add * from.pd) / total;
    into.lgd = (into.balance * into.lgd + add * from.lgd) / total;
  }
  into.balance = total;
  into.accounts += Math.round(from.accounts * share);
}

/**
 * Closes a branch: returns the lease deposit minus two weeks' rent plus 30% of
 * its equipment's book value. Loans move to the nearest branch in the city;
 * accounts and deposits follow with extra churn, or leave if there is none.
 */
export function closeBranch(
  state: GameState,
  branchId: string,
): CommandResult<{ movedTo?: string }> {
  const branch = state.branches[branchId];
  const quote = closeQuote(state, branchId);
  if (!branch || !quote) return fail('That branch no longer exists.');
  if (quote.blocker) return fail(quote.blocker);
  const target = quote.targetId ? state.branches[quote.targetId] : undefined;

  for (const [pid, from] of Object.entries(branch.books)) {
    const spec = productSpec(state, pid);
    if (!spec) continue;
    const share = isLoan(spec) ? 1 : quote.retention;
    // Deposits that leave the bank are paid out of treasury reserves.
    if (isDeposit(spec)) state.treasury.reserves -= from.balance * (1 - share);
    if (target) mergeBook((target.books[pid] ??= emptyBook()), from, share);
  }
  if (target) {
    target.customers += Math.round(branch.customers * quote.retention);
    for (const loan of Object.values(state.loanDesk.loans)) {
      if (loan.branchId === branchId) loan.branchId = target.id;
    }
  }
  for (const app of Object.values(state.loanDesk.applications)) {
    if (app.branchId === branchId) delete state.loanDesk.applications[app.id];
  }

  // Equipment: recover 30% of book value and write off the rest.
  state.company.fixedAssets = state.company.fixedAssets.filter((a) => a.ownerId !== branchId);
  postCash(state, quote.recovery, 'investing');
  postPnl(state, 'depreciation', quote.equipmentBook - quote.recovery);
  // Lease: the deposit comes back less the forfeited rent.
  state.company.leaseDeposits -= branch.lease.deposit;
  postCash(state, branch.lease.deposit, 'investing');
  spend(state, 'rent', quote.forfeit);

  if (branch.managerId) delete state.people.managers[branch.managerId];
  const lot = state.world.lots[branch.lotId];
  if (lot) delete lot.occupant;
  state.events.scheduled = state.events.scheduled.filter((e) => e.payload.branchId !== branchId);
  delete state.branches[branchId];
  pushEvent(state, 'BRANCH_CLOSED', { branchId, name: branch.name, movedTo: target?.name }, 2);
  return ok(target ? { movedTo: target.id } : {});
}
