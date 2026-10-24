// The stock market (SIMULATION §19.1, §19.5): tick step 12 moves every listed
// company and rival bank, keeps the cap-weighted index, values or prices your
// bank; the quarter-end step runs listed earnings and dividends, your
// earnings shock, the late filing fine and a pending IPO's listing. Every
// price change on a company holding is marked to market (securities.ts).
import { LATE_FILING, STOCK_MARKET } from '../config/balance';
import { previousQuarter } from './calendar';
import { listPendingIpo } from './equityIpo';
import { ownEarningsShock, updateOwnPrice } from './equityPrice';
import { pushEvent } from './events';
import { spend } from './ledger';
import { priceRivalShares, rivalEarningsShocks } from './marketRivals';
import {
  drawMarketShock,
  indexWeeklyMove,
  moveCompanies,
  payCompanyDividends,
  reportEarnings,
} from './marketStocks';
import { stream } from './rng';
import { withMarks } from './securities';
import type { GameState } from './state';
import { homeCountry } from './treasury';

/** Market capitalisation of every index member: listed companies and trading listed rivals. */
export function indexCaps(state: GameState): Map<string, number> {
  const caps = new Map<string, number>();
  for (const c of Object.values(state.market.companies)) caps.set(c.id, c.price * c.shares);
  for (const r of Object.values(state.rivals)) {
    if (r.listed && (r.status === 'active' || r.status === 'distressed') && r.price > 0)
      caps.set(r.id, r.price * r.shares);
  }
  return caps;
}

/** §19.1: the cap-weighted return of the members present before and after a move. */
export function capWeightedReturn(before: Map<string, number>, after: Map<string, number>): number {
  let was = 0;
  let now = 0;
  for (const [id, cap] of before) {
    const next = after.get(id);
    if (next === undefined) continue;
    was += cap;
    now += next;
  }
  return was > 0 ? now / was - 1 : 0;
}

function chainIndex(state: GameState, before: Map<string, number>, newWeek: boolean): void {
  const m = state.market;
  const r = capWeightedReturn(before, indexCaps(state));
  m.index *= 1 + r;
  if (newWeek) {
    m.indexHistory.push(m.index);
    if (m.indexHistory.length > STOCK_MARKET.historyWeeks)
      m.indexHistory.splice(0, m.indexHistory.length - STOCK_MARKET.historyWeeks);
  } else {
    m.indexHistory[m.indexHistory.length - 1] = m.index;
  }
}

/** Tick step 12. */
export function runMarkets(state: GameState): void {
  const rng = stream(state, 'market');
  const phase = homeCountry(state).phase;
  withMarks(state, () => {
    const before = indexCaps(state);
    const shock = drawMarketShock(rng, phase);
    state.market.shock = shock;
    moveCompanies(state, rng, phase, shock);
    priceRivalShares(state, rng, phase, shock);
    chainIndex(state, before, true);
  });
  const move = indexWeeklyMove(state);
  if (Math.abs(move) >= STOCK_MARKET.indexMoveNews) {
    pushEvent(state, 'MARKET_MOVE', { index: state.market.index, pct: move * 100 }, 1);
  }
  updateOwnPrice(state);
}

/** Public with Finance k′ below 0.6: a fine of 0.02% of the quarter's revenue (CONTENT §9). */
function lateFilingFine(state: GameState): void {
  if (state.stock.status !== 'public') return;
  const kPrime = state.hq.coverage.finance?.kPrime ?? 1;
  const revenue = state.history.quarterly.at(-1)?.revenue ?? 0;
  if (kPrime >= LATE_FILING.minKPrime || revenue <= 0) return;
  const amount = revenue * LATE_FILING.fineRate;
  spend(state, 'fines', amount);
  pushEvent(
    state,
    'REG_FINE',
    { bank: state.meta.bankName, amount, reason: 'the late filing of its quarterly results' },
    3,
  );
}

/** Quarter-end: listed earnings and dividends, your earnings shock, the late filing fine, the IPO. */
export function marketsQuarter(state: GameState): void {
  const rng = stream(state, 'market');
  const phase = homeCountry(state).phase;
  const { year, q } = previousQuarter(state.meta.startDate, state.clock.day);
  withMarks(state, () => {
    const before = indexCaps(state);
    reportEarnings(state, rng, phase, `Q${q} ${year}`);
    chainIndex(state, before, false);
  });
  rivalEarningsShocks(state);
  payCompanyDividends(state);
  ownEarningsShock(state);
  lateFilingFine(state);
  listPendingIpo(state);
}
