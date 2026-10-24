// Currencies on the Market tab (SCREENS §12, SIMULATION §19.10): one card per
// foreign currency with its rate against your home currency, a sparkline, what
// is driving it and your positions, and a Trade button for the FX sheet.
import { useState } from 'preact/hooks';
import { CURRENCIES } from '../../data/currencies';
import { homeCurrency } from '../../sim/fx';
import { Card, Medallion, Row } from '../components';
import { money, pct } from '../format/format';
import { useGame } from '../store';
import { FxTradeSheet } from './FxTradeSheet';
import { currencyViews } from './fxView';
import { Sparkline } from './Sparkline';

const FX_INK = '#2f5d50';

export function CurrenciesList() {
  const s = useGame();
  const sym = s.settings.currency;
  const [trading, setTrading] = useState<string | null>(null);
  const views = currencyViews(s);
  const home = CURRENCIES[homeCurrency(s)];
  return (
    <>
      <Card>
        <p class="muted small">
          A simple bet on a country: buy its currency if you think its economy will do better than
          home, sell if it will slip. Rates are against the {home.name} (100 = where both started).
        </p>
      </Card>
      <div class="ib-list">
        {views.map((v) => (
          <Card class="ib-card" key={v.country}>
            <div class="ib-card-head">
              <Medallion ink={FX_INK} monogram={v.country} size={40} />
              <div class="ib-card-title">
                <div class="ib-card-name">{v.name}</div>
                <div class="muted small">
                  {v.code} · {v.countryName}
                  {v.pegged && ` · pegged to the ${v.pegged}`}
                </div>
              </div>
            </div>
            <div class="ib-card-price">
              <Sparkline values={v.history} label={`${v.name} against home, last year`} />
              <div class="ib-card-quote">
                <div class="ib-price">{v.rate.toFixed(2)}</div>
                <div class={`small ${v.change >= 0 ? 'tone-good' : 'tone-bad'}`}>
                  {v.change >= 0 ? '+' : '−'}
                  {pct(Math.abs(v.change), 1)} in a year
                </div>
              </div>
            </div>
            <p class="muted small">{v.drivers}</p>
            <Row label="Company position" value={money(v.company, sym)} />
            <Row label="Private position" value={money(v.personal, sym)} />
            <button
              type="button"
              class="btn btn-primary btn-block"
              onClick={() => setTrading(v.country)}
            >
              Trade
            </button>
          </Card>
        ))}
      </div>
      {trading && (
        <FxTradeSheet
          country={trading as keyof typeof CURRENCIES}
          onClose={() => setTrading(null)}
        />
      )}
    </>
  );
}
