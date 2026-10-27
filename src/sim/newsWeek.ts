// Your bank's weekly close in The Weekly Ledger (SIMULATION §24, §14): the
// week's revenue and net income (the same figures as the weekly results) when
// the week is news (a loss, a swing back to profit, a record) or once every
// NEWS_ROUTINE_EVERY_WEEKS weeks otherwise; quarter results on the first tick
// of a quarter; and a weak safety tier with what to do about it (Watch on a
// change of tier or every few weeks, worse tiers every week).
import {
  NEWS_PRIORITY as P,
  NEWS_RECORD_MARGIN,
  NEWS_RECORD_MIN_WEEKS,
  NEWS_ROUTINE_EVERY_WEEKS,
} from '../config/balance';
import { CAPITAL_FIX_NEWS } from '../data/capitalFixes';
import { TIER_COPY } from '../data/newsWorld';
import { isQuarterStart } from './calendar';
import { newsMoney, newsRate } from './newsFormat';
import type { NewsContext, Story } from './newsStory';

const banking = (s: Omit<Story, 'tab'>): Story => ({ ...s, tab: 'banking' });
const business = (s: Omit<Story, 'tab'>): Story => ({ ...s, tab: 'business' });

/** Stories from the weekly close: the week's figures, quarter results and a weak safety tier. */
export function closeStories(ctx: NewsContext): Story[] {
  const s = ctx.state;
  const snap = s.history.weekly.at(-1);
  if (!snap || snap.week !== ctx.week) return [];
  const out: Story[] = [];
  const m = (x: number) => newsMoney(x, ctx.sym);
  const profit = snap.netIncome >= 0;
  const weekly = s.history.weekly;
  const prev = weekly.at(-2);
  const record =
    profit &&
    weekly.length > NEWS_RECORD_MIN_WEEKS &&
    weekly.slice(0, -1).every((w) => w.netIncome * (1 + NEWS_RECORD_MARGIN) < snap.netIncome);
  const swing = !!prev && prev.netIncome < 0 !== snap.netIncome < 0;
  if (record || !profit || swing || ctx.week % NEWS_ROUTINE_EVERY_WEEKS === 0) {
    out.push(
      business({
        key: record ? 'BANK_WEEK_RECORD' : profit ? 'BANK_WEEK_PROFIT' : 'BANK_WEEK_LOSS',
        subject: 'you',
        icon: 'chart',
        priority: record ? P.companyRoutine : P.companyWeek,
        group: 'youRoutine',
        tokens: {
          bank: ctx.bank,
          revenue: m(snap.revenue),
          net: m(snap.netIncome),
          loss: m(-snap.netIncome),
        },
      }),
    );
  }
  const q = s.history.quarterly.at(-1);
  if (q && isQuarterStart(s.meta.startDate, s.clock.day) && q.endWeek === ctx.week - 1) {
    out.push(
      business({
        key: q.netIncome >= 0 ? 'BANK_QUARTER' : 'BANK_QUARTER_LOSS',
        subject: 'you',
        icon: 'chart',
        priority: P.company,
        tokens: {
          bank: ctx.bank,
          quarter: `Q${q.q} ${q.year}`,
          revenue: m(q.revenue),
          net: m(q.netIncome),
          loss: m(-q.netIncome),
        },
      }),
    );
  }
  const tier = TIER_COPY[snap.tier];
  const tierNews =
    snap.tier !== 'watch' || prev?.tier !== snap.tier || ctx.week % NEWS_ROUTINE_EVERY_WEEKS === 0;
  if (tier && tierNews) {
    out.push(
      banking({
        key: 'CAPITAL_WEAK',
        subject: 'you',
        icon: 'shield',
        priority: snap.tier === 'watch' ? P.companyRoutine : P.companyAlarm,
        group: snap.tier === 'watch' ? 'youRoutine' : undefined,
        tokens: {
          bank: ctx.bank,
          cr: newsRate(snap.safetyRatio ?? s.company.safetyRatio, 0),
          tier,
          fix: CAPITAL_FIX_NEWS[s.stock.status],
        },
      }),
    );
  }
  return out;
}
