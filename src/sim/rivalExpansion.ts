// Rival expansion and closures (SIMULATION §18.4, C2b). Each rival lab holds
// one sales office per city. Monthly, a profitable rival with runway to spare
// may grow its office a size in each city it serves (the chance is divided by the
// units the step adds, so a network grows about as fast as when it opened
// branches), while leaving the city room for you, and a rival with a network
// may enter a new city on its best free storefront (score = footTraffic ×
// (1 − localShare) × incomeFit): one in a home country, or anywhere once it
// serves a few. Weekly, an office whose contribution has been negative for 26
// weeks (after its first year) shrinks a size, or closes when it is a Starter.
import {
  RIVAL_BOOKS,
  RIVAL_CLOSURE,
  RIVAL_EXPANSION,
  RIVAL_PLACEMENT,
  RIVAL_QUALITY_SIGMA,
  RIVAL_RADIUS,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { DISTRICT_SPECS } from '../data/districts';
import { RIVALS, STRATEGY_PROFILES } from '../data/rivals';
import { roomLot, tileDistance } from './citygen';
import { difficultyOf } from './difficulty';
import { pushEvent } from './events';
import { newId } from './ids';
import { clamp } from './math';
import { countryOfCity } from './rates';
import { syncRivalEquity, unitBuildCost } from './rivalFinance';
import { stream, type Rng } from './rng';
import { incomeFit, overallOf } from './rivals';
import { sizeMult, sizeName } from './branch/officeSize';
import { growStep, rivalMult, rivalOfficeIn, rivalUnits, rivalUnitsIn } from './rivalOffices';
import type { GameState, Lot, RivalBank, RivalBranch } from './state';

/** Profit over the last four reported quarters (0 until a year has been reported). */
export function trailingProfit(bank: RivalBank): number {
  const n = RIVAL_EXPANSION.minQuarters;
  if (bank.quarters.length < n) return 0;
  return bank.quarters.slice(-n).reduce((sum, q) => sum + q.netIncome, 0);
}

/**
 * Whether rivals may still grow in a city (§18.4). Offices count by size (C2b):
 * an office of size s fills sizeMult(s) storefronts' worth of the city, yours
 * and theirs.
 */
export function cityHasRoom(state: GameState, cityId: string, lots: Lot[]): boolean {
  if (lots.length === 0) return false;
  let rival = 0;
  for (const bank of Object.values(state.rivals)) {
    if (bank.status === 'active') rival += rivalUnitsIn(bank, cityId);
  }
  let yours = 0;
  for (const b of Object.values(state.branches)) {
    if (b.cityId === cityId && b.status !== 'closed') yours += sizeMult(b);
  }
  const free = lots.length - rival - yours;
  return (
    free / lots.length >= RIVAL_EXPANSION.minFreeLotShare &&
    rival / lots.length < RIVAL_EXPANSION.maxRivalLotShare
  );
}

/** score = footTraffic × (1 − localShare) × incomeFit(strategy) × jitter (§18.4). */
export function bestExpansionLot(lots: Lot[], bank: RivalBank, rng: Rng): Lot | undefined {
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

/** Opens an office of `size` for `bank` on `lot` with a fresh quality draw (rivalsAi stream). */
export function openRivalBranch(
  state: GameState,
  bank: RivalBank,
  lot: Lot,
  rng: Rng,
  size = 0,
): RivalBranch {
  const shift = difficultyOf(state).rivalQuality;
  const quality = STRATEGY_PROFILES[bank.strategy].quality.map((q) =>
    clamp(q + shift + rng.normal(0, RIVAL_QUALITY_SIGMA), 1, 5),
  ) as [number, number, number, number];
  const branch: RivalBranch = {
    id: newId(state, `rb_${bank.id}`),
    cityId: lot.cityId,
    lotId: lot.id,
    size,
    openedWeek: state.clock.week,
    quality,
    overall: overallOf(quality),
    reviewCount: rng.int(...RIVAL_EXPANSION.reviews),
    customers: 0,
    arr: 0,
    contribution: 0,
    negativeWeeks: 0,
  };
  lot.occupant = { type: 'rival', id: bank.id };
  bank.branches.push(branch);
  // Cash becomes an office at the same value, so equity is unchanged (§18.1).
  bank.cash -= unitBuildCost(state, lot.cityId) * rivalMult(branch);
  syncRivalEquity(state, bank);
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

/**
 * §18.4: a rival can pay a build when the cash left afterwards still covers
 * RIVAL_EXPANSION.minRunwayWeeks of its running costs.
 */
export function canAffordBuild(bank: RivalBank, cost: number): boolean {
  return bank.cash - cost >= RIVAL_EXPANSION.minRunwayWeeks * bank.costs;
}

/** Grows a rival's office one size, paying for the units it adds (C2b). */
export function growRivalOffice(state: GameState, bank: RivalBank, office: RivalBranch): void {
  const step = growStep(office);
  if (step <= 0) return;
  bank.cash -= unitBuildCost(state, office.cityId) * step;
  office.size += 1;
  syncRivalEquity(state, bank);
  pushEvent(
    state,
    'RIVAL_OFFICE_GROWN',
    { rivalId: bank.id, bank: bank.name, city: office.cityId, size: sizeName(office.size) },
    3,
    office.cityId,
  );
}

/**
 * Monthly expansion check for every active rival (§18.4, C2b): a roll per
 * city it serves to grow its office there (so a wider network grows faster),
 * then one roll to enter a new city.
 */
export function runExpansion(state: GameState): void {
  if (state.clock.week % RIVAL_EXPANSION.everyWeeks !== 0) return;
  const rng = stream(state, 'rivalsAi');
  const allLots = Object.values(state.world.lots);
  const banks = Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const bank of banks) {
    if (bank.status !== 'active') continue;
    const mult = RIVAL_BOOKS.strategy[bank.strategy].expandMult;
    const chance = RIVAL_EXPANSION.chance * mult;
    const eligible = trailingProfit(bank) > 0;
    for (const cityId of [...bank.cities].sort()) {
      // Draw first so every rival consumes the stream the same way.
      const roll = rng.next();
      const office = rivalOfficeIn(bank, cityId);
      // A step that adds more units is rarer, so units grow at `chance` a city.
      const step = office ? growStep(office) : 1;
      if (!eligible || step <= 0 || roll >= chance / step) continue;
      // The build must leave the lab its runway (§18.4).
      if (!canAffordBuild(bank, unitBuildCost(state, cityId) * step)) continue;
      const lots = allLots.filter((l) => l.cityId === cityId);
      if (!cityHasRoom(state, cityId, lots)) continue;
      if (office) {
        growRivalOffice(state, bank, office);
      } else {
        // A city it serves without an office (one closed): reopen there.
        const lot = bestExpansionLot(lots, bank, rng);
        if (lot) openRivalBranch(state, bank, lot, rng);
      }
    }
    const entry = rng.next();
    if (!eligible || entry >= RIVAL_EXPANSION.entryChance * mult) continue;
    if (rivalUnits(bank) < RIVAL_EXPANSION.entryMinUnits) continue;
    const cityId = entryCity(state, bank, allLots);
    if (cityId && canAffordBuild(bank, unitBuildCost(state, cityId)))
      enterCity(state, bank, cityId, allLots, rng);
  }
}

/**
 * The city a rival enters next (§18.4): a generated city with storefronts that
 * it doesn't serve, in one of its home countries, or anywhere once it serves
 * `abroadMinCities` cities; the one with the most free lots, ties by id.
 */
export function entryCity(state: GameState, bank: RivalBank, allLots: Lot[]): string | undefined {
  const home = bank.home ?? RIVALS[bank.id]?.home ?? [];
  const abroad = bank.cities.length >= RIVAL_EXPANSION.abroadMinCities;
  let best: string | undefined;
  let bestFree = 0;
  for (const cityId of Object.keys(state.world.cities).sort()) {
    const city = CITIES[cityId];
    if (!city || city.regional || bank.cities.includes(cityId)) continue;
    if (!abroad && !home.includes(city.country)) continue;
    const lots = allLots.filter((l) => l.cityId === cityId);
    if (!cityHasRoom(state, cityId, lots)) continue;
    // Storefronts held by businesses (C5a) still count as the city's room.
    const free = lots.filter(roomLot).length;
    if (free > bestFree) {
      bestFree = free;
      best = cityId;
    }
  }
  return best;
}

/** Opens a rival's first office in a city and adds the city to its network. */
function enterCity(state: GameState, bank: RivalBank, cityId: string, allLots: Lot[], rng: Rng) {
  const lots = allLots.filter((l) => l.cityId === cityId);
  const lot = bestExpansionLot(lots, bank, rng);
  if (!lot) return;
  bank.cities.push(cityId);
  openRivalBranch(state, bank, lot, rng);
  pushEvent(
    state,
    'RIVAL_CITY_ENTRY',
    {
      rivalId: bank.id,
      bank: bank.name,
      city: cityId,
      district: DISTRICT_SPECS[lot.district]?.name ?? lot.district,
      address: lot.address,
      cities: bank.cities.length,
    },
    5,
    cityId,
  );
}

/** Removes an office from its bank and frees its lot. */
export function removeRivalBranch(state: GameState, bank: RivalBank, branch: RivalBranch): void {
  bank.branches = bank.branches.filter((b) => b.id !== branch.id);
  const lot = state.world.lots[branch.lotId];
  if (lot?.occupant?.id === bank.id) delete lot.occupant;
}

/**
 * Weekly closure check: 26 negative weeks after the first year, outside
 * downturns (§18.4). A bigger office shrinks a size, losing that share of its
 * books (C2b); a Starter closes, except a bank's last office.
 */
export function runClosures(state: GameState): void {
  for (const bank of Object.values(state.rivals)) {
    if (bank.status !== 'active') continue;
    for (const branch of [...bank.branches]) {
      const age = state.clock.week - branch.openedWeek;
      if (age < RIVAL_CLOSURE.graceWeeks) continue;
      // A downturn doesn't count toward closing (RIVAL_CLOSURE.holdPhases).
      const phase = countryOfCity(state, branch.cityId).phase;
      if (RIVAL_CLOSURE.holdPhases.includes(phase)) continue;
      branch.negativeWeeks = branch.contribution < 0 ? branch.negativeWeeks + 1 : 0;
      if (branch.negativeWeeks < RIVAL_CLOSURE.negativeWeeks) continue;
      if (branch.size > 0) {
        shrinkRivalOffice(state, bank, branch);
        continue;
      }
      if (bank.branches.length <= 1) continue;
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

/** Shrinks an office a size; its books shrink in proportion (C2b). */
export function shrinkRivalOffice(state: GameState, bank: RivalBank, office: RivalBranch): void {
  const before = rivalMult(office);
  office.size -= 1;
  const keep = rivalMult(office) / before;
  office.customers *= keep;
  office.arr *= keep;
  office.negativeWeeks = 0;
  syncRivalEquity(state, bank);
  pushEvent(
    state,
    'RIVAL_OFFICE_SHRUNK',
    { rivalId: bank.id, bank: bank.name, city: office.cityId, size: sizeName(office.size) },
    3,
    office.cityId,
  );
}
