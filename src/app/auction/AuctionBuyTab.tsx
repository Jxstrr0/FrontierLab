// Auction house Buy tab (SCREENS §19): when the next sale is, the lots on view
// (icon, name, estimate, sale date, your bid), a Details sheet to bid, and the
// house's recent results.
import { useState } from 'preact/hooks';
import { AUCTIONS } from '../../config/balance';
import { COLLECTIBLES } from '../../data/collectibles';
import { saleListed } from '../../sim/auctions';
import { Badge, Card, Row, SectionTitle } from '../components';
import { money } from '../format/format';
import { useGame } from '../store';
import { CollectibleIcon } from './AuctionArt';
import { LotSheet } from './LotSheet';
import {
  lotRows,
  recentResults,
  saleDateText,
  saleShortDate,
  type HouseView,
  type LotRow,
} from './auctionView';

export function AuctionBuyTab({ view }: { view: HouseView }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [openLot, setOpenLot] = useState<string | null>(null);
  const h = view.house;
  const rows = lotRows(h);
  const listed = saleListed(h);
  const open = rows.find((r) => r.lot.id === openLot);
  const results = recentResults(h);
  return (
    <div class="stack">
      {!view.here && (
        <Card>
          <p class="small muted au-note">
            You need to be in {view.citiesText} to bid. Bids you've already placed still stand.
          </p>
        </Card>
      )}
      <SectionTitle>Next sale</SectionTitle>
      <Card>
        <Row label="Sale" value={saleDateText(s, h.nextWeek)} strong />
        <Row
          label="Lots"
          value={
            listed
              ? `${rows.length} on view`
              : `On view from ${saleShortDate(s, h.nextWeek - AUCTIONS.previewWeeks)}`
          }
          tone={listed ? undefined : 'dim'}
        />
      </Card>
      {rows.map((r) => (
        <LotCard
          key={r.lot.id}
          row={r}
          sym={sym}
          date={saleShortDate(s, h.nextWeek)}
          onOpen={() => setOpenLot(r.lot.id)}
        />
      ))}
      {results.length > 0 && (
        <>
          <SectionTitle>Recent results</SectionTitle>
          <Card>
            {results.map((r, i) => (
              <div class="au-result" key={`${r.week}-${r.itemId}-${i}`}>
                <span class="au-result-name small">
                  {COLLECTIBLES[r.itemId]?.name ?? r.itemId}
                  <span class="muted"> · {saleShortDate(s, r.week)}</span>
                </span>
                <span class="au-result-price">
                  {money(r.price, sym)}
                  {r.outcome === 'you' && <Badge tone="good">You won</Badge>}
                  {r.outcome === 'sold' && <Badge tone="info">Your sale</Badge>}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}
      {open && <LotSheet view={view} row={open} sym={sym} onClose={() => setOpenLot(null)} />}
    </div>
  );
}

function LotCard(p: { row: LotRow; sym: string; date: string; onOpen: () => void }) {
  const { lot, spec, yours } = p.row;
  return (
    <Card class="au-lot" onClick={p.onOpen}>
      <CollectibleIcon category={spec.category} />
      <span class="au-lot-body">
        <span class="au-lot-name">{spec.name}</span>
        <span class="small muted">
          Estimate {money(lot.estimate, p.sym)} · {p.date}
        </span>
        <span class="au-lot-badges">
          {yours && <Badge tone="info">Your consignment</Badge>}
          {lot.maxBid !== undefined && (
            <Badge tone="good">Your max bid {money(lot.maxBid, p.sym)}</Badge>
          )}
        </span>
      </span>
      <span class="au-chevron" aria-hidden="true">
        ›
      </span>
    </Card>
  );
}
