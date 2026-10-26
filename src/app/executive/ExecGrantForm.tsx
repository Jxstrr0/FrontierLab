// Add grant form inside the executive profile (SCREENS §10.1): Stock option |
// RSU, a shares stepper, a strike stepper for options (starting at today's
// share price), the 4-year vesting preview table, the expense it will book,
// and Add.
import { useState } from 'preact/hooks';
import { EXEC_PAY } from '../../config/balance';
import * as cmd from '../../sim/commands';
import type { EquityGrant, ExecSeat } from '../../sim/state';
import { Segmented, Stepper } from '../components';
import { count, exactMoney, money, moneyStepper } from '../format/format';
import { act, toast, useGame } from '../store';
import { grantCost, vestingPreview } from './execSelectors';

const STRIKE_STEP = 0.01;

export function ExecGrantForm(p: { seat: ExecSeat; onDone: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  const price = s.stock.price;
  const max = cmd.maxGrantShares(s);
  const step = EXEC_PAY.grantStep;
  const [type, setType] = useState<EquityGrant['type']>('option');
  const [shares, setShares] = useState(Math.min(max, step * 10));
  const [strike, setStrike] = useState(Math.max(STRIKE_STEP, Math.round(price * 100) / 100));
  const rows = vestingPreview(s, shares);
  const cost = grantCost(s, type, shares, strike);
  const add = () => {
    const r = act(cmd.addGrant, p.seat, type, shares, type === 'option' ? strike : 0);
    if (r.ok) {
      toast(`Granted ${count(shares)} ${type === 'rsu' ? 'RSUs' : 'options'}.`, 'good');
      p.onDone();
    }
  };
  return (
    <div class="stack exec-grant-form">
      <Segmented
        label="Grant type"
        value={type}
        onChange={setType}
        options={[
          { value: 'option', label: 'Stock option' },
          { value: 'rsu', label: 'RSU' },
        ]}
      />
      <div class="grid-2">
        <Stepper
          label="Shares"
          value={shares}
          min={step}
          max={Math.max(step, max)}
          step={step}
          format={count}
          onChange={setShares}
          hint={`Up to ${count(max)}`}
        />
        {type === 'option' ? (
          <Stepper
            label="Strike price"
            value={strike}
            min={STRIKE_STEP}
            max={Math.max(1, price * 3)}
            step={STRIKE_STEP}
            {...moneyStepper(sym, exactMoney)}
            onChange={setStrike}
            hint={`Share price ${exactMoney(price, sym)}`}
          />
        ) : (
          <div class="exec-rsu-note muted small">
            RSUs are shares, worth {exactMoney(price, sym)} each today.
          </div>
        )}
      </div>
      <table class="exec-vest-table">
        <caption class="muted small">Vests 25% a year</caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Date</th>
            <th scope="col">Vests</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr>
              <td>{r.year}</td>
              <td>{r.date}</td>
              <td>{count(r.shares)}</td>
              <td>{count(r.cumulative)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="muted small exec-note">
        Books {money(cost, sym)} of grant expense over four years (no cash). Shares are issued as
        they vest{type === 'option' ? ' and once the price is above the strike' : ''}.
      </p>
      <button type="button" class="btn btn-primary btn-block" disabled={max < 1} onClick={add}>
        Add grant
      </button>
    </div>
  );
}
