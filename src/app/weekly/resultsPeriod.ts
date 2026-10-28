// Results periods (SCREENS §21): which weekly snapshots and Ledger issues a
// weekly, monthly or quarterly results modal covers, and the period's totals.
// A snapshot numbered k covers days (k−1)·7 … k·7−1, so it belongs to the month
// or quarter its last day falls in; a month is therefore 4 or 5 weeks long.
import { DAYS_PER_WEEK } from '../../config/balance';
import { dateOf, quarterOf } from '../../sim/calendar';
import type { LedgerIssue } from '../../sim/competitionTypes';
import type { GameState, WeeklySnapshot } from '../../sim/state';

export type ResultsPeriod = 'weekly' | 'monthly' | 'quarterly';

/** The calendar day a snapshot's week ended on (it decides the month or quarter). */
export const snapshotEndDay = (week: number): number => week * DAYS_PER_WEEK - 1;

/**
 * The day a snapshot's week closed: the date on the top bar when its results
 * open, and the date the Ledger, the Finance floor and the charts give it.
 */
export const snapshotCloseDay = (week: number): number => week * DAYS_PER_WEEK;

/** Snapshot weeks with the same key fall in the same week, month or quarter. */
export function periodKey(period: ResultsPeriod, startDate: string, week: number): string {
  if (period === 'weekly') return `w${week}`;
  const d = dateOf(startDate, snapshotEndDay(week));
  const year = d.getUTCFullYear();
  return period === 'monthly' ? `${year}-${d.getUTCMonth()}` : `${year}q${quarterOf(d)}`;
}

export interface PeriodTotals {
  weeks: number;
  firstWeek: number;
  lastWeek: number;
  revenue: number;
  netIncome: number;
  cashFlow: WeeklySnapshot['cashFlow'];
}

/** Sums a period's snapshots; undefined with none. */
export function periodTotals(snaps: WeeklySnapshot[]): PeriodTotals | undefined {
  if (snaps.length === 0) return undefined;
  const t: PeriodTotals = {
    weeks: snaps.length,
    firstWeek: Math.min(...snaps.map((x) => x.week)),
    lastWeek: Math.max(...snaps.map((x) => x.week)),
    revenue: 0,
    netIncome: 0,
    cashFlow: { ops: 0, investing: 0, financing: 0, net: 0 },
  };
  for (const x of snaps) {
    t.revenue += x.revenue;
    t.netIncome += x.netIncome;
    t.cashFlow.ops += x.cashFlow.ops;
    t.cashFlow.investing += x.cashFlow.investing;
    t.cashFlow.financing += x.cashFlow.financing;
    t.cashFlow.net += x.cashFlow.net;
  }
  return t;
}

/**
 * The snapshots of the period that `lastWeek` (a snapshot week) closes, and
 * of the period before it, oldest first.
 */
export function periodSnapshots(
  s: GameState,
  period: ResultsPeriod,
  lastWeek: number,
): { now: WeeklySnapshot[]; prev: WeeklySnapshot[] } {
  const start = s.meta.startDate;
  const key = periodKey(period, start, lastWeek);
  const sorted = [...s.history.weekly].sort((a, b) => a.week - b.week);
  const now = sorted.filter((x) => x.week <= lastWeek && periodKey(period, start, x.week) === key);
  const first = now[0]?.week ?? lastWeek;
  const prevKey = periodKey(period, start, first - 1);
  const prev =
    prevKey === key ? [] : sorted.filter((x) => periodKey(period, start, x.week) === prevKey);
  return { now, prev };
}

/** The Ledger issues of the period that `lastWeek` closes, newest first. */
export function periodIssues(s: GameState, period: ResultsPeriod, lastWeek: number): LedgerIssue[] {
  const start = s.meta.startDate;
  const key = periodKey(period, start, lastWeek);
  return s.news.issues
    .filter((i) => i.week <= lastWeek && periodKey(period, start, i.week) === key)
    .sort((a, b) => b.week - a.week);
}
