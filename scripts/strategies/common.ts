// Shared helpers for scripted strategies: choosing lots, building, hiring and
// pricing through commands, for branches in every city the bank runs.
import { RIVAL_RADIUS } from '../../src/config/balance';
import { REFERENCE_BUILDS, type BuildSpec } from '../../src/data/equipment';
import { PRODUCTS } from '../../src/data/products';
import * as cmd from '../../src/sim/commands';
import { roundToStep } from '../../src/sim/math';
import { managerChoice, optionBlocker } from '../../src/sim/incidents';
import { countryOfCity, defaultPrice } from '../../src/sim/rates';
import type { GameState, Lot } from '../../src/sim/state';

export const LENDING = ['personal_loan', 'auto_loan', 'mortgage', 'loc', 'credit_card'];

/**
 * An "average lot" for calibration (SIMULATION §25): the median-rent free lot in
 * Midtown, the district whose income index is 1.00.
 */
export function averageLot(state: GameState): Lot | undefined {
  const free = freeLots(state)
    .filter((l) => l.district === 'midtown')
    .sort((a, b) => a.weeklyRent - b.weeklyRent);
  return free[Math.floor(free.length / 2)] ?? freeLots(state)[0];
}

/** A lot's appeal before crowding: foot traffic × income per √rent. */
export const lotScore = (lot: Lot): number =>
  (lot.footTraffic * lot.incomeIndex) / Math.sqrt(lot.weeklyRent);

/**
 * A free lot worth a branch: at least GOOD_LOT_SHARE of the best lot's appeal
 * in its city (occupied lots included), so the last few weak corners are left
 * and the player moves on to another city instead.
 */
const GOOD_LOT_SHARE = 0.25;

export function goodLots(state: GameState, cityId = state.world.currentCityId): Lot[] {
  const all = Object.values(state.world.lots).filter((l) => l.cityId === cityId);
  const best = Math.max(0, ...all.map(lotScore));
  return all.filter((l) => !l.occupant && lotScore(l) >= GOOD_LOT_SHARE * best);
}

/**
 * Best free lot in the city you're in by appeal, outside our own branches'
 * catchment; `goodOnly` keeps to goodLots.
 */
export function bestLot(state: GameState, goodOnly = false): Lot | undefined {
  // Tiles are per city, so only our branches in this city crowd a lot.
  const own = Object.values(state.branches)
    .map((b) => state.world.lots[b.lotId]!)
    .filter((l) => l.cityId === state.world.currentCityId);
  let best: Lot | undefined;
  let bestScore = -Infinity;
  for (const lot of goodOnly ? goodLots(state) : freeLots(state)) {
    const near = own.filter(
      (o) => Math.hypot(o.tile.x - lot.tile.x, o.tile.y - lot.tile.y) < RIVAL_RADIUS,
    ).length;
    const score = lotScore(lot) / (1 + near);
    if (score > bestScore) {
      bestScore = score;
      best = lot;
    }
  }
  return best;
}

/** Free lots in the city you're in. */
export function freeLots(state: GameState): Lot[] {
  return Object.values(state.world.lots).filter(
    (l) => !l.occupant && l.cityId === state.world.currentCityId,
  );
}

/** Builds, hires the best candidate and sets delegation. Returns the branch id or undefined. */
export function openBranch(
  state: GameState,
  lot: Lot,
  opts: {
    build?: BuildSpec;
    lending: boolean;
    delegate: { staffing: boolean; loans: boolean; marketing: boolean; products: boolean };
  },
): string | undefined {
  const r = cmd.buildBranch(state, { lotId: lot.id, build: opts.build ?? REFERENCE_BUILDS.mid });
  if (!r.ok) return undefined;
  const pool = state.people.managerCandidates[lot.cityId] ?? [];
  const best = [...pool].sort((a, b) => avgSkill(b) - avgSkill(a))[0];
  if (best) cmd.hireManager(state, r.branchId, best.id);
  for (const p of LENDING) cmd.setOffered(state, r.branchId, p, opts.lending);
  for (const [key, on] of Object.entries(opts.delegate)) {
    cmd.setDelegation(state, r.branchId, key as 'staffing', on);
  }
  return r.branchId;
}

const avgSkill = (m: { skills: Record<string, number> }) =>
  Object.values(m.skills).reduce((a, b) => a + b, 0) / 4;

/** Re-sets every rate product to the default rule plus an offset, so prices follow FTP. */
/**
 * Answers open incidents like a sensible owner: accept an emergency
 * recapitalisation, otherwise take the option a branch manager would pick
 * (falling back to the first affordable one).
 */
export function handleIncidents(state: GameState): void {
  for (const inc of [...state.incidents.active]) {
    const pick =
      inc.type === 'RECAP_OFFER'
        ? 'accept'
        : (() => {
            const choice = managerChoice(state, inc);
            if (!optionBlocker(state, inc, choice)) return choice;
            return inc.options.find((o) => !optionBlocker(state, inc, o.id))?.id;
          })();
    if (pick) cmd.resolveIncident(state, inc.id, pick);
  }
}

export function followDefaults(state: GameState, depositOffset = 0, loanOffset = 0): void {
  handleIncidents(state);
  for (const b of Object.values(state.branches)) {
    if (b.delegation.products) continue;
    const c = countryOfCity(state, b.cityId);
    for (const spec of Object.values(PRODUCTS)) {
      if (spec.priceType !== 'rate') continue;
      const offset = spec.category === 'deposits' ? depositOffset : loanOffset;
      cmd.setPrice(state, b.id, spec.id, roundToStep(defaultPrice(spec, c) + offset, spec.step));
    }
  }
}

export function buildCost(
  state: GameState,
  lot: Lot,
  build: BuildSpec = REFERENCE_BUILDS.mid,
): number {
  return cmd.buildQuote(state, lot.id, build).total;
}
