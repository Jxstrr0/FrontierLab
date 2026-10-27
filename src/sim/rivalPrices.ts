// Rival rate sheets (SIMULATION §5, §18.2–18.3): each rival keeps one sheet,
// priced in its home country (the country of the first city it serves), that
// follows FTP moves with deposit beta and drifts toward its strategy target.
// In another country `rivalPriceIn` prices it at its strategy target for that
// country, so a rival in several countries prices off each country's own
// central bank and one country's moves never reach another.
import {
  WEEKS_PER_YEAR,
  CARD_REPRICE_GAP,
  DEPOSIT_BETA_DOWN,
  DEPOSIT_BETA_UP,
  DEPOSIT_LAG_WEEKS,
  LOAN_LAG_WEEKS,
  LOAN_PASS_THROUGH,
  RIVAL_PRICE_DRIFT,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { isDeposit, PRODUCTS, type ProductSpec } from '../data/products';
import { STRATEGY_PROFILES, type Strategy } from '../data/rivals';
import type { CountryId } from '../data/types';
import { difficultyOf } from './difficulty';
import { nominalWeeklyGrowth } from './macro';
import { clamp } from './math';
import { defaultPrice, ftpLong, ftpShort } from './rates';
import { stream, type Rng } from './rng';
import type { CountryState, GameState, RivalBank } from './state';

/** Price offset or fee multiplier a strategy applies to a product's default (CONTENT §15). */
export function rivalTargetPrice(
  spec: ProductSpec,
  strategy: Strategy,
  c: CountryState,
  edge = 0,
  depositBump = 0,
): number {
  const p = STRATEGY_PROFILES[strategy];
  const base = defaultPrice(spec, c);
  let price: number;
  // Price wars (§18.6) cut plan prices.
  const cut = spec.kind === 'plan' && spec.category === 'deposits' ? depositBump : 0;
  if (spec.priceType !== 'rate') price = base * (1 + p.fees - cut);
  // C3c: the bank-only savings, term-deposit, mortgage and card offsets are gone.
  else price = base + p.loans;
  // Difficulty edge: better deposit rates, cheaper loans (in pp).
  if (spec.priceType === 'rate') price += isDeposit(spec) ? edge / 100 : -edge / 100;
  return clamp(price, spec.min, spec.max);
}

/** The country a rival's sheet is priced in: that of the first city it served. */
export function rivalHomeCountry(state: GameState, rival: RivalBank): CountryState | undefined {
  const id = CITIES[rival.cities[0] ?? '']?.country;
  return id ? state.world.countries[id] : undefined;
}

/**
 * A rival's price for a product in a country. At home it is the sheet itself;
 * elsewhere the rival prices at its strategy target for that country (no lag),
 * so another country's rate moves never leak in (DESIGN §5.2: each country's
 * central bank drives its own market).
 */
export function rivalPriceIn(
  state: GameState,
  rival: RivalBank,
  productId: string,
  country: CountryId | undefined,
): number | undefined {
  const raw = rival.prices[productId];
  const spec = PRODUCTS[productId];
  const home = rivalHomeCountry(state, rival);
  const local = country ? state.world.countries[country] : undefined;
  if (raw === undefined || !spec || !home || !local || home.id === local.id) return raw;
  const edge = difficultyOf(state).rivalRateEdge;
  return rivalTargetPrice(spec, rival.strategy, local, edge, priceWarBump(rival));
}

/** A rival's price in the country of a city. */
export function rivalPriceInCity(
  state: GameState,
  rival: RivalBank,
  productId: string,
  cityId: string,
): number | undefined {
  return rivalPriceIn(state, rival, productId, CITIES[cityId]?.country);
}

/**
 * Weekly rival pricing (tick step 3). Deposit rates follow home FTP moves with
 * beta over 4–8 weeks, loan rates pass 90% through within 2 weeks, and every
 * price drifts 2% of the gap per week toward the strategy target.
 */
export function updateRivalPrices(state: GameState): void {
  const rng = stream(state, 'rivals');
  const edge = difficultyOf(state).rivalRateEdge;
  for (const c of Object.values(state.world.countries)) {
    if (!c) continue;
    const dShort = ftpShort(c) - c.prevFtpShort;
    const dLong = ftpLong(c) - c.prevFtpLong;
    let dCard = 0;
    if (Math.abs(ftpShort(c) - c.cardAnchor) >= CARD_REPRICE_GAP) {
      dCard = ftpShort(c) - c.cardAnchor;
      c.cardAnchor = ftpShort(c);
    }
    for (const rival of Object.values(state.rivals)) {
      // Only the home country moves the sheet; other countries read it through rivalPriceIn.
      if (rival.status !== 'active' || rivalHomeCountry(state, rival)?.id !== c.id) continue;
      for (const spec of Object.values(PRODUCTS)) {
        if (spec.priceType !== 'rate') continue;
        const delta = spec.id === 'credit_card' ? dCard : spec.tenor === 'long' ? dLong : dShort;
        if (delta !== 0) queueMove(rival, spec, delta, rng);
      }
    }
  }
  for (const rival of Object.values(state.rivals)) {
    const c = rivalHomeCountry(state, rival);
    if (rival.status !== 'active' || !c) continue;
    const bump = priceWarBump(rival);
    for (const spec of Object.values(PRODUCTS)) {
      let price = rival.prices[spec.id] ?? rivalTargetPrice(spec, rival.strategy, c, edge, bump);
      const lag = rival.priceLags[spec.id];
      if (lag) {
        price += (lag.target - price) / Math.max(1, lag.weeksLeft);
        lag.weeksLeft -= 1;
        if (lag.weeksLeft <= 0) delete rival.priceLags[spec.id];
      }
      const target = rivalTargetPrice(spec, rival.strategy, c, edge, bump);
      price += RIVAL_PRICE_DRIFT * (target - price);
      rival.prices[spec.id] = clamp(price, spec.min, spec.max);
    }
  }
}

/** The largest active price-war bump on a rival's rate sheet (§18.6). */
export function priceWarBump(rival: RivalBank): number {
  let max = 0;
  for (const v of Object.values(rival.priceWar)) max = Math.max(max, v);
  return max;
}

function queueMove(rival: RivalBank, spec: ProductSpec, delta: number, rng: Rng): void {
  const current = rival.prices[spec.id] ?? 0;
  const existing = rival.priceLags[spec.id];
  const base = existing ? existing.target : current;
  if (spec.category === 'deposits') {
    const beta = delta > 0 ? DEPOSIT_BETA_UP : DEPOSIT_BETA_DOWN;
    const weeks = rng.int(...DEPOSIT_LAG_WEEKS);
    rival.priceLags[spec.id] = {
      target: base + beta * delta,
      weeksLeft: Math.max(existing?.weeksLeft ?? 0, weeks),
    };
  } else {
    rival.priceLags[spec.id] = {
      target: base + LOAN_PASS_THROUGH * delta,
      weeksLeft: Math.max(existing?.weeksLeft ?? 0, LOAN_LAG_WEEKS),
    };
  }
}

/** Year-end: rival $ fees re-price by their home country's inflation (§5). */
export function repriceRivalFees(state: GameState): void {
  for (const rival of Object.values(state.rivals)) {
    const c = rivalHomeCountry(state, rival);
    if (!c) continue;
    for (const spec of Object.values(PRODUCTS)) {
      if (spec.priceType === 'feeMonthly' || spec.priceType === 'feeAnnual') {
        const p = rival.prices[spec.id];
        if (p !== undefined)
          rival.prices[spec.id] = clamp(
            p * (1 + nominalWeeklyGrowth(c) * WEEKS_PER_YEAR),
            spec.min,
            spec.max,
          );
      }
    }
  }
}
