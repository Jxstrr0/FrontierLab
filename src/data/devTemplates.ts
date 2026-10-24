// Product development templates (docs/CONTENT.md §6). Each template names a
// base product and a set of modifiers; a finished development becomes a new
// catalog product built from PRODUCTS[base] plus these modifiers and the target
// tier (src/sim/products.ts). Digital templates have no base: they apply a
// one-time company effect instead and need an IT floor.
import type { SegmentId } from './types';

/** Modifiers a template applies on top of its base product. Absent = unchanged. */
export interface TemplateMods {
  /** Added to the base affinity per segment (CONTENT §4). */
  affinity?: Partial<Record<SegmentId, number>>;
  /** × base PD. */
  pdMult?: number;
  /** × annual churn. */
  churnMult?: number;
  /** × ticket (balance per new account; AUM for wealth). */
  ticketMult?: number;
  /** × credit limit, which scales the drawn balance of revolving products. */
  limitMult?: number;
  /** Added to base approval. */
  approvalAdd?: number;
  /** × take-up probability q (SIMULATION §9.6). */
  takeUpMult?: number;
  /** × card spend per month (interchange). */
  spendMult?: number;
  /** Card annual fee in $. */
  annualFee?: number;
  /** Added to the interchange rate on card spend. */
  interchangeAdd?: number;
  /** Added to the default rate (rate products), e.g. −0.001 = −0.10pp. */
  defaultRateAdd?: number;
  /** Replaces the default fee (fee products). The market reference scales with it. */
  defaultFee?: number;
  tenor?: 'short' | 'long';
  /** Branch rating bump at branches that offer it ("reputation"). */
  reputation?: number;
  /** Products rating bump at branches that offer it. */
  productsBump?: number;
  /** Wealth products that work without advisor offices. */
  noAdvisorOffice?: boolean;
}

export interface DigitalEffect {
  /** One-time app rating gain (SIMULATION §16.9 digitalProjectBonus). */
  appRating?: number;
  /** Added to the house model's Speed (1–10). */
  modelSpeed?: number;
}

export interface DevTemplate {
  id: string;
  name: string;
  /** Base product id in PRODUCTS; absent for digital projects. */
  base?: string;
  mods: TemplateMods;
  digital?: DigitalEffect;
}

export const DEV_TEMPLATES: Record<string, DevTemplate> = {
  senior_saver: {
    id: 'senior_saver',
    name: 'Senior Saver',
    base: 'savings',
    mods: { affinity: { RET: 0.15 } },
  },
  kids_savings: {
    id: 'kids_savings',
    name: 'Kids Savings',
    base: 'savings',
    mods: { affinity: { FAM: 0.1 }, ticketMult: 0.3 },
  },
  notice_acct: {
    id: 'notice_acct',
    name: '31-Day Notice',
    base: 'savings',
    mods: { churnMult: 0.6, tenor: 'long' },
  },
  green_gic: {
    id: 'green_gic',
    name: 'Green GIC',
    base: 'gic1y',
    mods: { reputation: 0.05, affinity: { YP: 0.05 } },
  },
  first_home: {
    id: 'first_home',
    name: 'First-Home Mortgage',
    base: 'mortgage',
    mods: { affinity: { YP: 0.04, FAM: 0.04 }, pdMult: 1.1 },
  },
  green_mortgage: {
    id: 'green_mortgage',
    name: 'Green Mortgage',
    base: 'mortgage',
    mods: { reputation: 0.05, defaultRateAdd: -0.001 },
  },
  ev_auto: {
    id: 'ev_auto',
    name: 'EV Auto Loan',
    base: 'auto_loan',
    mods: { affinity: { YP: 0.04 }, pdMult: 0.9 },
  },
  student_loc: {
    id: 'student_loc',
    name: 'Student Line of Credit',
    base: 'loc',
    mods: { affinity: { STU: 0.1 }, pdMult: 1.3 },
  },
  consolidation: {
    id: 'consolidation',
    name: 'Debt Consolidation Loan',
    base: 'personal_loan',
    mods: { approvalAdd: 0.05, pdMult: 1.15 },
  },
  cashback_card: {
    id: 'cashback_card',
    name: 'Cashback Card',
    base: 'credit_card',
    mods: { takeUpMult: 1.15, interchangeAdd: -0.003 },
  },
  travel_card: {
    id: 'travel_card',
    name: 'Travel Rewards Card',
    base: 'credit_card',
    mods: { annualFee: 120, spendMult: 1.6, affinity: { YP: 0.05, RET: 0.05 } },
  },
  student_card: {
    id: 'student_card',
    name: 'Student Card',
    base: 'credit_card',
    mods: { affinity: { STU: 0.15 }, limitMult: 0.4 },
  },
  secured_card: {
    id: 'secured_card',
    name: 'Secured Card',
    base: 'credit_card',
    mods: { approvalAdd: 0.25, pdMult: 0.6, spendMult: 0.5 },
  },
  business_card: {
    id: 'business_card',
    name: 'Business Card',
    base: 'credit_card',
    mods: { affinity: { BIZ: 0.25 }, spendMult: 3 },
  },
  robo_advisor: {
    id: 'robo_advisor',
    name: 'Robo-Advisor',
    base: 'wealth',
    mods: { noAdvisorOffice: true, defaultFee: 0.004, ticketMult: 0.25 },
  },
  premium_pkg: {
    id: 'premium_pkg',
    name: 'Premium Banking Package',
    base: 'chequing',
    // "RET/high-income take-up +0.1": modelled as RET affinity +0.1.
    mods: { defaultFee: 30, productsBump: 0.1, affinity: { RET: 0.1 } },
  },
  mobile_app_v2: {
    id: 'mobile_app_v2',
    name: 'Mobile App 2.0',
    mods: {},
    digital: { appRating: 0.3 },
  },
  instant_decisions: {
    id: 'instant_decisions',
    name: 'Instant Decisions',
    mods: {},
    digital: { modelSpeed: 2 },
  },
};

export const DEV_TEMPLATE_IDS = Object.keys(DEV_TEMPLATES);

export const isDigital = (t: DevTemplate) => t.digital !== undefined;
