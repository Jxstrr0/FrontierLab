// Treasury policy and government bonds (SCREENS §10, SIMULATION §13.3–13.5):
// the target liquidity ratio, the bond share of liquid assets above the
// minimum, the auto-funding toggle, and the bond book: market value, book
// value, unrealised gain or loss, book yield and duration.
import { BOND_DURATION, BOND_SHARE_MAX, LIQ_MIN, LIQ_TARGET_RANGE } from '../../../config/balance';
import * as cmd from '../../../sim/commands';
import { Card, Row, Stepper, Toggle } from '../../components';
import { delta, money, pct, percentText } from '../../format/format';
import { act, useGame } from '../../store';
import { gainTone } from './treasuryView';

/** Policy steppers move in whole percentage points (target) and 5pp (bond share). */
const TARGET_STEP = 0.01;
const BOND_STEP = 0.05;

const parsePercent = (t: string) => Number(t.replace('%', '').trim()) / 100;

export function TreasuryPolicyCard() {
  const s = useGame();
  const t = s.treasury;
  const [lo, hi] = LIQ_TARGET_RANGE;
  return (
    <Card>
      <div class="tr-card-title">Treasury policy</div>
      <div class="grid-2 tr-policy">
        <Stepper
          label="Target liquidity"
          value={t.liqTarget}
          min={lo}
          max={hi}
          step={TARGET_STEP}
          format={(v) => pct(v, 0)}
          editText={percentText}
          parse={parsePercent}
          onChange={(v) => act(cmd.setTreasuryPolicy, { liqTarget: v })}
          hint={`${pct(lo, 0)} to ${pct(hi, 0)}`}
        />
        <Stepper
          label="Bond share"
          value={t.bondShare}
          min={0}
          max={BOND_SHARE_MAX}
          step={BOND_STEP}
          format={(v) => pct(v, 0)}
          editText={percentText}
          parse={parsePercent}
          onChange={(v) => act(cmd.setTreasuryPolicy, { bondShare: v })}
          hint={`0% to ${pct(BOND_SHARE_MAX, 0)}`}
        />
      </div>
      <p class="muted small hq-note">
        Bonds earn more than reserves but lose value when long rates rise. The share applies to
        liquid assets above the {pct(LIQ_MIN, 0)} minimum.
      </p>
      <Toggle
        label="Auto-funding"
        hint={
          t.autoFunding
            ? 'Shortfalls borrow overnight, then from the central bank'
            : 'Shortfalls freeze lending instead of borrowing'
        }
        checked={t.autoFunding}
        onChange={(v) => act(cmd.setTreasuryPolicy, { autoFunding: v })}
      />
    </Card>
  );
}

export function BondsCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const t = s.treasury;
  const gain = t.bondsMarket - t.bondsBook;
  const d = delta(t.bondsMarket, t.bondsBook, sym);
  return (
    <Card>
      <div class="tr-card-title">Government bonds</div>
      {t.bondsBook <= 0 && t.bondsMarket <= 0 ? (
        <p class="muted small hq-note">
          No bonds yet. Treasury buys them each week up to the bond share once liquid assets are
          above the minimum.
        </p>
      ) : (
        <>
          <Row label="Market value" value={money(t.bondsMarket, sym)} strong />
          <Row label="Book value" value={money(t.bondsBook, sym)} />
          <Row
            label="Unrealised gain / loss"
            value={gainTone(gain) === 'flat' ? money(0, sym) : d.text}
            tone={gainTone(gain)}
          />
          <Row label="Book yield" value={pct(t.bondBookYield)} />
          <Row label="Duration" value={`${BOND_DURATION.toFixed(1)} years`} tone="dim" />
          <p class="muted small hq-note">
            A 1pp rise in long rates cuts market value by about {pct(BOND_DURATION / 100, 0)}.
            Unrealised gains and losses count in equity.
          </p>
        </>
      )}
    </Card>
  );
}
