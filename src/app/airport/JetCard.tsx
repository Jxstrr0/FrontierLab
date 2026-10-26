// Private jet card (SCREENS §18, DESIGN §5.17): without a jet, the two models
// with price, range and blurb and a Buy button paid from personal cash; with
// one, its value and weekly upkeep, "Fly now" (the departures board in jet
// mode) and "Sell" at the resale price. Buying and selling confirm first.
import { useState } from 'preact/hooks';
import { JETS, type JetSpec } from '../../data/jets';
import * as cmd from '../../sim/commands';
import { listPrice } from '../../sim/nominal';
import { jetResale, jetUpkeepWeekly } from '../../sim/travel';
import { Card, Confirm, Row, SectionTitle } from '../components';
import { money } from '../format/format';
import { act, toast, useGame } from '../store';
import { distanceText } from './departures';

export function rangeText(spec: JetSpec, units: 'km' | 'mi'): string {
  return spec.rangeKm === null ? 'Global' : distanceText(spec.rangeKm, units);
}

export function JetCard(p: { onFlyNow: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  const jet = s.personal.jet;
  const [buying, setBuying] = useState<JetSpec | null>(null);
  const [selling, setSelling] = useState(false);

  if (jet) {
    const spec = JETS[jet.model];
    const resale = jetResale(s);
    return (
      <div>
        <SectionTitle>Private jet</SectionTitle>
        <Card>
          <div class="jet-head">
            <span class="jet-name">{spec?.name ?? jet.model}</span>
            <span class="jet-range">{spec ? rangeText(spec, s.settings.units) : ''} range</span>
          </div>
          <Row label="Value" value={money(jet.value, sym)} />
          <Row
            label="Upkeep"
            value={`${money(jetUpkeepWeekly(jet.value), sym)} / week`}
            tone="dim"
          />
          <Row label="Bought for" value={money(jet.price, sym)} tone="dim" />
          <div class="btn-row jet-actions">
            <button type="button" class="btn btn-secondary" onClick={() => setSelling(true)}>
              Sell
            </button>
            <button type="button" class="btn btn-primary" onClick={p.onFlyNow}>
              Fly now
            </button>
          </div>
        </Card>
        {selling && (
          <Confirm
            title={`Sell the ${spec?.name ?? 'jet'}?`}
            body={
              <p>
                A buyer offers {money(resale, sym)}, paid into your personal cash. Its upkeep stops.
              </p>
            }
            confirmLabel={`Sell for ${money(resale, sym)}`}
            danger
            onCancel={() => setSelling(false)}
            onConfirm={() => {
              setSelling(false);
              const r = act(cmd.sellJet);
              if (r.ok) toast(`Jet sold for ${money(r.price, sym)}`, 'good');
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Private jet</SectionTitle>
      <p class="muted small jet-intro">
        Fly anywhere on your own schedule: a jet never pays a ticket within its range. Bought with
        personal cash ({money(s.personal.cash, sym)}).
      </p>
      <div class="stack">
        {Object.values(JETS).map((spec) => {
          // Today's price list (§4.6); the same figure buyJet charges.
          const j = { ...spec, price: listPrice(s, spec.price) };
          const short = s.personal.cash < j.price;
          return (
            <Card key={j.id}>
              <div class="jet-head">
                <span class="jet-name">{j.name}</span>
                <span class="jet-price">{money(j.price, sym)}</span>
              </div>
              <Row label="Range" value={rangeText(j, s.settings.units)} />
              <p class="muted small jet-blurb">{j.blurb}</p>
              <button
                type="button"
                class="btn btn-primary btn-block"
                disabled={short}
                onClick={() => setBuying(j)}
              >
                Buy
              </button>
              {short && (
                <p class="small tone-bad jet-why">
                  Needs {money(j.price, sym)} of personal cash; you have{' '}
                  {money(Math.max(0, s.personal.cash), sym)}.
                </p>
              )}
            </Card>
          );
        })}
      </div>
      {buying && (
        <Confirm
          title={`Buy the ${buying.name}?`}
          body={
            <p>
              {money(buying.price, sym)} from your personal cash. Upkeep and wear come to about{' '}
              {money(jetUpkeepWeekly(buying.price), sym)} a week at first.
            </p>
          }
          confirmLabel={`Buy for ${money(buying.price, sym)}`}
          onCancel={() => setBuying(null)}
          onConfirm={() => {
            const id = buying.id;
            setBuying(null);
            const r = act(cmd.buyJet, id);
            if (r.ok) toast(`Your ${JETS[id]?.name ?? 'jet'} is ready on the apron`, 'good');
          }}
        />
      )}
    </div>
  );
}
