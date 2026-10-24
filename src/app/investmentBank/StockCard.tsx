// One company card on the Market tab (SCREENS §12): monogram, name, ticker and
// exchange, sparkline and price, market cap, dividend (yield), 52-week high
// and low, P/E, the top three shareholders and a Trade button.
import { STOCK_MARKET } from '../../config/balance';
import { Card, Medallion, Row } from '../components';
import { money, pct } from '../format/format';
import { sharePrice, type SecurityView } from './marketView';
import { Sparkline } from './Sparkline';

const RANGE_WEEKS = STOCK_MARKET.rangeWeeks;

export function StockCard(p: { view: SecurityView; sym: string; onTrade: () => void }) {
  const v = p.view;
  const sym = p.sym;
  const recent = v.history.slice(-(RANGE_WEEKS + 1));
  const first = recent[0] ?? v.price;
  const span = recent.length - 1;
  const since = span >= RANGE_WEEKS ? 'in a year' : span > 0 ? `in ${span} wk` : 'this week';
  const change = first > 0 ? v.price / first - 1 : 0;
  return (
    <Card class="ib-card">
      <div class="ib-card-head">
        <Medallion ink={v.ink} monogram={v.monogram} size={40} />
        <div class="ib-card-title">
          <div class="ib-card-name">{v.name}</div>
          <div class="muted small">
            {v.ticker} · {v.exchange}
            {v.self && ' · You'}
          </div>
        </div>
      </div>
      <div class="ib-card-price">
        <Sparkline values={v.history} label={`${v.name} share price, last year`} />
        <div class="ib-card-quote">
          <div class="ib-price">{sharePrice(v.price, sym)}</div>
          <div class={`small ${change >= 0 ? 'tone-good' : 'tone-bad'}`}>
            {change >= 0 ? '+' : '−'}
            {pct(Math.abs(change), 1)} {since}
          </div>
        </div>
      </div>
      <Row label="Market cap" value={money(v.marketCap, sym)} />
      <Row
        label="Dividend"
        value={v.dividend > 0 ? `${sharePrice(v.dividend, sym)} (${pct(v.yield)})` : 'None'}
      />
      <Row
        label="52-week high / low"
        value={`${sharePrice(v.high52, sym)} / ${sharePrice(v.low52, sym)}`}
      />
      <Row label="P/E" value={v.pe === undefined ? '—' : v.pe.toFixed(1)} />
      <div class="ib-holders">
        <div class="muted small">Top shareholders</div>
        {v.holders.map((h) => (
          <div class={`ib-holder${h.you ? ' is-you' : ''}`}>
            <span>{h.name}</span>
            <span>{pct(h.pct)}</span>
          </div>
        ))}
      </div>
      <button type="button" class="btn btn-primary btn-block" onClick={p.onTrade}>
        Trade
      </button>
    </Card>
  );
}
