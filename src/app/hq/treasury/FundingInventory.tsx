// Funding inventory (SCREENS §10 Treasury, DESIGN §5.8.4): one card per
// wholesale lot bought from the funding market, with counterparty, type,
// fixed rate, amount, maturity date and rosette, plus "Repay early" (with a
// confirm) for the types flexible enough to allow it.
import { useState } from 'preact/hooks';
import { FUNDING_TYPES } from '../../../data/fundingTypes';
import * as cmd from '../../../sim/commands';
import { lotInterestWeekly, lotsOutstanding } from '../../../sim/fundingLots';
import type { FundingLot } from '../../../sim/state';
import { Badge, Card, Confirm, Row } from '../../components';
import { dayOfWeek } from '../../branch/selectors';
import { gameDate, money, moneyFull, pct } from '../../format/format';
import { act, toast, useGame } from '../../store';
import { FundFacts } from './FundFacts';
import { FundingRosette } from './FundingRosette';
import { termText } from './treasuryView';

export function FundingInventory() {
  const s = useGame();
  const sym = s.settings.currency;
  const lots = [...s.treasury.lots].sort((a, b) => a.maturityWeek - b.maturityWeek);
  if (lots.length === 0) {
    return (
      <Card>
        <p class="muted small hq-note">
          No market funding yet. Borrow from an offer below to fund lending beyond your deposits.
        </p>
      </Card>
    );
  }
  return (
    <div class="stack">
      <Card>
        <Row label="Outstanding" value={money(lotsOutstanding(s), sym)} strong />
        <Row label="Interest" value={`${money(lotInterestWeekly(s), sym)} /week`} />
        <p class="muted small hq-note">Interest is paid weekly from corporate cash.</p>
      </Card>
      {lots.map((l) => (
        <LotCard key={l.id} lot={l} />
      ))}
    </div>
  );
}

function LotCard({ lot }: { lot: FundingLot }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [confirming, setConfirming] = useState(false);
  const spec = FUNDING_TYPES[lot.type];
  const weeksLeft = Math.max(0, lot.maturityWeek - s.clock.week);
  const repay = () => {
    setConfirming(false);
    const r = act(cmd.repayLot, lot.id);
    if (r.ok) toast(`Repaid ${money(lot.amount, sym)} to ${lot.counterparty}.`, 'good');
  };
  return (
    <Card class="tr-fund-card">
      <div class="tr-fund-head">
        <div>
          <div class="tr-fund-name">{lot.counterparty}</div>
          <div class="muted small">{spec?.name ?? lot.type}</div>
        </div>
        <span class="tr-fund-rate">{pct(lot.rate)}</span>
      </div>
      <div class="tr-fund-body">
        <FundFacts
          items={[
            ['Amount', money(lot.amount, sym)],
            ['Matures', gameDate(s.meta.startDate, dayOfWeek(lot.maturityWeek))],
            ['Left', termText(weeksLeft)],
          ]}
        />
        <FundingRosette radar={lot.radar} />
      </div>
      {spec?.earlyRepay ? (
        <button
          type="button"
          class="btn btn-secondary btn-block"
          onClick={() => setConfirming(true)}
        >
          Repay early
        </button>
      ) : (
        <Badge tone="info">Runs to maturity</Badge>
      )}
      {confirming && (
        <Confirm
          title="Repay early?"
          body={
            <p>
              Repay {moneyFull(lot.amount, sym)} to {lot.counterparty} now, from Treasury reserves.
              Liquid assets fall by the same amount and the interest stops.
            </p>
          }
          confirmLabel="Repay"
          onConfirm={repay}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Card>
  );
}
