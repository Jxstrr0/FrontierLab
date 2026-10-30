// "From the archive" in The Weekly Ledger (SIMULATION §24.5): every few weeks
// the paper keeps that issue's lead story for good (skipping routine figures
// and columns), and on those weeks reprints the story it ran one, two, three,
// five or ten years earlier, the furthest back first. The archive is the
// player's own history, so every save's reprints are its own.
import { NEWS_ARCHIVE, NEWS_PRIORITY as P, WEEKS_PER_YEAR } from '../config/balance';
import { newsDate } from './newsFormat';
import type { LedgerIconId, NewsContext, Story } from './newsStory';
import type { LedgerArticle, NewsDesk } from './state';

/**
 * Stories that don't make a good reprint: routine figures, columns, wraps,
 * reprints, and the weekly market, rates and results reports.
 */
const ROUTINE =
  /^(BANK_WEEK_|LOAN_|RATE_WATCH|CAPITAL_WEAK|COLUMN_|COMMODITY_|ARCHIVE|POLL|CB_|ECONOMY_|MARKET_|HOUSING_|SPORTS_RESULT|SPORTS_DRAW|RIVAL_DIVIDEND|RIVAL_EARNINGS|COMPANY_EARNINGS|STOCK_MOVER)/;

const isArchiveWeek = (week: number) => week > 0 && week % NEWS_ARCHIVE.everyWeeks === 0;

/** A reprint from years ago on an archive week, or undefined. */
export function archiveStory(ctx: NewsContext, desk: NewsDesk): Story | undefined {
  if (!isArchiveWeek(ctx.week)) return undefined;
  // The furthest year back with a story not yet reprinted; each story runs again once.
  const turn = ctx.week / NEWS_ARCHIVE.everyWeeks;
  for (const years of NEWS_ARCHIVE.yearsBack) {
    if (years === 1 && turn % NEWS_ARCHIVE.oneYearEvery !== 0) continue;
    const old = desk.archive.find(
      (a) => a.week === ctx.week - years * WEEKS_PER_YEAR && !a.reprinted,
    );
    if (!old) continue;
    return {
      key: 'ARCHIVE',
      subject: `archive:${old.week}`,
      tab: old.tab,
      icon: old.icon as LedgerIconId,
      priority: P.archive,
      tokens: {
        ago: years === 1 ? 'a year ago' : `${years} years ago`,
        Ago: years === 1 ? 'A year ago' : `${years} years ago`,
        headline: old.headline,
        body: old.body,
        date: newsDate(old.date),
      },
    };
  }
  return undefined;
}

/** Flags the original of a reprint that made the issue, so it never runs again. */
export function markReprinted(desk: NewsDesk, printed: Story[]): void {
  for (const s of printed) {
    if (s.key !== 'ARCHIVE') continue;
    const week = Number(s.subject.split(':')[1]);
    const old = desk.archive.find((a) => a.week === week);
    if (old) old.reprinted = true;
  }
}

/** On an archive week, keeps this issue's lead story (after rendering). */
export function keepForArchive(
  desk: NewsDesk,
  week: number,
  date: string,
  articles: LedgerArticle[],
): void {
  if (!isArchiveWeek(week)) return;
  const lead = articles
    .filter((a) => !ROUTINE.test(a.ref ?? ''))
    .reduce<LedgerArticle | undefined>(
      (best, a) => (!best || a.priority > best.priority ? a : best),
      undefined,
    );
  if (!lead) return;
  desk.archive.push({
    week,
    date,
    tab: lead.tab,
    icon: lead.icon,
    headline: lead.headline,
    body: lead.body,
  });
}
