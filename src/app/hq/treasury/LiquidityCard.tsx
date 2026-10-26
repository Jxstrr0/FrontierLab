// Liquidity gauge (SCREENS §10 Treasury, SIMULATION §13.3–13.5): the
// liquidity ratio against the 10% minimum and your target, a funding-freeze
// banner while lending is frozen, what liquid assets are made of, and the
// one-way transfer of corporate cash into Treasury reserves.
import { useState } from 'preact/hooks';
import { FREEZE_RELEASE, LIQ_MIN, LIQ_REPAY_BUFFER } from '../../../config/balance';
import { totalDeposits } from '../../../sim/balanceSheet';
import * as cmd from '../../../sim/commands';
import { totalWholesale } from '../../../sim/fundingLots';
import { liquidAssets } from '../../../sim/treasury';
import { Badge, Card, Row } from '../../components';
import { money, pct } from '../../format/format';
import { act, toast, useGame } from '../../store';
import { AmountSlider } from './AmountSlider';
import { GAUGE_MAX, LIQUIDITY_STATUS, liquidityGauge } from './treasuryView';

export function LiquidityCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const t = s.treasury;
  const lr = s.company.liquidityRatio;
  const g = liquidityGauge(lr, LIQ_MIN, t.liqTarget, LIQ_REPAY_BUFFER);
  const status = LIQUIDITY_STATUS[g.status];
  return (
    <>
      {t.freeze && (
        <div class="tr-banner" role="alert">
          <strong>Funding freeze.</strong> Liquid assets are under the {pct(LIQ_MIN, 0)} minimum and
          auto-funding is off, so sales offices can't make new loans. Lending resumes once the ratio
          is back above {pct(LIQ_MIN + FREEZE_RELEASE, 0)}: borrow below, transfer cash in, or turn
          auto-funding on.
        </div>
      )}
      <Card>
        <div class="tr-gauge-head">
          <div>
            <div class="muted small">Liquidity ratio</div>
            <div class="hero-number">{lr === null ? '—' : pct(Math.max(0, lr), 1)}</div>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <div
          class="tr-gauge"
          role="meter"
          aria-label="Liquidity ratio"
          aria-valuemin={0}
          aria-valuemax={GAUGE_MAX * 100}
          aria-valuenow={lr === null ? undefined : Math.round(lr * 1000) / 10}
        >
          <span class="tr-gauge-danger" style={{ width: `${g.min * 100}%` }} />
          <span
            class={`tr-gauge-fill tr-gauge-${g.status}`}
            style={{ width: `${g.marker * 100}%` }}
          />
          <span class="tr-gauge-tick" style={{ left: `${g.min * 100}%` }} aria-hidden="true" />
          <span
            class="tr-gauge-tick is-target"
            style={{ left: `${g.target * 100}%` }}
            aria-hidden="true"
          />
        </div>
        <div class="tr-gauge-legend small">
          <span class="tr-legend-min">Minimum {pct(LIQ_MIN, 0)}</span>
          <span class="tr-legend-target">Target {pct(t.liqTarget, 0)}</span>
          <span class="muted">Scale to {pct(GAUGE_MAX, 0)}</span>
        </div>
        {g.offScale && lr !== null && (
          <p class="muted small hq-note">
            Off the end of the scale: liquid assets cover deposits many times over, so this cash
            could be earning more as loans.
          </p>
        )}
        <div class="tr-rows">
          <Row label="Reserves" value={money(t.reserves, sym)} />
          <Row label="Government bonds" value={money(t.bondsMarket, sym)} />
          <Row label="Liquid assets" value={money(liquidAssets(s), sym)} strong />
          <Row label="Deposits" value={money(totalDeposits(s), sym)} tone="dim" />
          <Row label="Wholesale funding" value={money(totalWholesale(s), sym)} tone="dim" />
        </div>
      </Card>
      <TransferCard />
    </>
  );
}

/** Corporate cash → reserves. One way only (§13.2), so it asks first. */
function TransferCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const cash = Math.max(0, s.company.cash);
  const [amount, setAmount] = useState(0);
  const value = Math.min(amount, cash);
  const go = () => {
    const r = act(cmd.transferToTreasury, value);
    if (r.ok) {
      toast(`Moved ${money(value, sym)} into Treasury reserves.`, 'good');
      setAmount(0);
    }
  };
  return (
    <Card>
      <div class="tr-card-title">Transfer cash to Treasury</div>
      <p class="muted small hq-note">
        Corporate cash can top up reserves, but it can't come back out: deposits and reserves belong
        to the lab's balance sheet.
      </p>
      <AmountSlider label="Amount" value={value} max={cash} onChange={setAmount} sym={sym} />
      <button type="button" class="btn btn-primary btn-block" disabled={value <= 0} onClick={go}>
        Transfer {value > 0 ? money(value, sym) : ''}
      </button>
      <p class="muted small tr-under">Corporate cash {money(s.company.cash, sym)}</p>
    </Card>
  );
}
