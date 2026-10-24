// Tick orchestration (SIMULATION §2). `advanceDay` moves the clock and resolves
// scheduled events; every 7th day runs `weeklyTick`, which calls each system in
// the documented order. Stage 1 runs steps 1–4, 6, 8–10, 13 and 14.
import { DAYS_PER_WEEK } from '../config/balance';
import { runBooks } from './branch/books';
import { addBranchCosts, closeBranchWeek } from './branch/branchPnl';
import { runDelegation } from './branch/delegation';
import { runDemand } from './branch/demand';
import { pruneLoans, runLoanDesk } from './branch/loanDesk';
import { campaignEffects, updateAwareness, updateBrandAwareness } from './branch/marketing';
import { addReviews, updateRatings } from './branch/ratings';
import { updateStaff } from './branch/staff';
import { emptyWeek } from './branch/week';
import { isQuarterStart, isYearStart } from './calendar';
import { evaluateCapital } from './capital';
import { checkFailure } from './failure';
import { updateAppRating } from './company';
import { pushEvent, trimEvents } from './events';
import { updateMacro } from './macro';
import { refreshManagerPool } from './people';
import { ftpLong, ftpShort, updateMarketRefs } from './rates';
import { repriceRivalFees, updateRivalPrices } from './rivals';
import type { Branch, GameState } from './state';
import { closeWeek, depreciate, quarterEnd } from './statements';
import { runTreasury } from './treasury';
import { PRODUCTS } from '../data/products';

/** Advances one game day; runs the weekly tick on every 7th day. */
export function advanceDay(state: GameState): void {
  if (state.flags.gameOver) return;
  state.clock.day += 1;
  state.clock.week = Math.floor(state.clock.day / DAYS_PER_WEEK);
  resolveScheduled(state);
  if (state.clock.day % DAYS_PER_WEEK === 0) weeklyTick(state);
}

/** Advances whole weeks (headless runs and tests). */
export function advanceWeeks(state: GameState, weeks: number): void {
  for (let i = 0; i < weeks * DAYS_PER_WEEK; i++) advanceDay(state);
}

function resolveScheduled(state: GameState): void {
  const due = state.events.scheduled.filter((e) => e.day <= state.clock.day);
  if (due.length === 0) return;
  state.events.scheduled = state.events.scheduled.filter((e) => e.day > state.clock.day);
  for (const e of due) {
    if (e.type === 'fitoutDone') {
      const branch = state.branches[e.payload.branchId];
      if (branch && branch.status === 'fitout') {
        branch.status = 'open';
        branch.openedWeek = state.clock.week;
        pushEvent(state, 'BRANCH_OPENED', { branchId: branch.id, name: branch.name }, 1, branch.id);
      }
    }
  }
}

export function weeklyTick(state: GameState): void {
  updateMacro(state); // 1
  updateRivalPrices(state); // 3 (before references so m(p) is this week's)
  updateMarketRefs(state); // 2
  for (const branch of Object.values(state.branches)) {
    if (branch.status === 'open') runBranch(state, branch); // 4
  }
  updateBrandAwareness(state);
  runTreasury(state); // 6
  updateAppRating(state); // 7
  depreciate(state); // 8
  closeWeek(state); // 9
  evaluateCapital(state); // 10
  checkFailure(state);

  if (isQuarterStart(state.meta.startDate, state.clock.day)) quarterEnd(state); // 13
  if (isYearStart(state.meta.startDate, state.clock.day)) yearEnd(state); // 14

  for (const cityId of Object.keys(state.world.cities)) refreshManagerPool(state, cityId);
  for (const c of Object.values(state.world.countries)) {
    if (!c) continue;
    c.prevFtpShort = ftpShort(c);
    c.prevFtpLong = ftpLong(c);
  }
  pruneLoans(state);
  trimEvents(state);
}

/** Tick step 4 for one open branch, in the documented order. */
function runBranch(state: GameState, branch: Branch): void {
  runDelegation(state, branch);
  updateStaff(state, branch); // 4.1
  const fx = campaignEffects(branch);
  updateAwareness(state, branch, fx); // 4.3
  updateRatings(state, branch, fx); // 4.4
  const demand = runDemand(state, branch, fx); // 4.2 capacity + 4.5 demand
  branch.capacity = demand.capacity;
  branch.waitIndex = demand.wait;
  branch.last = {
    prospects: demand.prospects,
    captured: demand.captured,
    served: demand.served,
    share: demand.share,
  };
  const wk = emptyWeek();
  runBooks(state, branch, demand, fx, wk); // 4.6
  runLoanDesk(state, branch, fx, wk); // 4.7
  let newDepositAccounts = 0;
  for (const [pid, o] of Object.entries(demand.byProduct)) {
    if (PRODUCTS[pid]?.category === 'deposits') newDepositAccounts += o.newAccounts;
  }
  addBranchCosts(state, branch, fx, wk, newDepositAccounts);
  closeBranchWeek(state, branch, wk); // 4.8
  addReviews(state, branch, demand.served, fx);
}

function yearEnd(state: GameState): void {
  for (const c of Object.values(state.world.countries)) {
    if (c) c.feeIndex *= 1 + c.inflation / 100;
  }
  repriceRivalFees(state);
}
