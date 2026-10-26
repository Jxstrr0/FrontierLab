// Rivals buy each other (SIMULATION §18.8). At each quarter-end a profitable,
// well-capitalised rival may bid for a smaller one it meets in a city or in its
// home countries, at book value plus a premium. Every holder is paid out in
// cash (your company's and your own shares included), the buyer takes the
// branches, cities and any corporate loans it made you, and the target leaves
// the market as 'merged'. Draws come from the `rivalMergers` stream.
import { MERGERS, RIVAL_FINANCE, RIVAL_LOAN_RISK_WEIGHT, RIVAL_MERGERS } from '../config/balance';
import { CITIES } from '../data/cities';
import { RIVALS } from '../data/rivals';
import { pushEvent } from './events';
import { postCash } from './ledger';
import { pendingOffer } from './mergerRules';
import { rivalBvps } from './mergerPricing';
import { stream } from './rng';
import { rivalCapitalRatio, rivalLoans } from './rivalBooks';
import { trailingProfit } from './rivalExpansion';
import { withMarks } from './securities';
import type { GameState, RivalBank } from './state';
import { giveRivalOffice } from './rivalOffices';

/** Countries a rival calls home: a chartered bank's own, else CONTENT §15's. */
export const homeOf = (bank: RivalBank): string[] => bank.home ?? RIVALS[bank.id]?.home ?? [];

/** Profitable over a year and holding capital above its strategy target plus the margin. */
export function canBuy(bank: RivalBank): boolean {
  const target = RIVAL_FINANCE[bank.strategy].crTarget + RIVAL_MERGERS.excessCr;
  return (
    bank.status === 'active' &&
    bank.quarters.length >= RIVAL_MERGERS.minQuarters &&
    trailingProfit(bank) > 0 &&
    bank.capitalRatio >= target
  );
}

/** The buyer's capital ratio after paying `premium` over book for `target`. */
export function proFormaCr(buyer: RivalBank, target: RivalBank, premium: number): number {
  const equity = buyer.equity - premium * Math.max(0, target.equity);
  const rwa = (rivalLoans(buyer) + rivalLoans(target)) * RIVAL_LOAN_RISK_WEIGHT;
  return rwa > 0 ? equity / rwa : 0;
}

/**
 * The rival `buyer` would bid for: active, smaller (equity ≤ maxTargetShare of
 * the buyer's), not under your pending offer, met in a shared city or in one of
 * the buyer's home countries. Most shared cities first, then the biggest.
 */
export function mergerTarget(state: GameState, buyer: RivalBank): RivalBank | undefined {
  const home = new Set(homeOf(buyer));
  let best: RivalBank | undefined;
  let bestKey = [-1, -1];
  for (const r of Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (r.id === buyer.id || r.status !== 'active' || r.equity <= 0) continue;
    if (r.equity > RIVAL_MERGERS.maxTargetShare * buyer.equity) continue;
    if (pendingOffer(state, r.id)) continue;
    const shared = r.cities.filter((c) => buyer.cities.includes(c)).length;
    const nearby = r.cities.some((c) => home.has(CITIES[c]?.country ?? ''));
    if (shared === 0 && !nearby) continue;
    const key = [shared, r.equity];
    if (key[0]! > bestKey[0]! || (key[0] === bestKey[0] && key[1]! > bestKey[1]!)) {
      best = r;
      bestKey = key;
    }
  }
  return best;
}

/** Pays every holder of the target's shares at `perShare`, booking your company's gain or loss first. */
function payOutHolders(state: GameState, target: RivalBank, perShare: number): void {
  withMarks(state, () => {
    target.price = perShare;
  });
  const co = state.market.holdings.company[target.id];
  if (co && co.shares > 0) postCash(state, co.shares * perShare, 'investing');
  const me = state.market.holdings.personal[target.id];
  if (me && me.shares > 0) state.personal.cash += me.shares * perShare;
  delete state.market.holdings.company[target.id];
  delete state.market.holdings.personal[target.id];
}

/** Loans and a credit line the target made you now run with the buyer (§19.9). */
function moveCorporateDebt(state: GameState, target: RivalBank, buyer: RivalBank): void {
  const d = state.corporateDebt;
  for (const loan of Object.values(d.loans))
    if (loan.lenderId === target.id) loan.lenderId = buyer.id;
  const line = d.lines[target.id];
  if (line) {
    const own = d.lines[buyer.id];
    if (own) own.drawn += line.drawn;
    else d.lines[buyer.id] = { ...line, lenderId: buyer.id };
    delete d.lines[target.id];
  }
  d.offers = d.offers.filter((o) => o.lenderId !== target.id);
}

/** Closes a rival-to-rival deal at book × (1 + premium). */
export function mergeRivals(
  state: GameState,
  buyer: RivalBank,
  target: RivalBank,
  premium: number,
): void {
  const perShare = Math.max(0, rivalBvps(target)) * (1 + premium);
  const price = perShare * target.shares;
  payOutHolders(state, target, perShare);
  buyer.equity -= premium * Math.max(0, target.equity);
  // Offices in a city they share fold into one (C2b).
  for (const branch of target.branches) giveRivalOffice(state, buyer, branch);
  for (const c of target.cities) if (!buyer.cities.includes(c)) buyer.cities.push(c);
  buyer.capitalRatio = rivalCapitalRatio(buyer);
  moveCorporateDebt(state, target, buyer);
  for (const site of Object.values(state.world.sites)) {
    if (site.employer?.partnerRivalId === target.id) site.employer.partnerRivalId = buyer.id;
  }
  const n = target.branches.length;
  target.branches = [];
  target.status = 'merged';
  target.mergedInto = buyer.id;
  target.priceWar = {};
  target.priceLags = {};
  delete target.campaigns;
  pushEvent(
    state,
    'RIVAL_MERGER',
    {
      buyerId: buyer.id,
      buyer: buyer.name,
      rivalId: target.id,
      bank: target.name,
      price,
      branches: n,
      cities: buyer.cities.length,
    },
    7,
  );
}

/** Quarter-end (tick step 13): a rival or two may buy a smaller one. */
export function runRivalMergers(state: GameState): void {
  const rng = stream(state, 'rivalMergers');
  let deals = 0;
  const banks = Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const buyer of banks) {
    // Draw first so every rival consumes the stream the same way.
    const roll = rng.next();
    const premium = rng.range(...RIVAL_MERGERS.premium);
    if (deals >= RIVAL_MERGERS.maxPerQuarter || !canBuy(buyer)) continue;
    if (roll >= RIVAL_MERGERS.chance) continue;
    const target = mergerTarget(state, buyer);
    if (!target) continue;
    if (proFormaCr(buyer, target, premium) < MERGERS.minProFormaCr) continue;
    mergeRivals(state, buyer, target, premium);
    deals += 1;
  }
}
