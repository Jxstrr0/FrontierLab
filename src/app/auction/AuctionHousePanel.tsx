// SCREENS §19 auction house: Buy and Sell tabs. Owner: auctions engineer.
// (Stage 9 placeholder: filled in by its owner.)
import { Card, Panel } from '../components';
import { closePanel } from '../store';

export function AuctionHousePanel(_p: { siteId?: string; clubId?: string }) {
  return (
    <Panel title="Auction house" onClose={closePanel}>
      <Card>
        <p class="muted">Coming soon.</p>
      </Card>
    </Panel>
  );
}
