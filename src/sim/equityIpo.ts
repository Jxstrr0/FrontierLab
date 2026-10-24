// Issuing your bank's shares (SIMULATION §19.3–19.6): booking a raise (cash in
// as financing, paid-in capital up by the net, new shares on the cap table)
// and listing a pending IPO at the quarter-end tick: eligibility re-checked,
// the float issued to public shareholders, the first-day pop rolled from the
// investment bank's range (stream `equity`), and a ticker and exchange set.
import { EXCHANGES } from '../data/stocks';
import { INVESTMENT_BANKS } from '../data/investmentBanks';
import type { EquityQuote } from './equityOffers';
import { ipoChecklist } from './equityOffers';
import { pushEvent } from './events';
import { postCash } from './ledger';
import { stream } from './rng';
import { issueShares } from './shares';
import type { GameState, Shareholder } from './state';
import { homeCountry } from './treasury';

/** The holder that stands for every outside shareholder once you are listed. */
export const PUBLIC_HOLDER: Omit<Shareholder, 'shares'> = {
  id: 'public',
  name: 'Public shareholders',
  kind: 'public',
};

/** Books a share issue: net cash in (financing), paid-in capital up, shares to the holder. */
export function bookRaise(
  state: GameState,
  holder: Omit<Shareholder, 'shares'>,
  q: EquityQuote,
): void {
  postCash(state, q.net, 'financing');
  state.company.paidInCapital += q.net;
  issueShares(state, holder, q.shares);
}

/** Every ticker in use on the market (listed companies and rivals). */
function takenTickers(state: GameState): Set<string> {
  const taken = new Set<string>();
  for (const c of Object.values(state.market.companies)) taken.add(c.ticker);
  for (const r of Object.values(state.rivals)) if (r.ticker) taken.add(r.ticker);
  return taken;
}

const letters = (s: string) =>
  s
    .normalize('NFD')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

/**
 * A ticker from your monogram, padded to three letters from the bank's name,
 * then a fourth letter if that is taken, so it never clashes with another.
 */
export function makeTicker(state: GameState): string {
  const taken = takenTickers(state);
  const pool = letters(state.meta.bankName) + 'BANK';
  let base = letters(state.meta.monogram).slice(0, 3);
  for (const ch of pool) {
    if (base.length >= 3) break;
    base += ch;
  }
  if (!taken.has(base)) return base;
  for (const ch of pool + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!taken.has(base + ch)) return base + ch;
  }
  return `${base}X`;
}

/** The exchange of your home country. */
export function homeExchange(state: GameState): string {
  return EXCHANGES[homeCountry(state).id];
}

/**
 * Quarter-end: a pending IPO lists, or is withdrawn if the bank no longer
 * qualifies. Returns true when it listed.
 */
export function listPendingIpo(state: GameState): boolean {
  const stock = state.stock;
  const ipo = stock.ipo;
  if (!ipo) return false;
  delete stock.ipo;
  const failed = ipoChecklist(state).find((r) => !r.ok);
  const bankName = state.meta.bankName;
  if (failed) {
    const reason = `${failed.label} (now ${failed.detail}).`;
    stock.ipoWithdrawn = { week: state.clock.week, reason };
    pushEvent(state, 'IPO_WITHDRAWN', { bank: bankName, reason }, 4);
    return false;
  }
  const gross = ipo.shares * ipo.price;
  const fee = gross * ipo.fee;
  bookRaise(state, PUBLIC_HOLDER, {
    shares: ipo.shares,
    price: ipo.price,
    gross,
    feeRate: ipo.fee,
    fee,
    net: gross - fee,
  });
  const [lo, hi] = INVESTMENT_BANKS[ipo.bankId]?.pop ?? [0, 0];
  const pop = stream(state, 'equity').range(lo, hi);
  const open = ipo.price * (1 + pop);
  stock.status = 'public';
  stock.ticker = makeTicker(state);
  stock.exchange = homeExchange(state);
  stock.listedWeek = state.clock.week;
  stock.ipoPrice = ipo.price;
  stock.price = open;
  stock.sentiment = 1;
  stock.history = [open];
  stock.high52 = open;
  stock.low52 = open;
  delete stock.ipoWithdrawn;
  pushEvent(
    state,
    'IPO_LISTED',
    {
      bank: bankName,
      ticker: stock.ticker,
      exchange: stock.exchange,
      price: ipo.price,
      open,
      popPct: pop * 100,
      raised: gross - fee,
    },
    4,
  );
  return true;
}
