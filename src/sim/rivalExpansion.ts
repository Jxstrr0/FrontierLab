// Rival expansion and closures (SIMULATION §18.4). Monthly, a profitable,
// well-capitalised rival may open one branch on the best free storefront in a
// city it already serves (score = footTraffic × (1 − localShare) × incomeFit),
// while leaving the city room for you. Weekly, a branch whose contribution has
// been negative for 26 weeks (after its first year) closes and frees its lot.
import {
  RIVAL_CLOSURE,
  RIVAL_EXPANSION,
  RIVAL_FINANCE,
  RIVAL_PLACEMENT,
  RIVAL_QUALITY_SIGMA,
  RIVAL_RADIUS,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { DISTRICT_SPECS } from '../data/districts';
import { STRATEGY_PROFILES } from '../data/rivals';
import { tileDistance } from './citygen';
import { difficultyOf } from './difficulty';
import { pushEvent } from './events';
import { newId } from './ids';
import { clamp } from './math';
import { stream, type Rng } from './rng';
import { incomeFit, overallOf } from './rivals';
import type { GameState, Lot, RivalBank, RivalBranch } from './state';

/** Profit over the last four reported quarters (0 until a year has been reported). */
export function trailingProfit(bank: RivalBank): number {
  const n = RIVAL_EXPANSION.minQuarters;
  if (bank.quarters.length < n) return 0;
  return bank.quarters.slice(-n).reduce((sum, q) => sum + q.netIncome, 0);
}

/** Lots in a city, and whether rivals may still open there. */
function cityHasRoom(lots: Lot[]): boolean {
  if (lots.length === 0) return false;
  const free = lots.filter((l) => !l.occupant).length;
  const rival = lots.filter((l) => l.occupant?.type === 'rival').length;
  return (
    free / lots.length >= RIVAL_EXPANSION.minFreeLotShare &&
    rival / lots.length < RIVAL_EXPANSION.maxRivalLotShare
  );
}

/** score = footTraffic × (1 − localShare) × incomeFit(strategy) × jitter (§18.4). */
function bestExpansionLot(lots: Lot[], bank: RivalBank, rng: Rng): Lot | undefined {
  const branchLots = lots.filter((l) => l.occupant);
  let best: Lot | undefined;
  let bestScore = 0;
  for (const lot of lots) {
    if (lot.occupant) continue;
    let near = 0;
    let own = 0;
    for (const other of branchLots) {
      if (tileDistance(lot, other) > RIVAL_RADIUS) continue;
      near += 1;
      if (other.occupant?.type === 'rival' && other.occupant.id === bank.id) own += 1;
    }
    const localShare = own / (near + 1);
    const score =
      lot.footTraffic *
      (1 - localShare) *
      incomeFit(lot, bank.strategy) *
      rng.range(...RIVAL_PLACEMENT.jitter);
    if (score > bestScore) {
      bestScore = score;
      best = lot;
    }
  }
  return best;
}

/** Opens a branch for `bank` on `lot` with a fresh quality draw (rivalsAi stream). */
export function openRivalBranch(
  state: GameState,
  bank: RivalBank,
  lot: Lot,
  rng: Rng,
): RivalBranch {
  const shift = difficultyOf(state).rivalQuality;
  const quality = STRATEGY_PROFILES[bank.strategy].quality.map((q) =>
    clamp(q + shift + rng.normal(0, RIVAL_QUALITY_SIGMA), 1, 5),
  ) as [number, number, number, number];
  const branch: RivalBranch = {
    id: newId(state, `rb_${bank.id}`),
    cityId: lot.cityId,
    lotId: lot.id,
    openedWeek: state.clock.week,
    quality,
    overall: overallOf(quality),
    reviewCount: rng.int(...RIVAL_EXPANSION.reviews),
    deposits: 0,
    loans: 0,
    contribution: 0,
    negativeWeeks: 0,
  };
  lot.occupant = { type: 'rival', id: bank.id };
  bank.branches.push(branch);
  bank.equity -= RIVAL_EXPANSION.buildCost * (CITIES[lot.cityId]?.costIndex ?? 1);
  pushEvent(
    state,
    'RIVAL_BRANCH_OPENED',
    {
      rivalId: bank.id,
      bank: bank.name,
      lotId: lot.id,
      city: lot.cityId,
      district: DISTRICT_SPECS[lot.district]?.name ?? lot.district,
      address: lot.address,
    },
    3,
    lot.cityId,
  );
  return branch;
}

/** Monthly expansion check for every active rival (§18.4). */
export function runExpansion(state: GameState): void {
  if (state.clock.week % RIVAL_EXPANSION.everyWeeks !== 0) return;
  const rng = stream(state, 'rivalsAi');
  const allLots = Object.values(state.world.lots);
  const banks = Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const bank of banks) {
    if (bank.status !== 'active') continue;
    const chance = RIVAL_EXPANSION.chance * RIVAL_FINANCE[bank.strategy].expandMult;
    // Draw first so every rival consumes the stream the same way.
    const roll = rng.next();
    if (trailingProfit(bank) <= 0 || bank.capitalRatio <= RIVAL_EXPANSION.minCr) continue;
    if (roll >= chance) continue;
    const candidates: { lot: Lot; score: number }[] = [];
    for (const cityId of bank.cities) {
      const lots = allLots.filter((l) => l.cityId === cityId);
      if (!cityHasRoom(lots)) continue;
      const lot = bestExpansionLot(lots, bank, rng);
      if (lot) candidates.push({ lot, score: lot.footTraffic });
    }
    candidates.sort((a, b) => b.score - a.score);
    const pick = candidates[0];
    if (pick) openRivalBranch(state, bank, pick.lot, rng);
  }
}

/** Removes a branch from its bank and frees its lot. */
export function removeRivalBranch(state: GameState, bank: RivalBank, branch: RivalBranch): void {
  bank.branches = bank.branches.filter((b) => b.id !== branch.id);
  const lot = state.world.lots[branch.lotId];
  if (lot?.occupant?.id === bank.id) delete lot.occupant;
}

/** Weekly closure check: 26 negative weeks after the first year (§18.4). Keeps a bank's last branch. */
export function runClosures(state: GameState): void {
  for (const bank of Object.values(state.rivals)) {
    if (bank.status !== 'active') continue;
    for (const branch of [...bank.branches]) {
      const age = state.clock.week - branch.openedWeek;
      if (age < RIVAL_CLOSURE.graceWeeks) continue;
      branch.negativeWeeks = branch.contribution < 0 ? branch.negativeWeeks + 1 : 0;
      if (branch.negativeWeeks < RIVAL_CLOSURE.negativeWeeks || bank.branches.length <= 1) continue;
      const lot = state.world.lots[branch.lotId];
      removeRivalBranch(state, bank, branch);
      pushEvent(
        state,
        'RIVAL_BRANCH_CLOSED',
        {
          rivalId: bank.id,
          bank: bank.name,
          city: branch.cityId,
          district: lot ? (DISTRICT_SPECS[lot.district]?.name ?? lot.district) : '',
          address: lot?.address ?? '',
        },
        3,
        branch.cityId,
      );
    }
  }
}
