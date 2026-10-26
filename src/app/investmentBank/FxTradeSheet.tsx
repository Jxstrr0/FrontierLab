// Currency trade sheet (SIMULATION §19.10): Company | Private, Buy | Sell, an
// amount slider with a typed field, the spread, available cash and the current
// position with its gain or loss.
import { useState } from 'preact/hooks';
import { FX } from '../../config/balance';
import { CURRENCIES } from '../../data/currencies';
import type { CountryId } from '../../data/types';
import * as cmd from '../../sim/commands';
import { accountCash, fxPositionValue, type TradeAccount } from '../../sim/commands';
import { Row, Segmented, Sheet } from '../components';
import { fromCurrency, money, pct, toCurrency } from '../format/format';
import { act, toast, useGame } from '../store';

type Side = 'buy' | 'sell';

/** Slider steps in whole thousands. */
const STEP = 1000;

export function FxTradeSheet(p: { country: CountryId; onClose: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  const spec = CURRENCIES[p.country];
  const [account, setAccount] = useState<TradeAccount>('company');
  const [side, setSide] = useState<Side>('buy');
  const [amount, setAmount] = useState(0);

  const held = fxPositionValue(s, account, p.country);
  const cost = s.fx.positions[account][p.country]?.cost ?? 0;
  const max =
    side === 'buy'
      ? Math.floor(Math.max(0, accountCash(s, account)) / (1 + FX.spread) / STEP) * STEP
      : Math.floor(held);
  const n = Math.min(amount, max);
  const spread = n * FX.spread;
  const gain = held - cost;

  const submit = () => {
    const r = act(cmd.tradeFx, account, p.country, side === 'buy' ? n : -n);
    if (r.ok) {
      toast(`${side === 'buy' ? 'Bought' : 'Sold'} ${money(n, sym)} of ${spec.name}.`, 'good');
      setAmount(0);
    }
  };

  return (
    <Sheet title={`Trade the ${spec.name}`} onClose={p.onClose}>
      <div class="stack">
        <Segmented
          label="Account"
          options={[
            { value: 'company', label: 'Company' },
            { value: 'personal', label: 'Private' },
          ]}
          value={account}
          onChange={(v) => {
            setAccount(v);
            setAmount(0);
          }}
        />
        <Segmented
          label="Buy or sell"
          options={[
            { value: 'buy', label: 'Buy' },
            { value: 'sell', label: 'Sell' },
          ]}
          value={side}
          onChange={(v) => {
            setSide(v);
            setAmount(0);
          }}
        />
        <div class="ib-shares">
          <div class="ib-shares-head">
            <label class="muted small" for="fx-amount-input">
              Amount ({sym})
            </label>
            <input
              id="fx-amount-input"
              class="ib-shares-input"
              inputMode="numeric"
              value={String(Math.round(toCurrency(n, sym)))}
              onInput={(e) => {
                const typed = Number((e.target as HTMLInputElement).value.replace(/\D/g, ''));
                const v = Math.floor(fromCurrency(typed, sym));
                setAmount(Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
              }}
            />
          </div>
          <input
            type="range"
            class="ib-range"
            min={0}
            max={Math.max(STEP, max)}
            step={side === 'buy' ? STEP : 1}
            value={n}
            disabled={max <= 0}
            aria-label="Amount"
            onInput={(e) => setAmount(Number((e.target as HTMLInputElement).value))}
          />
          <div class="ib-range-scale muted small" aria-hidden="true">
            <span>0</span>
            <span>{money(max, sym)}</span>
          </div>
        </div>
        <div>
          <Row label={`Spread (${pct(FX.spread, 2)})`} value={money(spread, sym)} />
          <Row
            label={side === 'buy' ? 'Total cost' : 'You receive'}
            value={money(side === 'buy' ? n + spread : n - spread, sym)}
            strong
          />
          <Row
            label={account === 'company' ? 'Corporate cash' : 'Personal cash'}
            value={money(accountCash(s, account), sym)}
            tone="dim"
          />
        </div>
        <div>
          <Row label="Current position" value={money(held, sym)} />
          {held > 0 && (
            <Row
              label="Gain / loss"
              value={`${gain >= 0 ? '+' : ''}${money(gain, sym)}`}
              tone={gain > 0 ? 'good' : gain < 0 ? 'bad' : 'flat'}
            />
          )}
        </div>
        <button type="button" class="btn btn-primary btn-block" disabled={n <= 0} onClick={submit}>
          {side === 'buy' ? 'Buy' : 'Sell'} {n > 0 ? money(n, sym) : ''}
        </button>
      </div>
    </Sheet>
  );
}
