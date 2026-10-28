// The scripted strategies from SIMULATION §25. Steady and aggressive grow their
// offices when busy and open one office per city, city by city (expansion.ts);
// turtle and nohq stay in the home city. Steady and aggressive also build one
// data center once rich (dataCenter.ts, C2c), and reserve GPU lots once spot
// runs short (compute.ts, C4c), and train new models (training.ts, C6b).
import { manageCompute } from './compute';
import { manageProjects } from './projects';
import { manageTraining } from './training';
import { maybeBuildDataCenter } from './dataCenter';
import { forceRecession } from './stress';
import {
  averageLot,
  bestLot,
  buildCost,
  followDefaults,
  handleIncidents,
  openBranch,
} from './common';
import { manageEquity, topUpRunway } from './equity';
import { hqReady, manageHq } from './hq';
import { cityFull, growableOffice, hasRoom, nextExpansionLot } from './expansion';
import type { Strategy } from './types';
import * as cmd from '../../src/sim/commands';
import { weeklyCosts } from '../../src/sim/cashCover';
import { runwaySnapshot } from '../../src/sim/runway';
import type { GameState } from '../../src/sim/state';

/** Weeks of running costs aggressive keeps in cash before it expands (C5a). */
const AGGRESSIVE_RESERVE_WEEKS = 3;
/** Steady keeps two weeks back, enough for a quarter's tax and a regulator fine (C7a). */
const STEADY_RESERVE_WEEKS = 2;
/** Weeks of running costs turtle keeps back before it grows its office (C8f). */
const TURTLE_RESERVE_WEEKS = 26;
/** Share of cash a week each strategy spends on a training run (C6b). */
const STEADY_TRAINING_SHARE = 0.01;
const AGGRESSIVE_TRAINING_SHARE = 0.015;

const DELEGATE_OPS = { staffing: true, loans: true, marketing: true, products: false };

/** True when the lab is not burning cash or has more than `months` of runway. */
function runwayClears(state: GameState, months: number): boolean {
  const { months: left } = runwaySnapshot(state);
  return left === null || left > months;
}

function firstBranch(state: GameState, lending: boolean, delegate = DELEGATE_OPS): void {
  const lot = averageLot(state);
  if (lot) openBranch(state, lot, { lending, delegate });
}

/**
 * Opens a branch when cash > mult × build cost and runway clears minRunway
 * months (runwayClears). With `travel`, it builds only on good lots and flies on to the next
 * city once the current one has none (expansion.ts); without, it stays home.
 */
function expand(
  state: GameState,
  mult: number,
  minRunway: number,
  lending: boolean,
  opts: { hq?: boolean; travel?: boolean; growRunway?: number; reserveWeeks?: number } = {},
): void {
  const { hq = true, travel = true, growRunway = minRunway, reserveWeeks = 0 } = opts;
  if (hq && !hqReady(state)) return;
  // Cash kept back for running costs (aggressive keeps a few weeks, C5a) and
  // the tax already owed, which is paid at the quarter's end.
  const reserve = reserveWeeks * weeklyCosts(state) + state.company.taxPayable;
  if (growOffice(state, mult, growRunway, Infinity, reserve)) return;
  if (travel && cityFull(state) && !runwayClears(state, minRunway)) return;
  if (!travel && !hasRoom(state, state.world.currentCityId)) return;
  const lot = travel ? nextExpansionLot(state) : bestLot(state);
  if (!lot) return;
  if (
    state.company.cash > mult * buildCost(state, lot) + reserve &&
    runwayClears(state, minRunway)
  ) {
    openBranch(state, lot, { lending, delegate: DELEGATE_OPS });
  }
}

/** Grows the busiest office a size when cash > mult × the cost and runway clears minRunway (C2a). */
function growOffice(
  state: GameState,
  mult: number,
  minRunway: number,
  maxSize = Infinity,
  reserve = 0,
): boolean {
  const office = growableOffice(state);
  if (office && (office.size ?? 0) >= maxSize) return false;
  const quote = office ? cmd.upgradeQuote(state, office.id) : undefined;
  if (!office || !quote) return false;
  if (state.company.cash <= mult * quote.total + reserve || !runwayClears(state, minRunway))
    return true;
  return cmd.upgradeOffice(state, office.id).ok;
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
    manageEquity(s, 6, 2);
    expand(s, 2, 6, true, { reserveWeeks: STEADY_RESERVE_WEEKS });
    maybeBuildDataCenter(s, 4);
    manageCompute(s);
    manageTraining(s, STEADY_TRAINING_SHARE);
    manageProjects(s);
  },
};

export const turtle: Strategy = {
  name: 'turtle',
  setup: (s) => firstBranch(s, false, { ...DELEGATE_OPS, loans: false }),
  weekly: (s) => {
    // One office can't afford half a year of plan cuts: a turtle holds its prices in a price war.
    handleIncidents(s, { PRICE_WAR: 'hold' });
    followDefaults(s);
    manageHq(s);
    topUpRunway(s);
    for (const r of Object.values(s.dealDesk.rfps))
      if (r.kind === 'new') cmd.declineApplication(s, r.id);
    // A turtle stays a Standard office: a bigger one needs an HQ team its
    // deposit-only income can't pay for.
    // C8f: a turtle grows its office only once the last quarter made money, with half a year of costs in hand.
    const profitable = (s.history.quarterly.at(-1)?.netIncome ?? 0) > 0;
    if (hqReady(s) && profitable) growOffice(s, 2, 0, 1, TURTLE_RESERVE_WEEKS * weeklyCosts(s));
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
    expand(s, 1.2, 3, true, { growRunway: 2, reserveWeeks: AGGRESSIVE_RESERVE_WEEKS });
    maybeBuildDataCenter(s, 3);
    manageCompute(s);
    manageTraining(s, AGGRESSIVE_TRAINING_SHARE);
    manageProjects(s);
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
    expand(s, 2, 6, true, { hq: false, travel: false });
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
