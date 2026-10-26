// Equity tab cards (SCREENS §12): the private placement card, the IPO card
// with its eligibility checklist, and the secondary offering card. Every
// figure comes from the same quotes the commands book (src/sim/equityOffers.ts).
import { useState } from 'preact/hooks';
import { IPO, PLACEMENT, SECONDARY } from '../../config/balance';
import * as cmd from '../../sim/commands';
import {
  ipoChecklist,
  ipoQuote,
  nextInvestor,
  placementQuote,
  placementStatus,
  secondaryQuote,
  type EquityQuote,
} from '../../sim/equityOffers';
import { Card, Confirm, Row, Stepper } from '../components';
import { count, gameDate, money, pct } from '../format/format';
import { act, toast, useGame } from '../store';
import { sharePrice } from './marketView';

const pctText = (v: number) => `${Math.round(v * 100)}%`;
const parsePct = (t: string) => Number(t) / 100;
const editPct = (v: number) => String(Math.round(v * 100));

/** The common money rows of a quote. */
function QuoteRows(p: { q: EquityQuote; sym: string; outstanding: number; grossLabel?: string }) {
  const { q, sym } = p;
  return (
    <>
      <Row
        label="New shares"
        value={`${count(q.shares)} (${pct(q.shares / Math.max(1, p.outstanding))})`}
      />
      <Row label="Price per share" value={sharePrice(q.price, sym)} />
      <Row label={p.grossLabel ?? 'Gross proceeds'} value={money(q.gross, sym)} />
      <Row label={`Underwriting fee (${pct(q.feeRate)})`} value={money(q.fee, sym)} />
      <Row label="Capital raised" value={money(q.net, sym)} strong />
    </>
  );
}

export function PlacementCard(p: { bankId: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [share, setShare] = useState(0.1);
  const [confirm, setConfirm] = useState(false);
  const q = placementQuote(s, p.bankId, share);
  const status = placementStatus(s);
  const waiting = s.clock.week < status.nextWeek;
  const blocked = status.left <= 0 || waiting || !!s.stock.ipo || q.price <= 0;
  const investor = nextInvestor(s);
  const raise = () => {
    setConfirm(false);
    const r = act(cmd.privatePlacement, p.bankId, share);
    if (r.ok) toast(`${r.investor} invested ${money(r.raised, sym)}.`, 'good');
  };
  return (
    <Card class="ib-card">
      <h3 class="ib-card-name">Private placement</h3>
      <p class="muted small">
        Sell new shares to an investment fund at a {pctText(1 - PLACEMENT.discount)} discount to
        your private valuation.
      </p>
      <Stepper
        label="New shares (% of the lab)"
        value={share}
        min={0.01}
        max={PLACEMENT.maxPct}
        step={0.01}
        format={pctText}
        parse={parsePct}
        editText={editPct}
        onChange={setShare}
      />
      <QuoteRows q={q} sym={sym} outstanding={s.company.sharesOutstanding} grossLabel="Gross" />
      <Row label="Investor" value={investor} />
      <Row
        label="Rounds left"
        value={
          status.left > 0 && waiting
            ? `${status.left} · next ${gameDate(s.meta.startDate, status.nextWeek * 7)}`
            : String(status.left)
        }
        tone="dim"
      />
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={blocked}
        onClick={() => setConfirm(true)}
      >
        Raise {money(q.net, sym)}
      </button>
      {confirm && (
        <Confirm
          title="Raise private capital?"
          body={`${investor} buys ${count(q.shares)} new shares at ${sharePrice(q.price, sym)}. Your stake shrinks as the lab grows its capital.`}
          confirmLabel="Raise"
          onConfirm={raise}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Card>
  );
}

export function IpoCard(p: { bankId: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [float, setFloat] = useState(0.25);
  const [confirm, setConfirm] = useState(false);
  const rules = ipoChecklist(s);
  const eligible = rules.every((r) => r.ok);
  const pending = s.stock.ipo;
  const q = ipoQuote(s, p.bankId, float);
  const launch = () => {
    setConfirm(false);
    if (act(cmd.launchIpo, p.bankId, float).ok)
      toast('IPO launched. Your shares list at the end of the quarter.', 'good');
  };
  return (
    <Card class="ib-card" tutorial="ipo-card">
      <h3 class="ib-card-name">Initial public offering</h3>
      {pending ? (
        <>
          <p class="ib-status small" role="status">
            Your IPO lists at the end of this quarter: {count(pending.shares)} shares at{' '}
            {sharePrice(pending.price, sym)}, about {money(pending.shares * pending.price, sym)}{' '}
            before fees. The rules are checked again on listing day.
          </p>
          <Row label="Float" value={pctText(pending.floatPct)} />
          <Row label="Underwriting fee" value={pct(pending.fee)} />
        </>
      ) : (
        <>
          {s.stock.ipoWithdrawn && (
            <p class="ib-status ib-status-bad small" role="status">
              Your last IPO was withdrawn: {s.stock.ipoWithdrawn.reason}
            </p>
          )}
          <ul class="ib-checklist" aria-label="Eligibility">
            {rules.map((r) => (
              <li class={r.ok ? 'is-ok' : 'is-no'}>
                <span class="ib-check" aria-hidden="true">
                  {r.ok ? '✓' : '✗'}
                </span>
                <span class="ib-check-label">{r.label}</span>
                <span class="ib-check-detail muted small">{r.detail}</span>
              </li>
            ))}
          </ul>
          <Stepper
            label="Float (public's share after listing)"
            value={float}
            min={IPO.floatPct[0]}
            max={IPO.floatPct[1]}
            step={0.01}
            format={pctText}
            parse={parsePct}
            editText={editPct}
            onChange={setFloat}
          />
          <Row label="Indicative price" value={sharePrice(q.price, sym)} />
          <Row label="New shares" value={count(q.shares)} />
          <Row label="Fee" value={pct(q.feeRate)} />
          <Row label="Capital raised" value={money(q.net, sym)} strong />
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!eligible}
            onClick={() => setConfirm(true)}
          >
            Launch IPO
          </button>
          {confirm && (
            <Confirm
              title="Launch your IPO?"
              body={`The lab offers ${count(q.shares)} new shares at ${sharePrice(q.price, sym)} and lists at the end of the quarter. Once public, the market prices your shares every week.`}
              confirmLabel="Launch IPO"
              onConfirm={launch}
              onCancel={() => setConfirm(false)}
            />
          )}
        </>
      )}
    </Card>
  );
}

export function SecondaryCard(p: { bankId: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [share, setShare] = useState(0.05);
  const [confirm, setConfirm] = useState(false);
  const q = secondaryQuote(s, p.bankId, share);
  const issue = () => {
    setConfirm(false);
    const r = act(cmd.secondaryOffering, p.bankId, share);
    if (r.ok) toast(`Raised ${money(r.raised, sym)} of new capital.`, 'good');
  };
  return (
    <Card class="ib-card">
      <h3 class="ib-card-name">Secondary offering</h3>
      <p class="muted small">
        Sell new shares on the market at a {pctText(SECONDARY.discount)} discount to the last price.
      </p>
      <Stepper
        label="New shares (% of outstanding)"
        value={share}
        min={0.01}
        max={SECONDARY.maxPct}
        step={0.01}
        format={pctText}
        parse={parsePct}
        editText={editPct}
        onChange={setShare}
      />
      <QuoteRows q={q} sym={sym} outstanding={s.company.sharesOutstanding} />
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={q.shares <= 0}
        onClick={() => setConfirm(true)}
      >
        Issue new shares
      </button>
      {confirm && (
        <Confirm
          title="Issue new shares?"
          body={`${count(q.shares)} new shares at ${sharePrice(q.price, sym)}. A larger issue weighs more on the share price.`}
          confirmLabel="Issue"
          onConfirm={issue}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Card>
  );
}
