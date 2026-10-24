// Auction houses (SIMULATION §22, SCREENS §19): the staggered schedule, lot
// listing, clearing and the buyer's premium, counterfeit odds, appraisal,
// consignment, insurance and yearly drift, plus the acceptance test "A
// counterfeit can be bought and discovered".
import { describe, expect, it } from 'vitest';
import { AUCTIONS, COLLECTIBLES_CFG } from '../../src/config/balance';
import { AUCTION_HOUSES, COLLECTIBLES } from '../../src/data/collectibles';
import {
  buyerCost,
  collectibleStatus,
  driftValues,
  insuranceWeekly,
  listLots,
  lognormalMean1,
  sellerProceeds,
} from '../../src/sim/auctions';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { netWorth } from '../../src/sim/netWorth';
import { newGame } from '../../src/sim/newGame';
import { hashSeed, rngFromState } from '../../src/sim/rng';
import type { GameState, OwnedCollectible } from '../../src/sim/state';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Gavel Bank' });

/** A game in New York with Marlowe & Finch's first sale listed. */
function atMarlowe(): GameState {
  const s = game();
  expect(cmd.travelTo(s, 'nyc').ok).toBe(true);
  while (s.auctions.marlowe!.listedWeek === undefined) advanceWeeks(s, 1);
  return s;
}

/** Runs weeks until the house's current sale is held. */
function runToSale(s: GameState, houseId: string): void {
  const due = s.auctions[houseId]!.nextWeek;
  while (s.clock.week < due) advanceWeeks(s, 1);
}

const piece = (o: Partial<OwnedCollectible> = {}): OwnedCollectible => ({
  id: 'col-test',
  itemId: 'sovereign',
  houseId: 'marlowe',
  price: 1_120_000,
  value: 1_000_000,
  genuine: true,
  appraised: false,
  boughtWeek: 0,
  ...o,
});

const identityHolds = (s: GameState) => {
  const bs = balanceSheet(s);
  expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
};

describe('auction math', () => {
  it('adds the 12% buyer premium and takes the 10% seller fee', () => {
    expect(buyerCost(1_000_000)).toBeCloseTo(1_120_000, 6);
    expect(sellerProceeds(1_000_000)).toBeCloseTo(900_000, 6);
  });

  it('draws lognormal(1, σ) with mean 1', () => {
    const rng = rngFromState(hashSeed(7, 'lognormal'));
    let sum = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) sum += lognormalMean1(rng, AUCTIONS.clearingSigma);
    expect(sum / n).toBeCloseTo(1, 1);
  });
});

describe('schedule', () => {
  it('staggers each house’s first sale a few weeks out', () => {
    const s = game();
    const weeks = Object.keys(AUCTION_HOUSES).map((id) => s.auctions[id]!.nextWeek);
    expect(new Set(weeks).size).toBe(weeks.length);
    for (const w of weeks) expect(w).toBeGreaterThanOrEqual(AUCTIONS.firstSaleWeeks);
    expect(Object.values(s.auctions).every((h) => h.lots.length === 0)).toBe(true);
  });

  it('lists 3–5 distinct lots previewWeeks ahead, then sells every everyWeeks', () => {
    const s = game();
    const h = s.auctions.harrowgate!;
    const first = h.nextWeek;
    while (s.clock.week < first - AUCTIONS.previewWeeks) {
      expect(h.listedWeek).toBeUndefined();
      advanceWeeks(s, 1);
    }
    expect(h.listedWeek).toBe(first - AUCTIONS.previewWeeks);
    const [lo, hi] = AUCTIONS.lots;
    expect(h.lots.length).toBeGreaterThanOrEqual(lo);
    expect(h.lots.length).toBeLessThanOrEqual(hi);
    expect(new Set(h.lots.map((l) => l.itemId)).size).toBe(h.lots.length);
    for (const l of h.lots) {
      const est = COLLECTIBLES[l.itemId]!.estimate;
      expect(Math.abs(l.estimate / est - 1)).toBeLessThanOrEqual(AUCTIONS.estimateNoise + 0.02);
      expect(l.estimate % AUCTIONS.estimateRound).toBe(0);
    }
    expect(
      s.events.log.some((e) => e.type === 'AUCTION_PREVIEW' && e.payload.houseId === 'harrowgate'),
    ).toBe(true);
    const n = h.lots.length;
    runToSale(s, 'harrowgate');
    expect(h.lots).toEqual([]);
    expect(h.nextWeek).toBe(first + AUCTIONS.everyWeeks);
    expect(h.history.length).toBe(n);
    expect(h.history.every((r) => r.outcome === 'other')).toBe(true);
  });

  it('rolls counterfeits at each house’s odds', () => {
    const s = game();
    for (const spec of Object.values(AUCTION_HOUSES)) {
      const h = s.auctions[spec.id]!;
      let fakes = 0;
      let lots = 0;
      for (let i = 0; i < 3000; i++) {
        h.lots = [];
        delete h.listedWeek;
        listLots(s, h);
        lots += h.lots.length;
        fakes += h.lots.filter((l) => !l.genuine).length;
      }
      expect(fakes / lots).toBeGreaterThan(spec.fakeOdds - 0.015);
      expect(fakes / lots).toBeLessThan(spec.fakeOdds + 0.015);
    }
  });
});

describe('bidding', () => {
  it('needs you in one of the house’s cities', () => {
    const s = game();
    while (s.auctions.marlowe!.listedWeek === undefined) advanceWeeks(s, 1);
    const lot = s.auctions.marlowe!.lots[0]!;
    expect(cmd.placeBid(s, 'marlowe', lot.id, 1e9).ok).toBe(false);
    cmd.travelTo(s, 'lon');
    expect(cmd.placeBid(s, 'marlowe', lot.id, 1e9).ok).toBe(true);
    expect(cmd.clearBid(s, 'marlowe', lot.id).ok).toBe(true);
    expect(lot.maxBid).toBeUndefined();
  });

  it('wins at clearing + premium, loses when outbid or short of cash', () => {
    const s = atMarlowe();
    const h = s.auctions.marlowe!;
    expect(h.lots.length).toBeGreaterThanOrEqual(3);
    const [a, b, c] = h.lots;
    expect(cmd.placeBid(s, 'marlowe', a!.id, 1e12).ok).toBe(true);
    expect(cmd.placeBid(s, 'marlowe', b!.id, 1).ok).toBe(true);
    s.personal.cash = 50_000_000;
    runToSale(s, 'marlowe');
    const owned = s.personal.empire.collectibles;
    expect(owned).toHaveLength(1);
    const won = owned[0]!;
    expect(won.itemId).toBe(a!.itemId);
    expect(won.price).toBeCloseTo(buyerCost(won.value), 6);
    expect(won.appraised).toBe(false);
    expect(collectibleStatus(won)).toBe('unverified');
    const lost = s.events.log.find((e) => e.type === 'AUCTION_LOST');
    expect(lost?.payload).toMatchObject({ itemId: b!.itemId, reason: 'outbid' });
    expect(h.history.filter((r) => r.outcome === 'you')).toHaveLength(1);
    expect(h.history.some((r) => r.itemId === c!.itemId && r.outcome === 'other')).toBe(true);
    identityHolds(s);
  });

  it('loses the lot when personal cash can’t pay at the sale', () => {
    const s = atMarlowe();
    const lot = s.auctions.marlowe!.lots[0]!;
    cmd.placeBid(s, 'marlowe', lot.id, 1e12);
    s.personal.cash = 0;
    runToSale(s, 'marlowe');
    expect(s.personal.empire.collectibles).toHaveLength(0);
    const lost = s.events.log.find((e) => e.type === 'AUCTION_LOST');
    expect(lost?.payload).toMatchObject({ itemId: lot.itemId, reason: 'cash' });
  });
});

describe('appraisal and consignment', () => {
  it('reports after appraiseWeeks; a genuine piece keeps its value', () => {
    const s = game();
    s.personal.empire.collectibles.push(piece());
    const cash = s.personal.cash;
    const r = cmd.appraiseCollectible(s, 'col-test');
    expect(r.ok).toBe(true);
    expect(s.personal.cash).toBeCloseTo(cash - 1_120_000 * AUCTIONS.appraiseFee, 6);
    const c = s.personal.empire.collectibles[0]!;
    expect(collectibleStatus(c)).toBe('appraising');
    expect(cmd.appraiseCollectible(s, 'col-test').ok).toBe(false);
    advanceWeeks(s, AUCTIONS.appraiseWeeks);
    expect(collectibleStatus(c)).toBe('genuine');
    expect(c.value).toBe(1_000_000);
    expect(s.events.log.some((e) => e.type === 'APPRAISAL_DONE')).toBe(true);
  });

  it('consigns only appraised genuine pieces, at the house, and pays hammer less the fee', () => {
    const s = game();
    s.personal.empire.collectibles.push(piece());
    expect(cmd.consignCollectible(s, 'col-test', 'marlowe').ok).toBe(false); // not in a Marlowe city
    cmd.travelTo(s, 'nyc');
    expect(cmd.consignCollectible(s, 'col-test', 'marlowe').ok).toBe(false); // unappraised
    s.personal.empire.collectibles[0]!.appraised = true;
    const r = cmd.consignCollectible(s, 'col-test', 'marlowe');
    expect(r.ok).toBe(true);
    expect(cmd.consignCollectible(s, 'col-test', 'marlowe').ok).toBe(false); // already consigned
    const h = s.auctions.marlowe!;
    expect(h.lots.some((l) => l.consignedId === 'col-test')).toBe(true);
    // Withdraw and consign again from anywhere / at the house.
    expect(cmd.withdrawConsignment(s, 'col-test').ok).toBe(true);
    expect(h.lots.some((l) => l.consignedId === 'col-test')).toBe(false);
    expect(cmd.consignCollectible(s, 'col-test', 'marlowe').ok).toBe(true);
    runToSale(s, 'marlowe');
    expect(s.personal.empire.collectibles).toHaveLength(0);
    const sold = s.events.log.find((e) => e.type === 'AUCTION_SOLD');
    expect(sold).toBeDefined();
    const hammer = sold!.payload.price as number;
    expect(sold!.payload.proceeds).toBeCloseTo(sellerProceeds(hammer), 6);
    expect(hammer).toBeGreaterThan(400_000);
    expect(hammer).toBeLessThan(2_500_000);
    expect(h.history.some((x) => x.outcome === 'sold')).toBe(true);
    identityHolds(s);
  });
});

describe('values', () => {
  it('charges insurance at 0.2% a year of value, weekly', () => {
    const s = game();
    s.personal.empire.collectibles.push(piece({ value: 52_000_000 }));
    expect(insuranceWeekly(s)).toBeCloseTo((52_000_000 * COLLECTIBLES_CFG.insuranceRate) / 52, 6);
  });

  it('drifts every piece not found fake by about +3% a year; found fakes stay at 0', () => {
    const s = game();
    const list = s.personal.empire.collectibles;
    for (let i = 0; i < 2000; i++) list.push(piece({ id: `c${i}`, value: 1_000_000 }));
    list.push(piece({ id: 'fake', value: 0, genuine: false, appraised: true }));
    list.push(piece({ id: 'hidden', genuine: false, appraised: false }));
    driftValues(s);
    const genuine = list.filter((c) => c.genuine);
    const mean = genuine.reduce((a, c) => a + c.value, 0) / genuine.length / 1_000_000;
    expect(mean).toBeGreaterThan(1 + COLLECTIBLES_CFG.drift - 0.01);
    expect(mean).toBeLessThan(1 + COLLECTIBLES_CFG.drift + 0.01);
    expect(list.find((c) => c.id === 'fake')!.value).toBe(0);
    expect(list.find((c) => c.id === 'hidden')!.value).not.toBe(1_000_000);
    for (const c of genuine) expect(c.value).toBeGreaterThanOrEqual(c.price * 0.25);
  });
});

describe('acceptance', () => {
  it('A counterfeit can be bought and discovered', () => {
    const s = atMarlowe();
    const h = s.auctions.marlowe!;
    const lot = h.lots[0]!;
    lot.genuine = false; // force the counterfeit roll for this lot
    expect(cmd.placeBid(s, 'marlowe', lot.id, 1e12).ok).toBe(true);
    s.personal.cash = 50_000_000;
    runToSale(s, 'marlowe');
    const fake = s.personal.empire.collectibles.find((c) => c.itemId === lot.itemId)!;
    expect(fake).toBeDefined();
    expect(collectibleStatus(fake)).toBe('unverified');
    expect(fake.value).toBeGreaterThan(0);
    expect(netWorth(s).collectibles).toBeCloseTo(fake.value, 6);

    // Twin futures: one appraises, the other doesn't.
    const twin = structuredClone(s);
    const value = fake.value;
    const fee = fake.price * AUCTIONS.appraiseFee;
    expect(cmd.appraiseCollectible(s, fake.id).ok).toBe(true);
    advanceWeeks(s, AUCTIONS.appraiseWeeks);
    advanceWeeks(twin, AUCTIONS.appraiseWeeks);

    expect(collectibleStatus(fake)).toBe('counterfeit');
    expect(fake.value).toBe(0);
    expect(cmd.consignCollectible(s, fake.id, 'marlowe').ok).toBe(false);
    const done = s.events.log.find((e) => e.type === 'APPRAISAL_DONE');
    expect(done?.payload).toMatchObject({ genuine: false, value: 0 });
    const after = netWorth(s);
    const untouched = netWorth(twin);
    expect(after.collectibles).toBe(0);
    expect(untouched.collectibles).toBeGreaterThan(0);
    // Net worth drops by the piece's value plus the fee (less a week's insurance saved).
    expect(untouched.total - after.total).toBeCloseTo(value + fee, -3);
    identityHolds(s);
  });
});
