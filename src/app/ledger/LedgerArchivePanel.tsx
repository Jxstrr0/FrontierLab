// The Weekly Ledger archive (menu → The Ledger, SCREENS §0.3, SIMULATION §24):
// the last 52 issues newest first, each with its date and lead headline; tap
// one to read it with the same tabs as the weekly results. Above them, the
// annual reports (SCREENS §21b), newest first, each reopening its front page.
import { DAYS_PER_WEEK } from '../../config/balance';
import { Panel } from '../components';
import { gameDate } from '../format/format';
import { annualText } from '../../sim/annualReport';
import type { GameState } from '../../sim/state';
import { closePanel, modal, openPanel, useGame } from '../store';
import { articlesFor, LedgerCard, Masthead } from '../weekly/LedgerCard';
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
      <Panel title="The Weekly Inference" subtitle={`No. ${open.week}`} onClose={closePanel}>
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
      title="The Weekly Inference"
      subtitle={`${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} on file`}
      onClose={closePanel}
    >
      {newest.length === 0 ? (
        <p class="muted">The first issue goes to press at the end of your first week.</p>
      ) : (
        <div class="ledger">
          <Masthead
            date={dateOf(newest[0]!.week)}
            edition={`${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} on file`}
          />
          <AnnualReports s={s} />
          <ol class="ledger-archive" aria-label="Back issues">
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
                    {lead && <LedgerGlyph icon={lead.icon} size={30} />}
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
        </div>
      )}
    </Panel>
  );
}

/** The annual reports on file, newest first; tap one to reopen it. */
function AnnualReports(p: { s: GameState }) {
  const reports = p.s.history.yearly;
  if (reports.length === 0) return null;
  const names = { bank: p.s.meta.bankName, founder: p.s.meta.founderName };
  return (
    <ol class="ledger-archive" aria-label="Annual reports">
      {reports
        .map((r, i) => ({ r, text: annualText(r, reports[i - 1], names) }))
        .reverse()
        .map(({ r, text }) => (
          <li key={r.year}>
            <button
              type="button"
              class="archive-row"
              onClick={() => (modal.value = { type: 'annual', year: r.year })}
            >
              <LedgerGlyph icon="chart" size={30} />
              <span class="archive-text">
                <span class="archive-date">Annual report {r.year}</span>
                <span class="archive-headline">{text.headline}</span>
              </span>
            </button>
          </li>
        ))}
    </ol>
  );
}

/** Your bank's routine weekly figures story (newsWeek.ts BANK_WEEK_*). */
function isRoutine(a: { ref?: string }): boolean {
  return a.ref?.startsWith('BANK_WEEK_') ?? false;
}
