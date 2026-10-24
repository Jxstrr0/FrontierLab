// Your bank's share price (SIMULATION §19.2, §19.5). While private it is the
// private valuation per share. Once public, a target of book value per share ×
// clamp(ROE_ttm / COE) × sentiment × the investor-relations penalty, eased in
// with an EMA plus noise. Sentiment walks (stream `ownStock`) and takes shocks
// from this week's incidents and dividend decisions, and from earnings growth
// at quarter-end. Big weekly moves make the paper.
import { OWN_STOCK, PUBLIC_PRICE } from '../config/balance';
import { balanceSheet } from './balanceSheet';
import {
  clampSentiment,
  dividendShock,
  earningsShock,
  incidentShock,
  publicTarget,
  walkSentiment,
} from './equityModel';
import { pushEvent } from './events';
import { ema } from './math';
import { recordClose } from './marketStocks';
import { stream } from './rng';
import { bookValuePerShare } from './shares';
import type { GameEvent, GameState } from './state';
import { privateValuation, roeTtm } from './valuation';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * Events logged since the last market step (incidents roll after it, board
 * decisions can land between ticks). Advances the cursor kept on state.stock.
 */
export function eventsSinceLastScan(state: GameState): GameEvent[] {
  const scan = state.stock.scan;
  const week = state.clock.week;
  let skip = scan ? scan.count : 0;
  const out: GameEvent[] = [];
  for (const e of state.events.log) {
    if (scan && e.week < scan.week) continue;
    if (scan && e.week === scan.week && skip > 0) {
      skip -= 1;
      continue;
    }
    out.push(e);
  }
  state.stock.scan = { week, count: state.events.log.filter((e) => e.week === week).length };
  return out;
}

/** The sentiment shock from this week's incidents and dividend decisions (§19.5). */
export function eventShock(events: GameEvent[]): number {
  let factor = 1;
  for (const e of events) {
    if (e.type === 'INCIDENT_RAISED') {
      const shock = incidentShock(String(e.payload.type ?? ''));
      if (shock !== undefined) factor *= 1 + shock;
    } else if (e.type === 'DIVIDEND_DECLARED') {
      factor *= 1 + dividendShock(num(e.payload.dps), num(e.payload.prevDps));
    }
  }
  return factor - 1;
}

/** The target price of your listed bank this week (§19.5). */
export function ownTargetPrice(state: GameState): number {
  const equity = balanceSheet(state).equity;
  return publicTarget(
    bookValuePerShare(state, equity),
    roeTtm(state, equity),
    state.stock.sentiment,
    state.hq.coverage.finance?.kPrime ?? 1,
  );
}

/** Tick step 12: values or prices your bank's shares. */
export function updateOwnPrice(state: GameState): void {
  const stock = state.stock;
  const events = eventsSinceLastScan(state);
  if (stock.status === 'private') {
    stock.price = privateValuation(state);
    recordClose(stock, stock.price);
    return;
  }
  const rng = stream(state, 'ownStock');
  const walked = walkSentiment(stock.sentiment, rng.normal(0, 1));
  stock.sentiment = clampSentiment(walked * (1 + eventShock(events)));
  const prev = stock.price;
  const noise = rng.normal(0, PUBLIC_PRICE.noise);
  stock.price = Math.max(0, ema(prev, ownTargetPrice(state), PUBLIC_PRICE.ema) * (1 + noise));
  recordClose(stock, stock.price);
  const move = prev > 0 ? stock.price / prev - 1 : 0;
  if (Math.abs(move) >= OWN_STOCK.moveNews) {
    pushEvent(
      state,
      'SHARE_PRICE_MOVE',
      {
        bank: state.meta.bankName,
        ticker: stock.ticker ?? '',
        price: stock.price,
        pct: move * 100,
      },
      3,
    );
  }
}

/** Quarter-end: earnings growth vs the previous quarter moves sentiment ±(0–8%). */
export function ownEarningsShock(state: GameState): void {
  if (state.stock.status !== 'public') return;
  const q = state.history.quarterly;
  if (q.length < 2) return;
  const shock = earningsShock(q[q.length - 1]!.netIncome, q[q.length - 2]!.netIncome);
  state.stock.sentiment = clampSentiment(state.stock.sentiment * (1 + shock));
}
