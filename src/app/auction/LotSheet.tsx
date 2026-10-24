// A lot's Details sheet (SCREENS §19 Buy): the description line, estimate and
// sale date, a max bid Stepper and Place bid / Change bid / Withdraw bid. You pay
// only if you win: the hammer plus the buyer's premium, from personal cash at the sale.
import { useState } from 'preact/hooks';
import { AUCTIONS } from '../../config/balance';
import { buyerCost } from '../../sim/auctions';
import * as cmd from '../../sim/commands';
import { Row, Sheet, Stepper } from '../components';
import { money, moneyFull, pct } from '../format/format';
import { act, toast, useGame } from '../store';
import { CollectibleIcon } from './AuctionArt';
import { bidBounds, saleDateText, type HouseView, type LotRow } from './auctionView';

export function LotSheet(p: { view: HouseView; row: LotRow; sym: string; onClose: () => void }) {
  const s = useGame();
  const { lot, spec, yours } = p.row;
  const houseId = p.view.spec.id;
  const b = bidBounds(lot.estimate);
  const [bid, setBid] = useState(lot.maxBid ?? lot.estimate);
  const worst = buyerCost(bid);
  const short = s.personal.cash < worst;
  const place = () => {
    const had = lot.maxBid !== undefined;
    const r = act(cmd.placeBid, houseId, lot.id, bid);
    if (r.ok) {
      toast(`${had ? 'Bid changed' : 'Bid placed'}: up to ${money(bid, p.sym)}.`, 'good');
      p.onClose();
    }
  };
  const withdraw = () => {
    const r = act(cmd.clearBid, houseId, lot.id);
    if (r.ok) {
      toast('Bid withdrawn.');
      p.onClose();
    }
  };
  return (
    <Sheet title="Lot details" onClose={p.onClose}>
      <div class="au-sheet-head">
        <CollectibleIcon category={spec.category} />
        <div>
          <div class="au-lot-name">{spec.name}</div>
          <p class="small muted au-blurb">{spec.blurb}</p>
        </div>
      </div>
      <Row label="Estimate" value={moneyFull(lot.estimate, p.sym)} strong />
      <Row label="Sale" value={saleDateText(s, p.view.house.nextWeek)} />
      <Row label="Buyer's premium" value={pct(AUCTIONS.buyerPremium, 0)} tone="dim" />
      {yours ? (
        <p class="small muted au-note">This is your own piece, consigned to this sale.</p>
      ) : (
        <>
          <Stepper
            label="Max bid"
            value={bid}
            min={b.min}
            max={b.max}
            step={b.step}
            onChange={setBid}
            format={(v) => moneyFull(v, p.sym)}
            disabled={!p.view.here}
          />
          <Row label="If you win, you pay up to" value={moneyFull(worst, p.sym)} />
          <Row
            label="Personal cash"
            value={moneyFull(s.personal.cash, p.sym)}
            tone={short ? 'bad' : undefined}
          />
          {short && (
            <p class="small au-warn">
              Not enough personal cash for a win at your max bid. If you can't pay at the sale, the
              lot goes to the next bidder.
            </p>
          )}
          {!p.view.here && (
            <p class="small muted au-note">Bidding opens to you in {p.view.citiesText}.</p>
          )}
          <div class="btn-row au-actions">
            {lot.maxBid !== undefined && (
              <button type="button" class="btn btn-secondary" onClick={withdraw}>
                Withdraw bid
              </button>
            )}
            <button type="button" class="btn btn-primary" disabled={!p.view.here} onClick={place}>
              {lot.maxBid !== undefined ? 'Change bid' : 'Place bid'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
