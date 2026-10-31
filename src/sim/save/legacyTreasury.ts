// The bank-era treasury as older saves store it (schema 37 and before). Only
// save migrations read it: migration 37 → 38 folds it into corporate cash and
// deletes it, so the live GameState no longer has a `treasury` key.
import type { GameState } from '../state';

export interface LegacyFundingLot {
  id: string;
  type: string;
  counterparty?: string;
  amount: number;
  rate?: number;
  startWeek?: number;
  maturityWeek?: number;
}

export interface LegacyTreasury {
  /** The old lending fund, an asset. */
  reserves: number;
  liqTarget?: number;
  autoFunding?: boolean;
  freeze?: boolean;
  /** Overnight and central bank window borrowing, liabilities. */
  overnight: number;
  window: number;
  windowStigmaWeeks?: number;
  /** Wholesale funding lots, liabilities. */
  lots: LegacyFundingLot[];
  offers: { type: string }[];
  offersRefreshWeek?: number;
}

/** The save's old treasury, created empty if a hand-built save lacks one. */
export function legacyTreasury(state: GameState): LegacyTreasury {
  const raw = state as unknown as { treasury?: Partial<LegacyTreasury> };
  const t = (raw.treasury ??= {});
  t.reserves ??= 0;
  t.overnight ??= 0;
  t.window ??= 0;
  t.lots ??= [];
  t.offers ??= [];
  return t as LegacyTreasury;
}
