// The Daily Ledger archive (menu → The Ledger, SCREENS §0.3, SIMULATION §24):
// the last 52 issues newest first, each with its date and lead headline; tap
// one to read it with the same tabs as the weekly results.
import { DAYS_PER_WEEK } from '../../config/balance';
import { Panel } from '../components';
import { gameDate } from '../format/format';
import { closePanel, openPanel, useGame } from '../store';
import { articlesFor, LedgerCard } from '../weekly/LedgerCard';
import { LedgerGlyph } from '../weekly/ledgerIcons';
import '../weekly/weekly.css';
import './ledger.css';

export function LedgerArchivePanel(p: { week?: number }) {
  const s = useGame();
  const issues = s.news.issues;
  const dateOf = (week: number) => gameDate(s.meta.startDate, week * DAYS_PER_WEEK);
  const open = p.week !== undefined ? issues.find((i) => i.week === p.week) : undefined;

  if (open) {
    return (
      <Panel title="The Daily Ledger" subtitle={`No. ${open.week}`} onClose={closePanel}>
        <div class="stack">
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => openPanel({ type: 'ledger' })}
          >
            ‹ All issues
          </button>
          <LedgerCard
            key={open.week}
            issue={open}
            date={dateOf(open.week)}
            edition={`No. ${open.week}`}
            reducedMotion={s.settings.reducedMotion}
          />
        </div>
      </Panel>
    );
  }

  const newest = [...issues].reverse();
  return (
    <Panel
      title="The Daily Ledger"
      subtitle={`${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} on file`}
      onClose={closePanel}
    >
      {newest.length === 0 ? (
        <p class="muted">The first issue goes to press at the end of your first week.</p>
      ) : (
        <ol class="ledger ledger-archive" aria-label="Back issues">
          {newest.map((issue) => {
            const top = articlesFor(issue, 'top');
            // Headline the week by its biggest real story; your routine weekly figures only when nothing else ran.
            const lead = top.find((a) => !isRoutine(a)) ?? top[0];
            return (
              <li key={issue.week}>
                <button
                  type="button"
                  class="archive-row"
                  onClick={() => openPanel({ type: 'ledger', week: issue.week })}
                >
                  {lead && <LedgerGlyph icon={lead.icon} size={24} />}
                  <span class="archive-text">
                    <span class="archive-date">
                      {dateOf(issue.week)} · No. {issue.week}
                    </span>
                    <span class="archive-headline">{lead?.headline ?? 'A quiet week'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

/** Your bank's routine weekly figures story (newsWeek.ts BANK_WEEK_*). */
function isRoutine(a: { ref?: string }): boolean {
  return a.ref?.startsWith('BANK_WEEK_') ?? false;
}
