// Save migration (schema 21 → 22): rival labs stop running bank books. Each
// office's "deposits" become customers (one per the old $10,000 of deposits,
// the figure the M&A tab used) with the ARR they pay at the rival's prices;
// the lab's cash is its old equity less its offices' replacement value (at
// least a quarter of running costs); loans, LDR and the capital ratio go.
import { refreshRivalFinances } from '../rivalBooks';
import { arrPerCustomer, rivalBookAssets, rivalWeeklyCosts } from '../rivalFinance';
import type { GameState, RivalBank, RivalBranch } from '../state';

/** The bank-era stand-in: one customer per this much of an office's deposits (old MERGERS.depositPerCustomer). */
const LEGACY_DEPOSIT_PER_CUSTOMER = 10_000;
/** A lab whose old equity was all offices starts with this much cash, in weeks of running costs. */
const MIN_START_WEEKS = 13;

type LegacyOffice = RivalBranch & { deposits?: number; loans?: number };
type LegacyRival = RivalBank & { capitalRatio?: number };

export function migrateRivalBooks(state: GameState): void {
  for (const bank of Object.values(state.rivals) as LegacyRival[]) {
    for (const office of bank.branches as LegacyOffice[]) {
      office.customers ??= (office.deposits ?? 0) / LEGACY_DEPOSIT_PER_CUSTOMER;
      office.arr ??= office.customers * arrPerCustomer(state, bank, office.cityId);
      delete office.deposits;
      delete office.loans;
    }
    const costs = rivalWeeklyCosts(state, bank);
    if (bank.cash === undefined) {
      const fromEquity = (bank.equity ?? 0) - rivalBookAssets(state, bank);
      bank.cash = bank.status === 'active' ? Math.max(fromEquity, MIN_START_WEEKS * costs) : 0;
    }
    bank.negativeQuarters ??= 0;
    delete bank.capitalRatio;
    refreshRivalFinances(state, bank);
  }
}
