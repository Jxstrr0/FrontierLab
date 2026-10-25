// The founder's homes and cars over time (SIMULATION §22), tick step 11: home
// values follow their country's hpi, rebuilds finish (+HOMES_CFG.rebuildGain),
// cars lose CARS_CFG.depreciation a year (classics gain classicGain), and
// upkeep for both comes out of personal cash. Also keeps the weekly net worth
// log the Personal Wealth screen reads. Collectibles'
// drift and insurance live with the auctions (auctions.ts); insider cases
// resolve at quarter-end (insider.ts).
import { HOMES_CFG, WEALTH_HISTORY_WEEKS, WEEKS_PER_YEAR } from '../config/balance';
import { HOMES } from '../data/homes';
import { pushEvent } from './events';
import { netWorth } from './netWorth';
import { carUpkeepWeekly, carYearlyChange, homeHpi, homeUpkeepWeekly } from './personalValues';
import type { GameState } from './state';

export { insiderQuarter } from './insider';

/** Weekly (tick step 11): asset values, rebuilds and upkeep. */
export function runPersonalAssets(state: GameState): void {
  if (state.flags.gameOver) return;
  runHomes(state);
  runCars(state);
}

function runHomes(state: GameState): void {
  const week = state.clock.week;
  for (const home of state.personal.empire.homes) {
    // §22: the value tracks the country's house prices since it was last marked.
    const hpi = homeHpi(state, home.homeId);
    if (home.hpiRef > 0) home.value *= hpi / home.hpiRef;
    home.hpiRef = hpi;
    if (home.rebuildDoneWeek !== undefined && week >= home.rebuildDoneWeek) {
      home.value *= 1 + HOMES_CFG.rebuildGain;
      home.rebuilds = (home.rebuilds ?? 0) + 1;
      delete home.rebuildDoneWeek;
      pushEvent(state, 'HOME_REBUILT', {
        homeId: home.homeId,
        name: HOMES[home.homeId]?.name ?? home.homeId,
        value: home.value,
      });
    }
    state.personal.cash -= homeUpkeepWeekly(home.value);
  }
}

function runCars(state: GameState): void {
  for (const car of state.personal.empire.cars) {
    car.value *= 1 + carYearlyChange(car.carId) / WEEKS_PER_YEAR;
    state.personal.cash -= carUpkeepWeekly(car.value);
  }
}

/** End of the weekly tick (after markets): logs net worth for the weekly change. */
export function recordNetWorth(state: GameState): void {
  const e = state.personal.empire;
  const log = (e.netWorthLog ??= []);
  log.push(netWorth(state).total);
  if (log.length > WEALTH_HISTORY_WEEKS) log.splice(0, log.length - WEALTH_HISTORY_WEEKS);
}

/**
 * Change against the close before this week's (the figure the screen showed a
 * week ago), so a fresh tick reads as this week's move. Undefined until two
 * weeks have closed.
 */
export function netWorthWeeklyChange(state: GameState): number | undefined {
  const prev = state.personal.empire.netWorthLog?.at(-2);
  return prev === undefined ? undefined : netWorth(state).total - prev;
}
