// Trade sheet (SCREENS §12): trade from the company or your private account,
// buy or sell, a shares slider with a typed field, the cost preview including
// the 0.1% commission, available cash and the current position with its gain
// or loss. Your own bank trades from the private account only.
import { useState } from 'preact/hooks';
import { COMMISSION } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { accountCash, maxBuy, positionOf, tradeQuote, type TradeAccount } from '../../sim/commands';
import { SELF_ID, securityPrice } from '../../sim/securities';
import { Row, Segmented, Sheet } from '../components';
import { count, money, pct } from '../format/format';
import { act, toast, useGame } from '../store';
import { sharePrice } from './marketView';

type Side = 'buy' | 'sell';

export function TradeSheet(p: { securityId: string; name: string; onClose: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  const self = p.securityId === SELF_ID;
  const [account, setAccount] = useState<TradeAccount>(self ? 'personal' : 'company');
  const [side, setSide] = useState<Side>('buy');
  const [shares, setShares] = useState(0);

  const price = securityPrice(s, p.securityId);
  const held = positionOf(s, account, p.securityId);
  const max = side === 'buy' ? maxBuy(s, account, p.securityId) : held;
  const n = Math.min(shares, max);
  const q = tradeQuote(s, p.securityId, side === 'buy' ? n : -n);
  const holding = self ? undefined : s.market.holdings[account][p.securityId];
  const gain = holding ? holding.shares * (price - holding.avgCost) : 0;

  const submit = () => {
    const r = act(cmd.trade, account, p.securityId, side === 'buy' ? n : -n);
    if (r.ok) {
      toast(`${side === 'buy' ? 'Bought' : 'Sold'} ${count(n)} shares of ${p.name}.`, 'good');
      setShares(0);
    }
  };

  return (
    <Sheet title={`Trade ${p.name}`} onClose={p.onClose}>
      <div class="stack">
        {self ? (
          <p class="muted small">Your own shares trade from your private account.</p>
        ) : (
          <Segmented
            label="Account"
            options={[
              { value: 'company', label: 'Company' },
              { value: 'personal', label: 'Private' },
            ]}
            value={account}
            onChange={(v) => {
              setAccount(v);
              setShares(0);
            }}
          />
        )}
        <Segmented
          label="Buy or sell"
          options={[
            { value: 'buy', label: 'Buy' },
            { value: 'sell', label: 'Sell' },
          ]}
          value={side}
          onChange={(v) => {
            setSide(v);
            setShares(0);
          }}
        />
        <div class="ib-shares">
          <div class="ib-shares-head">
            <label class="muted small" for="ib-shares-input">
              Shares
            </label>
            <input
              id="ib-shares-input"
              class="ib-shares-input"
              inputMode="numeric"
              value={String(n)}
              onInput={(e) => {
                const v = Math.floor(
                  Number((e.target as HTMLInputElement).value.replace(/\D/g, '')),
                );
                setShares(Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
              }}
            />
          </div>
          <input
            type="range"
            class="ib-range"
            min={0}
            max={Math.max(1, max)}
            step={1}
            value={n}
            disabled={max <= 0}
            aria-label="Shares"
            onInput={(e) => setShares(Number((e.target as HTMLInputElement).value))}
          />
          <div class="ib-range-scale muted small" aria-hidden="true">
            <span>0</span>
            <span>{count(max)}</span>
          </div>
        </div>
        <div>
          <Row label="Price per share" value={sharePrice(price, sym)} />
          <Row label="Value" value={money(q.value, sym)} />
          <Row label={`Commission (${pct(COMMISSION, 1)})`} value={money(q.commission, sym)} />
          <Row
            label={side === 'buy' ? 'Total cost' : 'You receive'}
            value={money(Math.abs(q.cashChange), sym)}
            strong
          />
          <Row
            label={account === 'company' ? 'Corporate cash' : 'Personal cash'}
            value={money(accountCash(s, account), sym)}
            tone="dim"
          />
        </div>
        <div>
          <Row label="Current position" value={`${count(held)} shares`} />
          <Row label="Market value" value={money(held * price, sym)} />
          {holding && (
            <>
              <Row label="Average cost" value={sharePrice(holding.avgCost, sym)} />
              <Row
                label="Gain / loss"
                value={`${gain >= 0 ? '+' : ''}${money(gain, sym)}`}
                tone={gain > 0 ? 'good' : gain < 0 ? 'bad' : 'flat'}
              />
            </>
          )}
        </div>
        <button type="button" class="btn btn-primary btn-block" disabled={n <= 0} onClick={submit}>
          {side === 'buy' ? 'Buy' : 'Sell'} {n > 0 ? `${count(n)} shares` : ''}
        </button>
      </div>
    </Sheet>
  );
}
