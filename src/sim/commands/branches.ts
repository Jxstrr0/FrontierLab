// Branch commands: lease a storefront and build a branch on it, rename a branch.
import {
  BRANCH_NAME_MAX,
  EQUIPMENT_LIFE_WEEKS,
  FITOUT_DAYS,
  FITOUT_LIFE_WEEKS,
  START_AWARENESS,
  START_STAFF_MORALE,
  START_STAFF_SKILL,
  GRAND_OPENING_WEEKS,
} from '../../config/balance';
import { DISTRICT_SPECS } from '../../data/districts';
import { BUILD_SLOTS, EQUIPMENT, isFitout, type BuildSpec } from '../../data/equipment';
import { PRODUCTS } from '../../data/products';
import { emptyBook } from '../branch/books';
import { campaignEffects } from '../branch/marketing';
import { branchTarget, productsTarget, ratesTarget, serviceTarget } from '../branch/ratings';
import { marketWage, staffNeeded } from '../branch/staff';
import { overallOf } from '../rivals';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { postCash, spend } from '../ledger';
import { roundToStep } from '../math';
import { countryOfCity, defaultPrice } from '../rates';
import type { Branch, GameState } from '../state';
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

function defaultName(state: GameState, district: string): string {
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
      wage: marketWage(lot.cityId),
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
  };
  branch.staff.count = branch.staff.target = staffNeeded(branch);
  for (const spec of Object.values(PRODUCTS)) {
    // Deposits and everyday services start on; lending and cards wait for the player (SCREENS §27).
    let on = spec.category === 'deposits' || spec.kind === 'fx' || spec.kind === 'sbl';
    if (spec.kind === 'wealth') on = offices > 0;
    if (spec.kind === 'safebox') on = boxes > 0;
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
