// The CFO's Investing switches (SIMULATION §17.2, §19.7, §20.4): every
// EXEC_DELEGATION.investEveryWeeks weeks each switch, for its account:
//   1. trims losers: sells every listed-company stock at or below investTrimAt
//      of its average cost; a trimmed stock isn't bought again for
//      investCooldownWeeks
//   2. buys one stock, spreading money across the market: the listed company
//      furthest under its market-cap weight in the account
//   3. backs one startup from the Investment floor pipeline: the best average
//      scorecard (at least investMinScore) the account doesn't already hold,
//      taking one offer lot of its open round
// Lab: never at a restricted tier; stocks stay under investStockCap and
// startup stakes under investVentureCap of total assets; one stock buy is at
// most investStockLot of total assets; RUNWAY.gateMonths of runway stay after
// each buy (runway.ts); expansionReserveWeeks of costs stay in cash.
// You: keeps buyReserveYears of CEO salary; one purchase spends at most
// investSpareShare of the cash above that.
// Rival banks' shares are never bought or sold here. nextStock and
// nextStartup are also what the CFO's profile shows.
import { COMMISSION, EXEC_DELEGATION as X, RUNWAY } from '../config/balance';
import { balanceSheet } from './balanceSheet';
import { maxBuy, trade } from './commands/markets';
import { buyStartupLot, ventureTierBlock } from './commands/ventures';
import { fixedReserve } from './execDelegationsGrowth';
import { delegationOn } from './execSeats';
import { startupShares, type Account } from './portfolio';
import { holdingsValue } from './securities';
import type { GameState } from './state';
import { accessBlock } from './ventureAccess';
import { isPrivate } from './ventureGen';
import { pentagonAvg } from './ventureModel';
import { spendableCash } from './runway';

export type Plan<T> = { pick: T; blocker?: undefined } | { pick?: undefined; blocker: string };

export interface StockPick {
  id: string;
  name: string;
  shares: number;
  cost: number;
}

export interface StartupPick {
  id: string;
  name: string;
  lot: number;
  price: number;
  pct: number;
  score: number;
}

/** The CFO's Investing switch for this account. */
export const investsSwitch = (account: Account): string =>
  account === 'company' ? 'bankInvests' : 'privateInvests';

/** True when this account's Investing switch is on. */
export const investingOn = (state: GameState, account: Account): boolean =>
  delegationOn(state, 'cfo', investsSwitch(account));

/** Weeks until the next investing week (this week counts when it is one, as the full cycle). */
export function weeksToInvest(state: GameState): number {
  const every = X.investEveryWeeks;
  return (X.investPhase - (state.clock.week % every) + every) % every || every;
}

const SPARE_CASH =
  'Waiting for spare cash: the chief keeps a year of your salary and spends at most a quarter of the rest at a time.';
const RESERVE = `Waiting for spare cash: the chief keeps ${X.expansionReserveWeeks} weeks of costs in reserve.`;
const RUNWAY_SHORT = `Runway would fall under ${RUNWAY.gateMonths} months.`;

/** The most one purchase may spend from your own cash. */
export function personalInvestLimit(state: GameState): number {
  const reserve = X.buyReserveYears * Math.max(0, state.governance.ceoSalary);
  return Math.max(0, state.personal.cash - reserve) * X.investSpareShare;
}

/** Stocks this account holds at or below the trim line, by id. */
export function losers(state: GameState, account: Account): string[] {
  return Object.entries(state.market.holdings[account])
    .filter(([id, h]) => {
      const c = state.market.companies[id];
      return c && h.shares >= 1 && c.price <= X.investTrimAt * h.avgCost;
    })
    .map(([id]) => id)
    .sort();
}

/** True while a stock trimmed from this account is still cooling off. */
function coolingOff(state: GameState, account: Account, id: string): boolean {
  const week = state.executives.trimmedStocks[account][id];
  return week !== undefined && state.clock.week - week < X.investCooldownWeeks;
}

/** How much the bank may put into stocks now, or why nothing. */
function bankStockBudget(state: GameState): number | string {
  const tier = ventureTierBlock(state);
  if (tier) return tier;
  const cash = state.company.cash - fixedReserve(state);
  if (cash <= 0) return RESERVE;
  const bs = balanceSheet(state);
  const room = X.investStockCap * bs.assets - holdingsValue(state, 'company');
  if (room <= 0)
    return `The lab's stocks are at ${Math.round(X.investStockCap * 100)}% of its assets.`;
  const runwayRoom = spendableCash(state);
  if (runwayRoom <= 0) return RUNWAY_SHORT;
  return Math.min(cash, room, runwayRoom, X.investStockLot * bs.assets);
}

/** The stock the chief would buy for this account now, or why none. */
export function nextStock(state: GameState, account: Account): Plan<StockPick> {
  const budget = account === 'company' ? bankStockBudget(state) : personalInvestLimit(state);
  if (typeof budget === 'string') return { blocker: budget };
  const companies = Object.values(state.market.companies).filter((c) => c.price > 0);
  const capOf = (c: (typeof companies)[number]) => c.price * c.shares;
  const totalCap = companies.reduce((sum, c) => sum + capOf(c), 0);
  const book = state.market.holdings[account];
  const held = companies.reduce((sum, c) => sum + (book[c.id]?.shares ?? 0) * c.price, 0);
  let best: StockPick | undefined;
  let bestGap = -Infinity;
  for (const c of companies) {
    if (coolingOff(state, account, c.id)) continue;
    // SIMULATION §17.2: the gap between a market-cap weight and what is held.
    const gap = (capOf(c) / totalCap) * (held + budget) - (book[c.id]?.shares ?? 0) * c.price;
    const shares = Math.min(
      Math.floor(budget / (c.price * (1 + COMMISSION))),
      maxBuy(state, account, c.id),
    );
    if (shares <= 0 || gap <= bestGap || (gap === bestGap && best && c.id > best.id)) continue;
    bestGap = gap;
    best = { id: c.id, name: c.name, shares, cost: shares * c.price * (1 + COMMISSION) };
  }
  if (!best || best.cost < X.investMinTrade)
    return { blocker: account === 'company' ? 'Not enough room for a stock buy yet.' : SPARE_CASH };
  return { pick: best };
}

/** Why the bank can't take a lot costing `price` now, or undefined when it can. */
function bankStartupBlocker(state: GameState, price: number): string | undefined {
  const tier = ventureTierBlock(state);
  if (tier) return tier;
  if (price > state.company.cash - fixedReserve(state)) return RESERVE;
  const bs = balanceSheet(state);
  if (bs.ventures + price > X.investVentureCap * bs.assets)
    return `The lab's startup stakes would pass ${Math.round(X.investVentureCap * 100)}% of its assets.`;
  if (price > spendableCash(state)) return RUNWAY_SHORT;
  return undefined;
}

/** The startup lot the chief would take for this account now, or why none. */
export function nextStartup(state: GameState, account: Account): Plan<StartupPick> {
  const week = state.clock.week;
  if (state.departments.investment === undefined)
    return { blocker: 'Startups come from the Investment floor: add one at HQ.' };
  const list: StartupPick[] = [];
  for (const id of state.ventures.pipeline) {
    const s = state.ventures.startups[id];
    if (!s || !isPrivate(s) || !s.round || s.round.closesWeek <= week) continue;
    if (accessBlock(state, s) || startupShares(s, account) > 0) continue;
    const score = pentagonAvg(s.pentagon);
    const lot = s.round.lots.findIndex((l) => !l.taken);
    if (lot < 0 || score < X.investMinScore) continue;
    const l = s.round.lots[lot]!;
    list.push({ id: s.id, name: s.name, lot, price: l.price, pct: l.pct, score });
  }
  if (list.length === 0)
    return {
      blocker: `No startup on the floor's list scores ${X.investMinScore} or more right now.`,
    };
  list.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  let first: string | undefined;
  for (const c of list) {
    const blocker =
      account === 'company'
        ? bankStartupBlocker(state, c.price)
        : c.price > personalInvestLimit(state)
          ? SPARE_CASH
          : undefined;
    if (!blocker) return { pick: c };
    first ??= blocker;
  }
  return { blocker: first! };
}

/** One investing round for this account: trim losers, buy a stock, back a startup. */
export function cfoInvest(state: GameState, account: Account): void {
  const trimmed = state.executives.trimmedStocks[account];
  for (const id of Object.keys(trimmed))
    if (state.clock.week - trimmed[id]! >= X.investCooldownWeeks) delete trimmed[id];
  for (const id of losers(state, account)) {
    const shares = Math.floor(state.market.holdings[account][id]!.shares);
    if (trade(state, account, id, -shares).ok) trimmed[id] = state.clock.week;
  }
  const stock = nextStock(state, account);
  if (stock.pick) trade(state, account, stock.pick.id, stock.pick.shares);
  const startup = nextStartup(state, account);
  if (startup.pick) buyStartupLot(state, startup.pick.id, startup.pick.lot, account);
}

const due = (state: GameState): boolean => state.clock.week % X.investEveryWeeks === X.investPhase;

/** Investing: the bank's money. */
export function cfoBankInvests(state: GameState): void {
  if (due(state)) cfoInvest(state, 'company');
}

/** Investing: your money. */
export function cfoPrivateInvests(state: GameState): void {
  if (due(state)) cfoInvest(state, 'personal');
}
