// Revolving credit line at an investment bank (Debt tab, SCREENS §12,
// SIMULATION §19.9): the live limit, the amount used, the rate and a
// draw/repay slider. The limit is a share of equity and moves with it.
import { useState } from 'preact/hooks';
import { CORPORATE_LENDING } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { creditLimit, creditRoom, lineRate } from '../../sim/corporateDebt';
import { Card, Row, Segmented } from '../components';
import { money, pct } from '../format/format';
import { AmountSlider } from '../hq/treasury/AmountSlider';
import { act, toast, useGame } from '../store';
import '../hq/treasury/treasury.css';

export function CreditLineCard(p: { siteId: string; near: boolean }) {
  const s = useGame();
  const sym = s.settings.currency;
  const line = s.corporateDebt.lines[p.siteId];
  const used = line?.drawn ?? 0;
  const limit = creditLimit(s);
  const available = p.near ? creditRoom(s) : 0;
  const repayMax = Math.min(used, Math.max(0, s.company.cash));
  const [mode, setMode] = useState<'draw' | 'repay'>('draw');
  const [amount, setAmount] = useState(0);
  const max = mode === 'draw' ? available : repayMax;
  const value = Math.min(amount, max);
  const go = () => {
    const r =
      mode === 'draw'
        ? act(cmd.drawCredit, p.siteId, value)
        : act(cmd.repayCredit, p.siteId, value);
    if (r.ok) {
      toast(
        mode === 'draw' ? `Drew ${money(value, sym)}.` : `Repaid ${money(value, sym)}.`,
        'good',
      );
      setAmount(0);
    }
  };
  return (
    <>
      <Card>
        <Row label="Limit (all lines)" value={money(limit, sym)} />
        <Row label="Used" value={money(used, sym)} />
        <Row label="Available" value={money(available, sym)} strong />
        <Row label="Interest rate" value={pct(line?.rate ?? lineRate(s))} />
      </Card>
      <p class="muted small">
        A revolving line: draw or repay any week. The limit is{' '}
        {CORPORATE_LENDING.lineEquityShare * 100}% of your equity, shared by all your credit lines,
        and moves with it; interest is charged weekly on what you use.
      </p>
      {!p.near && used === 0 ? (
        <p class="muted small">You can draw on it once you have a sales office here.</p>
      ) : (
        <>
          <Segmented
            label="Draw or repay"
            options={[
              { value: 'draw', label: 'Draw' },
              { value: 'repay', label: 'Repay' },
            ]}
            value={mode}
            onChange={setMode}
          />
          <AmountSlider
            label={mode === 'draw' ? 'Draw' : 'Repay'}
            value={value}
            max={max}
            onChange={setAmount}
            sym={sym}
          />
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={value <= 0}
            onClick={go}
          >
            {mode === 'draw' ? `Draw ${money(value, sym)}` : `Repay ${money(value, sym)}`}
          </button>
        </>
      )}
    </>
  );
}
