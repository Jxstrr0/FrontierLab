// One company card on the Market tab (SCREENS §12): monogram, name, ticker and
// exchange, sparkline and price, market cap, dividend (yield), 52-week high
// and low, P/E, the top three shareholders (StockFacts.tsx) and a Trade button.
import { Card, Medallion } from '../components';
import { type SecurityView } from './marketView';
import { StockHolders, StockQuote, StockStats } from './StockFacts';

export function StockCard(p: { view: SecurityView; sym: string; onTrade: () => void }) {
  const v = p.view;
  return (
    <Card class="ib-card">
      <div class="ib-card-head">
        <Medallion ink={v.ink} monogram={v.monogram} shape={v.shape} size={40} />
        <div class="ib-card-title">
          <div class="ib-card-name">{v.name}</div>
          <div class="muted small">
            {v.ticker} · {v.exchange}
            {v.self && ' · You'}
          </div>
        </div>
      </div>
      <StockQuote view={v} sym={p.sym} />
      <StockStats view={v} sym={p.sym} />
      <StockHolders view={v} />
      <button type="button" class="btn btn-primary btn-block" onClick={p.onTrade}>
        Trade
      </button>
    </Card>
  );
}
