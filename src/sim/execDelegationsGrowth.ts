// The COO's Expansion delegation (SIMULATION §17.2): opening sales offices for
// you in the cities you have marked for growth, so the lab can keep spreading
// while you run the top of it. Each week it picks the growth city with the most
// room: one without an office gets one on the busiest free storefront with your
// usual fit-out; one whose office is busy (C2a) gets it grown a size. It acts
// when the cash left after still covers the weeks of costs you dial
// (executives.expansionReserveWeeks, the cash reserve dial under the switch),
// at most once every expansionEveryWeeks. `expansionPlan` is
// the same choice without acting, for the COO's profile and "Open now".
import { EXEC_DELEGATION as X } from '../config/balance';
import { CITIES } from '../data/cities';
import { REFERENCE_BUILDS, type BuildSpec } from '../data/equipment';
import { cityRoom } from './branch/cityMarket';
import { nextSizeAddsReach, officeInCity } from './branch/officeSize';
import { tileDistance } from './citygen';
import { weeklyCosts } from './cashCover';
import {
  buildBlocker,
  buildBranch,
  buildQuote,
  upgradeBlocker,
  upgradeOffice,
  upgradeQuote,
} from './commands/branches';
import { isGenerated } from './worldGen';
import type { GameState, Lot } from './state';

export interface ExpansionPlan {
  cityId: string;
  /** Grow your office here a size (C2a) rather than open one. */
  growId?: string;
  lot?: Lot;
  build?: BuildSpec;
  total: number;
  /** Why the COO would not build here now (undefined when the plan is ready). */
  blocker?: string;
}

/**
 * With Expansion on and no growth city marked, starts the list with the cities
 * you already have branches in (on hire and when the switch is turned on), so
 * the delegation never sits idle without saying why.
 */
export function seedGrowthCities(state: GameState): void {
  if (!state.executives.seats.coo?.delegations.expansion || growthCities(state).length > 0) return;
  for (const b of Object.values(state.branches)) {
    if (b.status !== 'closed' && canGrowIn(state, b.cityId))
      state.executives.growthCities[b.cityId] = true;
  }
}

/** Cities the COO may build in: generated, not regional sites, marked for growth. */
export function growthCities(state: GameState): string[] {
  return Object.keys(state.executives.growthCities)
    .filter((id) => state.executives.growthCities[id] && canGrowIn(state, id))
    .sort();
}

/** A city you could mark for growth: one you have been to, with storefronts. */
export function canGrowIn(state: GameState, cityId: string): boolean {
  return isGenerated(state, cityId) && !CITIES[cityId]?.regional;
}

/** Cash the COO keeps back: the dialled weeks of weekly costs (executives.expansionReserveWeeks). */
export function expansionReserve(state: GameState): number {
  return state.executives.expansionReserveWeeks * weeklyCosts(state);
}

/** Cash the CFO's buying and investing keep back: the fixed EXEC_DELEGATION.expansionReserveWeeks of costs (§17.4). */
export function fixedReserve(state: GameState): number {
  return X.expansionReserveWeeks * weeklyCosts(state);
}

/** "the COO keeps 8 weeks of costs in reserve", for the blockers below. */
const reserveNote = (state: GameState) =>
  `the COO keeps ${state.executives.expansionReserveWeeks} weeks of costs in reserve`;

/** The busiest free storefront, discounted when it sits near one of yours. */
export function bestLot(state: GameState, cityId: string): Lot | undefined {
  const lots = Object.values(state.world.lots).filter((l) => l.cityId === cityId);
  const mine = lots.filter((l) => l.occupant?.type === 'player');
  let best: Lot | undefined;
  let bestScore = -1;
  for (const lot of lots) {
    if (lot.occupant) continue;
    let nearest = Infinity;
    for (const other of mine) nearest = Math.min(nearest, tileDistance(lot, other));
    const spacing = Math.min(1, nearest / X.expansionSpacing);
    const score = lot.footTraffic * spacing;
    if (score > bestScore || (score === bestScore && best && lot.id < best.id)) {
      bestScore = score;
      best = lot;
    }
  }
  return best;
}

/** Your usual fit-out: the last build you chose (else the newest branch's), then the reference builds. */
export function usualBuilds(state: GameState): BuildSpec[] {
  const newest = Object.values(state.branches).sort((a, b) => b.builtDay - a.builtDay)[0];
  const usual = state.company.lastBuild ?? newest?.build;
  const list: BuildSpec[] = [];
  if (usual) list.push({ ...usual });
  list.push({ ...REFERENCE_BUILDS.mid }, { ...REFERENCE_BUILDS.basic });
  return list;
}

/**
 * What the COO would build in a city right now. `keepReserve` applies the
 * cash reserve (the weekly routine does; your own "Open a branch now" ask
 * only needs the cash for the build).
 */
export function expansionPlan(state: GameState, cityId: string, keepReserve = true): ExpansionPlan {
  const plan: ExpansionPlan = { cityId, total: 0 };
  if (!canGrowIn(state, cityId)) return { ...plan, blocker: 'You have not been to this city yet.' };
  const office = officeInCity(state, cityId);
  if (office) return growPlan(state, office.id, keepReserve);
  if (keepReserve && cityRoom(state, cityId) < X.expansionMinRoom)
    return {
      ...plan,
      blocker: 'Little room left to grow here: most of the market already uses you.',
    };
  const lot = bestLot(state, cityId);
  if (!lot) return { ...plan, blocker: 'No free storefront in this city.' };
  const spare = state.company.cash - (keepReserve ? expansionReserve(state) : 0);
  let blocker: string | undefined;
  for (const build of usualBuilds(state)) {
    const total = buildQuote(state, lot.id, build).total;
    blocker = buildBlocker(state, lot.id, build, 'coo');
    if (blocker) return { ...plan, lot, build, total, blocker };
    if (total <= spare) return { cityId, lot, build, total };
  }
  const cheapest = buildQuote(state, lot.id, REFERENCE_BUILDS.basic).total;
  return {
    ...plan,
    lot,
    total: cheapest,
    blocker: keepReserve
      ? `Not enough spare cash: ${reserveNote(state)}.`
      : 'Not enough cash for the build.',
  };
}

/** C2a: growing the city's office one size, once it is busy and the city has room. */
function growPlan(state: GameState, branchId: string, keepReserve: boolean): ExpansionPlan {
  const office = state.branches[branchId]!;
  const plan: ExpansionPlan = { cityId: office.cityId, growId: branchId, total: 0 };
  const quote = upgradeQuote(state, branchId);
  if (!quote) return { ...plan, blocker: 'Your office here is already the largest size.' };
  plan.total = quote.total;
  if (keepReserve && !nextSizeAddsReach(office))
    return { ...plan, blocker: 'A bigger office would reach no more of this city.' };
  if (keepReserve && cityRoom(state, office.cityId) < X.expansionMinRoom)
    return {
      ...plan,
      blocker: 'Little room left to grow here: most of the market already uses you.',
    };
  const blocker = upgradeBlocker(state, branchId);
  if (blocker) return { ...plan, blocker };
  const spare = state.company.cash - (keepReserve ? expansionReserve(state) : 0);
  if (quote.total > spare)
    return {
      ...plan,
      blocker: keepReserve
        ? `Not enough spare cash: ${reserveNote(state)}.`
        : 'Not enough cash to grow the office.',
    };
  return plan;
}

/** Opens the planned office or grows it; true when it did. */
export function carryOutPlan(state: GameState, plan: ExpansionPlan): boolean {
  if (plan.blocker) return false;
  if (plan.growId) return upgradeOffice(state, plan.growId).ok;
  if (!plan.lot || !plan.build) return false;
  return buildBranch(state, { lotId: plan.lot.id, build: plan.build, via: 'coo' }).ok;
}

/** Weekly routine: at most one build per expansionEveryWeeks, in the growth city with the most room. */
export function cooExpansion(state: GameState): void {
  const ex = state.executives;
  if (ex.lastExpansionWeek >= 0 && state.clock.week - ex.lastExpansionWeek < X.expansionEveryWeeks)
    return;
  const cities = growthCities(state).sort(
    (a, b) => cityRoom(state, b) - cityRoom(state, a) || a.localeCompare(b),
  );
  for (const cityId of cities) {
    if (carryOutPlan(state, expansionPlan(state, cityId))) {
      ex.lastExpansionWeek = state.clock.week;
      return;
    }
  }
}

export interface ExpansionNext {
  /** The next move the COO would make with the reserve kept, if any growth city is ready. */
  plan?: ExpansionPlan;
  /** Why no growth city is ready right now (the first city's blocker, or no cities). */
  blocker?: string;
  /** Cash the dialled reserve holds back. */
  reserve: number;
  /** Weeks until the cadence allows the next build (0 = this week). */
  weeksTo: number;
}

/** What Expansion would do next at the current reserve, for the dial's tagline. Changes nothing. */
export function expansionNext(state: GameState): ExpansionNext {
  const ex = state.executives;
  const since =
    ex.lastExpansionWeek < 0 ? X.expansionEveryWeeks : state.clock.week - ex.lastExpansionWeek;
  const weeksTo = Math.max(0, X.expansionEveryWeeks - since);
  const reserve = expansionReserve(state);
  const cities = growthCities(state).sort(
    (a, b) => cityRoom(state, b) - cityRoom(state, a) || a.localeCompare(b),
  );
  if (cities.length === 0) return { reserve, weeksTo, blocker: 'No growth city marked.' };
  let first: ExpansionPlan | undefined;
  for (const cityId of cities) {
    const plan = expansionPlan(state, cityId);
    first ??= plan;
    if (!plan.blocker) return { plan, reserve, weeksTo };
  }
  return { reserve, weeksTo, blocker: first?.blocker };
}
