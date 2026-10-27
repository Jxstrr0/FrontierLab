// Read-only views for the Products floor, the credit bureau and the IT floor's
// digital projects (SCREENS §10, §13): the company lineup's price and Offered
// state, company totals per product, the ARR and lending trend, development
// status and model labels. Nothing here mutates GameState.
import { DEV_TIER, DEV_TERMS } from '../../../config/balance';
import { DATA_INPUTS } from '../../../data/bureaus';
import { DEV_TEMPLATES, type DevTemplate } from '../../../data/devTemplates';
import { PRODUCTS, type ProductSpec } from '../../../data/products';
import { CITIES } from '../../../data/cities';
import type { CategoryId, CountryId } from '../../../data/types';
import { isOffered } from '../../../sim/branch/pricing';
import { allProducts } from '../../../sim/products';
import { countryOfCity, defaultPrice } from '../../../sim/rates';
import type {
  Branch,
  DevTier,
  Development,
  GameState,
  UnderwritingModel,
  WeeklySnapshot,
} from '../../../sim/state';
import { apportion } from './mixMath';

// ─── Development form ─────────────────────────────────────────────────────────

export const TIERS: { value: DevTier; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'premium', label: 'Premium' },
];

export const TERM_OPTIONS = DEV_TERMS.map((w) => ({ value: String(w), label: `${w} wk` }));

const TIER_NAME: Record<DevTier, string> = { low: 'Low', medium: 'Medium', premium: 'Premium' };
export const tierName = (t: DevTier) => TIER_NAME[t];

const pp = (rate: number) => `${rate > 0 ? '+' : '−'}${(Math.abs(rate) * 100).toFixed(2)}pp`;

/** What the price tier does for a template's base product (DEV_TIER). */
export function tierHint(template: DevTemplate | undefined, tier: DevTier): string {
  const base = template?.base ? PRODUCTS[template.base] : undefined;
  if (!base) return '';
  const fee = base.defaultRule.base === 'fixed';
  const price = fee
    ? DEV_TIER.feeMult[tier] === 1
      ? 'Standard price'
      : `Price ×${DEV_TIER.feeMult[tier]}`
    : DEV_TIER.rateAdd[tier] === 0
      ? 'Standard rate'
      : `Default rate ${pp(DEV_TIER.rateAdd[tier])}`;
  const bump = DEV_TIER.productsBump[tier];
  return bump > 0 ? `${price} · Products rating +${bump.toFixed(2)} where offered` : price;
}

/** Odds rows for the table, 5★ first, as whole percents that add up to 100. */
export function oddsRows(odds: number[]): { stars: number; pct: number }[] {
  const pcts = apportion(odds, 100);
  return pcts.map((pct, i) => ({ stars: i + 1, pct })).reverse();
}

/** "Template · Tier" under a product's own name; the template is left out when it matches. */
export function devSubtitle(name: string, templateId: string | undefined, tier?: DevTier): string {
  const template = templateId ? DEV_TEMPLATES[templateId]?.name : undefined;
  const parts = [template !== name ? template : undefined, tier && `${tierName(tier)} tier`];
  return parts.filter(Boolean).join(' · ');
}

/** "Senior Saver · Premium tier" for a developed product; undefined for base products. */
export function productSubtitle(state: GameState, spec: ProductSpec): string | undefined {
  const entry = state.products.catalog[spec.id];
  if (!entry?.developed) return undefined;
  return devSubtitle(spec.name, entry.templateId, entry.tier);
}

// ─── Company lineup ───────────────────────────────────────────────────────────

const openBranches = (s: GameState): Branch[] =>
  Object.values(s.branches).filter((b) => b.status !== 'closed');

export function lineupSpecs(s: GameState, cat: CategoryId): ProductSpec[] {
  return allProducts(s).filter((x) => x.category === cat);
}

/**
 * The company price in a country (home by default): the HQ price while
 * Apply-to-all is on, else that country's first branch's (or the default).
 */
export function companyPrice(
  s: GameState,
  spec: ProductSpec,
  country: CountryId = CITIES[s.meta.homeCityId]!.country,
): number {
  if (s.company.applyRatesToAll) {
    const p = s.company.companyPrices[country]?.[spec.id];
    if (p !== undefined) return p;
  }
  const first = openBranches(s).find((b) => CITIES[b.cityId]?.country === country);
  const slot = first?.offered[spec.id];
  if (slot) return slot.price;
  const c = s.world.countries[country];
  return c ? defaultPrice(spec, c) : defaultPrice(spec, countryOfCity(s, s.meta.homeCityId));
}

/**
 * Countries with HQ price lists to edit: your home country, then every country
 * with an open (or opening) branch, in the order you entered them.
 */
export function priceCountries(s: GameState): CountryId[] {
  const ids: CountryId[] = [CITIES[s.meta.homeCityId]!.country];
  for (const b of openBranches(s)) {
    const c = CITIES[b.cityId]?.country;
    if (c && !ids.includes(c)) ids.push(c);
  }
  return ids;
}

/**
 * The city whose market a country's HQ prices are compared with: where most of
 * your branches there stand, your home city at home, else its first city.
 */
export function countryRefCity(s: GameState, country: CountryId): string {
  const counts = new Map<string, number>();
  for (const b of openBranches(s)) {
    if (CITIES[b.cityId]?.country === country)
      counts.set(b.cityId, (counts.get(b.cityId) ?? 0) + 1);
  }
  let best: string | undefined;
  for (const [id, n] of counts) if (best === undefined || n > counts.get(best)!) best = id;
  if (best) return best;
  if (CITIES[s.meta.homeCityId]?.country === country) return s.meta.homeCityId;
  return Object.values(CITIES).find((c) => c.country === country && !c.regional)?.id ?? '';
}

/** How many open branches offer a product. */
export function offeredCount(s: GameState, productId: string): { on: number; total: number } {
  const open = openBranches(s);
  return { on: open.filter((b) => isOffered(b, productId)).length, total: open.length };
}

/** The company Offered toggle: the HQ lineup when set, else whether any branch offers it. */
export function companyOffered(s: GameState, productId: string): boolean {
  const set = s.company.companyOffered?.[productId];
  if (set !== undefined) return set;
  return offeredCount(s, productId).on > 0;
}

/** Totals across open branches for one product. */
export function companyTotals(s: GameState, productId: string) {
  let balance = 0;
  let accounts = 0;
  let newAccounts = 0;
  for (const b of openBranches(s)) {
    const book = b.books[productId];
    if (!book) continue;
    balance += book.balance;
    accounts += book.accounts;
    newAccounts += book.last.newAccounts;
  }
  return { balance, accounts, newAccounts };
}

// ─── Company trend ────────────────────────────────────────────────────────────

/** ARR and Loan Desk lending over the last `weeks` closed weeks, with the latest two values. */
export function trendSeries(history: WeeklySnapshot[], weeks: number) {
  const recent = history.slice(-weeks);
  const arr = recent.map((w) => w.totals.arr ?? 0);
  const loans = recent.map((w) => w.totals.loans);
  return {
    weeks: recent.map((w) => w.week),
    arr,
    loans,
    last: recent[recent.length - 1],
    prev: recent[recent.length - 2],
  };
}

// ─── Developments ─────────────────────────────────────────────────────────────

export type DigitalStatus =
  { status: 'available' } | { status: 'running'; dev: Development } | { status: 'done' };

export function digitalStatus(s: GameState, templateId: string): DigitalStatus {
  if (s.products.digitalDone?.includes(templateId)) return { status: 'done' };
  const dev = s.products.developments.find((d) => d.templateId === templateId);
  return dev ? { status: 'running', dev } : { status: 'available' };
}

/** Why a template can't be picked in the New product form, or null. */
export function templateBlocker(s: GameState, template: DevTemplate): string | null {
  if (!template.digital) return null;
  if (!s.departments.it) return 'Needs an IT floor';
  const st = digitalStatus(s, template.id);
  if (st.status === 'running') return 'Under way';
  if (st.status === 'done') return 'Done';
  return null;
}

/** What a digital project does, in a phrase. */
export function digitalEffectText(template: DevTemplate): string {
  const d = template.digital;
  if (!d) return '';
  const parts: string[] = [];
  if (d.appRating) parts.push(`App rating +${d.appRating.toFixed(1)} for good`);
  if (d.modelSpeed) parts.push(`House model Speed +${d.modelSpeed}`);
  return parts.join(' · ');
}

// ─── Models ───────────────────────────────────────────────────────────────────

export const INPUT_IDS = Object.keys(DATA_INPUTS);

/** Inputs the player can use now (Internal History waits for loans booked). */
export function openInputs(s: GameState): string[] {
  return INPUT_IDS.filter((id) => {
    const min = DATA_INPUTS[id]?.minLoansBooked;
    return !min || s.underwriting.loansBooked >= min;
  });
}

export function modelSourceText(m: UnderwritingModel): string {
  if (m.source === 'bureau') return 'Bureau package';
  return m.hostedBy ? `Hosted by ${m.hostedBy}` : 'Built on the Products floor';
}

/** Axis labels for underwriting model rosettes (SIMULATION §16.7 radar order). */
export const MODEL_AXES = [
  ['Accuracy'],
  ['Speed'],
  ['Inclusion'],
  ['Fraud', 'shield'],
  ['Fairness'],
] as const;

export const radarText = (v: number) => v.toFixed(1);
