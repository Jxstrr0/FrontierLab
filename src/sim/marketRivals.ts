// Rival lab shares (SIMULATION §19.5 applied to rivals, §18.1; stage C8d): a
// listed rival's price follows its ARR × the §19.2 multiple (growth and its
// model's lead over the bar), never below book, × a mean-reverting sentiment
// that also carries the AI sector's weekly shock, eased in with an EMA plus
// noise; quarterly earnings growth nudges sentiment. A private rival is priced
// at that fair value every week and a wound-up one is worth nothing.
// Randomness from the `market` stream.
import { PUBLIC_PRICE, QUARTERS_PER_YEAR, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import { SECTOR_BETA, SECTOR_MU } from '../data/stocks';
import type { Phase } from '../data/types';
import { clampSentiment, earningsShock, walkSentiment } from './equityModel';
import { ema } from './math';
import { recordClose } from './marketStocks';
import { rivalFairPerShare } from './rivalFinance';
import type { Rng } from './rng';
import type { GameState, RivalBank } from './state';
import { qualityBar } from './underwriting';

export { rivalBookPerShare } from './rivalFinance';

/** Trailing four quarters' net income, annualised when fewer have been reported. */
export function rivalNetIncomeTtm(bank: RivalBank): number {
  const recent = bank.quarters.slice(-QUARTERS_PER_YEAR);
  if (recent.length === 0) return 0;
  return (recent.reduce((x, q) => x + q.netIncome, 0) * QUARTERS_PER_YEAR) / recent.length;
}

/** The rival's model quality over today's bar (0 without a model). */
export function rivalModelLead(state: GameState, bank: RivalBank): number {
  return bank.model ? bank.model.quality - qualityBar(state) : 0;
}

/** §19.2 and §19.5 without the IR penalty: max(BVPS, ARR × multiple ÷ shares) × sentiment. */
export function rivalTargetPrice(bank: RivalBank, lead = 0): number {
  return rivalFairPerShare(bank, lead) * bank.sentiment;
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
    // Bought out (by you or a rival): the last price stands.
    if (bank.status === 'acquired' || bank.status === 'merged') continue;
    if (bank.status === 'seized') {
      if (bank.price !== 0) {
        bank.price = 0;
        if (bank.listed) recordClose(bank, 0);
      }
      continue;
    }
    if (!bank.listed) {
      bank.price = rivalFairPerShare(bank, rivalModelLead(state, bank));
      continue;
    }
    const sector = bankingReturn(rivalPhase(state, bank, phase), shock);
    bank.sentiment = walkSentiment(bank.sentiment, rng.normal(0, 1)) * (1 + sector);
    bank.sentiment = clampSentiment(bank.sentiment);
    const noise = rng.normal(0, PUBLIC_PRICE.noise);
    bank.price = Math.max(
      0,
      ema(bank.price, rivalTargetPrice(bank, rivalModelLead(state, bank)), PUBLIC_PRICE.ema) *
        (1 + noise),
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
