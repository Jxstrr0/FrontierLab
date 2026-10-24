// The event catalog: every event type systems push into `state.events.log`
// (via pushEvent in events.ts) and the payload it carries. The Daily Ledger
// (news.ts), toasts and the weekly results read events through these shapes.
// Money in currency units, rates as decimals, percentages as plain numbers
// (2.5 = 2.5%). Add a line here whenever a system starts emitting a new type.
import type { Id, Money, Rate } from '../data/types';

export interface EventPayloads {
  // ─── Your bank ────────────────────────────────────────────────────────────
  /** You started a build (commands/branches.ts). */
  NEW_BRANCH: { branchId: Id; city: Id; district: string; address: string };
  /** Fit-out finished; the branch opened (engine.ts). */
  BRANCH_OPENED: { branchId: Id; name: string };
  BRANCH_CLOSED: { branchId: Id; name: string; movedTo?: string };
  LOAN_BOOKED: { branchId: Id; business: string; amount: Money; rate: Rate };
  /** A Loan Desk loan of any size defaulted at or above the BIG_DEFAULT line. */
  BIG_DEFAULT: { business: string; sector: string; amount: Money; branchId?: Id };
  WINDOW_USE: { amount: Money };
  FUNDING_MATURED: { lotId: Id; type: string; counterparty: string; amount: Money };
  REGULATOR_AUDIT: { fine: Money };
  BRAND_CAMPAIGN_ENDED: { campaignId: string; reason: string };
  DIGITAL_PROJECT_DONE: { templateId: string; name: string };
  PRODUCT_DEVELOPED: { productId: string; name: string; stars: number };
  GAME_OVER: { reason: 'takeover' | 'insolvency' };

  // ─── Macro (macro.ts) ─────────────────────────────────────────────────────
  /** Every central bank meeting, held or moved. `change` 0 means a hold. */
  CB_DECISION: {
    country: string;
    cb: string;
    rate: Rate;
    change: Rate;
    gdp: number;
    forecast: number;
    inflation: number;
  };

  // ─── Rivals (rivalAi.ts, corporateDebt.ts) ────────────────────────────────
  RIVAL_BRANCH_OPENED: {
    rivalId: Id;
    bank: string;
    lotId: Id;
    city: Id;
    district: string;
    address: string;
  };
  RIVAL_BRANCH_CLOSED: { rivalId: Id; bank: string; city: Id; district: string; address: string };
  /** Quarter-end report. `pct` is the change in revenue from the previous quarter. */
  RIVAL_EARNINGS: {
    rivalId: Id;
    company: string;
    revenue: Money;
    prevRevenue: Money;
    pct: number;
    netIncome: Money;
    quarter: string;
  };
  /** Listed rivals only. `yieldPct` is the annualised yield on the notional share price. */
  RIVAL_DIVIDEND: { rivalId: Id; company: string; dps: Money; yieldPct: number; quarter: string };
  RIVAL_EXEC_RESIGN: { rivalId: Id; company: string; title: string; name: string };
  /** A rival fails its recession check and is seized (§18.5). */
  BANK_FAILURE: { rivalId: Id; bank: string; n: number };
  /** Its unsold network is split among the other rivals (or closed). */
  RIVAL_NETWORK_SPLIT: { rivalId: Id; bank: string; n: number; takers: string[] };
  /** A rival raises deposit rates in a price war (§18.6). */
  PRICE_WAR: { rivalId: Id; bank: string; city: Id; bump: Rate; savingsRate: Rate };
  CORPORATE_LOAN: { lenderId: Id; lender: string; amount: Money; rate: Rate };

  // ─── Incidents (incidents.ts) ─────────────────────────────────────────────
  INCIDENT_RAISED: { incidentId: Id; type: string; scope: Id; scopeName: string };
  INCIDENT_RESOLVED: {
    incidentId: Id;
    type: string;
    scope: Id;
    scopeName: string;
    option: string;
    by: 'you' | 'manager' | 'deadline';
    cost: Money;
  };
  REG_FINE: { bank: string; amount: Money; reason: string };
  BREACH: { bank: string; n: number };
  BANK_RUN: { bank: string };
  BANK_RUN_ENDED: { bank: string };
  RECAP: { bank: string; amount: Money; shares: number };

  // ─── Partnerships (partnerships.ts) ───────────────────────────────────────
  PARTNERSHIP_SIGNED: {
    partnershipId: Id;
    siteId: Id;
    employer: string;
    kind: 'payroll' | 'student';
    branchName: string;
    fee: Money;
  };
  PARTNERSHIP_RENEWED: { partnershipId: Id; employer: string; fee: Money };
  PARTNERSHIP_ENDED: {
    partnershipId: Id;
    employer: string;
    reason: 'terminated' | 'lapsed' | 'released';
  };
  GRAD_PROGRAM: { siteId: Id; university: string; cost: Money; started: boolean };

  // ─── Politics (news.ts) ───────────────────────────────────────────────────
  /** `country` is a CountryId; `policy` and `effect` are copy from src/data/newsWorld.ts. */
  POLICY_PROPOSED: PolicyPayload;
  /** A passed capital buffer also sets that country's `capitalBuffer`. */
  POLICY_PASSED: PolicyPayload;
  POLICY_REJECTED: PolicyPayload;
}

export type EventType = keyof EventPayloads;

export interface PolicyPayload {
  country: string;
  policy: string;
  effect: string;
  /** Policy id in src/data/newsWorld.ts. */
  policyId: string;
  /** The fictional party that tabled it. */
  party: string;
}
