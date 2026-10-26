// Trophy assets on the Personal Wealth screen (SCREENS §23, SIMULATION §22a):
// the billion-dollar catalogue, cheapest first. An owned trophy shows what you
// paid, its value, its yearly upkeep and Sell; the rest show today's price
// (your home price list) and Buy, disabled with the reason when you can't.
import { useState } from 'preact/hooks';
import { WEEKS_PER_YEAR } from '../../config/balance';
import { TROPHIES, TROPHY_ORDER, type TrophySpec } from '../../data/trophies';
import * as cmd from '../../sim/commands';
import { ownedTrophy, trophyPrice, trophySalePrice, trophyUpkeepWeekly } from '../../sim/trophies';
import { Card, Confirm, Row, SectionTitle } from '../components';
import { money } from '../format/format';
import { act, toast, useGame } from '../store';

type Pending = { spec: TrophySpec; action: 'buy' | 'sell'; amount: number };

export function TrophiesSection() {
  const s = useGame();
  const sym = s.settings.currency;
  const [pending, setPending] = useState<Pending | null>(null);
  const confirm = () => {
    if (!pending) return;
    const { spec, action } = pending;
    setPending(null);
    if (action === 'buy') {
      if (act(cmd.buyTrophy, spec.id).ok) toast(`${spec.name} is yours.`, 'good');
    } else {
      const r = act(cmd.sellTrophy, spec.id);
      if (r.ok) toast(`Sold ${spec.name} for ${money(r.raised, sym)}.`, 'good');
    }
  };
  return (
    <div class="stack">
      <SectionTitle>Trophy assets</SectionTitle>
      <p class="muted small">
        The rarest things money buys, paid from your own cash. Prices follow the economy.
      </p>
      {TROPHY_ORDER.map((id) => {
        const spec = TROPHIES[id]!;
        const owned = ownedTrophy(s, id);
        const price = trophyPrice(s, id);
        const blocker = cmd.trophyBlocker(s, id);
        return (
          <Card>
            <div class="pw-card-head">
              <span class="pw-card-name">{spec.name}</span>
              <span class="muted small">{spec.kind}</span>
            </div>
            <p class="muted small">{spec.blurb}</p>
            {owned ? (
              <>
                <Row label="Paid" value={money(owned.price, sym)} tone="dim" />
                <Row label="Value" value={money(owned.value, sym)} strong />
                <Row
                  label="Upkeep"
                  value={`${money(trophyUpkeepWeekly(owned) * WEEKS_PER_YEAR, sym)} a year`}
                />
                <button
                  type="button"
                  class="btn btn-secondary btn-block"
                  onClick={() =>
                    setPending({ spec, action: 'sell', amount: trophySalePrice(owned) })
                  }
                >
                  Sell for {money(trophySalePrice(owned), sym)}
                </button>
              </>
            ) : (
              <>
                <Row label="Price" value={money(price, sym)} strong />
                <Row
                  label="Upkeep"
                  value={`about ${money(trophyUpkeepWeekly({ trophyId: id, value: price }) * WEEKS_PER_YEAR, sym)} a year`}
                  tone="dim"
                />
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  disabled={!!blocker}
                  onClick={() => setPending({ spec, action: 'buy', amount: price })}
                >
                  Buy for {money(price, sym)}
                </button>
                {blocker && <p class="muted small">{blocker}</p>}
              </>
            )}
          </Card>
        );
      })}
      {pending && (
        <Confirm
          title={
            pending.action === 'buy' ? `Buy ${pending.spec.name}?` : `Sell ${pending.spec.name}?`
          }
          body={
            pending.action === 'buy'
              ? `${money(pending.amount, sym)} leaves your personal cash. Upkeep is paid every week.`
              : `You receive ${money(pending.amount, sym)} after the broker's fee.`
          }
          confirmLabel={pending.action === 'buy' ? 'Buy' : 'Sell'}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
