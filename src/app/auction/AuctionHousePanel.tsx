// SCREENS §19 auction house: header with the house and city, the advisor line,
// the saleroom vignette, and tabs Buy (the next sale's lots, bids, results) and
// Sell (your collectibles: appraise, consign).
import { useState } from 'preact/hooks';
import { Card, Panel, type Tab } from '../components';
import { LayerMedallion } from '../map/LayerIcon';
import { closePanel, useGame } from '../store';
import { AuctionArt } from './AuctionArt';
import { AuctionBuyTab } from './AuctionBuyTab';
import { AuctionSellTab } from './AuctionSellTab';
import { houseView } from './auctionView';
import './auction.css';

type AuctionTab = 'buy' | 'sell';

const TABS: Tab<AuctionTab>[] = [
  { id: 'buy', label: 'Buy' },
  { id: 'sell', label: 'Sell' },
];

export function AuctionHousePanel(p: { siteId?: string; tab?: AuctionTab }) {
  const s = useGame();
  const [tab, setTab] = useState<AuctionTab>(p.tab ?? 'buy');
  const view = p.siteId ? houseView(s, p.siteId) : undefined;
  if (!view) {
    return (
      <Panel title="Auction house" onClose={closePanel}>
        <Card>
          <p class="muted">That auction house is no longer on the map.</p>
        </Card>
      </Panel>
    );
  }
  return (
    <Panel
      title={view.spec.name}
      subtitle={`Auction house · ${view.cityName}`}
      icon={<LayerMedallion id="auctionHouses" size={32} />}
      onClose={closePanel}
      advisor={{ text: 'Exceptional pieces this season. Buying or selling?' }}
      hero={<AuctionArt />}
      tabs={TABS}
      tab={tab}
      onTab={setTab}
    >
      {tab === 'buy' ? <AuctionBuyTab view={view} /> : <AuctionSellTab view={view} />}
    </Panel>
  );
}
