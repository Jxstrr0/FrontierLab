// Share buyback card (SCREENS §12, SIMULATION §19.6a): buy shares back from the
// public at the market price plus a premium and retire them. Every figure comes
// from the quote the command books (src/sim/buybacks.ts).
import { useState } from 'preact/hooks';
import { BUYBACK } from '../../config/balance';
import * as cmd from '../../sim/commands';
import {
  buybackBlocker,
  buybackQuote,
  maxBuybackShares,
  nextBuybackWeek,
} from '../../sim/buybacks';
import { FOUNDER_ID, sharesHeld } from '../../sim/shares';
import { Card, Confirm, Row, Stepper } from '../components';
import { count, gameDate, money, pct } from '../format/format';
import { act, toast, useGame } from '../store';
import { sharePrice } from './marketView';

const pctText = (v: number) => `${Math.round(v * 100)}%`;
const parsePct = (t: string) => Number(t) / 100;
const editPct = (v: number) => String(Math.round(v * 100));

export function BuybackCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const [share, setShare] = useState(0.02);
  const [confirm, setConfirm] = useState(false);
  const q = buybackQuote(s, share);
  const blocker = buybackBlocker(s, q);
  const out = s.company.sharesOutstanding;
  const stakeAfter = sharesHeld(s, FOUNDER_ID) / Math.max(1, out - q.shares);
  const waiting = s.clock.week < nextBuybackWeek(s);
  const capped = q.shares < Math.round(out * share) && q.shares === maxBuybackShares(s);
  const buy = () => {
    setConfirm(false);
    const r = act(cmd.buyBackShares, share);
    if (r.ok) toast(`Bought back ${count(r.shares)} shares for ${money(r.cost, sym)}.`, 'good');
  };
  return (
    <Card class="ib-card">
      <h3 class="ib-card-name">Share buyback</h3>
      <p class="muted small">
        Buy shares back from the market at {pctText(BUYBACK.premium)} over the last price and retire
        them. Profits and votes are then shared among fewer shares. One buyback a quarter.
      </p>
      <Stepper
        label="Shares to buy back (% of outstanding)"
        value={share}
        min={0.01}
        max={BUYBACK.maxPct}
        step={0.01}
        format={pctText}
        parse={parsePct}
        editText={editPct}
        onChange={setShare}
      />
      <Row
        label="Shares retired"
        value={`${count(q.shares)} (${pct(q.shares / Math.max(1, out))})`}
      />
      <Row label="Price per share" value={sharePrice(q.price, sym)} />
      <Row label={`Broker's fee (${pct(BUYBACK.fee)})`} value={money(q.fee, sym)} />
      <Row label="Total cost" value={money(q.cost, sym)} strong />
      <Row label="Your stake after" value={pct(stakeAfter, 1)} />
      <Row label="Capital ratio after" value={pct(q.crAfter, 1)} tone="dim" />
      {capped && (
        <p class="muted small">
          Capped so the public keeps at least {pctText(BUYBACK.minFloat)} of the bank.
        </p>
      )}
      {waiting && (
        <Row
          label="Next buyback"
          value={gameDate(s.meta.startDate, nextBuybackWeek(s) * 7)}
          tone="dim"
        />
      )}
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={!!blocker}
        onClick={() => setConfirm(true)}
      >
        Buy back for {money(q.cost, sym)}
      </button>
      {blocker && !waiting && <p class="small tone-bad">{blocker}</p>}
      {confirm && (
        <Confirm
          title="Buy back shares?"
          body={`The bank pays ${money(q.cost, sym)} for ${count(q.shares)} of its own shares and retires them. The cash leaves your capital, like a dividend.`}
          confirmLabel="Buy back"
          onConfirm={buy}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Card>
  );
}
