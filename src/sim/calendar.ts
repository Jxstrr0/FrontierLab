// Game calendar: converts the day counter into dates, weeks of the year and
// quarters (SIMULATION §2). Uses UTC date arithmetic only — never wall time.
import { DAYS_PER_WEEK } from '../config/balance';

const MS_PER_DAY = 86_400_000;

export function dateOf(startDate: string, day: number): Date {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  return new Date(start + day * MS_PER_DAY);
}

/** ISO-style yyyy-mm-dd for a game day. */
export function isoDate(startDate: string, day: number): string {
  return dateOf(startDate, day).toISOString().slice(0, 10);
}

/** 1-based week of the year: days 1–7 of January are week 1. */
export function weekOfYear(date: Date): number {
  const jan1 = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - jan1) / MS_PER_DAY / DAYS_PER_WEEK) + 1;
}

export function quarterOf(date: Date): 1 | 2 | 3 | 4 {
  return (Math.floor(date.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

/** True on the first weekly tick after a quarter ends (Mar 31, Jun 30, Sep 30, Dec 31). */
export function isQuarterStart(startDate: string, day: number): boolean {
  if (day < DAYS_PER_WEEK) return false;
  const now = dateOf(startDate, day);
  const prev = dateOf(startDate, day - DAYS_PER_WEEK);
  return quarterOf(now) !== quarterOf(prev) || now.getUTCFullYear() !== prev.getUTCFullYear();
}

/** True when `day` is the first day of a quarter: the week ending the day before closed the last one. */
export function isFirstDayOfQuarter(startDate: string, day: number): boolean {
  const d = dateOf(startDate, day);
  return d.getUTCDate() === 1 && d.getUTCMonth() % 3 === 0;
}

/** True on the first weekly tick after a month ends. */
export function isMonthStart(startDate: string, day: number): boolean {
  if (day < DAYS_PER_WEEK) return false;
  const now = dateOf(startDate, day);
  const prev = dateOf(startDate, day - DAYS_PER_WEEK);
  return now.getUTCMonth() !== prev.getUTCMonth() || now.getUTCFullYear() !== prev.getUTCFullYear();
}

/** True on the first weekly tick of a new year. */
export function isYearStart(startDate: string, day: number): boolean {
  if (day < DAYS_PER_WEEK) return false;
  return (
    dateOf(startDate, day).getUTCFullYear() !==
    dateOf(startDate, day - DAYS_PER_WEEK).getUTCFullYear()
  );
}

/** The quarter that just ended, for reports on a quarter-start tick. */
export function previousQuarter(
  startDate: string,
  day: number,
): { year: number; q: 1 | 2 | 3 | 4 } {
  const prev = dateOf(startDate, day - DAYS_PER_WEEK);
  return { year: prev.getUTCFullYear(), q: quarterOf(prev) };
}

/**
 * The week of the `n`-th quarter-start tick after `afterWeek` (n ≥ 1): the
 * renewal season for business contracts (stage C5a).
 */
export function quarterStartWeek(startDate: string, afterWeek: number, n: number): number {
  let week = afterWeek;
  for (let found = 0; found < n;) {
    week += 1;
    if (isQuarterStart(startDate, week * DAYS_PER_WEEK)) found += 1;
  }
  return week;
}
