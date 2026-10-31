// Ventures (SIMULATION §20): the weekly step (venture debt payments, rounds
// closing, the Investment floor pipeline every 4 weeks) and the quarter-end
// report (growth, margin, burn, pentagon drift, then failure, IPO,
// acquisition or a new round when runway is short). Draws come from the
// `ventures` stream; generated startups from `ventureGen`.
import { VENTURE_GEN, VENTURES } from '../config/balance';
import { portfolioBreakdown } from './portfolio';
import { investmentStaff } from './ventureAccess';
import { stream, type Rng } from './rng';
import type { GameState, Startup } from './state';
import { homeCountry } from './homeCountry';
import { serviceVentureDebt } from './ventureDebt';
import { acquireStartup, failStartup, ipoStartup, pruneStartups } from './ventureExits';
import { generateStartup, isPrivate } from './ventureGen';
import {
  annualRevenue,
  drawGrowth,
  drawPriceStep,
  driftPentagon,
  failureChance,
  ipoEligible,
  nextMargin,
  PENTAGON,
  runwayQuarters,
  sectorOf,
  targetMargin,
} from './ventureModel';
import { closeDueRounds, openRound } from './ventureRounds';

/** §20.3: startups the pipeline shows, N = 1 + floor(staff / 4), max 8; none without the floor. */
export function pipelineSize(state: GameState): number {
  const staff = investmentStaff(state);
  if (staff === undefined) return 0;
  return Math.min(
    VENTURES.pipelineMax,
    VENTURES.pipelineBase + Math.floor(staff / VENTURES.staffPerExtra),
  );
}

const activeCount = (state: GameState) =>
  Object.values(state.ventures.startups).filter(isPrivate).length;

/** Opens a round now on a startup that isn't raising: price step from a fresh growth draw. */
function raiseNow(
  state: GameState,
  s: Startup,
  rng: Rng,
  growth: number,
  closesWeek: number,
): void {
  const step = drawPriceStep(rng, growth);
  const fraction = rng.range(VENTURES.newMoney[0], VENTURES.newMoney[1]);
  openRound(state, s, step, fraction, closesWeek);
}

/** A generated startup that is raising right away, its round open until `closesWeek`. */
export function newRaisingStartup(
  state: GameState,
  rng: Rng,
  seenAt: Startup['seenAt'],
  closesWeek: number,
  conventionId?: string,
): Startup {
  const s = generateStartup(state, rng, seenAt, conventionId);
  // A first look: priced at its current valuation (a step of 1).
  openRound(state, s, 1, rng.range(VENTURES.newMoney[0], VENTURES.newMoney[1]), closesWeek);
  return s;
}

/** §20.3: every 4 weeks, the pipeline shows N raising startups, generating more when short. */
export function refreshPipeline(state: GameState): void {
  const v = state.ventures;
  const n = pipelineSize(state);
  const week = state.clock.week;
  const due = week - v.pipelineRefreshWeek >= VENTURES.pipelineEveryWeeks;
  if (!due && !(n > 0 && v.pipeline.length === 0)) return;
  v.pipelineRefreshWeek = week;
  if (n === 0) {
    v.pipeline = [];
    return;
  }
  const raising = Object.values(v.startups)
    .filter((s) => s.seenAt === 'pipeline' && isPrivate(s) && s.round && s.round.closesWeek > week)
    .sort((a, b) => b.round!.closesWeek - a.round!.closesWeek || (a.id < b.id ? -1 : 1))
    .slice(0, n)
    .map((s) => s.id);
  const rng = stream(state, 'ventureGen');
  while (raising.length < n && activeCount(state) < VENTURE_GEN.maxActive) {
    const s = newRaisingStartup(state, rng, 'pipeline', week + VENTURES.roundWeeks);
    raising.push(s.id);
  }
  v.pipeline = raising;
}

/** Tick step 8: the portfolio log, venture debt, rounds closing, the pipeline and pruning. */
export function runVentures(state: GameState): void {
  state.ventures.valueLog = {
    week: state.clock.week,
    company: portfolioBreakdown(state, 'company').total,
    personal: portfolioBreakdown(state, 'personal').total,
  };
  serviceVentureDebt(state);
  closeDueRounds(state, stream(state, 'ventures'));
  refreshPipeline(state);
  pruneStartups(state);
}

/** One startup's quarter (§20.2). */
function quarter(state: GameState, s: Startup, rng: Rng, recession: boolean): void {
  const sector = sectorOf(s.sector);
  const last = s.quarters.at(-1) ?? { revenue: 0, netIncome: 0 };
  const g = drawGrowth(rng, sector.mu, s.pentagon);
  const revenue = last.revenue * Math.max(0, 1 + g);
  const target = targetMargin(sector.margin, s.pentagon[PENTAGON.maturity]);
  const margin = nextMargin(last.revenue > 0 ? last.netIncome / last.revenue : target, target);
  const netIncome = revenue * margin;
  s.quarters.push({ revenue, netIncome });
  if (s.quarters.length > VENTURES.quartersKept) s.quarters.shift();
  s.cash += netIncome;
  const q = s.quarters.at(-1)!;
  q.cash = s.cash;
  q.debt = s.ventureDebt?.balance ?? 0;
  s.pentagon = driftPentagon(rng, s.pentagon);

  const failRoll = rng.next();
  const ipoRoll = rng.next();
  const saleRoll = rng.next();
  const saleMult = rng.range(VENTURES.acquireMult[0], VENTURES.acquireMult[1]);
  if (s.cash < 0 || failRoll < failureChance(s.pentagon[PENTAGON.finHealth], recession)) {
    failStartup(state, s);
  } else if (ipoEligible(s.stage, revenue, netIncome) && ipoRoll < VENTURES.ipoChance) {
    ipoStartup(state, s, rng);
  } else if (saleRoll < VENTURES.acquireChance) {
    // A buyer pays the better of a revenue multiple and a premium on the last mark.
    acquireStartup(
      state,
      s,
      Math.max(saleMult * annualRevenue(s), VENTURES.acquireMarkPremium * s.lastPrice * s.shares),
    );
  } else if (!s.round && runwayQuarters(s.cash, netIncome) < VENTURES.runwayQuarters) {
    raiseNow(state, s, rng, g, state.clock.week + VENTURES.roundWeeks);
  }
}

/** Quarter-end (tick step 13): every private startup reports and maybe raises or exits. */
export function venturesQuarter(state: GameState): void {
  const rng = stream(state, 'ventures');
  const recession = homeCountry(state).phase === 'recession';
  for (const s of Object.values(state.ventures.startups)) {
    if (isPrivate(s)) quarter(state, s, rng, recession);
  }
}
