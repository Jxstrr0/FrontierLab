// Read-only views for the Personal Wealth screen (SCREENS §23): the donut's four
// slices (Cash, Stocks, Real estate, Others), built from netWorth() so the
// slices always add up to the total, and the rows for each section (stocks with
// your own stake, buildings and homes, cars, collectibles, the jet and the
// rest). Shared by WealthPanel and the "Net worth ties out" test.
import { CARS } from '../../data/cars';
import { CITIES } from '../../data/cities';
import { COLLECTIBLES } from '../../data/collectibles';
import { HOMES } from '../../data/homes';
import { JETS } from '../../data/jets';
import { netWorth, type NetWorth } from '../../sim/netWorth';
import { carResale, homeSite } from '../../sim/personalValues';
import { propertyRoi } from '../../sim/propertyMath';
import { securityPrice } from '../../sim/securities';
import { FOUNDER_ID, sharesHeld } from '../../sim/shares';
import type { GameState } from '../../sim/state';

export type WealthSliceId = 'cash' | 'stocks' | 'realEstate' | 'others';

export interface WealthSlice {
  id: WealthSliceId;
  label: string;
  value: number;
}

/** Which netWorth() parts each slice sums (every part lands in exactly one). */
export const SLICE_PARTS: Record<WealthSliceId, (keyof Omit<NetWorth, 'total'>)[]> = {
  cash: ['cash'],
  stocks: ['ownShares', 'stocks'],
  realEstate: ['realEstate', 'homes'],
  others: ['ventures', 'ventureDebt', 'currencies', 'cars', 'collectibles', 'jet', 'franchise'],
};

const LABELS: Record<WealthSliceId, string> = {
  cash: 'Cash',
  stocks: 'Stocks',
  realEstate: 'Real estate',
  others: 'Others',
};

/** The donut slices and their sum (equal to netWorth().total). */
export function wealthSlices(s: GameState): { slices: WealthSlice[]; total: number; nw: NetWorth } {
  const nw = netWorth(s);
  const slices = (Object.keys(SLICE_PARTS) as WealthSliceId[]).map((id) => ({
    id,
    label: LABELS[id],
    value: SLICE_PARTS[id].reduce((t, k) => t + nw[k], 0),
  }));
  return { slices, total: slices.reduce((t, x) => t + x.value, 0), nw };
}

export interface StockRow {
  key: string;
  name: string;
  detail: string;
  shares: number;
  value: number;
  /** What you paid, when known (founder shares have none). */
  cost?: number;
  gain?: number;
}

/** Your own bank stake first, then other stocks you hold personally, largest first. */
export function stockRows(s: GameState): StockRow[] {
  const rows: StockRow[] = [];
  const own = sharesHeld(s, FOUNDER_ID);
  if (own > 0)
    rows.push({
      key: 'self',
      name: s.meta.bankName,
      detail:
        s.stock.status === 'public'
          ? `${s.stock.ticker ?? ''} · founder stake`
          : 'Private · founder stake',
      shares: own,
      value: own * s.stock.price,
    });
  const others: StockRow[] = [];
  for (const [id, h] of Object.entries(s.market.holdings.personal)) {
    const value = h.shares * securityPrice(s, id);
    const cost = h.shares * h.avgCost;
    const c = s.market.companies[id];
    others.push({
      key: id,
      name: c?.name ?? s.rivals[id]?.name ?? id,
      detail: c?.ticker ?? s.rivals[id]?.ticker ?? '',
      shares: h.shares,
      value,
      cost,
      gain: value - cost,
    });
  }
  return [...rows, ...others.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))];
}

export interface EstateRow {
  key: string;
  name: string;
  detail: string;
  value: number;
  gain: number;
  /** Buildings only: annualised net rent / price. */
  roi?: number;
  /** Rebuild finishing in this many weeks (homes). */
  rebuildIn?: number;
  open: { type: 'property'; siteId: string } | { type: 'vacationHome'; siteId: string } | null;
}

/** Buildings you own personally, then your homes, largest first within each. */
export function estateRows(s: GameState): EstateRow[] {
  const buildings: EstateRow[] = Object.values(s.realEstate.properties)
    .filter((p) => p.owner === 'personal')
    .map((p) => ({
      key: p.id,
      name: s.world.sites[p.id]?.address ?? 'Building',
      detail: `${CITIES[p.cityId]?.name ?? ''} · rented building`,
      value: p.value,
      gain: p.value - p.purchasePrice,
      roi: propertyRoi(p),
      open: { type: 'property' as const, siteId: p.id },
    }));
  const homes: EstateRow[] = s.personal.empire.homes.map((h) => {
    const spec = HOMES[h.homeId];
    const site = homeSite(s, h.homeId);
    const row: EstateRow = {
      key: h.id,
      name: spec?.name ?? h.homeId,
      detail: `${CITIES[spec?.cityId ?? '']?.name ?? ''} · vacation home`,
      value: h.value,
      gain: h.value - h.price,
      open: site ? { type: 'vacationHome', siteId: site.id } : null,
    };
    if (h.rebuildDoneWeek !== undefined)
      row.rebuildIn = Math.max(1, h.rebuildDoneWeek - s.clock.week);
    return row;
  });
  const big = (a: EstateRow, b: EstateRow) => b.value - a.value || a.key.localeCompare(b.key);
  return [...buildings.sort(big), ...homes.sort(big)];
}

export interface CarRow {
  id: string;
  name: string;
  value: number;
  gain: number;
  resale: number;
  classic: boolean;
}

export function carRows(s: GameState): CarRow[] {
  return s.personal.empire.cars.map((c) => ({
    id: c.id,
    name: CARS[c.carId]?.name ?? c.carId,
    value: c.value,
    gain: c.value - c.price,
    resale: carResale(c),
    classic: !!CARS[c.carId]?.classic,
  }));
}

export interface CollectibleRow {
  id: string;
  name: string;
  price: number;
  value: number;
  status: 'Unverified' | 'Genuine' | 'Counterfeit';
}

/** Read-only: the auction house panel owns appraisals and consignments. */
export function collectibleRows(s: GameState): CollectibleRow[] {
  return s.personal.empire.collectibles.map((c) => ({
    id: c.id,
    name: COLLECTIBLES[c.itemId]?.name ?? c.itemId,
    price: c.price,
    value: c.value,
    status: !c.appraised ? 'Unverified' : c.genuine ? 'Genuine' : 'Counterfeit',
  }));
}

/** The jet's name, if you own one. */
export function jetName(s: GameState): string | undefined {
  const jet = s.personal.jet;
  return jet ? (JETS[jet.model]?.name ?? jet.model) : undefined;
}
