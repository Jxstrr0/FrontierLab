// Read-only views for the M&A tab (SCREENS §12): which rivals are for sale,
// the price an offer is measured against, their market facts (like a Market
// card) and size, and how your last offer to each went.
import { CITIES } from '../../data/cities';
import { referencePrice, requiredPremium } from '../../sim/mergerPricing';
import { rivalArr } from '../../sim/rivalFinance';
import type { GameState, MergerOffer, RivalBank } from '../../sim/state';
import { rivalSecurity, type SecurityView } from './marketView';

export { rivalArr, rivalCustomers, rivalRunwayWeeks } from '../../sim/rivalFinance';

/** Rivals you could bid for: active or on distressed sale, with offices. Distressed first, then the biggest ARR. */
export function mnaRivals(s: GameState): RivalBank[] {
  return Object.values(s.rivals)
    .filter((r) => (r.status === 'active' || r.status === 'distressed') && r.branches.length > 0)
    .sort(
      (a, b) =>
        Number(b.status === 'distressed') - Number(a.status === 'distressed') ||
        rivalArr(b) - rivalArr(a) ||
        a.id.localeCompare(b.id),
    );
}

export function rivalCities(bank: RivalBank): string {
  const ids = [...new Set(bank.branches.map((b) => b.cityId))];
  return ids.map((id) => CITIES[id]?.name ?? id).join(', ');
}

/** What the reference price is, for its label. */
export function referenceLabel(bank: RivalBank): string {
  if (bank.status === 'distressed') return 'Asking price';
  return bank.listed ? 'Share price' : 'Fair value / share';
}

export interface MnaMarketFacts {
  /** Market card facts for a listed rival; undefined while it is private. */
  market?: SecurityView;
  /** "Ticker · exchange" or "Private". */
  listing: string;
  /**
   * The price an offer is measured against, when the card needs its own row:
   * a listed, healthy rival's reference is its share price, already on show.
   */
  reference?: { label: string; price: number };
}

/** What an M&A card shows above the deal facts (SCREENS §12: like Market cards). */
export function mnaMarketFacts(s: GameState, bank: RivalBank): MnaMarketFacts {
  const market = bank.listed ? rivalSecurity(s, bank) : undefined;
  const sameAsQuote = !!market && bank.status !== 'distressed';
  return {
    market,
    listing: market ? `${market.ticker} · ${market.exchange}` : 'Private',
    reference: sameAsQuote
      ? undefined
      : { label: referenceLabel(bank), price: referencePrice(bank) },
  };
}

/** Weeks left on a distressed sale. */
export function saleWeeksLeft(s: GameState, bank: RivalBank): number {
  return Math.max(0, (bank.distressedUntil ?? s.clock.week) - s.clock.week);
}

/** Your most recent offer to a rival. */
export function lastOffer(s: GameState, rivalId: string): MergerOffer | undefined {
  return [...s.mergers.offers].reverse().find((o) => o.rivalId === rivalId);
}

/** One line on how an offer stands. */
export function offerStatusText(o: MergerOffer): string {
  switch (o.status) {
    case 'pending':
      return 'Offer made. The answer arrives next week.';
    case 'accepted':
      return 'Offer accepted.';
    case 'rejected':
      return 'The board said no.';
    case 'blocked':
      return `Blocked by the regulator. ${o.reason ?? ''}`.trim();
    case 'lapsed':
      return o.reason ?? 'The deal fell through.';
  }
}

export function offerTone(o: MergerOffer): 'good' | 'bad' | 'warn' | 'info' {
  if (o.status === 'accepted') return 'good';
  if (o.status === 'pending') return 'info';
  return o.status === 'rejected' ? 'warn' : 'bad';
}

/** A hint on what the board expects (§19.8 required premium). */
export function boardHint(bank: RivalBank): string {
  const req = requiredPremium(bank);
  if (bank.status === 'distressed')
    return 'Administrators want the failed lab sold. Offers near the asking price usually succeed.';
  return `A lab in this shape usually wants about ${Math.round(req * 100)}% over the ${bank.listed ? 'share price' : 'fair value'}.`;
}
