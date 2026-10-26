// Monthly and quarterly results (SCREENS §21, §26): when each setting opens
// the results modal, which weeks a month or quarter rolls up (a snapshot
// belongs to the month its last day falls in, so months run 4 or 5 weeks),
// and the period totals the modal shows.
import { describe, expect, it } from 'vitest';
import { resultsDue } from '../../src/app/loop';
import {
  periodIssues,
  periodKey,
  periodSnapshots,
  periodTotals,
  snapshotEndDay,
} from '../../src/app/weekly/resultsPeriod';
import { DAYS_PER_WEEK } from '../../src/config/balance';
import { isoDate } from '../../src/sim/calendar';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';

const START = '2027-01-04'; // a Monday

describe('resultsDue', () => {
  it('opens weekly results every week and the others when a month or quarter’s last week closes', () => {
    const ticks = Array.from({ length: 20 }, (_, i) => (i + 1) * DAYS_PER_WEEK);
    const monthly = ticks.filter((d) => resultsDue('monthly', START, d) === 'monthly');
    const quarterly = ticks.filter((d) => resultsDue('quarterly', START, d) === 'quarterly');
    // Months close with snapshots 4 (ends Sun 31 Jan), 8 (28 Feb), 12 (28 Mar; the
    // week of 29 Mar ends 4 Apr, so it is April's) and 16 (25 Apr).
    expect(monthly.map((d) => d / DAYS_PER_WEEK)).toEqual([4, 8, 12, 16]);
    expect(monthly.map((d) => isoDate(START, snapshotEndDay(d / DAYS_PER_WEEK)))).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-28',
      '2027-04-25',
    ]);
    expect(quarterly.map((d) => d / DAYS_PER_WEEK)).toEqual([12]);
    expect(ticks.every((d) => resultsDue('weekly', START, d) === 'weekly')).toBe(true);
    expect(ticks.every((d) => resultsDue('off', START, d) === null)).toBe(true);
    expect(resultsDue('monthly', START, 0)).toBe(null);
  });

  it('reports every week of the month that just ended, whatever weekday the game began', () => {
    // A start mid-week (the reported bug): a Thursday, so ticks never fall on the 1st.
    const start = '2040-01-05';
    const s = newGame({ seed: 42, cityId: 'cal', startDate: start });
    advanceWeeks(s, 30);
    for (let d = DAYS_PER_WEEK; d <= 30 * DAYS_PER_WEEK; d += DAYS_PER_WEEK) {
      if (resultsDue('monthly', start, d) !== 'monthly') continue;
      const week = d / DAYS_PER_WEEK;
      const { now } = periodSnapshots(s, 'monthly', week);
      expect(now.length === 4 || now.length === 5 || week < 5).toBe(true);
      // The next week starts a new month, and every reported week is in this one.
      expect(periodKey('monthly', start, week + 1)).not.toBe(periodKey('monthly', start, week));
      for (const x of now)
        expect(periodKey('monthly', start, x.week)).toBe(periodKey('monthly', start, week));
    }
  });
});

describe('periods', () => {
  it('groups snapshot weeks by the month or quarter their last day falls in', () => {
    // Snapshot 4 covers 25–31 Jan; snapshot 5 covers 1–7 Feb.
    expect(isoDate(START, snapshotEndDay(4))).toBe('2027-01-31');
    expect(periodKey('monthly', START, 4)).toBe('2027-0');
    expect(periodKey('monthly', START, 5)).toBe('2027-1');
    expect(periodKey('quarterly', START, 5)).toBe('2027q1');
    expect(periodKey('quarterly', START, 13)).toBe('2027q2');
    expect(periodKey('weekly', START, 5)).toBe('w5');
  });

  it('rolls a month up from its weeks and compares it with the month before', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    advanceWeeks(s, 10);
    // February is snapshots 5–8 (ending 7, 14, 21 and 28 Feb); snapshot 9 ends 7 Mar.
    const feb = periodSnapshots(s, 'monthly', 8);
    expect(feb.now.map((x) => x.week)).toEqual([5, 6, 7, 8]);
    expect(feb.prev.map((x) => x.week)).toEqual([1, 2, 3, 4]);
    const t = periodTotals(feb.now)!;
    expect(t.weeks).toBe(4);
    expect(t.firstWeek).toBe(5);
    expect(t.lastWeek).toBe(8);
    expect(t.revenue).toBeCloseTo(
      feb.now.reduce((sum, x) => sum + x.revenue, 0),
      6,
    );
    expect(t.cashFlow.net).toBeCloseTo(
      feb.now.reduce((sum, x) => sum + x.cashFlow.net, 0),
      6,
    );
    expect(periodTotals([])).toBeUndefined();
    // A week's own period is just itself and the week before.
    const w = periodSnapshots(s, 'weekly', 8);
    expect(w.now.map((x) => x.week)).toEqual([8]);
    expect(w.prev.map((x) => x.week)).toEqual([7]);
    // The issues of the month, newest first.
    expect(periodIssues(s, 'monthly', 8).map((i) => i.week)).toEqual([8, 7, 6, 5]);
  });

  it('has no previous period for the first month of trading', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    advanceWeeks(s, 4);
    const jan = periodSnapshots(s, 'monthly', 4);
    expect(jan.now.map((x) => x.week)).toEqual([1, 2, 3, 4]);
    expect(jan.prev).toEqual([]);
  });
});

describe('quarter-end report', () => {
  it('keeps a week that ends the day before a quarter starts in the old quarter', () => {
    // Started Thursday 4 March: the 4th tick falls on Thursday 1 April, so
    // snapshots 1–4 (ending 10, 17, 24 and 31 March) are all Q1.
    const s = newGame({ seed: 42, cityId: 'cal', startDate: '2027-03-04' });
    advanceWeeks(s, 4);
    const q = s.history.quarterly.at(-1)!;
    expect(q.q).toBe(1);
    expect(q.endWeek).toBe(4);
    expect(q.revenue).toBeCloseTo(
      s.history.weekly.filter((w) => w.week <= 4).reduce((sum, w) => sum + w.revenue, 0),
      6,
    );
  });
});
