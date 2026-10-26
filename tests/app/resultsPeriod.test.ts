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
import { isMonthStart, isoDate } from '../../src/sim/calendar';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';

const START = '2027-01-04'; // a Monday

describe('resultsDue', () => {
  it('opens weekly results every week and the others on the first tick after a month or quarter', () => {
    const ticks = Array.from({ length: 20 }, (_, i) => (i + 1) * DAYS_PER_WEEK);
    const monthly = ticks.filter((d) => resultsDue('monthly', START, d) === 'monthly');
    const quarterly = ticks.filter((d) => resultsDue('quarterly', START, d) === 'quarterly');
    // The first tick on or after each month's first day: Mon 1 Feb, Mon 1 Mar, Mon 5 Apr, Mon 3 May.
    expect(monthly.map((d) => isoDate(START, d))).toEqual([
      '2027-02-01',
      '2027-03-01',
      '2027-04-05',
      '2027-05-03',
    ]);
    expect(quarterly.map((d) => isoDate(START, d))).toEqual(['2027-04-05']);
    expect(ticks.every((d) => resultsDue('weekly', START, d) === 'weekly')).toBe(true);
    expect(ticks.every((d) => resultsDue('off', START, d) === null)).toBe(true);
    expect(isMonthStart(START, 0)).toBe(false);
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
