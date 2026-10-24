// Rival bank shares (SIMULATION §19.5 applied to rivals, §18.1): a listed
// rival's price follows book value per share × clamp(ROE_ttm / COE) × a
// mean-reverting sentiment that also carries the banking sector's weekly
// shock, eased in with an EMA plus noise; quarterly earnings growth nudges
// sentiment. A private rival is priced at book every week and a seized one is
// worth nothing. Randomness from the `market` stream.
import { COE, PUBLIC_PRICE, QUARTERS_PER_YEAR, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import { SECTOR_BETA, SECTOR_MU } from '../data/stocks';
import type { Phase } from '../data/types';
import { clampSentiment, earningsShock, walkSentiment } from './equityModel';
import { clamp, ema } from './math';
import { recordClose } from './marketStocks';
import type { Rng } from './rng';
import type { GameState, RivalBank } from './state';

/** Trailing four quarters' net income, annualised when fewer have been reported. */
export function rivalNetIncomeTtm(bank: RivalBank): number {
  const recent = bank.quarters.slice(-QUARTERS_PER_YEAR);
  if (recent.length === 0) return 0;
  return (recent.reduce((x, q) => x + q.netIncome, 0) * QUARTERS_PER_YEAR) / recent.length;
}

/** Book value per share (0 when equity is gone). */
export function rivalBookPerShare(bank: RivalBank): number {
  return Math.max(0, bank.equity) / Math.max(1, bank.shares);
}

/**
 * §19.5 without the IR penalty: BVPS × clamp(ROE_ttm / COE, 0.3, 3) × sentiment.
 * Before a rival's first report the market assumes it earns its cost of equity
 * (trades at book), rather than reading the empty record as zero earnings.
 */
export function rivalTargetPrice(bank: RivalBank): number {
  const roe =
    bank.quarters.length === 0 ? COE : bank.equity > 0 ? rivalNetIncomeTtm(bank) / bank.equity : 0;
  return rivalBookPerShare(bank) * clamp(roe / COE, ...PUBLIC_PRICE.roeClamp) * bank.sentiment;
}

/** The phase of the rival's home country (its first city), or the fallback. */
function rivalPhase(state: GameState, bank: RivalBank, fallback: Phase): Phase {
  const country = CITIES[bank.cities[0] ?? '']?.country;
  return (country && state.world.countries[country]?.phase) || fallback;
}

/** The banking sector's weekly return: μ_banking(phase)/52 + β_banking × market shock (§19.1). */
export function bankingReturn(phase: Phase, shock: number): number {
  return SECTOR_MU.banking[phase] / WEEKS_PER_YEAR + SECTOR_BETA.banking * shock;
}

/** Banks in a fixed order, so draws never depend on object key order. */
const sortedRivals = (state: GameState) =>
  Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1));

/** Weekly: prices every rival's shares. */
export function priceRivalShares(state: GameState, rng: Rng, phase: Phase, shock: number): void {
  for (const bank of sortedRivals(state)) {
    if (bank.status === 'acquired') continue;
    if (bank.status === 'seized') {
      if (bank.price !== 0) {
        bank.price = 0;
        if (bank.listed) recordClose(bank, 0);
      }
      continue;
    }
    if (!bank.listed) {
      bank.price = rivalBookPerShare(bank);
      continue;
    }
    const sector = bankingReturn(rivalPhase(state, bank, phase), shock);
    bank.sentiment = walkSentiment(bank.sentiment, rng.normal(0, 1)) * (1 + sector);
    bank.sentiment = clampSentiment(bank.sentiment);
    const noise = rng.normal(0, PUBLIC_PRICE.noise);
    bank.price = Math.max(
      0,
      ema(bank.price, rivalTargetPrice(bank), PUBLIC_PRICE.ema) * (1 + noise),
    );
    recordClose(bank, bank.price);
  }
}

/** Quarter-end (after rivals report): earnings growth moves a listed rival's sentiment. */
export function rivalEarningsShocks(state: GameState): void {
  for (const bank of sortedRivals(state)) {
    if (!bank.listed || bank.status !== 'active') continue;
    const n = bank.quarters.length;
    if (n < 2) continue;
    const shock = earningsShock(bank.quarters[n - 1]!.netIncome, bank.quarters[n - 2]!.netIncome);
    bank.sentiment = clampSentiment(bank.sentiment * (1 + shock));
  }
}
