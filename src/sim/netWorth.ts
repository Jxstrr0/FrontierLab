// The founder's net worth (SIMULATION §22): personal cash + stocks at market
// (your own bank's founder stake included) + private investments + real estate
// + other assets (homes, cars, collectibles, trophies, the jet, a club you own
// personally). The Personal Wealth screen and the rich list both read this, so
// the total always ties out to its parts.
import { franchiseValue, portfolioBreakdown } from './portfolio';
import { FOUNDER_ID, sharesHeld } from './shares';
import type { GameState } from './state';

export interface NetWorth {
  cash: number;
  /** Your founder stake in your own bank at its share price or private valuation. */
  ownShares: number;
  /** Other listed shares held personally. */
  stocks: number;
  ventures: number;
  ventureDebt: number;
  currencies: number;
  /** Buildings you own personally (§21). */
  realEstate: number;
  homes: number;
  cars: number;
  collectibles: number;
  /** Trophy assets (§22a). */
  trophies: number;
  jet: number;
  franchise: number;
  total: number;
}

export function netWorth(state: GameState): NetWorth {
  const p = portfolioBreakdown(state, 'personal');
  const e = state.personal.empire;
  const sum = (xs: { value: number }[] | undefined) => (xs ?? []).reduce((a, x) => a + x.value, 0);
  const parts = {
    cash: state.personal.cash,
    ownShares: sharesHeld(state, FOUNDER_ID) * state.stock.price,
    stocks: p.stocks,
    ventures: p.ventures,
    ventureDebt: p.ventureDebt,
    currencies: p.currencies,
    realEstate: p.realEstate,
    homes: sum(e?.homes),
    cars: sum(e?.cars),
    collectibles: sum(e?.collectibles),
    trophies: sum(e?.trophies),
    jet: state.personal.jet?.value ?? 0,
    franchise: franchiseValue(state, 'personal'),
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { ...parts, total };
}
