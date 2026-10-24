// Central bank standing facility on the Treasury floor (SCREENS §8 and §10,
// SIMULATION §13.5): the window rate, what you owe at the window and
// overnight, Borrow and Repay amounts, and the stigma warning: each use dips
// every branch's rating for a few weeks and may make the news.
import { useState } from 'preact/hooks';
import { LIQ_MIN, WINDOW_STIGMA } from '../../../config/balance';
import { totalDeposits } from '../../../sim/balanceSheet';
import * as cmd from '../../../sim/commands';
import { liquidAssets, overnightRate, windowRate } from '../../../sim/treasury';
import { Badge, Card, Confirm, Row } from '../../components';
import { money, moneyFull, pct } from '../../format/format';
import { act, toast, useGame } from '../../store';
import { AmountSlider } from './AmountSlider';

/** The borrow slider never offers less than this, even with few deposits. */
const BORROW_SLIDER_MIN = 1_000_000;
/** Amount steps for the facility sliders. */
const STEP_FLOOR = 100_000;

export function CentralBankFacility() {
  const s = useGame();
  const sym = s.settings.currency;
  const t = s.treasury;
  const deposits = totalDeposits(s);
  // Borrow up to the regulatory minimum's worth of deposits; repay what you owe,
  // as far as liquidity above the minimum allows.
  const borrowMax = Math.max(BORROW_SLIDER_MIN, LIQ_MIN * deposits);
  const headroom = Math.max(0, Math.min(t.reserves, liquidAssets(s) - LIQ_MIN * deposits));
  const repayMax = Math.max(0, Math.min(t.window, headroom));
  const [borrow, setBorrow] = useState(0);
  const [repay, setRepay] = useState(0);
  const [warn, setWarn] = useState(false);
  const borrowValue = Math.min(borrow, borrowMax);
  const repayValue = Math.min(repay, repayMax);
  const stigma = t.windowStigmaWeeks > 0;

  const doBorrow = () => {
    setWarn(false);
    const r = act(cmd.borrowWindow, borrowValue);
    if (r.ok) {
      toast(`Borrowed ${money(borrowValue, sym)} from the central bank.`, 'info');
      setBorrow(0);
    }
  };
  const doRepay = () => {
    const r = act(cmd.repayWindow, repayValue);
    if (r.ok) {
      toast(`Repaid ${money(repayValue, sym)} to the central bank.`, 'good');
      setRepay(0);
    }
  };

  return (
    <Card>
      <div class="tr-fund-head">
        <div class="tr-card-title">Standing lending facility</div>
        {stigma && <Badge tone="warn">Stigma {t.windowStigmaWeeks} wk</Badge>}
      </div>
      <Row label="Window rate" value={pct(windowRate(s))} strong />
      <Row label="Borrowed at the window" value={money(t.window, sym)} />
      <Row label="Overnight interbank" value={money(t.overnight, sym)} />
      <Row label="Overnight rate" value={pct(overnightRate(s))} tone="dim" />
      <p class="muted small hq-note">
        The lender of last resort. Every use dents trust: branch ratings fall by{' '}
        {WINDOW_STIGMA.rating.toFixed(2)} for {WINDOW_STIGMA.weeks} weeks, and the papers may
        notice. Auto-funding repays the window first once liquidity is comfortably above target.
      </p>

      <div class="tr-facility">
        <AmountSlider
          label="Borrow"
          value={borrowValue}
          max={borrowMax}
          onChange={setBorrow}
          sym={sym}
          floor={STEP_FLOOR}
        />
        <button
          type="button"
          class="btn btn-secondary btn-block"
          disabled={borrowValue <= 0}
          onClick={() => (stigma ? doBorrow() : setWarn(true))}
        >
          Borrow {borrowValue > 0 ? money(borrowValue, sym) : ''}
        </button>
      </div>

      {t.window > 0 && (
        <div class="tr-facility">
          <AmountSlider
            label="Repay"
            value={repayValue}
            max={repayMax}
            onChange={setRepay}
            sym={sym}
            floor={STEP_FLOOR}
          />
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={repayValue <= 0}
            onClick={doRepay}
          >
            Repay {repayValue > 0 ? money(repayValue, sym) : ''}
          </button>
          {repayMax < t.window && (
            <p class="muted small tr-under">
              Repaying more would take liquidity below the {pct(LIQ_MIN, 0)} minimum.
            </p>
          )}
        </div>
      )}

      {warn && (
        <Confirm
          title="Borrow from the central bank?"
          body={
            <p>
              Borrow {moneyFull(borrowValue, sym)} at {pct(windowRate(s))}. Using the window signals
              trouble: every branch's rating dips for {WINDOW_STIGMA.weeks} weeks and there is a
              chance it makes the news. Market funding or a cash transfer avoids the stigma.
            </p>
          }
          confirmLabel="Borrow anyway"
          danger
          onConfirm={doBorrow}
          onCancel={() => setWarn(false)}
        />
      )}
    </Card>
  );
}
