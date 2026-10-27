// Company statements (SIMULATION §14): depreciation, tax, the weekly close
// (P&L, cash flow, balance sheet snapshot) and quarter-end reporting.
import { companyArr } from './arr';
import { SAFETY, WEEKLY_HISTORY } from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { balanceSheet, totalDeposits, loanTotals } from './balanceSheet';
import { isFirstDayOfQuarter, previousQuarter } from './calendar';
import { capitalSnapshot } from './capital';
import { trailingRevenue } from './riskFloor';
import { safetySnapshot } from './safety';
import { emptyLedger, postCash, postPnl, spend, summarize } from './ledger';
import type { GameState, WeeklySnapshot } from './state';
import { homeCountry } from './treasury';

/** Straight-line depreciation of every fixed asset (tick step 8). */
export function depreciate(state: GameState): void {
  for (const a of state.company.fixedAssets) {
    if (a.ageWeeks < a.lifeWeeks) postPnl(state, 'depreciation', a.cost / a.lifeWeeks);
    a.ageWeeks += 1;
  }
}

/** Accrues tax with loss carry-forward (§14.2). */
function accrueTax(state: GameState, preTax: number): void {
  const c = state.company;
  if (preTax <= 0) {
    c.taxLossCarry += -preTax;
    return;
  }
  const used = Math.min(c.taxLossCarry, preTax);
  c.taxLossCarry -= used;
  const tax = (preTax - used) * COUNTRIES[homeCountry(state).id].corpTax;
  c.taxPayable += tax;
  postPnl(state, 'tax', tax);
}

/** Tick step 9: closes the week's ledger into a snapshot and resets it. */
export function closeWeek(state: GameState): WeeklySnapshot {
  accrueTax(state, summarize(state.ledger.pnl).preTax);
  const sum = summarize(state.ledger.pnl);
  state.company.retainedEarnings += sum.netIncome;
  const bs = balanceSheet(state);
  const cap = capitalSnapshot(state);
  const safety = safetySnapshot(state);
  const cash = state.ledger.cash;
  const snap: WeeklySnapshot = {
    week: state.clock.week,
    revenue: sum.revenue,
    netIncome: sum.netIncome,
    netRevenue: sum.netRevenue,
    cashFlow: {
      ops: cash.ops,
      investing: cash.investing,
      financing: cash.financing,
      net: cash.ops + cash.investing + cash.financing,
    },
    totals: {
      assets: bs.assets,
      arr: companyArr(state),
      deposits: totalDeposits(state),
      loans: loanTotals(state).total,
      equity: bs.equity,
      rwa: cap.rwa,
      liquid: bs.reserves,
      taxPayable: bs.taxPayable,
    },
    pnl: { ...state.ledger.pnl },
    capitalRatio: cap.capitalRatio,
    safetyRatio: safety.ratio,
    tier: safety.tier,
    appRating: state.company.appRating,
  };
  state.history.weekly.push(snap);
  if (state.history.weekly.length > WEEKLY_HISTORY) {
    state.history.weekly.splice(0, state.history.weekly.length - WEEKLY_HISTORY);
  }
  state.ledger = emptyLedger();
  return snap;
}

/** Quarter-end (tick step 13): report, pay taxes, Critical-tier fines. */
export function quarterEnd(state: GameState): void {
  const lastEnd = state.history.quarterly.at(-1)?.endWeek ?? -1;
  // A week belongs to the quarter its last day falls in (the results modal's
  // rule): the week just closed ended last quarter only when today starts this one.
  const endWeek =
    state.clock.week - (isFirstDayOfQuarter(state.meta.startDate, state.clock.day) ? 0 : 1);
  const weeks = state.history.weekly.filter((w) => w.week > lastEnd && w.week <= endWeek);
  const { year, q } = previousQuarter(state.meta.startDate, state.clock.day);
  const revenue = weeks.reduce((s, w) => s + w.revenue, 0);
  const netIncome = weeks.reduce((s, w) => s + w.netIncome, 0);
  const equity = weeks.at(-1)?.totals.equity ?? 0;
  state.history.quarterly.push({
    endWeek,
    year,
    q,
    revenue,
    netIncome,
    eps: netIncome / state.company.sharesOutstanding,
    roe: equity > 0 ? (netIncome * 4) / equity : 0,
  });

  const c = state.company;
  if (c.taxPayable > 0) {
    postCash(state, -c.taxPayable, 'ops');
    c.taxPayable = 0;
  }
  // §15: at Critical the regulator fines a share of trailing annual revenue each quarter.
  if (c.tier === 'critical') spend(state, 'fines', trailingRevenue(state) * SAFETY.criticalFine);
}
