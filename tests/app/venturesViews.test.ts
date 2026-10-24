// Ventures UI selectors (SCREENS §10, §11, §17): the donut slices tie to the
// portfolio total, List portfolio rows match the books, the startup panel's
// advisor and blocks, and the convention panel's status.
import { describe, expect, it } from 'vitest';
import { conventionAdvisor, conventionView } from '../../src/app/convention/conventionView';
import {
  portfolioRows,
  portfolioSlices,
  weeklyChange,
} from '../../src/app/investment/investmentView';
import {
  advisorLine,
  debtBounds,
  investBlock,
  quarterBars,
  topShareholders,
} from '../../src/app/startup/startupView';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { portfolioBreakdown } from '../../src/sim/portfolio';
import { refreshPipeline } from '../../src/sim/ventures';
import { addCapital } from '../helpers/markets';
import { bankWithFloors } from '../helpers/scenario';

function setup() {
  const s = bankWithFloors(['investment'], { weeks: 2, capital: 20_000_000 });
  addCapital(s, 100_000_000);
  s.ventures.pipelineRefreshWeek = -10;
  refreshPipeline(s);
  return s;
}

describe('Investment floor views', () => {
  it('slices and rows tie to the portfolio breakdown', () => {
    const s = setup();
    const st = s.ventures.startups[s.ventures.pipeline[0]!]!;
    expect(cmd.buyStartupLot(s, st.id, 0, 'company').ok).toBe(true);
    const r = cmd.offerVentureDebt(s, st.id, 100_000, 0.05, 'company');
    expect(r.ok).toBe(true);
    const { slices, total } = portfolioSlices(s, 'company');
    expect(slices.map((x) => x.id)).toEqual([
      'stocks',
      'ventures',
      'realEstate',
      'ventureDebt',
      'currencies',
    ]);
    expect(slices.reduce((t, x) => t + x.value, 0)).toBeCloseTo(total, 4);
    const rows = portfolioRows(s, 'company');
    expect(rows.reduce((t, x) => t + x.value, 0)).toBeCloseTo(
      portfolioBreakdown(s, 'company').total,
      4,
    );
    expect(rows.find((x) => x.kind === 'ventures')?.gain).toBeCloseTo(0, 4);
    expect(portfolioRows(s, 'personal')).toEqual([]);
    expect(weeklyChange(s, 'company')).toBeDefined();
  });
});

describe('startup panel views', () => {
  it('reads the round, blocks and bars', () => {
    const s = setup();
    const st = s.ventures.startups[s.ventures.pipeline[0]!]!;
    expect(advisorLine(s, st)).toMatch(/^They're raising a Series/);
    expect(investBlock(s, st, 'company')).toBeUndefined();
    s.company.tier = 'critical';
    expect(investBlock(s, st, 'company')).toMatch(/critical/);
    expect(investBlock(s, st, 'personal')).toBeUndefined();
    expect(quarterBars(s, st, 'income')).toHaveLength(4);
    expect(quarterBars(s, st, 'income')[3]!.label).toBe("Q4 '26");
    const top = topShareholders(st);
    expect(top[0]!.pct).toBeGreaterThan(top[1]!.pct);
    const b = debtBounds(s, st);
    expect(b.maxAmount).toBeLessThanOrEqual(st.postMoney * 0.1);
    const hidden = Object.values(s.ventures.startups).find(
      (x) => !s.ventures.pipeline.includes(x.id),
    )!;
    expect(investBlock(s, hidden, 'personal')).toMatch(/pipeline/);
  });
});

describe('convention panel views', () => {
  it('shows the next run with dates and status', () => {
    const s = setup();
    const site = Object.values(s.world.sites).find(
      (x) => x.kind === 'conventionCenter' && x.refId === 'foothillsFounders',
    );
    advanceWeeks(s, 25 - s.clock.week);
    const v = conventionView(s, site)!;
    expect(v.dates).toBe('12 Jul – 18 Jul 2027');
    expect(v.phase).toBe('announced');
    expect(conventionAdvisor(v)).toMatch(/2 weeks/);
    advanceWeeks(s, 2);
    const open = conventionView(s, site)!;
    expect(open.phase).toBe('open');
    expect(conventionAdvisor(open)).toBe("Founders everywhere. Let's find a deal.");
  });
});
