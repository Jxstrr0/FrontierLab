// Save migration 7 → 8 (stage C3c): the last bank-only machinery goes.
// Foreclosed property (REO) is sold into company cash at its marked value, and
// government bonds are sold into reserves at market. Their unrealised gain or
// loss (AOCI) moves into retained earnings, so equity is unchanged. Covered
// bond lots (which needed mortgage cover) become term interbank lots, and any
// covered bond offers are withdrawn. Both sums are tiny or zero in C2-era saves,
// so there is no news note (DESIGN decision log, C3c).
import type { GameState } from '../state';

type OldTreasury = {
  bondsMarket?: number;
  bondsBook?: number;
  bondBookYield?: number;
  bondShare?: number;
};

export function migrateBankCleanup(state: GameState): void {
  const raw = state as unknown as { reo?: Record<string, { value?: number }> };
  let reoValue = 0;
  for (const pool of Object.values(raw.reo ?? {})) reoValue += pool.value ?? 0;
  delete raw.reo;
  state.company.cash += reoValue;

  const t = state.treasury as unknown as OldTreasury & GameState['treasury'];
  const market = t.bondsMarket ?? 0;
  const book = t.bondsBook ?? 0;
  t.reserves += market;
  state.company.retainedEarnings += market - book;
  delete t.bondsMarket;
  delete t.bondsBook;
  delete t.bondBookYield;
  delete t.bondShare;

  for (const lot of t.lots ?? []) if (lot.type === 'covered_bond') lot.type = 'term_interbank';
  t.offers = (t.offers ?? []).filter((o) => o.type !== 'covered_bond');
}
