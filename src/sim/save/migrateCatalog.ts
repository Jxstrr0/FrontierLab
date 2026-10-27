// Save migration 5 → 6 (stage C3a): the bank catalog gives way to Plans, API
// and Apps & Services. Every bank book is settled where it stands, so equity is
// unchanged: deposits are paid out of reserves, loans are sold into reserves at
// book value, and off-balance-sheet books (wealth, safe boxes, FX) just close.
// Each office's old customers move onto the Free Tier, and partnerships switch
// to a plan package. Business loans (the Loan Desk) carry over untouched.
import { PRODUCTS } from '../../data/products';
import { emptyBook } from '../branch/books';
import { roundToStep } from '../math';
import { countryOfCity, defaultPrice } from '../rates';
import type { Branch, GameState } from '../state';

/** The bank's base products and how their balances sit on the balance sheet. */
const OLD_DEPOSITS = new Set(['chequing', 'savings', 'gic1y', 'student', 'business_acct']);
const OLD_LOANS = new Set(['personal_loan', 'auto_loan', 'mortgage', 'loc', 'credit_card']);
const OLD_OTHER = new Set(['wealth', 'safe_box', 'fx']);
const isOldBase = (id: string) => OLD_DEPOSITS.has(id) || OLD_LOANS.has(id) || OLD_OTHER.has(id);

/** Old product ids (base or developed) mapped to their base. */
function oldProducts(state: GameState): Map<string, string> {
  const out = new Map<string, string>();
  for (const id of [...OLD_DEPOSITS, ...OLD_LOANS, ...OLD_OTHER]) out.set(id, id);
  for (const e of Object.values(state.products?.catalog ?? {})) {
    if (e.developed && e.base && isOldBase(e.base)) out.set(e.id, e.base);
  }
  return out;
}

/** Settles an office's bank books and opens the new catalog's. */
function convertOffice(state: GameState, b: Branch, old: Map<string, string>): void {
  for (const [pid, base] of old) {
    const book = b.books[pid];
    if (book) {
      if (OLD_DEPOSITS.has(base)) state.treasury.reserves -= book.balance;
      else if (OLD_LOANS.has(base)) state.treasury.reserves += book.balance;
    }
    delete b.books[pid];
    delete b.offered[pid];
  }
  const country = countryOfCity(state, b.cityId);
  for (const spec of Object.values(PRODUCTS)) {
    if (b.offered[spec.id]) continue;
    // Plans start on, as in a new office; the API and apps wait for the player.
    const on = spec.category === 'deposits' || spec.kind === 'sbl';
    b.offered[spec.id] = { on, price: roundToStep(defaultPrice(spec, country), spec.step) };
    b.books[spec.id] ??= emptyBook();
  }
  // Yesterday's customers keep the app on the Free Tier, and some will upgrade.
  const free = b.books.free_tier;
  if (free && b.status !== 'closed') free.accounts += b.customers;
}

export function migrateCatalog(state: GameState): void {
  const old = oldProducts(state);
  for (const b of Object.values(state.branches ?? {})) convertOffice(state, b, old);

  // Paying out more deposits than reserves held comes out of corporate cash.
  if (state.treasury.reserves < 0) {
    state.company.cash += state.treasury.reserves;
    state.treasury.reserves = 0;
  }

  for (const p of Object.values(state.partnerships ?? {})) {
    state.treasury.reserves -= p.balance;
    p.balance = 0;
    p.productId = p.kind === 'student' ? 'campus_plan' : 'team';
  }
  if (state.treasury.reserves < 0) {
    state.company.cash += state.treasury.reserves;
    state.treasury.reserves = 0;
  }

  const catalog = state.products.catalog;
  for (const id of old.keys()) delete catalog[id];
  for (const spec of Object.values(PRODUCTS)) {
    catalog[spec.id] ??= { id: spec.id, stars: spec.startStars, developed: false };
  }
  state.products.developments = state.products.developments.filter(
    (d) => !isOldBase(DEV_BASES[d.templateId] ?? ''),
  );

  for (const list of Object.values(state.company.companyPrices)) {
    for (const id of old.keys()) if (list) delete list[id];
  }
  const lineup = state.company.companyOffered;
  if (lineup) for (const id of old.keys()) delete lineup[id];

  for (const r of Object.values(state.rivals ?? {})) {
    for (const id of old.keys()) {
      delete r.prices[id];
      delete r.priceLags[id];
    }
    // Price-war bumps were savings-rate points; they are plan price cuts now.
    r.priceWar = {};
  }
  state.incidents.effects = state.incidents.effects.filter(
    (e) => (e.kind as string) !== 'savingsBoost' && !(e.target && isOldBase(e.target)),
  );
}

/** Bases of the bank's development templates, which no longer exist (CONTENT §6 before C3a). */
const DEV_BASES: Record<string, string> = {
  senior_saver: 'savings',
  kids_savings: 'savings',
  notice_acct: 'savings',
  green_gic: 'gic1y',
  first_home: 'mortgage',
  green_mortgage: 'mortgage',
  ev_auto: 'auto_loan',
  student_loc: 'loc',
  consolidation: 'personal_loan',
  cashback_card: 'credit_card',
  travel_card: 'credit_card',
  student_card: 'credit_card',
  secured_card: 'credit_card',
  business_card: 'credit_card',
  robo_advisor: 'wealth',
  premium_pkg: 'chequing',
};
