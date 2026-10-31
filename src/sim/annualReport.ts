// The annual report (owner's review A5, SIMULATION §22a): at each year end,
// after the rich list ranks you, the lab's year is recorded in
// `history.yearly` (revenue and net income summed from the year's quarterly
// reports, plus ARR, offices, customers, valuation, your net worth and rank,
// model quality and the safety tier at the close). The year-end front page
// and, every ANNUAL_REPORT.decadeYears years, the decade in review read it.
import { ANNUAL_REPORT } from '../config/balance';
import { ANNUAL_TEXT, type AnnualKind, type AnnualText } from '../data/annualReport';
import { FRONTIER_PROJECTS_BY_ID } from '../data/frontierProjects';
import { companyArr } from './arr';
import { previousQuarter } from './calendar';
import { netWorth } from './netWorth';
import { fillTemplate, newsPct } from './newsFormat';
import { hashSeed } from './rng';
import type { GameState, YearReport } from './state';
import { activeModel, modelQuality } from './underwriting';
import { companyValuation } from './valuation';

/** Year end (tick step 14, after the quarter's report and the rich list): record the year. */
export function recordYear(state: GameState): YearReport {
  const { year } = previousQuarter(state.meta.startDate, state.clock.day);
  const quarters = state.history.quarterly.filter((q) => q.year === year);
  const open = Object.values(state.branches).filter((b) => b.status === 'open');
  const prev = state.history.yearly.at(-1);
  const rank = state.personal.empire.richList.rank;
  const report: YearReport = {
    year,
    n: (prev?.n ?? 0) + 1,
    endWeek: quarters.at(-1)?.endWeek ?? state.clock.week - 1,
    revenue: quarters.reduce((s, q) => s + q.revenue, 0),
    netIncome: quarters.reduce((s, q) => s + q.netIncome, 0),
    arr: companyArr(state),
    offices: open.length,
    customers: open.reduce((n, b) => n + b.customers, 0),
    value: companyValuation(state),
    worth: netWorth(state).total,
    ...(rank !== undefined ? { rank } : {}),
    quality: modelQuality(activeModel(state)),
    tier: state.company.tier,
  };
  state.history.yearly.push(report);
  return report;
}

/** ARR growth over the year before (undefined without one, or from zero). */
export function arrGrowth(cur: YearReport, prev: YearReport | undefined): number | undefined {
  return prev && prev.arr > 0 ? cur.arr / prev.arr - 1 : undefined;
}

/** True when this report closes a decade of play. */
export function isDecade(r: YearReport): boolean {
  return r.n % ANNUAL_REPORT.decadeYears === 0;
}

/**
 * What else happened in the year, read from the state (2026-10-31): the IPO,
 * acquisitions, the first or last frontier project, the first time on top of
 * the leaderboard (all from milestone and deal weeks), and a record profit.
 * Nothing new is stored, so an old save's reports gain these too.
 */
export interface YearFacts {
  ipo: boolean;
  deals: number;
  /** The frontier project finished this year (first or last), by name. */
  project?: string;
  leader: boolean;
  record: boolean;
}

export function yearFacts(
  state: GameState,
  cur: YearReport,
  prev: YearReport | undefined,
): YearFacts {
  // Each year owns (last end, this end] + 1, as the report's milestone list does.
  const from = prev ? prev.endWeek + 1 : -1;
  const inYear = (w: number | undefined) => w !== undefined && w > from && w <= cur.endWeek + 1;
  const ms = state.milestones;
  const done = state.projects.done;
  const project = inYear(ms.all_frontier_projects)
    ? 'every frontier project'
    : inYear(ms.first_frontier_project) && done[0]
      ? (FRONTIER_PROJECTS_BY_ID[done[0]]?.name ?? 'a frontier project')
      : undefined;
  const earlier = state.history.yearly.filter((r) => r.year < cur.year);
  const best = Math.max(0, ...earlier.map((r) => r.netIncome));
  return {
    ipo: inYear(ms.ipo),
    deals: state.mergers.deals.filter((d) => inYear(d.week)).length,
    ...(project ? { project } : {}),
    leader: inYear(ms.leaderboard_top),
    record: best > 0 && cur.netIncome >= best * ANNUAL_REPORT.recordMargin,
  };
}

/** Which front page the year earns, most newsworthy first. */
export function annualKind(
  cur: YearReport,
  prev: YearReport | undefined,
  facts?: YearFacts,
): AnnualKind {
  if (isDecade(cur)) return 'decade';
  if (!prev) return 'first';
  if (cur.rank === 1 && prev.rank !== 1) return 'topRich';
  if (facts?.ipo) return 'ipo';
  if (facts?.project) return 'frontier';
  if (facts?.leader) return 'leader';
  if (cur.netIncome > 0 && prev.netIncome <= 0) return 'firstProfit';
  if (ANNUAL_REPORT.safetyTiers.includes(cur.tier)) return 'safety';
  const g = arrGrowth(cur, prev);
  if (g !== undefined && g >= ANNUAL_REPORT.doubled) return 'doubled';
  if (facts && facts.deals >= ANNUAL_REPORT.spreeDeals) return 'spree';
  if (facts?.record) return 'record';
  if (g !== undefined && g < ANNUAL_REPORT.hardYear) return 'hardYear';
  return 'grew';
}

/** The year's headline and standfirst, filled in. */
export function annualText(
  cur: YearReport,
  prev: YearReport | undefined,
  names: { bank: string; founder: string },
  facts?: YearFacts,
): AnnualText & { kind: AnnualKind } {
  const kind = annualKind(cur, prev, facts);
  const versions = ANNUAL_TEXT[kind];
  // A hash of year and kind picks the version: stable on reopening, no fixed alternation.
  const t = versions[hashSeed(cur.year, kind)[0]! % versions.length]!;
  const g = arrGrowth(cur, prev);
  const tokens = {
    ...names,
    year: String(cur.year),
    n: String(cur.n),
    decade: String(cur.n),
    pct: g !== undefined ? newsPct(g * 100, 0) : '',
    deals: String(facts?.deals ?? 0),
    project: facts?.project ?? 'a frontier project',
  };
  return {
    kind,
    headline: fillTemplate(t.headline, tokens),
    standfirst: fillTemplate(t.standfirst, tokens),
  };
}
