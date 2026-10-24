// The Daily Ledger card (ART_DIRECTION §6): ivory paper, the masthead between
// double rules, text tabs and a two-column article grid. The weekly results and
// the game-over screen both use `Masthead`; the weekly results use `LedgerCard`.
import { useState } from 'preact/hooks';
import type { Article } from './ledgerArticles';
import { LedgerGlyph } from './ledgerIcons';

type Tab = 'top' | 'banking' | 'business';

const TABS: { id: Tab; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'banking', label: 'Banking' },
  { id: 'business', label: 'Business' },
];

/** Most stories the Top page carries. */
const TOP_STORIES = 5;

/** "The Daily Ledger" between a double rule, with edition and date underneath. */
export function Masthead(p: { date: string; edition?: string }) {
  return (
    <header class="masthead">
      <h3 class="masthead-title">The Daily Ledger</h3>
      <div class="masthead-line">
        <span>{p.edition ?? ''}</span>
        <span>{p.date}</span>
      </div>
    </header>
  );
}

export function ArticleView(p: { article: Article; lead?: boolean }) {
  const a = p.article;
  return (
    <article class={`article${p.lead ? ' article-lead' : ''}`}>
      <LedgerGlyph icon={a.icon} />
      <h4 class="article-headline">{a.headline}</h4>
      <p class="article-body">{a.body}</p>
    </article>
  );
}

export function LedgerCard(p: {
  date: string;
  edition: string;
  articles: Article[];
  reducedMotion: boolean;
}) {
  const [tab, setTab] = useState<Tab>('top');
  const shown =
    tab === 'top' ? p.articles.slice(0, TOP_STORIES) : p.articles.filter((a) => a.section === tab);
  const [lead, ...rest] = shown;
  return (
    <section class={`ledger ledger-press${p.reducedMotion ? ' is-reduced' : ''}`}>
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
        <p class="article-body ledger-quiet">A quiet day on this page.</p>
      )}
    </section>
  );
}
