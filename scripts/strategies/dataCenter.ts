// Data centers for the scripted strategies (stage C2c, SIMULATION §25): once the
// lab is well off (year ≥ DC_FROM_YEAR, cash > mult × the cost), build one on the
// busiest free lot in a city where it runs a sales office, for the Service lift.
import { WEEKS_PER_YEAR } from '../../src/config/balance';
import { DEFAULT_DC_BUILD } from '../../src/data/dataCenters';
import * as cmd from '../../src/sim/commands';
import { officeInCity } from '../../src/sim/branch/officeSize';
import type { GameState } from '../../src/sim/state';
import { bestLot } from './common';

const DC_FROM_YEAR = 5;

export function maybeBuildDataCenter(state: GameState, mult: number): void {
  if (Object.keys(state.dataCenters).length > 0) return;
  if (state.clock.week < DC_FROM_YEAR * WEEKS_PER_YEAR) return;
  if (!officeInCity(state, state.world.currentCityId)) return;
  const lot = bestLot(state);
  if (!lot) return;
  const where = { lotId: lot.id };
  const quote = cmd.dataCenterQuote(state, where, DEFAULT_DC_BUILD);
  if (state.company.cash <= mult * quote.total) return;
  cmd.buildDataCenter(state, { where, build: DEFAULT_DC_BUILD });
}
