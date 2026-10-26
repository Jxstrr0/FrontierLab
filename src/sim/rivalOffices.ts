// Rival sales offices (stage C2b, SIMULATION §18.4): each rival lab holds one
// office per city, with a size from the same table as yours (OFFICE_SIZES). An
// office of size s counts as sizeMult(s) branches of the old network wherever
// books, costs, crowding and price weights are summed, so a city's rival
// strength carries over. Networks that meet in a city (mergers, splits,
// charters, old saves) fold into one office sized to hold both.
import { OFFICE_SIZES } from '../config/balance';
import { MAX_OFFICE_SIZE, sizeMultOf } from './branch/officeSize';
import { overallOf } from './rivals';
import type { GameState, RivalBank, RivalBranch } from './state';

/** A rival office's size multiplier: how many old-style branches it stands for. */
export function rivalMult(office: Pick<RivalBranch, 'size'>): number {
  return sizeMultOf(office.size ?? 0);
}

/** A rival's units across every city (the sum of its offices' multipliers). */
export function rivalUnits(bank: RivalBank): number {
  return bank.branches.reduce((sum, b) => sum + rivalMult(b), 0);
}

/** A rival's units in one city (0 when it has no office there). */
export function rivalUnitsIn(bank: RivalBank, cityId: string): number {
  const office = rivalOfficeIn(bank, cityId);
  return office ? rivalMult(office) : 0;
}

export function rivalOfficeIn(bank: RivalBank, cityId: string): RivalBranch | undefined {
  return bank.branches.find((b) => b.cityId === cityId);
}

/** The size whose multiplier is nearest `units` (ties go to the smaller). */
export function nearestSize(units: number): number {
  let best = 0;
  for (let s = 1; s <= MAX_OFFICE_SIZE; s++) {
    if (Math.abs(sizeMultOf(s) - units) < Math.abs(sizeMultOf(best) - units)) best = s;
  }
  return best;
}

/** Units the next size adds (0 at the largest). */
export function growStep(office: Pick<RivalBranch, 'size'>): number {
  const size = office.size ?? 0;
  if (size >= MAX_OFFICE_SIZE) return 0;
  return OFFICE_SIZES[size + 1]!.mult - OFFICE_SIZES[size]!.mult;
}

/**
 * Folds `from` into `into` (same city): books and reviews add, quality blends
 * by size, the office grows to the size nearest both, and `from`'s lot is freed.
 */
export function foldRivalOffice(state: GameState, into: RivalBranch, from: RivalBranch): void {
  const a = rivalMult(into);
  const b = rivalMult(from);
  into.quality = into.quality.map((q, i) => (q * a + from.quality[i]! * b) / (a + b)) as [
    number,
    number,
    number,
    number,
  ];
  into.overall = overallOf(into.quality);
  into.size = Math.max(into.size ?? 0, from.size ?? 0, nearestSize(a + b));
  into.deposits += from.deposits;
  into.loans += from.loans;
  into.contribution += from.contribution;
  into.reviewCount += from.reviewCount;
  into.openedWeek = Math.min(into.openedWeek, from.openedWeek);
  into.negativeWeeks = 0;
  if (from.lotId !== into.lotId) {
    const lot = state.world.lots[from.lotId];
    if (lot) delete lot.occupant;
  }
}

/**
 * Folds every office `bank` has in `cityId` into the first one, sized nearest
 * their combined units, with quality blended by units and books added; the
 * others' lots are freed. Used when seeding a city and for old saves.
 */
export function foldRivalCity(
  state: GameState,
  bank: RivalBank,
  cityId: string,
): RivalBranch | undefined {
  const here = bank.branches.filter((b) => b.cityId === cityId);
  const keeper = here[0];
  if (!keeper || here.length === 1) return keeper;
  const units = here.reduce((sum, b) => sum + rivalMult(b), 0);
  keeper.quality = keeper.quality.map(
    (_, i) => here.reduce((sum, b) => sum + b.quality[i]! * rivalMult(b), 0) / units,
  ) as RivalBranch['quality'];
  keeper.overall = overallOf(keeper.quality);
  for (const other of here.slice(1)) {
    keeper.deposits += other.deposits;
    keeper.loans += other.loans;
    keeper.contribution += other.contribution;
    keeper.reviewCount += other.reviewCount;
    keeper.openedWeek = Math.min(keeper.openedWeek, other.openedWeek);
    const lot = state.world.lots[other.lotId];
    if (lot?.occupant?.id === bank.id) delete lot.occupant;
  }
  keeper.size = nearestSize(units);
  bank.branches = bank.branches.filter((b) => b.cityId !== cityId || b === keeper);
  return keeper;
}

/**
 * Hands `office` to `taker`: it joins the taker's office in that city, or
 * becomes the taker's office there (and takes over the lot).
 */
export function giveRivalOffice(state: GameState, taker: RivalBank, office: RivalBranch): void {
  const own = rivalOfficeIn(taker, office.cityId);
  if (own) {
    foldRivalOffice(state, own, office);
    return;
  }
  taker.branches.push({ ...office, negativeWeeks: 0 });
  const lot = state.world.lots[office.lotId];
  if (lot) lot.occupant = { type: 'rival', id: taker.id };
}
