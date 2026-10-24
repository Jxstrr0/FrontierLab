// Tick orchestration (SIMULATION §2). `advanceDay` moves the clock and resolves
// scheduled events; every 7th day runs `weeklyTick`, which calls each system in
// the documented order.
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
import { runExecutives } from './executives';
import { governanceQuarter, runGovernance } from './governance';
import { marketsQuarter, runMarkets } from './market';
import { runFx } from './fx';
import { runMergers } from './mergers';
import { conventionsYear, runConventions } from './conventions';
import { runLobbying } from './lobbying';
import { runRealEstate } from './realEstate';
import { runReo } from './reo';
import { runVentures, venturesQuarter } from './ventures';
import { runPersonal } from './personal';
import { checkFailure } from './failure';
import { updateAppRating } from './company';
import { pushEvent, trimEvents } from './events';
import { refreshFundingOffers } from './fundingMarket';
import { runDevelopments } from './development';
import { runHq } from './hq';
import { runBrandMarketing } from './hqMarketing';
import { updateMacro } from './macro';
import { runCorporateDebt } from './corporateDebt';
import { runIncidents } from './incidents';
import { composeNews } from './news';
import { runPartnerships } from './partnerships';
import { rivalsQuarter, runRivals } from './rivalAi';
import { refreshManagerPool } from './people';
import { ftpLong, ftpShort, updateMarketRefs } from './rates';
import { regulatorReview } from './riskFloor';
import { repriceRivalFees, updateRivalPrices } from './rivals';
import type { Branch, GameState } from './state';
import { closeWeek, depreciate, quarterEnd } from './statements';
import { runTreasury } from './treasury';
import { updateModels } from './underwriting';
import { productSpec } from './products';

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
  runRivals(state); // 3 (books, financials, expansion, price wars)
  for (const branch of Object.values(state.branches)) {
    if (branch.status === 'open') runBranch(state, branch); // 4
  }
  updateBrandAwareness(state);
  runPartnerships(state); // 5
  runTreasury(state); // 6
  refreshFundingOffers(state); // 6 (§13.6 market, after this week's flows)
  runHq(state); // 7
  runDevelopments(state);
  updateModels(state);
  updateAppRating(state);
  runBrandMarketing(state); // 8 (brand marketing)
  runCorporateDebt(state); // 8 (corporate debt)
  runExecutives(state); // 8 (executives, §17.2)
  runGovernance(state); // 8 (dividends due)
  runMergers(state); // 8 (M&A responses and integrations, §19.8)
  runRealEstate(state); // 8 (owned buildings, listings, sales, §21.1–21.2)
  runReo(state); // 8 (foreclosed homes, §21.3)
  runVentures(state); // 8 (venture debt, open rounds, pipeline, §20.3–20.5)
  runConventions(state); // 8 (announce, open and close conventions, CONTENT §19)
  runLobbying(state); // 8 (campaign outcomes, DESIGN §5.8.10)
  depreciate(state); // 8
  closeWeek(state); // 9
  evaluateCapital(state); // 10
  checkFailure(state);
  runPersonal(state); // 11
  runMarkets(state); // 12
  runFx(state); // 12 (currencies, §19.10)

  if (isQuarterStart(state.meta.startDate, state.clock.day)) {
    quarterEnd(state); // 13
    regulatorReview(state); // 13 (§15)
    rivalsQuarter(state); // 13 (rival earnings and failures)
    marketsQuarter(state); // 13 (listed earnings, IPO listing)
    governanceQuarter(state); // 13 (board meeting unlocks)
    venturesQuarter(state); // 13 (ventures report and raise, §20.2)
  }
  if (isYearStart(state.meta.startDate, state.clock.day)) yearEnd(state); // 14
  runIncidents(state); // 15
  composeNews(state); // 16

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
    if (productSpec(state, pid)?.category === 'deposits') newDepositAccounts += o.newAccounts;
  }
  addBranchCosts(state, branch, fx, wk, newDepositAccounts);
  closeBranchWeek(state, branch, wk); // 4.8
  addReviews(state, branch, demand.served, fx);
}

function yearEnd(state: GameState): void {
  conventionsYear(state); // next year's conventions calendar
  for (const c of Object.values(state.world.countries)) {
    if (c) c.feeIndex *= 1 + c.inflation / 100;
  }
  repriceRivalFees(state);
}
