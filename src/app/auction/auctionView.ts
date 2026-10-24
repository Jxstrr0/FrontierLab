// Read-only views of the auction state for the auction house panel (SCREENS
// §19): the house behind a map site, its sale date, the lots on view with your
// bids, recent results, and your collectibles with what you can do with each
// here. Never reveals whether an unappraised piece is genuine.
import { AUCTIONS, DAYS_PER_WEEK } from '../../config/balance';
import { CITIES } from '../../data/cities';
import {
  AUCTION_HOUSES,
  COLLECTIBLES,
  type AuctionHouseSpec,
  type CollectibleSpec,
} from '../../data/collectibles';
import {
  appraisalFee,
  collectibleStatus,
  saleListed,
  type CollectibleStatus,
} from '../../sim/auctions';
import { dateOf, weekOfYear } from '../../sim/calendar';
import type {
  AuctionHouseState,
  AuctionLot,
  AuctionResult,
  GameState,
  OwnedCollectible,
} from '../../sim/state';
import { gameDate, shortDate } from '../format/format';

export interface HouseView {
  spec: AuctionHouseSpec;
  house: AuctionHouseState;
  cityName: string;
  /** You're in one of the house's cities (bidding and consigning need it). */
  here: boolean;
  /** "London or New York". */
  citiesText: string;
}

export function houseView(s: GameState, siteId: string): HouseView | undefined {
  const site = s.world.sites[siteId];
  const spec = site && AUCTION_HOUSES[site.refId];
  const house = spec && s.auctions[spec.id];
  if (!site || !spec || !house) return undefined;
  const names = spec.cities.map((c) => CITIES[c]?.name ?? c);
  return {
    spec,
    house,
    cityName: CITIES[site.cityId]?.name ?? site.cityId,
    here: spec.cities.includes(s.world.currentCityId),
    citiesText: names.join(' or '),
  };
}

/** Week of the year of a sale week, for "Sale wk 12". */
export function saleWeekOfYear(s: GameState, week: number): number {
  return weekOfYear(dateOf(s.meta.startDate, week * DAYS_PER_WEEK));
}

/** "18 Mar 2027 · week 12". */
export function saleDateText(s: GameState, week: number): string {
  return `${gameDate(s.meta.startDate, week * DAYS_PER_WEEK)} · week ${saleWeekOfYear(s, week)}`;
}

export const saleShortDate = (s: GameState, week: number): string =>
  shortDate(s.meta.startDate, week * DAYS_PER_WEEK);

export interface LotRow {
  lot: AuctionLot;
  spec: CollectibleSpec;
  /** One of your own pieces, consigned to this sale. */
  yours: boolean;
}

/** The lots on view for the next sale (none before its preview window). */
export function lotRows(house: AuctionHouseState): LotRow[] {
  if (!saleListed(house)) return [];
  return house.lots.flatMap((lot) => {
    const spec = COLLECTIBLES[lot.itemId];
    return spec ? [{ lot, spec, yours: !!lot.consignedId }] : [];
  });
}

/** Recent results, newest first. */
export function recentResults(house: AuctionHouseState, n = 8): AuctionResult[] {
  return house.history.slice(-n).reverse();
}

/** Max-bid stepper bounds for a lot. */
export function bidBounds(estimate: number): { min: number; max: number; step: number } {
  const step = Math.max(
    AUCTIONS.estimateRound,
    Math.round((estimate * AUCTIONS.bidStepShare) / AUCTIONS.estimateRound) *
      AUCTIONS.estimateRound,
  );
  return { min: step, max: Math.ceil((estimate * AUCTIONS.bidMaxFactor) / step) * step, step };
}

export interface CollectibleRow {
  c: OwnedCollectible;
  spec: CollectibleSpec | undefined;
  name: string;
  status: CollectibleStatus;
  fee: number;
  /** Where it's consigned, if anywhere, and that sale's week. */
  consigned?: { house: string; week: number };
  /** Why it can't be consigned here, or undefined when it can. */
  consignBlock?: string;
}

export function collectibleRows(s: GameState, here: HouseView | undefined): CollectibleRow[] {
  return s.personal.empire.collectibles.map((c) => {
    const spec = COLLECTIBLES[c.itemId];
    const status = collectibleStatus(c);
    const target = c.consignedTo ? s.auctions[c.consignedTo] : undefined;
    const row: CollectibleRow = {
      c,
      spec,
      name: spec?.name ?? c.itemId,
      status,
      fee: appraisalFee(c),
    };
    if (c.consignedTo && target) {
      row.consigned = {
        house: AUCTION_HOUSES[c.consignedTo]?.name ?? c.consignedTo,
        week: target.nextWeek,
      };
    }
    row.consignBlock = consignBlock(status, here);
    return row;
  });
}

function consignBlock(status: CollectibleStatus, here: HouseView | undefined): string | undefined {
  if (status === 'counterfeit') return "Counterfeits can't be consigned.";
  if (status === 'appraising') return 'Still with the appraisers.';
  if (status === 'unverified') return 'Appraise it before the house will take it.';
  if (!here?.here) return `Consign in ${here?.citiesText ?? 'a city with this house'}.`;
  return undefined;
}
