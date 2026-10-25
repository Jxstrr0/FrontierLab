// Currencies as an investment (SIMULATION §19.10): each country has a strength
// level that drifts with its growth, interest rate and business cycle, plus
// noise; a currency's rate is its level against your home country's. Company
// positions are marked through `investmentGains` each week, like stocks.
import { FX, FX_START_INDEX, WEEKS_PER_YEAR } from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { CURRENCIES } from '../data/currencies';
import type { CountryId } from '../data/types';
import { pushEvent } from './events';
import { postPnl } from './ledger';
import { clamp } from './math';
import { stream } from './rng';
import type { FxState, GameState } from './state';
import { homeCountry } from './treasury';

const COUNTRY_IDS = Object.keys(COUNTRIES) as CountryId[];

export function emptyFx(): FxState {
  const level: FxState['level'] = {};
  const history: FxState['history'] = {};
  for (const c of COUNTRY_IDS) {
    level[c] = FX_START_INDEX;
    history[c] = [FX_START_INDEX];
  }
  return { level, history, positions: { company: {}, personal: {} } };
}

/** Your home currency (the country of your first branch). */
export function homeCurrency(state: GameState): CountryId {
  return homeCountry(state).id;
}

/** A currency's rate against your home currency (100 = where both started). */
export function fxRate(state: GameState, c: CountryId): number {
  const home = state.fx?.level[homeCurrency(state)] ?? FX_START_INDEX;
  return ((state.fx?.level[c] ?? FX_START_INDEX) / home) * FX_START_INDEX;
}

/** Value of the company's or the founder's currency positions in home money. */
export function fxValue(state: GameState, account: 'company' | 'personal'): number {
  // Saves upgrading through older migrations read the balance sheet before fx exists.
  const book = state.fx?.positions[account];
  if (!book) return 0;
  let total = 0;
  for (const [c, p] of Object.entries(book))
    if (p) total += p.units * fxRate(state, c as CountryId);
  return total;
}

/** This week's change of a currency against home, as a fraction. */
export function fxWeeklyMove(state: GameState, c: CountryId): number {
  const h = state.fx.history[c] ?? [];
  if (h.length < 2) return 0;
  return h[h.length - 1]! / h[h.length - 2]! - 1;
}

/** Tick step 12 (after listed prices): move every level, record rates, mark company positions. */
export function runFx(state: GameState): void {
  const rng = stream(state, 'fx');
  const before = fxValue(state, 'company');
  for (const c of COUNTRY_IDS) {
    const spec = CURRENCIES[c];
    const country = state.world.countries[c];
    if (spec.peggedTo || !country) continue;
    const draw = COUNTRIES[c].ownStream ? stream(state, `fx:${c}`) : rng;
    // SIMULATION §19.10: growth and rate pull, cycle drift, noise; rates against home follow.
    const r =
      (FX.growthW * country.gdp) / 100 / WEEKS_PER_YEAR +
      (FX.rateW * country.policyRate) / WEEKS_PER_YEAR +
      FX.phase[country.phase] +
      draw.normal(0, spec.vol * FX.volMult);
    const level = (state.fx.level[c] ?? FX_START_INDEX) * (1 + r);
    state.fx.level[c] = clamp(level, FX.min * FX_START_INDEX, FX.max * FX_START_INDEX);
  }
  for (const c of COUNTRY_IDS) {
    const anchor = CURRENCIES[c].peggedTo;
    if (anchor) {
      state.fx.level[c] =
        (state.fx.level[anchor] ?? FX_START_INDEX) * (1 + rng.normal(0, FX.pegVol));
    }
  }
  const home = homeCurrency(state);
  for (const c of COUNTRY_IDS) {
    const h = (state.fx.history[c] ??= []);
    h.push(fxRate(state, c));
    if (h.length > FX.historyWeeks) h.splice(0, h.length - FX.historyWeeks);
    const move = fxWeeklyMove(state, c);
    if (c !== home && Math.abs(move) >= FX.newsMove) {
      pushEvent(
        state,
        'FX_MOVE',
        { country: c, currency: CURRENCIES[c].name, home: CURRENCIES[home].name, pct: move * 100 },
        4,
      );
    }
  }
  const delta = fxValue(state, 'company') - before;
  if (delta !== 0) postPnl(state, 'investmentGains', delta);
}
