// Weekly results modal (SCREENS §21): the week's revenue and net income with
// their change, the cash flow, and that week's issue of The Weekly Ledger (as
// composed by the sim, src/sim/news.ts). When the Finance team is short the
// figures read "Delayed" (SIMULATION §14.6); the Ledger still runs. Closing
// resumes the game.
import { DAYS_PER_WEEK } from '../../config/balance';
import { statementDelayWeeks } from '../../sim/hq';
import type { GameState, WeeklySnapshot } from '../../sim/state';
import { Card, Medallion, Modal, Row, SectionTitle } from '../components';
import { delta, gameDate, money, moneyFull } from '../format/format';
import { modal, useGame } from '../store';
import { LedgerCard } from './LedgerCard';
import './weekly.css';

/** The snapshot for the week the modal reports; the sim numbers a snapshot by the week that just began. */
function snapshotFor(s: GameState, week: number): WeeklySnapshot | undefined {
  const target = week + 1;
  const list = s.history.weekly;
  return list.find((w) => w.week === target) ?? list.filter((w) => w.week <= target).at(-1);
}

export function WeeklyResults(p: { week: number }) {
  const s = useGame();
  const close = () => (modal.value = null);
  const sym = s.settings.currency;
  const snap = snapshotFor(s, p.week);
  const prev = snap ? s.history.weekly.find((w) => w.week === snap.week - 1) : undefined;
  const week = snap?.week ?? p.week + 1;
  const date = gameDate(s.meta.startDate, week * DAYS_PER_WEEK);
  const issue = s.news.issues.find((i) => i.week === week);
  const delay = statementDelayWeeks(s);

  return (
    <Modal
      title="Weekly results"
      class="weekly-modal"
      onClose={close}
      icon={<Medallion ink={s.meta.brandInk} monogram={s.meta.monogram} size={30} />}
      footer={
        <button
          type="button"
          class="btn btn-primary btn-block"
          onClick={close}
          data-tutorial="weekly-continue"
        >
          Continue
        </button>
      }
    >
      <div class="stack">
        <p class="weekly-date">
          Week {week} · ending {date}
        </p>
        {snap && delay > 0 ? (
          <Delayed weeks={delay} />
        ) : snap ? (
          <>
            <div class="grid-2">
              <Figure label="Revenue" now={snap.revenue} prev={prev?.revenue} sym={sym} />
              <Figure label="Net income" now={snap.netIncome} prev={prev?.netIncome} sym={sym} />
            </div>
            <div>
              <SectionTitle>Cash flow</SectionTitle>
              <Card>
                <CashRow label="Cash from operations" value={snap.cashFlow.ops} sym={sym} />
                <CashRow label="Investing" value={snap.cashFlow.investing} sym={sym} />
                <CashRow label="Financing" value={snap.cashFlow.financing} sym={sym} />
                <CashRow label="Net cash flow" value={snap.cashFlow.net} sym={sym} strong />
              </Card>
            </div>
          </>
        ) : (
          <p class="muted">No figures yet for this week.</p>
        )}
        <LedgerCard
          issue={issue}
          date={date}
          edition={`No. ${week}`}
          reducedMotion={s.settings.reducedMotion}
          press
        />
      </div>
    </Modal>
  );
}

function Figure(p: { label: string; now: number; prev: number | undefined; sym: string }) {
  const d = p.prev === undefined ? undefined : delta(p.now, p.prev, p.sym);
  return (
    <Card class="figure">
      <div class="figure-label">{p.label}</div>
      <div class={`figure-value${p.now < 0 ? ' tone-bad' : ''}`}>{money(p.now, p.sym)}</div>
      <div class={`figure-delta${d ? ` tone-${d.tone}` : ' tone-dim'}`}>
        {d ? `${d.text} on last week` : 'First week of trading'}
      </div>
    </Card>
  );
}

/** Finance is short-staffed: this week's books aren't closed yet (§14.6). */
function Delayed(p: { weeks: number }) {
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
        The finance team is short-staffed, so this week's figures close in {p.weeks}{' '}
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
