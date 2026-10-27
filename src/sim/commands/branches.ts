// Branch commands: lease a storefront and build a sales office on it (one per
// city, at a size, C2a), grow it a size, rename or close it.
import {
  DEAL,
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
import { CITIES } from '../../data/cities';
import { DISTRICT_SPECS } from '../../data/districts';
import { BUILD_SLOTS, EQUIPMENT, isFitout, type BuildSpec } from '../../data/equipment';
import { isDeposit, isLoan } from '../../data/products';
import { allProducts, productSpec } from '../products';
import { assetBookValue } from '../balanceSheet';
import { tileDistance } from '../citygen';
import { endOfficeContracts, moveOfficeContracts } from '../contracts';
import { cityDistanceKm } from '../geo';
import { emptyBook } from '../branch/books';
import { campaignEffects } from '../branch/marketing';
import { branchTarget, productsTarget, ratesTarget, serviceTarget } from '../branch/ratings';
import { marketWage, staffNeeded } from '../branch/staff';
import {
  MAX_OFFICE_SIZE,
  officeInCity,
  sizeMultOf,
  sizeName,
  slotMult,
} from '../branch/officeSize';
import { overallOf } from '../rivals';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { listPrice } from '../nominal';
import { postCash, postPnl, spend } from '../ledger';
import { roundToStep } from '../math';
import { countryOfCity, defaultPrice } from '../rates';
import { seedCountryPrices } from './products';
import type { Book, Branch, GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

/**
 * Itemized cost of a build on a lot at a size (C2a): parts (interior slots ×
 * the size multiplier), lease deposit and the first week's rent (both × it).
 */
export function buildQuote(state: GameState, lotId: string, build: BuildSpec, size = 0) {
  const lot = state.world.lots[lotId];
  // Catalogue prices at today's price list in the lot's country (§4.6).
  const parts = BUILD_SLOTS.reduce(
    (sum, slot) =>
      sum + listPrice(state, EQUIPMENT[build[slot]]?.cost ?? 0, lot?.cityId) * slotMult(slot, size),
    0,
  );
  const mult = sizeMultOf(size);
  const deposit = (lot?.deposit ?? 0) * mult;
  const rent = (lot?.weeklyRent ?? 0) * mult;
  return { parts, deposit, rent, total: parts + deposit + rent };
}

/**
 * Why a branch can't be built here right now, or undefined if it can. `via`
 * 'coo' is a build the COO makes for you (Expansion, §17.2): it may be in a
 * city you are not in, because they are.
 */
export function buildBlocker(
  state: GameState,
  lotId: string,
  build: BuildSpec,
  via?: 'coo',
  size = 0,
): string | undefined {
  const lot = state.world.lots[lotId];
  if (!lot) return 'That storefront no longer exists.';
  if (lot.occupant) return 'This storefront is already taken.';
  if (officeInCity(state, lot.cityId)) return 'You already have a sales office in this city.';
  if (size < 0 || size > MAX_OFFICE_SIZE) return 'Pick a valid office size.';
  if (via === 'coo') {
    if (!state.executives.seats.coo) return 'You need a COO to open sales offices for you.';
  } else if (lot.cityId !== state.world.currentCityId) {
    return "You can only build in the city you're in.";
  }
  for (const slot of BUILD_SLOTS) {
    const item = EQUIPMENT[build[slot]];
    if (!item || item.slot !== slot) return `Pick a valid ${slot} option.`;
  }
  const tier = state.company.tier;
  if (tier === 'restricted' || tier === 'critical') {
    return `The regulator won't allow new sales offices at the ${tier} safety tier.`;
  }
  const quote = buildQuote(state, lotId, build, size);
  if (state.company.cash < quote.total) return `Not enough cash: you need ${money(quote.total)}.`;
  return undefined;
}

/** The district's name (led by the city's away from home), numbered when one of your branches already has it. */
export function defaultName(state: GameState, district: string, cityId?: string): string {
  const area = DISTRICT_SPECS[district as keyof typeof DISTRICT_SPECS]?.name ?? 'Sales office';
  // Away from home the city leads the name ("New York Midtown"), so lists and news stay clear.
  const away = cityId && cityId !== state.meta.homeCityId ? CITIES[cityId]?.name : undefined;
  const base = away ? `${away} ${area}` : area;
  const taken = new Set(Object.values(state.branches).map((b) => b.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
}

/** Leases the storefront and builds a branch; it opens after a one-week fit-out (DESIGN §5.3). */
export function buildBranch(
  state: GameState,
  args: { lotId: string; build: BuildSpec; name?: string; via?: 'coo'; size?: number },
): CommandResult<{ branchId: string }> {
  const size = args.size ?? 0;
  const blocker = buildBlocker(state, args.lotId, args.build, args.via, size);
  if (blocker) return fail(blocker);
  const lot = state.world.lots[args.lotId]!;
  const quote = buildQuote(state, args.lotId, args.build, size);
  const id = newId(state, 'br');
  const country = countryOfCity(state, lot.cityId);
  const offices = EQUIPMENT[args.build.lobby]?.advisorOffices ?? 0;
  const boxes = EQUIPMENT[args.build.vault]?.boxes ?? 0;

  const branch: Branch = {
    id,
    cityId: lot.cityId,
    lotId: lot.id,
    name: (args.name?.trim() || defaultName(state, lot.district, lot.cityId)).slice(
      0,
      BRANCH_NAME_MAX,
    ),
    builtDay: state.clock.day,
    status: 'fitout',
    build: { ...args.build },
    size,
    lease: { weeklyRent: quote.rent, deposit: quote.deposit },
    staff: {
      count: 0,
      target: 0,
      wage: roundToStep(marketWage(state, lot.cityId), WAGE_STEP),
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
    ownPrices: false,
    books: {},
    campaigns: {},
    signupChurn: { mult: 1, weeksLeft: 0, weeksTotal: 0 },
    customers: 0,
    waitIndex: 0,
    capacity: 0,
    last: { prospects: 0, captured: 0, served: 0, share: 0 },
    pnl: [],
    desk: { week: 0, arrived: 0, won: 0, lost: 0, declined: 0, expired: 0 },
    discountLimit: DEAL.defaultLimit,
  };
  branch.staff.count = branch.staff.target = staffNeeded(branch);
  const lineup = state.company.companyOffered;
  for (const spec of allProducts(state)) {
    // Plans and the Loan Desk start on; the API and apps wait for the player (SCREENS §27).
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
  if (!args.via) state.company.lastBuild = { ...args.build };
  lot.occupant = { type: 'player', id };
  // First branch in a new country under Apply-to-all: that country gets its own HQ list.
  if (state.company.applyRatesToAll && !state.company.companyPrices[country.id]) {
    seedCountryPrices(state, country.id);
  }

  // Start ratings at their targets so the first week reflects what was built.
  const fx = campaignEffects(state, branch);
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
      cost: listPrice(state, item.cost, lot.cityId) * slotMult(slot, size),
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
    {
      branchId: id,
      city: lot.cityId,
      district: lot.district,
      address: lot.address,
      ...(args.via ? { by: args.via } : {}),
    },
    1,
    id,
  );
  return ok({ branchId: id });
}

/** What growing an office one size costs: the added interior, deposit and rent. */
export function upgradeQuote(state: GameState, branchId: string) {
  const b = state.branches[branchId];
  if (!b || b.size >= MAX_OFFICE_SIZE) return undefined;
  const from = sizeMultOf(b.size);
  const to = sizeMultOf(b.size + 1);
  const ratio = to / from;
  const parts = BUILD_SLOTS.reduce(
    (sum, slot) =>
      sum +
      (slot === 'exterior'
        ? 0
        : listPrice(state, EQUIPMENT[b.build[slot]]?.cost ?? 0, b.cityId) * (to - from)),
    0,
  );
  const deposit = b.lease.deposit * (ratio - 1);
  const rent = b.lease.weeklyRent * ratio;
  return {
    size: b.size + 1,
    name: sizeName(b.size + 1),
    parts,
    deposit,
    rent,
    total: parts + deposit,
  };
}

/** Why an office can't grow a size now, or undefined if it can. */
export function upgradeBlocker(state: GameState, branchId: string): string | undefined {
  const b = state.branches[branchId];
  if (!b || b.status !== 'open') return 'Only an open office can grow.';
  if (b.converting) return 'Wait until the office has converted to your brand.';
  const quote = upgradeQuote(state, branchId);
  if (!quote) return 'This office is already the largest size.';
  const tier = state.company.tier;
  if (tier === 'restricted' || tier === 'critical') {
    return `The regulator won't allow expansion at the ${tier} safety tier.`;
  }
  if (state.company.cash < quote.total) return `Not enough cash: you need ${money(quote.total)}.`;
  return undefined;
}

/**
 * Grows a sales office one size (C2a): more seats and staff to hire, a bigger
 * lease and the added interior fit-out, at today's prices. It stays open.
 */
export function upgradeOffice(state: GameState, branchId: string): CommandResult<{ size: number }> {
  const blocker = upgradeBlocker(state, branchId);
  if (blocker) return fail(blocker);
  const b = state.branches[branchId]!;
  const quote = upgradeQuote(state, branchId)!;
  const from = sizeMultOf(b.size);
  const to = sizeMultOf(quote.size);
  for (const slot of BUILD_SLOTS) {
    if (slot === 'exterior') continue;
    const item = EQUIPMENT[b.build[slot]];
    if (!item || item.cost <= 0) continue;
    const fitout = isFitout(slot);
    state.company.fixedAssets.push({
      id: newId(state, 'fa'),
      kind: fitout ? 'fitout' : 'equipment',
      slot,
      cost: listPrice(state, item.cost, b.cityId) * (to - from),
      lifeWeeks: fitout ? FITOUT_LIFE_WEEKS : EQUIPMENT_LIFE_WEEKS,
      ageWeeks: 0,
      ownerId: b.id,
    });
  }
  postCash(state, -quote.parts, 'investing');
  postCash(state, -quote.deposit, 'investing');
  state.company.leaseDeposits += quote.deposit;
  b.lease.deposit += quote.deposit;
  b.lease.weeklyRent = quote.rent;
  b.size = quote.size;
  b.staff.target = Math.max(b.staff.target, staffNeeded(b));
  pushEvent(state, 'OFFICE_GROWN', { branchId: b.id, city: b.cityId, size: quote.name }, 1, b.id);
  return ok({ size: quote.size });
}

export function renameBranch(state: GameState, branchId: string, name: string): CommandResult {
  const branch = state.branches[branchId];
  if (!branch) return fail('That sales office no longer exists.');
  const trimmed = name.trim();
  if (!trimmed) return fail('Give the sales office a name.');
  branch.name = trimmed.slice(0, BRANCH_NAME_MAX);
  return ok();
}

/** The nearest other branch in the same city, which takes over a closed branch's accounts. */
/**
 * Where a closing office's accounts go: the nearest other office in the city,
 * or (C2a: one office per city) the office in the nearest other city.
 */
function successor(state: GameState, branch: Branch): Branch | undefined {
  const lot = state.world.lots[branch.lotId];
  // Same-city offices first (by tiles), then other cities (by km).
  const rank = (other: Branch): [number, number] => {
    if (other.cityId !== branch.cityId) return [1, cityDistanceKm(branch.cityId, other.cityId)];
    const otherLot = state.world.lots[other.lotId];
    return [0, lot && otherLot ? tileDistance(lot, otherLot) : 0];
  };
  let best: Branch | undefined;
  let bestR: [number, number] = [Infinity, Infinity];
  for (const other of Object.values(state.branches)) {
    if (other.id === branch.id || other.status === 'closed') continue;
    const r = rank(other);
    const closer = r[0] < bestR[0] || (r[0] === bestR[0] && r[1] < bestR[1]);
    const tie = r[0] === bestR[0] && r[1] === bestR[1] && best && other.id < best.id;
    if (closer || tie) {
      best = other;
      bestR = r;
    }
  }
  return best;
}

function hasLoans(state: GameState, branch: Branch): boolean {
  const books = Object.entries(branch.books).some(([pid, b]) => {
    const spec = productSpec(state, pid);
    return spec && isLoan(spec) && b.balance > 0;
  });
  return books;
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
      ? 'This is your only sales office, so its loans have nowhere to go.'
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
 * its equipment's book value. Loans move to the nearest other office (in the
 * city, else the nearest city); accounts and deposits follow with extra churn,
 * or leave if there is none.
 */
export function closeBranch(
  state: GameState,
  branchId: string,
): CommandResult<{ movedTo?: string }> {
  const branch = state.branches[branchId];
  const quote = closeQuote(state, branchId);
  if (!branch || !quote) return fail('That sales office no longer exists.');
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
  }
  // C5b: contracts stay with an office in the same city; elsewhere they end.
  if (target?.cityId === branch.cityId) moveOfficeContracts(state, branchId, target.id);
  else endOfficeContracts(state, branchId);

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
