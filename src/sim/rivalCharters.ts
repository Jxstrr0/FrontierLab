// New rivals get chartered (SIMULATION §18.7). At each year end, a city with
// fewer active rival banks than usual (because you bought them, the regulator
// seized them, or they merged) may see a new bank open, and so, less often, may
// a full city with plenty of empty storefronts. A new bank is private, opens two
// or three branches in that city, and grows like any rival once it has a year
// of profits. Draws come from the `charters` stream so other rival draws never
// shift.
import { NAME_GEN, RIVAL_CHARTER, RIVAL_EXPANSION } from '../config/balance';
import { CITIES } from '../data/cities';
import {
  CHARTER_BRANDS,
  CHARTER_INKS,
  CHARTER_STEMS,
  CHARTER_SUFFIXES,
} from '../data/rivalCharters';
import type { Strategy } from '../data/rivals';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { pushEvent } from './events';
import { coinedBrand, placeStem } from './nameGen';
import { initRivalShares } from './marketInit';
import { nominalIndex } from './nominal';
import { countryOfCity } from './rates';
import { stream, type Rng } from './rng';
import { rivalCapitalRatio } from './rivalBooks';
import { bestExpansionLot, openRivalBranch } from './rivalExpansion';
import { nearestSize } from './rivalOffices';
import { competitorsFor, initRivalBench, newRivalBank } from './rivals';
import type { GameState, Lot, RivalBank } from './state';

/** Active rival banks with a branch in a city. */
export function activeRivalsIn(state: GameState, cityId: string): RivalBank[] {
  return Object.values(state.rivals).filter(
    (r) => r.status === 'active' && r.branches.some((b) => b.cityId === cityId),
  );
}

/** The chance a city charters a bank this year (0 when it has no room for one). */
export function charterChance(state: GameState, cityId: string, lots: Lot[]): number {
  const city = CITIES[cityId];
  if (!city || city.regional || lots.length === 0) return 0;
  const free = lots.filter((l) => !l.occupant).length;
  if (free < RIVAL_CHARTER.branches[1] || free / lots.length < RIVAL_EXPANSION.minFreeLotShare)
    return 0;
  if (activeRivalsIn(state, cityId).length < competitorsFor(state, cityId))
    return RIVAL_CHARTER.chance;
  return free / lots.length >= RIVAL_CHARTER.roomShare ? RIVAL_CHARTER.roomChance : 0;
}

/** A name no rival has used: stem + strategy suffix, or a one-word brand for disruptors. */
function charterName(state: GameState, strategy: Strategy, rng: Rng): string {
  const taken = new Set(Object.values(state.rivals).map((r) => r.name));
  for (let i = 0; i < NAME_GEN.tries; i++) {
    // A listed stem or brand some of the time, else a generated one (NAME_GEN.listedName).
    const listed = rng.chance(NAME_GEN.listedName);
    const name =
      strategy === 'disruptor'
        ? listed
          ? rng.pick(CHARTER_BRANDS)
          : coinedBrand(rng)
        : `${listed ? rng.pick(CHARTER_STEMS) : placeStem(rng)} ${rng.pick(CHARTER_SUFFIXES[strategy])}`;
    if (!taken.has(name)) return name;
  }
  // Every short name is used: number the next one.
  const base = `${rng.pick(CHARTER_STEMS)} Bank`;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

/** Founds a bank in a city and opens its first branches; returns it (undefined if no lot fits). */
export function charterRival(state: GameState, cityId: string, rng: Rng): RivalBank | undefined {
  const c = countryOfCity(state, cityId);
  const w = RIVAL_CHARTER.strategyWeights;
  const strategy = rng.pickWeighted<Strategy>(
    (Object.keys(w) as Strategy[]).map((item) => ({ item, weight: w[item] })),
  );
  let n = 1;
  while (state.rivals[`charter${n}`]) n += 1;
  const bank = newRivalBank(
    state,
    {
      id: `charter${n}`,
      name: charterName(state, strategy, rng),
      strategy,
      ink: rng.pick(CHARTER_INKS),
    },
    c,
  );
  bank.home = [c.id];
  bank.charteredWeek = state.clock.week;
  bank.cities = [cityId];
  bank.equity = RIVAL_CHARTER.capital * nominalIndex(state, cityId);
  bank.ceo = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  initRivalShares(bank);
  initRivalBench(state, bank);
  const lots = Object.values(state.world.lots).filter((l) => l.cityId === cityId);
  // One office (C2b), sized for the branches a charter used to open.
  const count = rng.int(...RIVAL_CHARTER.branches);
  const lot = bestExpansionLot(lots, bank, rng);
  if (lot) openRivalBranch(state, bank, lot, rng, nearestSize(count));
  if (bank.branches.length === 0) {
    delete state.rivals[bank.id];
    return undefined;
  }
  bank.capitalRatio = rivalCapitalRatio(bank);
  pushEvent(
    state,
    'RIVAL_CHARTERED',
    { rivalId: bank.id, bank: bank.name, city: cityId, strategy, branches: bank.branches.length },
    6,
    cityId,
  );
  return bank;
}

/** Year end (tick step 14): cities short of rivals, or with room to spare, may charter a bank. */
export function charterRivals(state: GameState): void {
  const rng = stream(state, 'charters');
  const allLots = Object.values(state.world.lots);
  let founded = 0;
  for (const cityId of Object.keys(state.world.cities).sort()) {
    // Draw first so every city consumes the stream the same way.
    const roll = rng.next();
    if (founded >= RIVAL_CHARTER.maxPerYear) continue;
    const lots = allLots.filter((l) => l.cityId === cityId);
    if (roll >= charterChance(state, cityId, lots)) continue;
    if (charterRival(state, cityId, rng)) founded += 1;
  }
}
