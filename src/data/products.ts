// The product catalog (docs/CONTENT.md §5): Plans, API and Apps & Services
// (stage C3a). Category ids keep the bank's deposits / lending / cards so every
// table keyed by category carries over; the screens show the new names.
import type { CategoryId, SegmentId } from './types';

/**
 * Display order and names of the three catalog categories (the ids keep their
 * bank-era names). `label` is the short form for the category switch at phone
 * width; `name` is the full name used in text.
 */
export const CATEGORY_NAMES: { value: CategoryId; label: string; name: string }[] = [
  { value: 'deposits', label: 'Plans', name: 'Plans' },
  { value: 'lending', label: 'API', name: 'API' },
  { value: 'cards', label: 'Apps', name: 'Apps & Services' },
];

/** How a product's balances behave in the books (SIMULATION §10). */
export type ProductKind =
  | 'plan'
  | 'usage'
  | 'sbl'
  // Bank kinds, no longer in the catalog; their book paths go in stage C3c.
  | 'deposit'
  | 'amortizing'
  | 'revolving'
  | 'wealth'
  | 'safebox'
  | 'fx';

/**
 * What the price stepper sets: an interest rate (Loan Desk), a $ fee per seat
 * (monthly or annual), a $ price per unit of usage (API, per million tokens),
 * or a percentage fee (bank products, gone in C3c).
 */
export type PriceType = 'rate' | 'feeMonthly' | 'feeAnnual' | 'perUnit' | 'pctFee';

/** Default price rule (SIMULATION §5). `fixed` prices re-price with the fee index or card anchor. */
export type DefaultRule =
  | { base: 'ftpShort' | 'ftpLong'; spread: number; floor?: number }
  | { base: 'fixed'; value: number }
  | { base: 'card'; value: number };

export interface ProductSpec {
  id: string;
  name: string;
  category: CategoryId;
  kind: ProductKind;
  priceType: PriceType;
  tenor: 'short' | 'long';
  defaultRule: DefaultRule;
  min: number;
  max: number;
  step: number;
  /**
   * Size of a new account: seats for plans, units of usage a month (million
   * tokens) for usage products. Book balances are ARR (SIMULATION §10).
   */
  ticket: number;
  /** Amortization term in weeks (amortizing loans) or deposit term (GIC). */
  termWeeks?: number;
  basePd?: number;
  lgd?: number;
  riskWeight: number;
  baseApproval?: number;
  /** Annual account churn (deposits, revolving, wealth, safe box). */
  churn: number;
  /** $ per account per week (support and, until C3b, inference for plans). */
  servicing: number;
  /** Usage products: $ of compute per unit used (until C3b's compute charge). */
  unitCost?: number;
  /** Free tiers: the plan users upgrade to, and the share that upgrade a year. */
  convertsTo?: string;
  conversion?: number;
  /** Fixed pay rate for fee-based deposit accounts. */
  payRate?: number;
  rateChurnSens?: number;
  /** Organic balance growth per year (usage per account grows as customers build on it). */
  organic?: number;
  /** Origination fee as a fraction of new volume. */
  originationFee?: number;
  /** Credit card spend per account per month (interchange). */
  spendPerMonth?: number;
  annualFee?: number;
  startStars: number;
  // Developed products only (SIMULATION §16.6, built in src/sim/products.ts):
  /** The base product this one was developed from. */
  base?: string;
  /** Affinity per segment; base products read AFFINITY in segments.ts. */
  affinity?: Record<SegmentId, number>;
  /** × take-up probability q (§9.6). */
  takeUpMult?: number;
  /** Interchange rate on card spend, replacing INTERCHANGE. */
  interchange?: number;
  /** Wealth product that needs no advisor offices. */
  noAdvisorOffice?: boolean;
  /** Branch and Products rating bumps where it's offered. */
  branchBump?: number;
  productsBump?: number;
  /** Market reference = the base product's × this (fee templates that set their own fee). */
  refMult?: number;
}

export const PRODUCTS: Record<string, ProductSpec> = {
  // ─── Plans (category id 'deposits') ─────────────────────────────────────────
  free_tier: {
    id: 'free_tier',
    name: 'Free Tier',
    category: 'deposits',
    kind: 'plan',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 0 },
    min: 0,
    max: 5,
    step: 1,
    ticket: 1,
    riskWeight: 0,
    churn: 0.25,
    servicing: 0.05,
    convertsTo: 'plus',
    conversion: 0.12,
    startStars: 3.0,
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    category: 'deposits',
    kind: 'plan',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 20 },
    min: 5,
    max: 60,
    step: 1,
    ticket: 1,
    riskWeight: 0,
    churn: 0.14,
    servicing: 1.0,
    rateChurnSens: 0.3,
    startStars: 3.0,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    category: 'deposits',
    kind: 'plan',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 60 },
    min: 20,
    max: 250,
    step: 5,
    ticket: 1,
    riskWeight: 0,
    churn: 0.12,
    servicing: 3.0,
    rateChurnSens: 0.3,
    startStars: 2.5,
  },
  team: {
    id: 'team',
    name: 'Team',
    category: 'deposits',
    kind: 'plan',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 30 },
    min: 10,
    max: 90,
    step: 1,
    ticket: 6,
    riskWeight: 0,
    churn: 0.08,
    servicing: 6.0,
    rateChurnSens: 0.2,
    startStars: 2.5,
  },
  campus_plan: {
    id: 'campus_plan',
    name: 'Campus Plan',
    category: 'deposits',
    kind: 'plan',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 8 },
    min: 0,
    max: 20,
    step: 1,
    ticket: 1,
    riskWeight: 0,
    churn: 0.2,
    servicing: 0.6,
    startStars: 2.5,
  },
  // ─── API (category id 'lending'), priced per million tokens ──────────────────
  api: {
    id: 'api',
    name: 'Standard API',
    category: 'lending',
    kind: 'usage',
    priceType: 'perUnit',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 3 },
    min: 0.5,
    max: 15,
    step: 0.25,
    ticket: 40,
    riskWeight: 0,
    churn: 0.1,
    servicing: 0.5,
    unitCost: 1.0,
    organic: 0.25,
    rateChurnSens: 0.3,
    startStars: 3.0,
  },
  batch_api: {
    id: 'batch_api',
    name: 'Batch API',
    category: 'lending',
    kind: 'usage',
    priceType: 'perUnit',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 1.5 },
    min: 0.25,
    max: 6,
    step: 0.25,
    ticket: 80,
    riskWeight: 0,
    churn: 0.09,
    servicing: 0.5,
    unitCost: 0.5,
    organic: 0.2,
    rateChurnSens: 0.3,
    startStars: 2.5,
  },
  fine_tuning: {
    id: 'fine_tuning',
    name: 'Fine-tuning',
    category: 'lending',
    kind: 'usage',
    priceType: 'perUnit',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 8 },
    min: 2,
    max: 30,
    step: 0.5,
    ticket: 5,
    riskWeight: 0,
    churn: 0.1,
    servicing: 1.5,
    unitCost: 3.0,
    organic: 0.15,
    rateChurnSens: 0.2,
    startStars: 2.5,
  },
  // Enterprise contracts (C5b): the switch that opens the Deal Desk. Bids are
  // a discount off each business's budget, so the price fields are unused.
  sbl: {
    id: 'sbl',
    name: 'Enterprise contracts',
    category: 'lending',
    kind: 'sbl',
    priceType: 'rate',
    tenor: 'short',
    defaultRule: { base: 'ftpShort', spread: 0.045 },
    min: 0.03,
    max: 0.2,
    step: 0.0005,
    ticket: 0,
    riskWeight: 0,
    churn: 0,
    servicing: 1.2,
    startStars: 2.5,
  },
  // ─── Apps & Services (category id 'cards') ──────────────────────────────────
  code_assistant: {
    id: 'code_assistant',
    name: 'Code Assistant',
    category: 'cards',
    kind: 'plan',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 19 },
    min: 5,
    max: 60,
    step: 1,
    ticket: 1,
    riskWeight: 0,
    churn: 0.13,
    servicing: 0.9,
    rateChurnSens: 0.3,
    startStars: 2.5,
  },
  agent_studio: {
    id: 'agent_studio',
    name: 'Agent Studio',
    category: 'cards',
    kind: 'plan',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 99 },
    min: 25,
    max: 400,
    step: 5,
    ticket: 1,
    riskWeight: 0,
    churn: 0.1,
    servicing: 4.0,
    rateChurnSens: 0.2,
    startStars: 2.5,
  },
  creative_suite: {
    id: 'creative_suite',
    name: 'Creative Suite',
    category: 'cards',
    kind: 'plan',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 15 },
    min: 5,
    max: 50,
    step: 1,
    ticket: 1,
    riskWeight: 0,
    churn: 0.14,
    servicing: 0.8,
    rateChurnSens: 0.3,
    startStars: 2.5,
  },
  priority_support: {
    id: 'priority_support',
    name: 'Priority Support',
    category: 'cards',
    kind: 'plan',
    priceType: 'feeAnnual',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 1500 },
    min: 300,
    max: 6000,
    step: 50,
    ticket: 1,
    riskWeight: 0,
    churn: 0.08,
    servicing: 1.0,
    startStars: 2.5,
  },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS);

/** Subscription products: plans and usage, whose book balance is ARR (C3a). */
export const isRecurring = (p: ProductSpec) => p.kind === 'plan' || p.kind === 'usage';
/** Products whose balances are deposits. */
export const isDeposit = (p: ProductSpec) => p.kind === 'deposit';
/** Products that need credit approval (loans and cards, excluding the Loan Desk). */
export const needsApproval = (p: ProductSpec) => p.kind === 'amortizing' || p.kind === 'revolving';
/** Products whose balances are loans on the balance sheet. */
export const isLoan = (p: ProductSpec) => p.kind === 'amortizing' || p.kind === 'revolving';
