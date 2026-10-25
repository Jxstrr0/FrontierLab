// The scripted strategies from SIMULATION §25. Steady and aggressive expand
// city by city once home runs out of good lots (expansion.ts); turtle and nohq
// stay in the home city.
import { forceRecession } from './stress';
import { averageLot, bestLot, buildCost, followDefaults, openBranch } from './common';
import { manageEquity } from './equity';
import { hqReady, manageHq } from './hq';
import { cityFull, hasRoom, nextExpansionLot } from './expansion';
import type { Strategy } from './types';
import * as cmd from '../../src/sim/commands';
import type { GameState } from '../../src/sim/state';

const DELEGATE_OPS = { staffing: true, loans: true, marketing: true, products: false };

function firstBranch(state: GameState, lending: boolean, delegate = DELEGATE_OPS): void {
  const lot = averageLot(state);
  if (lot) openBranch(state, lot, { lending, delegate });
}

/**
 * Opens a branch when cash > mult × build cost and the capital ratio clears
 * minCr. With `travel`, it builds only on good lots and flies on to the next
 * city once the current one has none (expansion.ts); without, it stays home.
 */
function expand(
  state: GameState,
  mult: number,
  minCr: number,
  lending: boolean,
  opts: { hq?: boolean; travel?: boolean } = {},
): void {
  const { hq = true, travel = true } = opts;
  if (hq && !hqReady(state)) return;
  if (travel && cityFull(state) && state.company.capitalRatio <= minCr) return;
  if (!travel && !hasRoom(state, state.world.currentCityId)) return;
  const lot = travel ? nextExpansionLot(state) : bestLot(state);
  if (!lot) return;
  if (state.company.cash > mult * buildCost(state, lot) && state.company.capitalRatio > minCr) {
    openBranch(state, lot, { lending, delegate: DELEGATE_OPS });
  }
}

export const idle: Strategy = {
  name: 'idle',
  setup: (s) => firstBranch(s, true),
  weekly: () => {},
};

export const steady: Strategy = {
  name: 'steady',
  setup: (s) => firstBranch(s, true),
  weekly: (s) => {
    followDefaults(s);
    manageHq(s);
    manageEquity(s, 0.12, 2);
    expand(s, 2, 0.12, true);
  },
};

export const turtle: Strategy = {
  name: 'turtle',
  setup: (s) => firstBranch(s, false, { ...DELEGATE_OPS, loans: false }),
  weekly: (s) => {
    followDefaults(s);
    manageHq(s);
    for (const app of Object.values(s.loanDesk.applications)) cmd.declineApplication(s, app.id);
    const lot = hasRoom(s, s.world.currentCityId) ? bestLot(s) : undefined;
    if (lot && hqReady(s) && s.company.cash > 2 * buildCost(s, lot)) {
      const id = openBranchTurtle(s, lot.id);
      if (id) cmd.setDelegation(s, id, 'loans', false);
    }
  },
};

function openBranchTurtle(s: GameState, lotId: string): string | undefined {
  const lot = s.world.lots[lotId];
  if (!lot) return undefined;
  const r = openBranch(s, lot, { lending: false, delegate: { ...DELEGATE_OPS, loans: false } });
  if (r) cmd.setOffered(s, r, 'sbl', false);
  return r;
}

export const aggressive: Strategy = {
  name: 'aggressive',
  setup: (s) => {
    cmd.setRiskAppetite(s, 5);
    firstBranch(s, true);
  },
  weekly: (s) => {
    // Cheapest prices: savers get 0.5pp more, borrowers pay 0.5pp less.
    followDefaults(s, 0.005, -0.005);
    manageHq(s);
    expand(s, 1.2, 0.085, true);
  },
};

export const stress: Strategy = {
  name: 'stress',
  setup: (s) => {
    forceRecession(s);
    steady.setup(s);
  },
  weekly: steady.weekly,
};

/** Steady without ever leasing an HQ: shows what understaffing costs (Stage 4 acceptance). */
export const nohq: Strategy = {
  name: 'nohq',
  setup: steady.setup,
  weekly: (s) => {
    followDefaults(s);
    expand(s, 2, 0.12, true, { hq: false, travel: false });
  },
};

export const STRATEGIES: Record<string, Strategy> = {
  idle,
  steady,
  turtle,
  aggressive,
  stress,
  nohq,
};
