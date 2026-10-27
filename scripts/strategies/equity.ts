// Equity raises for scripted strategies (SIMULATION §25: "Capital first binds
// years 1–3; placements and the IPO are the growth fuel"). Through the city's
// investment bank: a private placement whenever cash binds (runway near the
// strategy's expansion gate) and cash is short of a new branch; the IPO as
// soon as the lab is eligible; once listed, a secondary offering when cash
// binds again.
import { PLACEMENT, SECONDARY } from '../../src/config/balance';
import { investmentBanksIn } from '../../src/data/investmentBanks';
import * as cmd from '../../src/sim/commands';
import { ipoEligible, placementStatus } from '../../src/sim/equityOffers';
import { runwayHealthy, runwaySnapshot } from '../../src/sim/runway';
import type { GameState } from '../../src/sim/state';
import { bestLot, buildCost } from './common';

/** Cash binds when runway is within this many months of the expansion gate. */
const BIND_MARGIN = 1;
/** IPO float: the public's share after listing. */
const IPO_FLOAT = 0.25;
/** Weeks between secondary offerings. */
const SECONDARY_GAP = 26;
/** Week of each game's last secondary offering (the script's own memory). */
const lastSecondary = new WeakMap<GameState, number>();

/** True when runway (months) is near the gate and cash can't fund another branch. */
function capitalBinds(state: GameState, gate: number, cashMult: number): boolean {
  const lot = bestLot(state);
  const cost = lot ? buildCost(state, lot) : 0;
  const { months } = runwaySnapshot(state);
  return months !== null && months < gate + BIND_MARGIN && state.company.cash < cashMult * cost;
}

export function manageEquity(state: GameState, gate: number, cashMult: number): void {
  const bankId = investmentBanksIn(state.world.currentCityId)[0];
  if (!bankId) return;
  const stock = state.stock;
  if (stock.status === 'private' && !stock.ipo) {
    if (ipoEligible(state)) {
      cmd.launchIpo(state, bankId, IPO_FLOAT);
      return;
    }
    const rounds = placementStatus(state);
    if (
      rounds.left > 0 &&
      state.clock.week >= rounds.nextWeek &&
      capitalBinds(state, gate, cashMult)
    )
      cmd.privatePlacement(state, bankId, PLACEMENT.maxPct);
    return;
  }
  if (stock.status !== 'public') return;
  const since = state.clock.week - (lastSecondary.get(state) ?? -Infinity);
  if (since >= SECONDARY_GAP && capitalBinds(state, gate, cashMult)) {
    if (cmd.secondaryOffering(state, bankId, SECONDARY.maxPct / 2).ok)
      lastSecondary.set(state, state.clock.week);
  }
}

/**
 * A cautious founder's top-up: no IPO, but once runway falls out of
 * Comfortable, a private placement (or, once listed, a secondary) of half the
 * largest size, as the CFO's Share sales switch would.
 */
export function topUpRunway(state: GameState): void {
  if (runwayHealthy(runwaySnapshot(state).tier)) return;
  const bankId = investmentBanksIn(state.world.currentCityId)[0];
  if (!bankId) return;
  if (state.stock.status === 'public') {
    const since = state.clock.week - (lastSecondary.get(state) ?? -Infinity);
    if (since >= SECONDARY_GAP && cmd.secondaryOffering(state, bankId, SECONDARY.maxPct / 2).ok)
      lastSecondary.set(state, state.clock.week);
    return;
  }
  const rounds = placementStatus(state);
  if (state.stock.ipo || rounds.left <= 0 || state.clock.week < rounds.nextWeek) return;
  cmd.privatePlacement(state, bankId, PLACEMENT.maxPct / 2);
}
