// The v1 product catalog (docs/CONTENT.md §5).
import type { CategoryId, SegmentId } from './types';

/** How a product's balances behave in the books (SIMULATION §10). */
export type ProductKind =
  'deposit' | 'amortizing' | 'revolving' | 'sbl' | 'wealth' | 'safebox' | 'fx';

/**
 * What the price stepper sets: an interest rate, a $ fee (monthly or annual),
 * or a percentage fee (wealth % of AUM, FX markup).
 */
export type PriceType = 'rate' | 'feeMonthly' | 'feeAnnual' | 'pctFee';

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
  /** Base balance per new account (drawn balance for revolving, AUM for wealth). */
  ticket: number;
  /** Amortization term in weeks (amortizing loans) or deposit term (GIC). */
  termWeeks?: number;
  basePd?: number;
  lgd?: number;
  riskWeight: number;
  baseApproval?: number;
  /** Annual account churn (deposits, revolving, wealth, safe box). */
  churn: number;
  /** $ per account per week. */
  servicing: number;
  /** Fixed pay rate for fee-based deposit accounts. */
  payRate?: number;
  rateChurnSens?: number;
  /** Organic balance growth per year (chequing). */
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
  chequing: {
    id: 'chequing',
    name: 'Everyday Chequing',
    category: 'deposits',
    kind: 'deposit',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 12 },
    min: 0,
    max: 30,
    step: 1,
    ticket: 3000,
    riskWeight: 0,
    churn: 0.08,
    servicing: 0.45,
    payRate: 0.0005,
    rateChurnSens: 0.1,
    organic: 0.03,
    startStars: 3.0,
  },
  savings: {
    id: 'savings',
    name: 'High-Interest Savings',
    category: 'deposits',
    kind: 'deposit',
    priceType: 'rate',
    tenor: 'short',
    defaultRule: { base: 'ftpShort', spread: -0.01, floor: 0.001 },
    min: 0,
    max: 0.08,
    step: 0.0005,
    ticket: 9000,
    riskWeight: 0,
    churn: 0.14,
    servicing: 0.3,
    rateChurnSens: 0.6,
    startStars: 3.0,
  },
  gic1y: {
    id: 'gic1y',
    name: '1-Year GIC',
    category: 'deposits',
    kind: 'deposit',
    priceType: 'rate',
    tenor: 'long',
    defaultRule: { base: 'ftpLong', spread: -0.0015 },
    min: 0,
    max: 0.09,
    step: 0.0005,
    ticket: 16000,
    termWeeks: 52,
    riskWeight: 0,
    churn: 0,
    servicing: 0.2,
    startStars: 2.5,
  },
  student: {
    id: 'student',
    name: 'Student Account',
    category: 'deposits',
    kind: 'deposit',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 0 },
    min: 0,
    max: 10,
    step: 1,
    ticket: 900,
    riskWeight: 0,
    churn: 0.12,
    servicing: 0.35,
    payRate: 0,
    startStars: 2.5,
  },
  business_acct: {
    id: 'business_acct',
    name: 'Business Account',
    category: 'deposits',
    kind: 'deposit',
    priceType: 'feeMonthly',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 25 },
    min: 0,
    max: 80,
    step: 1,
    ticket: 15000,
    riskWeight: 0,
    churn: 0.09,
    servicing: 0.9,
    payRate: 0.0025,
    startStars: 2.5,
  },
  personal_loan: {
    id: 'personal_loan',
    name: 'Personal Loan',
    category: 'lending',
    kind: 'amortizing',
    priceType: 'rate',
    tenor: 'short',
    defaultRule: { base: 'ftpShort', spread: 0.06 },
    min: 0.03,
    max: 0.25,
    step: 0.0005,
    ticket: 11000,
    termWeeks: 156,
    basePd: 0.03,
    lgd: 0.7,
    riskWeight: 0.75,
    baseApproval: 0.62,
    churn: 0,
    servicing: 0.4,
    startStars: 2.5,
  },
  auto_loan: {
    id: 'auto_loan',
    name: 'Auto Loan',
    category: 'lending',
    kind: 'amortizing',
    priceType: 'rate',
    tenor: 'long',
    defaultRule: { base: 'ftpLong', spread: 0.034 },
    min: 0.02,
    max: 0.18,
    step: 0.0005,
    ticket: 27000,
    termWeeks: 260,
    basePd: 0.016,
    lgd: 0.4,
    riskWeight: 0.75,
    baseApproval: 0.7,
    churn: 0,
    servicing: 0.3,
    startStars: 2.5,
  },
  mortgage: {
    id: 'mortgage',
    name: 'Mortgage (5-yr fixed)',
    category: 'lending',
    kind: 'amortizing',
    priceType: 'rate',
    tenor: 'long',
    defaultRule: { base: 'ftpLong', spread: 0.0145 },
    min: 0.015,
    max: 0.12,
    step: 0.0005,
    ticket: 340000,
    termWeeks: 1300,
    basePd: 0.0035,
    lgd: 0.2,
    riskWeight: 0.35,
    baseApproval: 0.48,
    churn: 0,
    servicing: 0.6,
    originationFee: 0.005,
    startStars: 2.5,
  },
  loc: {
    id: 'loc',
    name: 'Line of Credit',
    category: 'lending',
    kind: 'revolving',
    priceType: 'rate',
    tenor: 'short',
    defaultRule: { base: 'ftpShort', spread: 0.05 },
    min: 0.03,
    max: 0.2,
    step: 0.0005,
    ticket: 8800,
    basePd: 0.02,
    lgd: 0.6,
    riskWeight: 0.75,
    baseApproval: 0.6,
    churn: 0.06,
    servicing: 0.25,
    startStars: 2.5,
  },
  sbl: {
    id: 'sbl',
    name: 'Small Business Loan',
    category: 'lending',
    kind: 'sbl',
    priceType: 'rate',
    tenor: 'short',
    defaultRule: { base: 'ftpShort', spread: 0.045 },
    min: 0.03,
    max: 0.2,
    step: 0.0005,
    ticket: 0,
    riskWeight: 1.0,
    churn: 0,
    servicing: 1.2,
    startStars: 2.5,
  },
  credit_card: {
    id: 'credit_card',
    name: 'Credit Card',
    category: 'cards',
    kind: 'revolving',
    priceType: 'rate',
    tenor: 'short',
    defaultRule: { base: 'card', value: 0.2099 },
    min: 0.0999,
    max: 0.2999,
    step: 0.0025,
    ticket: 2400,
    basePd: 0.045,
    lgd: 0.85,
    riskWeight: 0.75,
    baseApproval: 0.6,
    churn: 0.07,
    servicing: 0.35,
    spendPerMonth: 1300,
    annualFee: 0,
    startStars: 2.5,
  },
  wealth: {
    id: 'wealth',
    name: 'Wealth Advice',
    category: 'cards',
    kind: 'wealth',
    priceType: 'pctFee',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 0.01 },
    min: 0.0025,
    max: 0.025,
    step: 0.0005,
    ticket: 50000,
    riskWeight: 0,
    churn: 0.08,
    servicing: 1.5,
    startStars: 2.5,
  },
  safe_box: {
    id: 'safe_box',
    name: 'Safe Deposit Box',
    category: 'cards',
    kind: 'safebox',
    priceType: 'feeAnnual',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 120 },
    min: 40,
    max: 400,
    step: 5,
    ticket: 0,
    riskWeight: 0,
    churn: 0.06,
    servicing: 0.1,
    startStars: 2.5,
  },
  fx: {
    id: 'fx',
    name: 'FX & Wires',
    category: 'cards',
    kind: 'fx',
    priceType: 'pctFee',
    tenor: 'short',
    defaultRule: { base: 'fixed', value: 0.025 },
    min: 0.005,
    max: 0.05,
    step: 0.001,
    ticket: 0,
    riskWeight: 0,
    churn: 0,
    servicing: 0,
    startStars: 2.5,
  },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS);

/** Products whose balances are deposits. */
export const isDeposit = (p: ProductSpec) => p.kind === 'deposit';
/** Products that need credit approval (loans and cards, excluding the Loan Desk). */
export const needsApproval = (p: ProductSpec) => p.kind === 'amortizing' || p.kind === 'revolving';
/** Products whose balances are loans on the balance sheet. */
export const isLoan = (p: ProductSpec) =>
  p.kind === 'amortizing' || p.kind === 'revolving' || p.kind === 'sbl';
