// M&A rival cards (SCREENS §12: "like Market cards, plus branches, cities and
// deposits"): listed rivals carry the same market facts as their Market card,
// private ones show "Private", and the reference price gets its own row only
// when it differs from the quote (distressed asking price, book value).
import { describe, expect, it } from 'vitest';
import { mnaMarketFacts, mnaRivals } from '../../src/app/investmentBank/mnaSelectors';
import {
  priceChange,
  rivalSecurity,
  sectorSecurities,
} from '../../src/app/investmentBank/marketView';
import { STOCK_MARKET } from '../../src/config/balance';
import { referencePrice } from '../../src/sim/mergerPricing';
import { newGame } from '../../src/sim/newGame';

function game() {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Deal Bank' });
  const rivals = mnaRivals(s);
  expect(rivals.length).toBeGreaterThanOrEqual(2);
  return { s, rivals };
}

describe('M&A card market facts', () => {
  it('matches the Market card for a listed rival', () => {
    const { s, rivals } = game();
    const bank = rivals[0]!;
    bank.listed = true;
    bank.ticker ??= 'TEST';
    const facts = mnaMarketFacts(s, bank);
    const market = sectorSecurities(s, 'banking').find((v) => v.id === bank.id);
    expect(facts.market).toEqual(market);
    expect(facts.market).toEqual(rivalSecurity(s, bank));
    expect(facts.listing).toBe(`${market!.ticker} · ${market!.exchange}`);
    // The quote already shows the share price, so no separate reference row.
    expect(facts.reference).toBeUndefined();
    expect(facts.market!.holders.length).toBeGreaterThan(0);
    expect(facts.market!.marketCap).toBeCloseTo(bank.price * bank.shares);
  });

  it('shows Private and book value for an unlisted rival', () => {
    const { s, rivals } = game();
    const bank = rivals[1]!;
    bank.listed = false;
    const facts = mnaMarketFacts(s, bank);
    expect(facts.market).toBeUndefined();
    expect(facts.listing).toBe('Private');
    expect(facts.reference).toEqual({
      label: 'Fair value / share',
      price: referencePrice(bank),
    });
  });

  it('keeps the asking price row on a distressed sale', () => {
    const { s, rivals } = game();
    const bank = rivals[0]!;
    bank.listed = true;
    bank.status = 'distressed';
    const facts = mnaMarketFacts(s, bank);
    expect(facts.market).toBeDefined();
    expect(facts.reference?.label).toBe('Asking price');
    expect(facts.reference?.price).toBeCloseTo(referencePrice(bank));
  });
});

describe('price change on a card', () => {
  it('measures over a year of closes, or what history there is', () => {
    const year = Array.from({ length: STOCK_MARKET.rangeWeeks + 10 }, (_, i) => 10 + i);
    const first = year[year.length - 1 - STOCK_MARKET.rangeWeeks]!;
    expect(priceChange(year, 20)).toEqual({ change: 20 / first - 1, since: 'in a year' });
    const short = priceChange([10, 11, 12], 12);
    expect(short.change).toBeCloseTo(0.2);
    expect(short.since).toBe('in 2 wk');
    expect(priceChange([], 5)).toEqual({ change: 0, since: 'this week' });
  });
});
