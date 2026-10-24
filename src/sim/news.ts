// The Daily Ledger (SIMULATION §24): composes each week's issue from the event
// log and macro state, never repeating a template for the same subject in
// back-to-back weeks, and keeps the last NEWS_ARCHIVE_ISSUES issues. Story
// sources live in news*.ts; this module gathers their candidates, ranks them
// by the §24 priority order, caps each kind, pads a thin issue with filler,
// picks each story's wording with the `news` RNG stream and stores the issue.
import {
  NEWS_ARCHIVE_ISSUES,
  NEWS_ARTICLES_MAX,
  NEWS_ARTICLES_MIN,
  NEWS_GROUP_CAPS,
  NEWS_PRIORITY as P,
} from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { LEDGER_TEMPLATES } from '../data/ledgerTemplates';
import type { CountryId } from '../data/types';
import { isoDate } from './calendar';
import { companyStories } from './newsCompany';
import { governanceStories } from './newsGovernance';
import { marketsStories } from './newsMarkets';
import { mergersStories } from './newsMergers';
import { lobbyingStories } from './newsLobbying';
import { auctionStories } from './newsAuctions';
import { franchiseStories } from './newsFranchise';
import { personalStories } from './newsPersonal';
import { realEstateStories } from './newsRealEstate';
import { venturesStories } from './newsVentures';
import { fillTemplate } from './newsFormat';
import {
  centralBankStories,
  economyStory,
  housingStories,
  marketStory,
  rankingStory,
} from './newsMacro';
import { politicsStories, pollStory, runPolitics } from './newsPolitics';
import { rateWatchStory, rivalStories } from './newsRivals';
import { runSports } from './newsSports';
import { newsContext, type Story } from './newsStory';
import { closeStories } from './newsWeek';
import { stream, type Rng } from './rng';
import type { GameEvent, GameState, LedgerArticle, NewsDesk } from './state';

const COUNTRY_ORDER = Object.keys(COUNTRIES) as CountryId[];

function ensureDesk(state: GameState): NewsDesk {
  return (state.news.desk ??= { proposals: [], seasons: {}, polls: {}, assetMarks: {} });
}

/**
 * This issue's events: everything pushed in this week's tick, plus events from
 * the previous week that arrived after the last issue went to press (player
 * commands and fit-outs between ticks).
 */
function issueEvents(state: GameState, desk: NewsDesk): GameEvent[] {
  const week = state.clock.week;
  const cursor = desk.cursor;
  let skip = cursor && cursor.week === week - 1 ? cursor.count : 0;
  const out: GameEvent[] = [];
  for (const e of state.events.log) {
    if (e.week === week) out.push(e);
    else if (e.week === week - 1) {
      if (skip > 0) skip -= 1;
      else if (cursor) out.push(e);
    }
  }
  // Before the first issue, everything from the opening days is news.
  if (!cursor) out.unshift(...state.events.log.filter((e) => e.week === week - 1));
  return out;
}

/** Tick step 16: compose this week's issue into state.news. */
export function composeNews(state: GameState): void {
  const desk = ensureDesk(state);
  const rng = stream(state, 'news');
  runPolitics(state, desk, rng);
  const ctx = newsContext(state, issueEvents(state, desk));
  const sports = runSports(ctx, desk, rng);
  const home = state.world.countries[ctx.home];

  const candidates: Story[] = [
    ...companyStories(ctx),
    ...closeStories(ctx),
    ...centralBankStories(ctx),
    ...rivalStories(ctx),
    ...governanceStories(ctx),
    ...marketsStories(ctx),
    ...mergersStories(ctx),
    ...venturesStories(ctx),
    ...realEstateStories(ctx),
    ...lobbyingStories(ctx),
    ...personalStories(ctx),
    ...auctionStories(ctx),
    ...franchiseStories(ctx),
    ...politicsStories(ctx),
    ...sports.stories,
    ...housingStories(ctx, rng),
  ];
  const ranking = rankingStory(ctx, desk);
  if (ranking) candidates.push(ranking);
  const market = marketStory(ctx, rng);
  if (market) candidates.push(market);
  if (home) candidates.push(economyStory(home, P.economy, 'economy'));
  const watch = rateWatchStory(ctx);
  if (watch) candidates.push(watch);
  const poll = pollStory(ctx, desk, rng);
  if (poll) candidates.push(poll);

  // Filler for a thin week: economies abroad (a different one first each week),
  // then sports from leagues you don't follow.
  const spare: Story[] = [];
  for (let i = 0; i < COUNTRY_ORDER.length; i++) {
    const id = COUNTRY_ORDER[(ctx.week + i) % COUNTRY_ORDER.length]!;
    const c = state.world.countries[id];
    if (c && id !== ctx.home) spare.push(economyStory(c, P.filler));
  }
  spare.push(...sports.spare);

  const chosen = select(candidates, spare);
  const articles = render(state, chosen, rng);
  state.news.issues.push({
    week: ctx.week,
    date: isoDate(state.meta.startDate, state.clock.day),
    articles,
  });
  if (state.news.issues.length > NEWS_ARCHIVE_ISSUES)
    state.news.issues.splice(0, state.news.issues.length - NEWS_ARCHIVE_ISSUES);
  desk.cursor = {
    week: ctx.week,
    count: state.events.log.filter((e) => e.week === ctx.week).length,
  };
}

/** Highest priority first, at most one story per subject and template, kinds capped. */
function select(candidates: Story[], spare: Story[]): Story[] {
  const ranked = candidates
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.priority - a.s.priority || a.i - b.i)
    .map((x) => x.s);
  const seen = new Set<string>();
  const perGroup = new Map<string, number>();
  const out: Story[] = [];
  const take = (s: Story, capped: boolean) => {
    const id = `${s.key}:${s.subject}`;
    if (seen.has(id)) return;
    if (capped && s.group) {
      const n = perGroup.get(s.group) ?? 0;
      if (n >= (NEWS_GROUP_CAPS[s.group] ?? Infinity)) return;
      perGroup.set(s.group, n + 1);
    }
    seen.add(id);
    out.push(s);
  };
  for (const s of ranked) if (out.length < NEWS_ARTICLES_MAX) take(s, true);
  for (const s of spare) if (out.length < NEWS_ARTICLES_MIN) take(s, false);
  return out;
}

/** Picks each story's variant (never last week's for the same subject) and fills its tokens. */
function render(state: GameState, stories: Story[], rng: Rng): LedgerArticle[] {
  const week = state.clock.week;
  const last = state.news.lastTemplate;
  for (const [id, used] of Object.entries(last)) if (used.week < week - 1) delete last[id];
  return stories.map((s, i) => {
    const variants = LEDGER_TEMPLATES[s.key];
    const id = `${s.key}:${s.subject}`;
    const prev = last[id];
    const banned = prev && prev.week === week - 1 && variants.length > 1 ? prev.idx : -1;
    let idx = rng.int(0, variants.length - (banned >= 0 ? 2 : 1));
    if (banned >= 0 && idx >= banned) idx += 1;
    last[id] = { week, idx };
    const t = variants[idx]!;
    return {
      id: `w${week}-${i}`,
      tab: s.tab,
      icon: s.icon,
      headline: fillTemplate(t.h, s.tokens),
      body: fillTemplate(t.b, s.tokens),
      priority: s.priority,
      ref: `${id}#${idx}`,
    };
  });
}
