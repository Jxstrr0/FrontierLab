// Read-only views for the Investment floor (SCREENS §10): the donut slices,
// the portfolio's weekly change, every holding for the List portfolio sheet
// (stocks, ventures, venture debt, buildings) and the ventures
// carousel of pipeline startups.
import { CITIES } from '../../data/cities';
import { portfolioBreakdown, startupMark, startupShares, type Account } from '../../sim/portfolio';
import { securityPrice } from '../../sim/securities';
import type { GameState, Startup } from '../../sim/state';
import { sectorOf } from '../../sim/ventureModel';

export type SliceId = 'stocks' | 'ventures' | 'realEstate' | 'ventureDebt';

export const SLICES: { id: SliceId; label: string }[] = [
  { id: 'stocks', label: 'Stocks' },
  { id: 'ventures', label: 'Ventures' },
  { id: 'realEstate', label: 'Real estate' },
  { id: 'ventureDebt', label: 'Compute credits' },
];

export interface Slice {
  id: SliceId;
  label: string;
  value: number;
}

export function portfolioSlices(
  s: GameState,
  account: Account,
): { slices: Slice[]; total: number } {
  const p = portfolioBreakdown(s, account);
  return {
    slices: SLICES.map((x) => ({ ...x, value: Math.max(0, p[x.id]) })),
    total: p.total,
  };
}

/** Change since last week's investment step (undefined before the first week). */
export function weeklyChange(s: GameState, account: Account): number | undefined {
  const log = s.ventures.valueLog;
  if (!log) return undefined;
  return portfolioBreakdown(s, account).total - log[account];
}

export interface HoldingRow {
  key: string;
  kind: SliceId;
  name: string;
  detail: string;
  value: number;
  /** Gain against what you paid, when known. */
  gain?: number;
  /** Opens the startup panel. */
  startupId?: string;
  /** Opens the property panel. */
  siteId?: string;
}

const ventureDetail = (st: Startup, shares: number) =>
  `${sectorOf(st.sector).label} · ${Math.round(shares).toLocaleString('en-US')} shares`;

/** Every holding of an account, grouped in donut order, largest first within a group. */
export function portfolioRows(s: GameState, account: Account): HoldingRow[] {
  const rows: HoldingRow[] = [];
  for (const [id, h] of Object.entries(s.market.holdings[account])) {
    const value = h.shares * securityPrice(s, id);
    const c = s.market.companies[id];
    const name = c?.name ?? s.rivals[id]?.name ?? (id === 'self' ? s.meta.bankName : id);
    rows.push({
      key: `stock:${id}`,
      kind: 'stocks',
      name,
      detail: `${c?.ticker ?? s.rivals[id]?.ticker ?? ''} · ${h.shares.toLocaleString('en-US')} shares`,
      value,
      gain: value - h.shares * h.avgCost,
    });
  }
  for (const st of Object.values(s.ventures.startups)) {
    const shares = startupShares(st, account);
    if (shares > 0 && st.stage !== 'public' && st.stage !== 'acquired' && st.stage !== 'failed') {
      const value = shares * startupMark(s, st);
      const cost = st.holders.find((h) => h.id === account)?.cost;
      rows.push({
        key: `venture:${st.id}`,
        kind: 'ventures',
        name: st.name,
        detail: ventureDetail(st, shares),
        value,
        gain: cost === undefined ? undefined : value - cost,
        startupId: st.id,
      });
    }
    const d = st.ventureDebt;
    if (d && d.lender === account) {
      rows.push({
        key: `debt:${st.id}`,
        kind: 'ventureDebt',
        name: st.name,
        detail: `${(d.rate * 100).toFixed(2)}% · ${d.weeksLeft} weeks left`,
        value: d.balance,
        startupId: st.id,
      });
    }
  }
  for (const p of Object.values(s.realEstate.properties)) {
    if (p.owner !== account) continue;
    rows.push({
      key: `property:${p.id}`,
      kind: 'realEstate',
      name: s.world.sites[p.id]?.address ?? 'Building',
      detail: `${CITIES[p.cityId]?.name ?? ''} · ${p.sqm.toLocaleString('en-US')} m²`,
      value: p.value,
      gain: p.value - p.purchasePrice,
      siteId: p.id,
    });
  }
  const order = SLICES.map((x) => x.id);
  return rows.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.value - a.value);
}

/** Pipeline startups to show, in pipeline order (dropped ones skipped). */
export function pipelineStartups(s: GameState): Startup[] {
  return s.ventures.pipeline.map((id) => s.ventures.startups[id]).filter((x): x is Startup => !!x);
}
