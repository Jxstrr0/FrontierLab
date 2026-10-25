// The COO's Expansion delegation (SIMULATION §17.2): opening branches for you
// in the cities you have marked for growth, so the bank can keep spreading
// while you run the top of it. Each week it picks the growth city with the most
// room, the busiest free storefront clear of your other branches, and your
// usual fit-out, and builds when the cash left after the build still covers
// EXEC_DELEGATION.expansionReserveWeeks of weekly costs. One build at most
// every expansionEveryWeeks. `expansionPlan` is the same choice without acting,
// for the COO's profile and the "Open a branch now" command.
import { EXEC_DELEGATION as X } from '../config/balance';
import { CITIES } from '../data/cities';
import { REFERENCE_BUILDS, type BuildSpec } from '../data/equipment';
import { cityBranchGuide, cityRoom } from './branch/cityMarket';
import { tileDistance } from './citygen';
import { weeklyCosts } from './cashCover';
import { buildBlocker, buildBranch, buildQuote } from './commands/branches';
import { isGenerated } from './worldGen';
import type { GameState, Lot } from './state';

export interface ExpansionPlan {
  cityId: string;
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

/** Your open or building branches in a city. */
function branchesIn(state: GameState, cityId: string): number {
  let n = 0;
  for (const b of Object.values(state.branches))
    if (b.cityId === cityId && b.status !== 'closed') n += 1;
  return n;
}

/** Cash the COO keeps back: expansionReserveWeeks of weekly costs. */
export function expansionReserve(state: GameState): number {
  return X.expansionReserveWeeks * weeklyCosts(state);
}

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
  if (branchesIn(state, cityId) >= cityBranchGuide(cityId))
    return {
      ...plan,
      blocker: 'This city already has about as many of your branches as it can use.',
    };
  if (keepReserve && cityRoom(state, cityId) < X.expansionMinRoom)
    return {
      ...plan,
      blocker: 'Little room left to grow here: most of the market already banks with you.',
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
      ? 'Not enough spare cash: the COO keeps 8 weeks of costs in reserve.'
      : 'Not enough cash for the build.',
  };
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
    const plan = expansionPlan(state, cityId);
    if (plan.blocker || !plan.lot || !plan.build) continue;
    const r = buildBranch(state, { lotId: plan.lot.id, build: plan.build, via: 'coo' });
    if (r.ok) {
      ex.lastExpansionWeek = state.clock.week;
      return;
    }
  }
}
