// Investment bank Market tab (SCREENS §12): the Ledger Composite, a sector
// switch (Banking lists listed rival banks and, once you are public, your
// own) and a vertical list of company cards, phone-first. Trade opens the
// Trade sheet.
import { useState } from 'preact/hooks';
import { MARKET_INDEX_NAME, SECTORS, type SectorId } from '../../data/stocks';
import { indexWeeklyMove } from '../../sim/marketStocks';
import { Card, Segmented } from '../components';
import { signedPct } from '../format/format';
import { useGame } from '../store';
import { sectorSecurities } from './marketView';
import { Sparkline } from './Sparkline';
import { StockCard } from './StockCard';
import { TradeSheet } from './TradeSheet';
import './investmentBank.css';

export function MarketTab(_p: { bankId: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [sector, setSector] = useState<SectorId>('technology');
  const [trading, setTrading] = useState<{ id: string; name: string } | null>(null);
  const list = sectorSecurities(s, sector);
  const move = indexWeeklyMove(s);
  return (
    <>
      <Card class="ib-index">
        <div>
          <div class="muted small">{MARKET_INDEX_NAME}</div>
          <div class="ib-index-level">{s.market.index.toFixed(1)}</div>
          <div class={`small ${move >= 0 ? 'tone-good' : 'tone-bad'}`}>
            {signedPct(move, 1)} this week
          </div>
        </div>
        <Sparkline values={s.market.indexHistory} label={`${MARKET_INDEX_NAME}, last year`} />
      </Card>
      <div class="ib-sectors">
        <Segmented
          label="Sector"
          options={SECTORS.map((x) => ({ value: x.id, label: x.label }))}
          value={sector}
          onChange={setSector}
        />
      </div>
      {list.length === 0 ? (
        <Card>
          <p class="muted small">
            {sector === 'banking'
              ? 'No banks are listed here yet. Your own bank joins this list once it goes public.'
              : 'Nothing is listed in this sector.'}
          </p>
        </Card>
      ) : (
        <div class="ib-list">
          {list.map((v) => (
            <StockCard
              key={v.id}
              view={v}
              sym={sym}
              onTrade={() => setTrading({ id: v.id, name: v.name })}
            />
          ))}
        </div>
      )}
      {trading && (
        <TradeSheet securityId={trading.id} name={trading.name} onClose={() => setTrading(null)} />
      )}
    </>
  );
}
