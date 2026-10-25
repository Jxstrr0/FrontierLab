// The market facts shared by Market and M&A cards (SCREENS §12): the sparkline
// with price and its move, then market cap, dividend (yield), 52-week high and
// low, P/E and the top three shareholders.
import { Row } from '../components';
import { money, pct } from '../format/format';
import { priceChange, sharePrice, type SecurityView } from './marketView';
import { Sparkline } from './Sparkline';
import './investmentBank.css';

export function StockQuote(p: { view: SecurityView; sym: string }) {
  const v = p.view;
  const { change, since } = priceChange(v.history, v.price);
  return (
    <div class="ib-card-price">
      <Sparkline values={v.history} label={`${v.name} share price, last year`} />
      <div class="ib-card-quote">
        <div class="ib-price">{sharePrice(v.price, p.sym)}</div>
        <div class={`small ${change >= 0 ? 'tone-good' : 'tone-bad'}`}>
          {change >= 0 ? '+' : '−'}
          {pct(Math.abs(change), 1)} {since}
        </div>
      </div>
    </div>
  );
}

export function StockStats(p: { view: SecurityView; sym: string }) {
  const v = p.view;
  const sym = p.sym;
  return (
    <>
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
    </>
  );
}

export function StockHolders(p: { view: SecurityView }) {
  return (
    <div class="ib-holders">
      <div class="muted small">Top shareholders</div>
      {p.view.holders.map((h) => (
        <div class={`ib-holder${h.you ? ' is-you' : ''}`}>
          <span>{h.name}</span>
          <span>{pct(h.pct)}</span>
        </div>
      ))}
    </div>
  );
}
