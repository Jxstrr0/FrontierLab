// Save migration 37 → 38 (cleanup batch): the last bank-era weight goes.
// The treasury folds into corporate cash: its reserves (an asset) are added
// and whatever it still owed (overnight and central bank window borrowing and
// wholesale funding lots, all liabilities) is paid off, so equity is unchanged
// and the balance identity still holds. Deposit and loan books were settled in
// migration 5 → 6, so none remain to count. Write-only and always-zero fields
// go too: the liquidity ratio, the Risk floor's loss records, rival price lags,
// the FTP trackers on each country, the dead P&L lines (folded into the line
// that replaces them, so every stored total keeps its net income), the bank
// totals on each weekly close, the office "Bad debts" line, and fields the
// game wrote but never read (dropWriteOnly).
import type { GameState } from '../state';
import { legacyTreasury } from './legacyTreasury';

/** Removed company P&L lines and the live line each one's amount moves to. */
const FOLDED_LINES: Record<string, string> = {
  reserveInterest: 'ventureDebtInterest',
  bondCoupon: 'ventureDebtInterest',
  depositInterest: 'corporateInterest',
  wholesaleInterest: 'corporateInterest',
  wealthFees: 'dividendIncome',
  originationFees: 'dividendIncome',
  realizedGains: 'investmentGains',
};

/** Moves each removed line's amount onto its replacement and deletes it. */
function foldPnl(pnl: Record<string, number> | undefined): void {
  if (!pnl) return;
  for (const [from, to] of Object.entries(FOLDED_LINES)) {
    if (!(from in pnl)) continue;
    pnl[to] = (pnl[to] ?? 0) + (pnl[from] ?? 0);
    delete pnl[from];
  }
}

type OldWeek = {
  netRevenue?: number;
  pnl?: Record<string, number>;
  totals?: Record<string, number | undefined>;
};

export function migrateBankWeight(state: GameState): void {
  const raw = state as unknown as { treasury?: unknown };
  if (raw.treasury) {
    const t = legacyTreasury(state);
    const owed = t.overnight + t.window + t.lots.reduce((sum, l) => sum + (l.amount ?? 0), 0);
    state.company.cash += t.reserves - owed;
  }
  delete raw.treasury;
  delete (state.company as unknown as { liquidityRatio?: unknown }).liquidityRatio;
  delete (state.risk as unknown as { losses?: unknown }).losses;
  delete state.rng.funding;

  for (const r of Object.values(state.rivals ?? {}))
    delete (r as unknown as { priceLags?: unknown }).priceLags;
  for (const c of Object.values(state.world.countries ?? {})) {
    const old = c as unknown as Record<string, unknown> | undefined;
    if (!old) continue;
    delete old.prevFtpShort;
    delete old.prevFtpLong;
    delete old.cardAnchor;
    delete old.startPolicy;
  }

  foldPnl(state.ledger.pnl as unknown as Record<string, number>);
  for (const w of (state.history?.weekly ?? []) as unknown as OldWeek[]) {
    foldPnl(w.pnl);
    delete w.netRevenue;
    if (w.totals) {
      delete w.totals.deposits;
      delete w.totals.loans;
      delete w.totals.liquid;
    }
  }
  for (const b of Object.values(state.branches ?? {})) {
    for (const row of b.pnl ?? []) delete (row.lines as Record<string, number>).losses;
    for (const book of Object.values(b.books ?? {})) {
      const last = book.last as unknown as Record<string, unknown>;
      delete last.defaulted;
      delete last.defaultedLoans;
    }
  }
  dropWriteOnly(state);
}

/** Fields the game wrote but never read. */
function dropWriteOnly(state: GameState): void {
  const del = (o: unknown, ...keys: string[]) => {
    if (o && typeof o === 'object') for (const k of keys) delete (o as Record<string, unknown>)[k];
  };
  del(state.meta, 'saveName');
  del(state.world.travel, 'faresPaid', 'totalKm');
  for (const lot of Object.values(state.world.lots ?? {})) del(lot, 'homeownerShare');
  del(state.stock, 'ipoPrice');
  del(state.market, 'shock');
  del(state.personal?.empire?.richList, 'lastRankWeek');
  for (const o of state.mergers?.offers ?? []) del(o, 'madeWeek');
  for (const q of state.history?.quarterly ?? []) del(q, 'roe');
}
