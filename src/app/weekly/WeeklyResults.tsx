// Weekly results modal (SCREENS §21): the week's revenue and net income with
// their change, the cash flow, and The Daily Ledger. Closing resumes the game.
import { DAYS_PER_WEEK } from '../../config/balance';
import type { GameState, WeeklySnapshot } from '../../sim/state';
import { Card, Medallion, Modal, Row, SectionTitle } from '../components';
import { delta, gameDate, money, moneyFull } from '../format/format';
import { modal, useGame } from '../store';
import { buildArticles } from './ledgerArticles';
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
  const date = gameDate(s.meta.startDate, (snap?.week ?? p.week + 1) * DAYS_PER_WEEK);
  const articles = buildArticles(s, snap);

  return (
    <Modal
      title="Weekly results"
      class="weekly-modal"
      onClose={close}
      icon={<Medallion ink={s.meta.brandInk} monogram={s.meta.monogram} size={30} />}
      footer={
        <button type="button" class="btn btn-primary btn-block" onClick={close}>
          Continue
        </button>
      }
    >
      <div class="stack">
        <p class="weekly-date">
          Week {snap?.week ?? p.week + 1} · ending {date}
        </p>
        {snap ? (
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
          date={date}
          edition={`No. ${snap?.week ?? p.week + 1}`}
          articles={articles}
          reducedMotion={s.settings.reducedMotion}
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
