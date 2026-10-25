// The Weekly Ledger card (ART_DIRECTION §6, SCREENS §21): ivory paper, the
// masthead between double rules, text tabs (Top | Banking | Business | Markets
// | Politics | Sports) and the article grid of one stored issue. The weekly
// results and the archive use `LedgerCard`; the game-over screen uses `Masthead`.
import { useState } from 'preact/hooks';
import { NEWS_TOP_N } from '../../config/balance';
import type { LedgerArticle, LedgerIssue, LedgerTab } from '../../sim/state';
import { LedgerGlyph } from './ledgerIcons';

type Tab = 'top' | LedgerTab;

const TABS: { id: Tab; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'banking', label: 'Banking' },
  { id: 'business', label: 'Business' },
  { id: 'markets', label: 'Markets' },
  { id: 'politics', label: 'Politics' },
  { id: 'sports', label: 'Sports' },
];

/** "The Weekly Ledger" between a double rule, with edition and date underneath. */
export function Masthead(p: { date: string; edition?: string }) {
  return (
    <header class="masthead">
      <h3 class="masthead-title">The Weekly Ledger</h3>
      <div class="masthead-line">
        <span>{p.edition ?? ''}</span>
        <span>{p.date}</span>
      </div>
    </header>
  );
}

export function ArticleView(p: { article: LedgerArticle; lead?: boolean }) {
  const a = p.article;
  return (
    <article class={`article${p.lead ? ' article-lead' : ''}`}>
      <LedgerGlyph icon={a.icon} />
      <div class="article-text">
        <h4 class="article-headline">{a.headline}</h4>
        <p class="article-body">{a.body}</p>
      </div>
    </article>
  );
}

/** Articles for a tab, highest priority first; Top is the six highest overall. */
export function articlesFor(issue: LedgerIssue | undefined, tab: Tab): LedgerArticle[] {
  const sorted = [...(issue?.articles ?? [])].sort((a, b) => b.priority - a.priority);
  return tab === 'top' ? sorted.slice(0, NEWS_TOP_N) : sorted.filter((a) => a.tab === tab);
}

export function LedgerCard(p: {
  issue: LedgerIssue | undefined;
  date: string;
  edition: string;
  reducedMotion: boolean;
  /** The landing "press" animation (weekly results only). */
  press?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('top');
  const [lead, ...rest] = articlesFor(p.issue, tab);
  const press = p.press ? ` ledger-press${p.reducedMotion ? ' is-reduced' : ''}` : '';
  return (
    <section class={`ledger${press}`}>
      <Masthead date={p.date} edition={p.edition} />
      <nav class="ledger-tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            class={`ledger-tab${t.id === tab ? ' is-active' : ''}`}
            aria-current={t.id === tab}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {lead ? (
        <>
          <ArticleView article={lead} lead />
          {rest.length > 0 && (
            <div class="article-grid">
              {rest.map((a) => (
                <ArticleView key={a.id} article={a} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p class="article-body ledger-quiet">
          {p.issue ? 'A quiet week on this page.' : 'The presses were quiet this week.'}
        </p>
      )}
    </section>
  );
}
