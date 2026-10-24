// How a startup's story ends (SIMULATION §20.2, §20.6): failure (marks go to
// 0, venture debt loses 80%), acquisition (cash to holders at 2–6× annual
// revenue, the gain or loss against the mark booked first) and IPO (it becomes
// a listed company and your stakes move into market holdings at the same
// value, so the balance sheet total doesn't jump). Also pruning, so state
// keeps only finished startups you held plus the last few others.
import { QUARTERS_PER_YEAR, VENTURE_GEN, VENTURE_IPO, VENTURE_NEWS } from '../config/balance';
import { EXCHANGES, SECTOR_BETA } from '../data/stocks';
import { pushEvent } from './events';
import { postCash } from './ledger';
import { withAssetMarks, type Account } from './portfolio';
import type { Rng } from './rng';
import type { GameState, ListedCompany, Startup } from './state';
import { homeCountry } from './treasury';
import { repayDebtInFull, writeOffDebt } from './ventureDebt';
import { cancelRound, heldByYou } from './ventureRounds';
import { sectorOf } from './ventureModel';

const ACCOUNTS: Account[] = ['company', 'personal'];
const holderOf = (s: Startup, a: Account) => s.holders.find((h) => h.id === a);

function end(state: GameState, s: Startup, stage: Startup['stage']): void {
  cancelRound(s);
  s.stage = stage;
  s.endedWeek = state.clock.week;
  state.ventures.pipeline = state.ventures.pipeline.filter((id) => id !== s.id);
}

/** Failure: stakes are worth nothing and venture debt is written off at LGD 0.8. */
export function failStartup(state: GameState, s: Startup): void {
  const held = heldByYou(s);
  writeOffDebt(state, s);
  withAssetMarks(state, () => end(state, s, 'failed'));
  pushEvent(state, 'VENTURE_FAILED', { startupId: s.id, name: s.name, held }, held ? 3 : 1, s.id);
}

/** Acquisition at `price` for the whole company: every holder is paid per share. */
export function acquireStartup(state: GameState, s: Startup, price: number): void {
  const held = heldByYou(s);
  const perShare = price / Math.max(1, s.shares);
  repayDebtInFull(state, s);
  // Book the gain or loss against the last mark, then turn the stake into cash.
  withAssetMarks(state, () => {
    s.lastPrice = perShare;
  });
  s.exitPrice = perShare;
  end(state, s, 'acquired');
  for (const a of ACCOUNTS) {
    const h = holderOf(s, a);
    if (!h || h.shares <= 0) continue;
    const cash = h.shares * perShare;
    if (a === 'company') postCash(state, cash, 'investing');
    else state.personal.cash += cash;
  }
  const big = price >= VENTURE_NEWS.bigExit;
  pushEvent(
    state,
    'VENTURE_ACQUIRED',
    { startupId: s.id, name: s.name, price, held },
    held ? 3 : big ? 2 : 0,
    s.id,
  );
}

/** A ticker from the name's letters, unique among listed companies and rivals. */
export function makeTicker(state: GameState, name: string): string {
  const taken = new Set<string>([
    ...Object.values(state.market.companies).map((c) => c.ticker),
    ...Object.values(state.rivals).map((r) => r.ticker ?? ''),
  ]);
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase() || 'NEWCO';
  const base = letters.slice(0, VENTURE_IPO.tickerLength).padEnd(VENTURE_IPO.tickerLength, 'X');
  if (!taken.has(base)) return base;
  const stem = base.slice(0, VENTURE_IPO.tickerLength - 1);
  for (let c = 65; c <= 90; c++) {
    const t = stem + String.fromCharCode(c);
    if (!taken.has(t)) return t;
  }
  let n = 2;
  while (taken.has(`${stem}${n}`)) n++;
  return `${stem}${n}`;
}

/** IPO: lists the startup on the home exchange at the last round price × a pop (§20.2). */
export function ipoStartup(state: GameState, s: Startup, rng: Rng): ListedCompany {
  const held = heldByYou(s);
  const sector = sectorOf(s.sector);
  const price = s.lastPrice * rng.range(VENTURE_IPO.pop[0], VENTURE_IPO.pop[1]);
  repayDebtInFull(state, s);
  // The pop is a revaluation of the stake; after it, the move into market
  // holdings happens at the same value, so the total doesn't jump.
  withAssetMarks(state, () => {
    s.lastPrice = price;
  });
  const id = `ipo_${s.id}`;
  const lastNi = s.quarters.at(-1)?.netIncome ?? 0;
  const others = s.holders.filter((h) => h.kind === 'founder' || h.kind === 'fund');
  const company: ListedCompany = {
    id,
    ticker: makeTicker(state, s.name),
    name: s.name,
    sector: sector.marketSector,
    exchange: EXCHANGES[homeCountry(state).id],
    price,
    shares: s.shares,
    eps: (lastNi * QUARTERS_PER_YEAR) / Math.max(1, s.shares),
    growth: Math.min(VENTURE_IPO.maxGrowth, sector.mu * QUARTERS_PER_YEAR),
    vol: VENTURE_IPO.vol,
    beta: SECTOR_BETA[sector.marketSector],
    divYield: 0,
    history: [price],
    high52: price,
    low52: price,
    topHolders: others
      .map((h) => ({ name: h.name, pct: h.shares / Math.max(1, s.shares) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3),
  };
  state.market.companies[id] = company;
  s.listedCompanyId = id;
  end(state, s, 'public');
  for (const a of ACCOUNTS) {
    const h = holderOf(s, a);
    if (!h || h.shares <= 0) continue;
    const book = state.market.holdings[a];
    const prev = book[id] ?? { shares: 0, avgCost: 0 };
    const cost = prev.shares * prev.avgCost + (h.cost ?? 0);
    prev.shares += h.shares;
    prev.avgCost = cost / prev.shares;
    book[id] = prev;
  }
  pushEvent(
    state,
    'VENTURE_IPO',
    { startupId: s.id, name: s.name, ticker: company.ticker, price, held },
    held ? 3 : 2,
    s.id,
  );
  return company;
}

/** Keeps every active startup, every finished one you held, and the last few others. */
export function pruneStartups(state: GameState): void {
  const all = state.ventures.startups;
  const dropped = Object.values(all)
    .filter((s) => s.endedWeek !== undefined && !heldByYou(s))
    .sort((a, b) => b.endedWeek! - a.endedWeek! || (a.id < b.id ? -1 : 1))
    .slice(VENTURE_GEN.endedKept);
  for (const s of dropped) delete all[s.id];
  if (dropped.length === 0) return;
  for (const run of state.conventions.runs)
    run.startupIds = run.startupIds.filter((id) => !!all[id]);
}
