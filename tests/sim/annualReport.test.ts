// The annual report (owner's review A5, SIMULATION §22a): the year end records
// the year's figures, the front page picks the most newsworthy headline, every
// tenth year is the decade in review, and migration 35 → 36 moves old rich
// lists onto the new fortune range.
import { describe, expect, it } from 'vitest';
import { ANNUAL_REPORT, RICH_LIST } from '../../src/config/balance';
import { ANNUAL_TEXT } from '../../src/data/annualReport';
import { annualKind, annualText, recordYear } from '../../src/sim/annualReport';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { exportCode, importCode } from '../../src/sim/save/serialize';
import { migrations } from '../../src/sim/save/migrations';
import type { YearReport } from '../../src/sim/state';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Ledger Labs' });

const report = (o: Partial<YearReport> = {}): YearReport => ({
  year: 2028,
  n: 2,
  endWeek: 103,
  revenue: 1e6,
  netIncome: 1e5,
  arr: 2e6,
  offices: 2,
  customers: 500,
  value: 1e7,
  worth: 5e6,
  quality: 5,
  tier: 'adequate',
  ...o,
});

describe('annual report', () => {
  it('files one report per year end with the year’s quarters summed', () => {
    const s = game();
    advanceWeeks(s, 53);
    expect(s.history.yearly).toHaveLength(1);
    const r = s.history.yearly[0]!;
    expect(r.year).toBe(2027);
    expect(r.n).toBe(1);
    const quarters = s.history.quarterly.filter((q) => q.year === 2027);
    expect(quarters).toHaveLength(4);
    expect(r.revenue).toBeCloseTo(
      quarters.reduce((a, q) => a + q.revenue, 0),
      6,
    );
    expect(r.endWeek).toBe(quarters.at(-1)!.endWeek);
    expect(r.rank).toBe(s.personal.empire.richList.rank);
  });

  it('numbers the years of play', () => {
    const s = game();
    s.history.yearly.push(report({ n: 4 }));
    expect(recordYear(s).n).toBe(5);
  });

  it('leads with the most newsworthy headline', () => {
    const prev = report({ n: 1, year: 2027 });
    expect(annualKind(report({ n: 1 }), undefined)).toBe('first');
    expect(annualKind(report({ rank: 1 }), { ...prev, rank: 3 })).toBe('topRich');
    expect(annualKind(report({ rank: 1 }), { ...prev, rank: 1 })).toBe('grew');
    expect(annualKind(report(), { ...prev, netIncome: -5 })).toBe('firstProfit');
    expect(annualKind(report({ tier: 'restricted', arr: 9e6 }), prev)).toBe('safety');
    expect(annualKind(report({ arr: 4e6 }), prev)).toBe('doubled');
    expect(annualKind(report({ arr: 1.5e6 }), prev)).toBe('hardYear');
    expect(annualKind(report({ arr: 2.5e6 }), prev)).toBe('grew');
    expect(annualKind(report({ n: ANNUAL_REPORT.decadeYears }), prev)).toBe('decade');
  });

  it('fills every placeholder in every version', () => {
    const names = { bank: 'Ledger Labs', founder: 'Ada Vale' };
    const prev = report({ n: 1, year: 2027, arr: 1e6 });
    for (const kind of Object.keys(ANNUAL_TEXT)) {
      expect(ANNUAL_TEXT[kind as keyof typeof ANNUAL_TEXT]).toHaveLength(2);
    }
    for (const year of [2028, 2029]) {
      for (const cur of [
        report({ year }),
        report({ year, n: 10 }),
        report({ year, rank: 1 }),
        report({ year, tier: 'critical' }),
      ]) {
        const t = annualText(cur, prev, names);
        expect(t.headline + t.standfirst).not.toMatch(/[{}]/);
      }
      const first = annualText(report({ year, n: 1 }), undefined, names);
      expect(first.headline + first.standfirst).not.toMatch(/[{}]/);
    }
    expect(annualText(report({ year: 2028, arr: 3e6 }), prev, names).headline).toContain('200%');
  });

  it('moves an old rich list onto the new range by place and round-trips', () => {
    const s = game();
    const list = s.personal.empire.richList;
    list.fortunes.forEach((f, i) => (f.worth = 2e9 - i * 3e7)); // the old $150M–$2B scale
    list.nominalRef = 1.5;
    const order = list.fortunes.map((f) => f.id);
    delete (s.history as { yearly?: unknown }).yearly;
    migrations[35]!(s as never);
    expect(s.history.yearly).toEqual([]);
    expect(list.fortunes.map((f) => f.id)).toEqual(order);
    const [lo, hi] = RICH_LIST.fortune;
    expect(list.fortunes[0]!.worth).toBeLessThanOrEqual(hi * 1.5);
    expect(list.fortunes[0]!.worth).toBeGreaterThan(hi * 1.5 * 0.9);
    expect(list.fortunes.at(-1)!.worth).toBeGreaterThanOrEqual(lo * 1.5);
    expect(importCode(exportCode(s))).toEqual(s);
  });
});
