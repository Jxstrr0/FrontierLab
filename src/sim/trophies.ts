// Trophy assets (SIMULATION §22a): the top tier of personal purchases. The
// asking price is the catalogue price at your home price list (§4.6). An owned
// trophy's value follows that list as it steps each year, plus its own yearly
// drift, and its upkeep comes out of personal cash every week (tick step 11).
// Owning the airline makes every flight free (travel.ts).
import { TROPHIES_CFG, WEEKS_PER_YEAR } from '../config/balance';
import { TROPHIES } from '../data/trophies';
import { listLevel, listPrice } from './nominal';
import type { GameState, OwnedTrophy } from './state';

/** Today's asking price for a trophy (0 if unknown). */
export function trophyPrice(state: GameState, trophyId: string): number {
  const spec = TROPHIES[trophyId];
  return spec ? listPrice(state, spec.price) : 0;
}

/** The trophy you own with this id, if any. */
export function ownedTrophy(state: GameState, trophyId: string): OwnedTrophy | undefined {
  return state.personal.empire.trophies?.find((t) => t.trophyId === trophyId);
}

/** Weekly upkeep of an owned trophy at its value. */
export function trophyUpkeepWeekly(t: Pick<OwnedTrophy, 'trophyId' | 'value'>): number {
  return (t.value * (TROPHIES[t.trophyId]?.upkeep ?? 0)) / WEEKS_PER_YEAR;
}

/** What a sale raises: value less the broker's fee. */
export const trophySalePrice = (t: Pick<OwnedTrophy, 'value'>) =>
  t.value * (1 - TROPHIES_CFG.sellFee);

/** True when you own a trophy with this perk. */
export function hasTrophyPerk(state: GameState, perk: 'freeFlights'): boolean {
  return (state.personal.empire.trophies ?? []).some((t) => TROPHIES[t.trophyId]?.perk === perk);
}

/** Weekly (tick step 11): values follow the price list and drift; upkeep is paid. */
export function runTrophies(state: GameState): void {
  const level = listLevel(state);
  for (const t of state.personal.empire.trophies ?? []) {
    if (t.levelRef > 0) t.value *= level / t.levelRef;
    t.levelRef = level;
    t.value *= 1 + (TROPHIES[t.trophyId]?.drift ?? 0) / WEEKS_PER_YEAR;
    state.personal.cash -= trophyUpkeepWeekly(t);
  }
}
