// Auction houses (SIMULATION §22 "Auctions", SCREENS §19): each house holds a
// sale every AUCTIONS.everyWeeks weeks (houses staggered) of 3–5 lots drawn
// from COLLECTIBLES, listed AUCTIONS.previewWeeks ahead, each with an estimate
// and a hidden counterfeit roll at the house's odds. At the sale every lot
// clears at estimate × lognormal(1, σ); your max bid wins it if it reaches the
// clearing price and personal cash covers clearing + the buyer's premium. Your
// consignments sell in the same sale. Weekly: appraisals report, insurance is
// charged; at year start, values drift. Streams: `auctions`, `collectibles`.
import { AUCTIONS, COLLECTIBLES_CFG, WEEKS_PER_YEAR } from '../config/balance';
import { AUCTION_HOUSES, COLLECTIBLES } from '../data/collectibles';
import { isYearStart } from './calendar';
import { dexp } from './detmath';
import { pushEvent } from './events';
import { stream, type Rng } from './rng';
import type { AuctionHouseState, AuctionLot, GameState, OwnedCollectible } from './state';

/** Lognormal draw with mean 1 (SIMULATION §22: "lognormal(1, σ)"). */
export const lognormalMean1 = (rng: Rng, sigma: number): number =>
  dexp(rng.normal(-(sigma * sigma) / 2, sigma));

export const itemName = (itemId: string): string => COLLECTIBLES[itemId]?.name ?? itemId;
export const houseName = (houseId: string): string => AUCTION_HOUSES[houseId]?.name ?? houseId;

/** What you pay for a lot that clears at `clearing`: hammer + buyer's premium. */
export const buyerCost = (clearing: number): number => clearing * (1 + AUCTIONS.buyerPremium);

/** What you receive for a consignment hammered at `hammer`, after the seller's fee. */
export const sellerProceeds = (hammer: number): number => hammer * (1 - AUCTIONS.sellerFee);

/** The appraisal fee for a piece: a share of what you paid. */
export const appraisalFee = (c: OwnedCollectible): number => c.price * AUCTIONS.appraiseFee;

export type CollectibleStatus = 'unverified' | 'appraising' | 'genuine' | 'counterfeit';

/** What the player knows about a piece (never reveals an unappraised fake). */
export function collectibleStatus(c: OwnedCollectible): CollectibleStatus {
  if (c.appraised) return c.genuine ? 'genuine' : 'counterfeit';
  return c.appraisalWeek !== undefined ? 'appraising' : 'unverified';
}

/** A house's next sale has its lots up for preview. */
export const saleListed = (h: AuctionHouseState): boolean => h.listedWeek !== undefined;

/** First sale for every house (newGame and migration 9 → 10), a week apart. */
export function seedAuctions(state: GameState): void {
  Object.keys(AUCTION_HOUSES).forEach((houseId, i) => {
    state.auctions[houseId] = {
      houseId,
      nextWeek: state.clock.week + AUCTIONS.firstSaleWeeks + i * AUCTIONS.staggerWeeks,
      lots: [],
      history: [],
    };
  });
}

/** Weekly (tick step 11): list upcoming lots, hold due sales, finish appraisals, insure, drift. */
export function runAuctions(state: GameState): void {
  const week = state.clock.week;
  for (const h of Object.values(state.auctions)) {
    if (!saleListed(h) && week >= h.nextWeek - AUCTIONS.previewWeeks) listLots(state, h);
    if (week >= h.nextWeek) holdSale(state, h);
  }
  finishAppraisals(state);
  chargeInsurance(state);
  if (isYearStart(state.meta.startDate, state.clock.day)) driftValues(state);
}

/**
 * Draws the next sale's lots and previews them: no item twice in one sale, and
 * never a one-of-a-kind piece you already own (2026-10-31).
 */
export function listLots(state: GameState, h: AuctionHouseState): void {
  const spec = AUCTION_HOUSES[h.houseId];
  if (!spec) return;
  const rng = stream(state, 'auctions');
  const [lo, hi] = AUCTIONS.lots;
  const n = rng.int(lo, hi);
  const taken = new Set([
    ...h.lots.map((l) => l.itemId),
    ...state.personal.empire.collectibles.map((c) => c.itemId),
  ]);
  const pool = Object.keys(COLLECTIBLES).filter((id) => !taken.has(id));
  const noise = AUCTIONS.estimateNoise;
  for (let i = 0; i < n && pool.length > 0; i++) {
    const itemId = pool.splice(rng.int(0, pool.length - 1), 1)[0]!;
    const base = COLLECTIBLES[itemId]!.estimate * rng.range(1 - noise, 1 + noise);
    h.lots.push({
      id: `${h.houseId}-${h.nextWeek}-${i}`,
      itemId,
      estimate: Math.max(1, Math.round(base / AUCTIONS.estimateRound)) * AUCTIONS.estimateRound,
      genuine: !rng.chance(spec.fakeOdds),
    });
  }
  h.listedWeek = state.clock.week;
  const offered = h.lots.filter((l) => !l.consignedId);
  const top = offered.reduce<AuctionLot | undefined>(
    (best, l) => (!best || l.estimate > best.estimate ? l : best),
    undefined,
  );
  if (!top) return;
  pushEvent(
    state,
    'AUCTION_PREVIEW',
    {
      houseId: h.houseId,
      house: spec.name,
      itemId: top.itemId,
      item: itemName(top.itemId),
      estimate: top.estimate,
      week: h.nextWeek,
      lots: h.lots.length,
    },
    5,
    h.houseId,
  );
}

/** Holds the sale: every lot clears; bids win or lose; consignments pay out. */
export function holdSale(state: GameState, h: AuctionHouseState): void {
  const rng = stream(state, 'auctions');
  for (const lot of h.lots) {
    if (lot.consignedId) sellConsigned(state, h, lot, rng);
    else sellLot(state, h, lot, rng);
  }
  h.history = h.history.slice(-AUCTIONS.historyKeep);
  h.lots = [];
  delete h.listedWeek;
  h.nextWeek += AUCTIONS.everyWeeks;
}

function sellLot(state: GameState, h: AuctionHouseState, lot: AuctionLot, rng: Rng): void {
  const clearing = lot.estimate * lognormalMean1(rng, AUCTIONS.clearingSigma);
  const base = { houseId: h.houseId, house: houseName(h.houseId), itemId: lot.itemId };
  const item = itemName(lot.itemId);
  let won = false;
  if (lot.maxBid !== undefined) {
    const cost = buyerCost(clearing);
    if (lot.maxBid < clearing) {
      pushEvent(state, 'AUCTION_LOST', { ...base, item, price: clearing, reason: 'outbid' }, 3);
    } else if (state.personal.cash < cost) {
      // SIMULATION §22: the bid stood, but you can't pay at the sale.
      pushEvent(state, 'AUCTION_LOST', { ...base, item, price: clearing, reason: 'cash' }, 2);
    } else {
      won = true;
      state.personal.cash -= cost;
      state.personal.empire.collectibles.push({
        id: `col-${lot.id}`,
        itemId: lot.itemId,
        houseId: h.houseId,
        price: cost,
        value: clearing,
        genuine: lot.genuine,
        appraised: false,
        boughtWeek: state.clock.week,
      });
      pushEvent(state, 'AUCTION_WON', { ...base, item, price: cost }, 2);
    }
  }
  h.history.push({
    week: state.clock.week,
    itemId: lot.itemId,
    price: clearing,
    outcome: won ? 'you' : 'other',
    estimate: lot.estimate,
  });
  if (clearing >= lot.estimate * AUCTIONS.recordFactor) {
    pushEvent(state, 'AUCTION_RECORD', {
      ...base,
      item,
      price: clearing,
      estimate: lot.estimate,
      yours: won,
    });
  }
}

function sellConsigned(state: GameState, h: AuctionHouseState, lot: AuctionLot, rng: Rng): void {
  const list = state.personal.empire.collectibles;
  const c = list.find((x) => x.id === lot.consignedId);
  if (!c) return;
  // SIMULATION §22: hammer = value × lognormal(1, 0.15), less the seller's fee.
  const hammer = c.value * lognormalMean1(rng, AUCTIONS.consignSigma);
  const proceeds = sellerProceeds(hammer);
  state.personal.cash += proceeds;
  state.personal.empire.collectibles = list.filter((x) => x !== c);
  h.history.push({
    week: state.clock.week,
    itemId: c.itemId,
    price: hammer,
    outcome: 'sold',
    estimate: lot.estimate,
  });
  pushEvent(
    state,
    'AUCTION_SOLD',
    {
      houseId: h.houseId,
      house: houseName(h.houseId),
      itemId: c.itemId,
      item: itemName(c.itemId),
      price: hammer,
      proceeds,
    },
    2,
  );
}

/** Appraisals due this week report: a fake is worth nothing from now on. */
export function finishAppraisals(state: GameState): void {
  for (const c of state.personal.empire.collectibles) {
    if (c.appraisalWeek === undefined || state.clock.week < c.appraisalWeek) continue;
    delete c.appraisalWeek;
    c.appraised = true;
    if (!c.genuine) c.value = 0;
    pushEvent(
      state,
      'APPRAISAL_DONE',
      {
        collectibleId: c.id,
        houseId: c.houseId,
        house: houseName(c.houseId),
        itemId: c.itemId,
        item: itemName(c.itemId),
        genuine: c.genuine,
        value: c.value,
      },
      2,
    );
  }
}

/** SIMULATION §22: collectible insurance, 0.2%/yr of value, weekly from personal cash. */
export function insuranceWeekly(state: GameState): number {
  const total = state.personal.empire.collectibles.reduce((a, c) => a + c.value, 0);
  return (total * COLLECTIBLES_CFG.insuranceRate) / WEEKS_PER_YEAR;
}

function chargeInsurance(state: GameState): void {
  state.personal.cash -= insuranceWeekly(state);
}

/**
 * Year start: every piece not found to be fake moves by drift + σ·N(0,1)
 * (SIMULATION §22). Unappraised fakes move too, so values never give them away.
 */
export function driftValues(state: GameState): void {
  const rng = stream(state, 'collectibles');
  const { drift, sigma, floorShare } = COLLECTIBLES_CFG;
  for (const c of state.personal.empire.collectibles) {
    if (c.value <= 0) continue;
    const factor = 1 + drift + sigma * rng.normal(0, 1);
    c.value = Math.max(c.price * floorShare, c.value * factor);
  }
}
