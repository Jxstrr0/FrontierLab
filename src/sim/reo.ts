// Foreclosed homes, tick step 8 (SIMULATION §21.3). Defaulted mortgages leave
// a pool per city (books.ts addReo). Each week the pool's value follows the
// country's house price index (a non-cash propertyGains mark); Hold and Rent
// carry a 6%/yr cost, Rent also earns 4.5%/yr at 90% occupancy, and a Sell all
// settles at its sell week for 90% of value: the cash is investing cash and the
// 10% haircut a property loss. New foreclosures afterwards start a fresh pool.
import { REO, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import { pushEvent } from './events';
import { earn, postCash, postPnl, spend } from './ledger';
import type { GameState, ReoPool } from './state';

/** The house price index of the city's country (100 if unknown). */
export function cityHpi(state: GameState, cityId: string): number {
  const country = CITIES[cityId]?.country;
  return (country && state.world.countries[country]?.hpi) || 100;
}

/** §21.3: this week's carrying cost (Hold and Rent) and rent income (Rent only). */
export function reoWeek(pool: ReoPool): { carrying: number; rent: number } {
  const carrying = pool.mode === 'selling' ? 0 : (pool.value * REO.carryingCost) / WEEKS_PER_YEAR;
  const rent =
    pool.mode === 'rent' ? ((pool.value * REO.rentYield) / WEEKS_PER_YEAR) * REO.rentOcc : 0;
  return { carrying, rent };
}

/** Tick step 8 for foreclosed homes. */
export function runReo(state: GameState): void {
  for (const cityId of Object.keys(state.reo).sort()) {
    const pool = state.reo[cityId]!;
    markToHpi(state, cityId, pool);
    const wk = reoWeek(pool);
    if (wk.carrying > 0) spend(state, 'propertyCosts', wk.carrying);
    if (wk.rent > 0) earn(state, 'rentalIncome', wk.rent);
    if (pool.mode === 'selling' && pool.sellWeek !== undefined && state.clock.week >= pool.sellWeek)
      settleSale(state, cityId, pool);
  }
}

/** Value tracks hpi: value × hpi / hpiRef, the change posted to propertyGains. */
function markToHpi(state: GameState, cityId: string, pool: ReoPool): void {
  const hpi = cityHpi(state, cityId);
  if (pool.hpiRef > 0 && hpi !== pool.hpiRef) {
    const next = (pool.value * hpi) / pool.hpiRef;
    postPnl(state, 'propertyGains', next - pool.value);
    pool.value = next;
  }
  pool.hpiRef = hpi;
}

/** Sell all completes: 90% of value in cash, the rest a property loss; the pool empties. */
function settleSale(state: GameState, cityId: string, pool: ReoPool): void {
  const price = pool.value * REO.sellPrice;
  postCash(state, price, 'investing');
  postPnl(state, 'propertyGains', price - pool.value);
  delete state.reo[cityId];
  pushEvent(
    state,
    'REO_SOLD',
    { cityId, city: CITIES[cityId]?.name ?? cityId, units: Math.round(pool.units), price },
    3,
    cityId,
  );
}
