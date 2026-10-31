// Results modal (SCREENS §21): the week's, month's or quarter's revenue and net
// income with their change, the cash flow, and the latest issue of The Weekly
// Ledger (as composed by the sim, src/sim/news.ts); a monthly or quarterly
// roll-up also lists the lead story of each earlier issue in the period. When
// the Finance team is short the figures read "Delayed" (SIMULATION §14.6); the
// Ledger still runs. Closing resumes the game. Under Continue, a row sets how
// often these results open (the same setting as in Settings).
import { dateOf, quarterOf } from '../../sim/calendar';
import { statementDelayWeeks } from '../../sim/hq';
import type { LedgerIssue } from '../../sim/competitionTypes';
import type { GameState, WeeklySnapshot } from '../../sim/state';
import { WEEKLY_RESULTS_MODES } from '../../data/settingsOptions';
import { setSettings } from '../../sim/commands';
import { Card, Medallion, Modal, Row, SectionTitle, Segmented } from '../components';
import { delta, gameDate, money, moneyFull, monthYear, shortDate } from '../format/format';
import { act, modal, useGame } from '../store';
import { articlesFor, LedgerCard } from './LedgerCard';
import {
  periodIssues,
  periodSnapshots,
  periodTotals,
  snapshotCloseDay,
  snapshotEndDay,
  type ResultsPeriod,
} from './resultsPeriod';
import './weekly.css';

/** The snapshot for the week the modal reports; the sim numbers a snapshot by the week that just began. */
function snapshotFor(s: GameState, week: number): WeeklySnapshot | undefined {
  const target = week + 1;
  const list = s.history.weekly;
  return list.find((w) => w.week === target) ?? list.filter((w) => w.week <= target).at(-1);
}

const TITLE: Record<ResultsPeriod, string> = {
  weekly: 'Weekly results',
  monthly: 'Monthly results',
  quarterly: 'Quarterly results',
};
const FREQ_LABEL: Record<GameState['settings']['weeklyResults'], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  off: 'Off',
};
const NOUN: Record<ResultsPeriod, string> = {
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter',
};

export function WeeklyResults(p: { week: number; period?: ResultsPeriod }) {
  const s = useGame();
  const close = () => (modal.value = null);
  const sym = s.settings.currency;
  const period = p.period ?? 'weekly';
  const snap = snapshotFor(s, p.week);
  const week = snap?.week ?? p.week + 1;
  const { now, prev } = periodSnapshots(s, period, week);
  const totals = periodTotals(now);
  const before = periodTotals(prev);
  const date = gameDate(s.meta.startDate, snapshotCloseDay(week));
  const issues = period === 'weekly' ? [] : periodIssues(s, period, week);
  const issue = s.news.issues.find((i) => i.week === week);
  const delay = statementDelayWeeks(s);
  const noun = NOUN[period];

  return (
    <Modal
      title={TITLE[period]}
      class="weekly-modal"
      onClose={close}
      icon={
        <Medallion
          ink={s.meta.brandInk}
          monogram={s.meta.monogram}
          shape={s.meta.logoShape}
          size={30}
        />
      }
      footer={
        <>
          <button
            type="button"
            class="btn btn-primary btn-block"
            onClick={close}
            data-tutorial="weekly-continue"
          >
            Continue
          </button>
          <div class="weekly-freq">
            <span class="muted small">Show results</span>
            <Segmented
              label="Show results"
              value={s.settings.weeklyResults}
              options={WEEKLY_RESULTS_MODES.map((m) => ({ value: m, label: FREQ_LABEL[m] }))}
              onChange={(weeklyResults) => act(setSettings, { weeklyResults })}
            />
          </div>
        </>
      }
    >
      <div class="stack">
        <p class="weekly-date">
          {period === 'weekly'
            ? `Week ${week} · closed ${date}`
            : `${periodLabel(s, period, week)} · ${totals?.weeks ?? 0} ${
                totals?.weeks === 1 ? 'week' : 'weeks'
              }, closed ${date}`}
        </p>
        {totals && delay > 0 ? (
          <Delayed weeks={delay} noun={noun} />
        ) : totals ? (
          <>
            <div class="grid-2">
              <Figure
                label="Revenue"
                now={totals.revenue}
                prev={before?.revenue}
                sym={sym}
                noun={noun}
              />
              <Figure
                label="Net income"
                now={totals.netIncome}
                prev={before?.netIncome}
                sym={sym}
                noun={noun}
              />
            </div>
            <div>
              <SectionTitle>Cash flow</SectionTitle>
              <Card>
                <CashRow label="Cash from operations" value={totals.cashFlow.ops} sym={sym} />
                <CashRow label="Investing" value={totals.cashFlow.investing} sym={sym} />
                <CashRow label="Financing" value={totals.cashFlow.financing} sym={sym} />
                <CashRow label="Net cash flow" value={totals.cashFlow.net} sym={sym} strong />
              </Card>
            </div>
          </>
        ) : (
          <p class="muted">No figures yet for this {noun}.</p>
        )}
        <LedgerCard
          issue={issue}
          date={date}
          edition={`No. ${week}`}
          reducedMotion={s.settings.reducedMotion}
          press
        />
        {issues.length > 1 && (
          <EarlierIssues issues={issues.slice(1)} startDate={s.meta.startDate} noun={noun} />
        )}
      </div>
    </Modal>
  );
}

/** "October 2027" or "Q4 2027" for the period a snapshot week closes. */
function periodLabel(s: GameState, period: ResultsPeriod, week: number): string {
  const day = snapshotEndDay(week);
  if (period === 'monthly') return monthYear(s.meta.startDate, day);
  const d = dateOf(s.meta.startDate, day);
  return `Q${quarterOf(d)} ${d.getUTCFullYear()}`;
}

/** The lead story of each earlier issue in the period, newest first. */
function EarlierIssues(p: { issues: LedgerIssue[]; startDate: string; noun: string }) {
  return (
    <div>
      <SectionTitle>Earlier this {p.noun}</SectionTitle>
      <Card>
        <ul class="earlier-issues">
          {p.issues.map((i) => {
            const lead = articlesFor(i, 'top')[0];
            return (
              <li key={i.week} class="earlier-issue">
                <span class="earlier-date">{shortDate(p.startDate, snapshotCloseDay(i.week))}</span>
                <span class="earlier-headline">{lead?.headline ?? 'A quiet week.'}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function Figure(p: {
  label: string;
  now: number;
  prev: number | undefined;
  sym: string;
  noun: string;
}) {
  const d = p.prev === undefined ? undefined : delta(p.now, p.prev, p.sym);
  return (
    <Card class="figure">
      <div class="figure-label">{p.label}</div>
      <div class={`figure-value${p.now < 0 ? ' tone-bad' : ''}`}>{money(p.now, p.sym)}</div>
      <div class={`figure-delta${d ? ` tone-${d.tone}` : ' tone-dim'}`}>
        {d ? `${d.text} on last ${p.noun}` : `First ${p.noun} of trading`}
      </div>
    </Card>
  );
}

/** Finance is short-staffed: this period's books aren't closed yet (§14.6). */
function Delayed(p: { weeks: number; noun: string }) {
  return (
    <div class="stack">
      <div class="grid-2">
        {['Revenue', 'Net income'].map((label) => (
          <Card key={label} class="figure">
            <div class="figure-label">{label}</div>
            <div class="figure-value tone-dim">Delayed</div>
          </Card>
        ))}
      </div>
      <p class="muted weekly-delayed">
        The finance team is short-staffed, so this {p.noun}'s figures close in {p.weeks}{' '}
        {p.weeks === 1 ? 'week' : 'weeks'}. Hire finance staff at HQ to catch up.
      </p>
    </div>
  );
}

function CashRow(p: { label: string; value: number; sym: string; strong?: boolean }) {
  return (
    <Row
      label={p.label}
      value={moneyFull(p.value, p.sym)}
      tone={p.value < 0 ? 'bad' : undefined}
      strong={p.strong}
    />
  );
}
