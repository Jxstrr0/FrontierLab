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
  /** A press angle on an incident with no template of its own (ATM skim denial, viral complaint). */
  INCIDENT_NEWS: { bank: string; type: string; branchName: string; city: Id };
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

  // ─── Governance and executives (governance.ts, executives.ts) ──────────────
  BOARD_MEETING: {
    bank: string;
    quarter: string;
    dps: Money;
    dividendPassed: boolean;
    salary: Money;
    salaryPassed: boolean;
  };
  /** The board approved a dividend; paid `payWeek` (a DIVIDEND_DUE case reminds you). */
  DIVIDEND_DECLARED: {
    bank: string;
    dps: Money;
    /** The previous approved dividend per share (sentiment: raise or cut, §19.5). */
    prevDps: Money;
    total: Money;
    payWeek: number;
    yieldPct: number;
  };
  DIVIDEND_PAID: { bank: string; dps: Money; total: Money; personal: Money };
  EXEC_HIRED: { seat: string; title: string; name: string };
  /** An executive resigned or was poached (EXEC_POACHED decides first). */
  EXEC_RESIGNED: { seat: string; title: string; name: string; bank: string };
  EXEC_FIRED: { seat: string; title: string; name: string; severance: Money };

  // ─── Capital markets (market.ts, equity commands) ─────────────────────────
  PLACEMENT: { bank: string; investor: string; shares: number; price: Money; raised: Money };
  IPO_LAUNCHED: {
    bank: string;
    adviser: string;
    price: Money;
    shares: number;
    floatPct: number;
  };
  IPO_LISTED: {
    bank: string;
    ticker: string;
    exchange: string;
    price: Money;
    open: Money;
    popPct: number;
    raised: Money;
  };
  /** A pending IPO no longer qualified at the quarter-end listing and was pulled. */
  IPO_WITHDRAWN: { bank: string; reason: string };
  SECONDARY_OFFERING: { bank: string; shares: number; price: Money; raised: Money };
  /** A non-bank listed company's quarterly results; `surprisePct` vs expectations. */
  COMPANY_EARNINGS: {
    companyId: Id;
    company: string;
    ticker: string;
    eps: number;
    surprisePct: number;
    quarter: string;
  };
  /** The index moved more than the news threshold this week. */
  MARKET_MOVE: { index: number; pct: number };
  /** Your own share price moved sharply (public only). */
  SHARE_PRICE_MOVE: { bank: string; ticker: string; price: Money; pct: number };

  // ─── M&A (mergers.ts) ─────────────────────────────────────────────────────
  MERGER_OFFER: { rivalId: Id; bank: string; total: Money; premiumPct: number };
  MERGER_REJECTED: { rivalId: Id; bank: string; reason: string };
  MERGER_BLOCKED: { rivalId: Id; bank: string; reason: string };
  ACQUISITION_CLOSED: {
    rivalId: Id;
    bank: string;
    buyer: string;
    price: Money;
    branches: number;
    goodwill: Money;
    distressed: boolean;
  };
  CONVERSION_DONE: { rivalId: Id; bank: string; buyer: string; branches: number };
  /** An accepted offer that could not close (cash or capital tier), or a target gone from the market. */
  MERGER_LAPSED: { rivalId: Id; bank: string; reason: string };
  /** A failed rival's network goes on sale in M&A (rivalQuarter.ts failureCheck, §18.5). */
  DISTRESSED_SALE: { rivalId: Id; bank: string; ask: Money; pb: number; weeks: number; n: number };

  /** A currency moved ≥ FX.newsMove against your home currency this week (fx.ts, §19.10). */
  FX_MOVE: { country: string; currency: string; home: string; pct: number };

  // ─── Ventures and conventions (ventures.ts, conventions.ts) ────────────────
  /** You (company or personal) bought an offer lot. */
  VENTURE_INVESTED: { startupId: Id; name: string; account: string; amount: Money; pct: number };
  VENTURE_ROUND: {
    startupId: Id;
    name: string;
    round: string;
    amount: Money;
    postMoney: Money;
    down: boolean;
    /** You (company or personally) hold shares or lend to it. */
    held: boolean;
  };
  VENTURE_FAILED: { startupId: Id; name: string; held: boolean };
  VENTURE_IPO: { startupId: Id; name: string; ticker: string; price: Money; held: boolean };
  VENTURE_ACQUIRED: { startupId: Id; name: string; price: Money; held: boolean };
  VENTURE_DEBT_OFFERED: {
    startupId: Id;
    name: string;
    amount: Money;
    rate: number;
    accepted: boolean;
  };
  CONVENTION_ANNOUNCED: {
    conventionId: Id;
    name: string;
    cityId: Id;
    city: string;
    startWeek: number;
    /** In the city you were in when it was announced. */
    local: boolean;
  };
  CONVENTION_OPEN: { conventionId: Id; name: string; cityId: Id; city: string; local: boolean };

  // ─── Real estate (realEstate.ts, reo.ts) ──────────────────────────────────
  PROPERTY_BOUGHT: { siteId: Id; address: string; price: Money; account: string };
  PROPERTY_OFFER_REJECTED: { siteId: Id; address: string; offer: Money };
  PROPERTY_SOLD: { siteId: Id; address: string; price: Money; account: string };
  REO_SOLD: { cityId: Id; city: string; units: number; price: Money };

  // ─── Lobbying (lobbying.ts) ───────────────────────────────────────────────
  LOBBY_STARTED: { campaignId: string; title: string; firm: string; cost: Money };
  LOBBY_WON: { campaignId: string; title: string; firm: string; country: string };
  LOBBY_LOST: { campaignId: string; title: string; firm: string; country: string };
  LOBBY_EXPOSED: { campaignId: string; title: string; firm: string; bank: string; fine: Money };

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
