// The event catalog: every event type systems push into `state.events.log`
// (via pushEvent in events.ts) and the payload it carries. The Weekly Ledger
// (news.ts), toasts and the weekly results read events through these shapes.
// Money in currency units, rates as decimals, percentages as plain numbers
// (2.5 = 2.5%). Add a line here whenever a system starts emitting a new type.
import type { Id, Money, Rate } from '../data/types';

export interface EventPayloads {
  // ─── Your bank ────────────────────────────────────────────────────────────
  /** You started a build (commands/branches.ts). */
  NEW_BRANCH: { branchId: Id; city: Id; district: string; address: string; by?: 'coo' };
  /** Fit-out finished; the branch opened (engine.ts). */
  BRANCH_OPENED: { branchId: Id; name: string };
  BRANCH_CLOSED: { branchId: Id; name: string; movedTo?: string };
  /** A sales office grew one size (commands/branches.ts, C2a). */
  OFFICE_GROWN: { branchId: Id; city: Id; size: string };
  /** You started a data center (commands/dataCenters.ts, C2c); `site` is the lot address or energy site. */
  DATA_CENTER_STARTED: { dataCenterId: Id; name: string; city: Id; site: string; weeks: number };
  /** A data center's fit-out (or a hall refit) finished (dataCenters.ts). */
  DATA_CENTER_OPENED: { dataCenterId: Id; name: string; city: Id; gpus: number; refit: boolean };
  /** A data center part was upgraded; `part` is the new part's name. */
  DATA_CENTER_UPGRADED: { dataCenterId: Id; name: string; slot: string; part: string };
  DATA_CENTER_CLOSED: { dataCenterId: Id; name: string; city: Id };
  /** Deal Desk (C5b): you won a business's contract; `from` names the rival you took it from. */
  CONTRACT_WON: {
    branchId: Id;
    businessId: Id;
    business: string;
    sector: string;
    value: Money;
    from?: string;
  };
  /** One of your contracts ended; `to` names the rival that took it. */
  CONTRACT_LOST: {
    branchId: Id;
    businessId: Id;
    business: string;
    sector: string;
    value: Money;
    reason: 'renewal' | 'outage' | 'failed' | 'office';
    to?: string;
  };
  WINDOW_USE: { amount: Money };
  FUNDING_MATURED: { lotId: Id; type: string; counterparty: string; amount: Money };
  REGULATOR_AUDIT: { fine: Money };
  BRAND_CAMPAIGN_ENDED: { campaignId: string; reason: string };
  DIGITAL_PROJECT_DONE: { templateId: string; name: string };
  PRODUCT_DEVELOPED: { productId: string; name: string; stars: number };
  /** A training run finished: a new model generation (training.ts, C6b). */
  MODEL_TRAINED: { modelId: Id; name: string; stars: number; quality: number; leads: boolean };
  /** You hired a researcher; `from` names the rival lab they left (commands/talent.ts, C6c). */
  RESEARCHER_HIRED: { researcherId: Id; name: string; stars: number; from?: string };
  /** One of your researchers left for a rival (RESEARCHER_POACHED, C6c). */
  RESEARCHER_LEFT: { researcherId: Id; name: string; stars: number; rival: string };
  /** A rival lab shipped a new model; `leads` when it tops every rival model (rivalModels.ts, C6b). */
  RIVAL_MODEL_RELEASED: {
    rivalId: Id;
    rival: string;
    model: string;
    quality: number;
    leads: boolean;
  };
  GAME_OVER: { reason: 'takeover' | 'insolvency' };
  /** A milestone reached this week (DESIGN §5.18; src/data/milestones.ts). */
  MILESTONE: { id: string; title: string };

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
  /** A rival grows or shrinks its office in a city a size (C2b); `size` is the new size's name. */
  RIVAL_OFFICE_GROWN: { rivalId: Id; bank: string; city: Id; size: string };
  RIVAL_OFFICE_SHRUNK: { rivalId: Id; bank: string; city: Id; size: string };
  /** A rival opens its first branch in a new city (§18.4); `cities` is its count afterwards. */
  RIVAL_CITY_ENTRY: {
    rivalId: Id;
    bank: string;
    city: Id;
    district: string;
    address: string;
    cities: number;
  };
  /** A new bank is chartered in a city (§18.7). */
  RIVAL_CHARTERED: { rivalId: Id; bank: string; city: Id; strategy: string; branches: number };
  /** A rival buys another (§18.8); `price` is the whole deal, `cities` the buyer's count after. */
  RIVAL_MERGER: {
    buyerId: Id;
    buyer: string;
    rivalId: Id;
    bank: string;
    price: number;
    branches: number;
    cities: number;
  };
  /** A rival starts an ad campaign in one of your cities (§18.9). */
  RIVAL_CAMPAIGN: { rivalId: Id; bank: string; city: Id; weeks: number; branches: number };
  /** A rival's app crosses a half star after its yearly tech spend (§18.9). */
  RIVAL_APP_LAUNCH: { rivalId: Id; bank: string; app: number; spend: number };
  /** A disruptor big enough to behave like an incumbent (§18.9). */
  RIVAL_GROWS_UP: { rivalId: Id; bank: string; branches: number };
  /** A city opened new storefronts (city growth, CONTENT §3). */
  CITY_GROWTH: { city: Id; lots: number };
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
  PRICE_WAR: { rivalId: Id; bank: string; city: Id; bump: Rate; plusPrice: Money };
  CORPORATE_LOAN: { lenderId: Id; lender: string; amount: Money; rate: Rate };

  // ─── Incidents (incidents.ts) ─────────────────────────────────────────────
  INCIDENT_RAISED: { incidentId: Id; type: string; scope: Id; scopeName: string };
  INCIDENT_RESOLVED: {
    incidentId: Id;
    type: string;
    scope: Id;
    scopeName: string;
    option: string;
    by: 'you' | 'manager' | 'executive' | 'deadline';
    cost: Money;
  };
  REG_FINE: { bank: string; amount: Money; reason: string };
  /** A press angle on an incident with no template of its own (ATM skim denial, viral complaint). */
  INCIDENT_NEWS: { bank: string; type: string; branchName: string; city: Id };
  BREACH: { bank: string; n: number };
  BANK_RUN: { bank: string };
  BANK_RUN_ENDED: { bank: string };
  // ─── Compute (compute.ts, C4c) ───
  COMPUTE_BURST: { bank: string; gpus: number };
  COMPUTE_CRUNCH: { bank: string };
  COMPUTE_CRUNCH_ENDED: { bank: string };
  COMPUTE_OUTAGE: { bank: string };
  RECAP: { bank: string; amount: Money; shares: number };
  // ─── The AI regulator (mandatedPause.ts, C7a) ───
  SAFETY_PAUSE: { bank: string; weeks: number; fee: Money };
  LICENCE_REVOKED: { bank: string; weeks: number };
  LICENCE_RESTORED: { bank: string };

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

  // ─── Power deals at energy sites (powerDeals.ts, C8a) ──────────────────────
  POWER_DEAL_SIGNED: { dealId: Id; siteId: Id; site: string; fee: Money };
  POWER_DEAL_RENEWED: { dealId: Id; site: string; fee: Money };
  POWER_DEAL_ENDED: { dealId: Id; site: string; reason: 'terminated' | 'lapsed' | 'released' };

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
  /** A rival hired away a branch manager (payReviews.ts, §17.1). */
  MANAGER_POACHED: { branchId: Id; branch: string; name: string; rival: string };
  /** The COO's pay review: salaries raised and cut, and the premium over market. */
  PAY_REVIEW: { raised: number; cut: number; premium: number };

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
  /** Your bank bought back and retired its own shares (§19.6a). */
  SHARE_BUYBACK: { bank: string; shares: number; price: Money; cost: Money };
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
    /** Share of the price paid in your new shares (§19.8). */
    stockPct?: number;
  };
  CONVERSION_DONE: { rivalId: Id; bank: string; buyer: string; branches: number };
  /** An accepted offer that could not close (cash or safety tier), or a target gone from the market. */
  MERGER_LAPSED: { rivalId: Id; bank: string; reason: string };
  /** A failed rival's network goes on sale in M&A (rivalQuarter.ts failureCheck, §18.5). */
  DISTRESSED_SALE: { rivalId: Id; bank: string; ask: Money; pb: number; weeks: number; n: number };

  /** A currency moved ≥ FX.newsMove against your home currency this week (fx.ts, §19.10). */
  FX_MOVE: { country: string; currency: string; home: string; pct: number };

  // ─── Travel (Stage 8, travel.ts) ──────────────────────────────────────────
  /** You flew. `mode`: inside the weekly allowance, a paid fare, or your jet. */
  FLIGHT_TAKEN: {
    from: Id;
    to: Id;
    km: number;
    mode: 'free' | 'fare' | 'jet';
    fare: Money;
    /** Part of the fare the bank paid because personal cash was short. */
    bankPaid: Money;
    /** First visit: the city was generated on arrival. */
    firstVisit: boolean;
  };
  JET_BOUGHT: { model: string; price: Money };
  JET_SOLD: { model: string; price: Money };

  // ─── Personal empire (Stage 9; payloads are refined by each system) ───────
  HOME_BOUGHT: { homeId: string; name: string; price: Money };
  HOME_SOLD: { homeId: string; name: string; price: Money };
  HOME_REBUILT: { homeId: string; name: string; value: Money };
  CAR_BOUGHT: { carId: string; name: string; price: Money };
  CAR_SOLD: { carId: string; name: string; price: Money };
  /** A house listed its next sale (auctions.ts); item = the headline lot, week = sale week. */
  AUCTION_PREVIEW: {
    houseId: string;
    house: string;
    itemId: string;
    item: string;
    estimate: Money;
    week: number;
    lots: number;
  };
  /** You won a lot: price = what you paid (hammer + buyer's premium). */
  AUCTION_WON: { houseId: string; house: string; itemId: string; item: string; price: Money };
  /** A lot you bid on went elsewhere: outbid, or you couldn't pay at the sale (price = hammer). */
  AUCTION_LOST: {
    houseId: string;
    house: string;
    itemId: string;
    item: string;
    price: Money;
    reason: 'outbid' | 'cash';
  };
  /** Your consignment sold: price = hammer, proceeds = after the seller's fee. */
  AUCTION_SOLD: {
    houseId: string;
    house: string;
    itemId: string;
    item: string;
    price: Money;
    proceeds: Money;
  };
  /** A hammer well above estimate (AUCTIONS.recordFactor); yours = you bought it. */
  AUCTION_RECORD: {
    houseId: string;
    house: string;
    itemId: string;
    item: string;
    price: Money;
    estimate: Money;
    yours: boolean;
  };
  /** An appraisal reported (auctions.ts); houseId = where the piece was bought. */
  APPRAISAL_DONE: {
    collectibleId: Id;
    houseId: string;
    house: string;
    itemId: string;
    item: string;
    genuine: boolean;
    value: Money;
  };
  CLUB_BOUGHT: {
    clubId: string;
    club: string;
    owner: 'company' | 'personal';
    price: Money;
    league: string;
  };
  CLUB_SOLD: { clubId: string; club: string; price: Money; owner: 'company' | 'personal' };
  CLUB_SEASON: { clubId: string; club: string; league: string; pos: number; record: string };
  KIT_SPONSOR: { clubId: string; club: string; on: boolean };
  /** Arena Naming Rights started at a club you own (CONTENT §11). */
  NAMING_RIGHTS: { clubId: string; cityId: Id };
  /** You signed a star from the transfer market (commands/franchise.ts). */
  CLUB_SIGNED: { clubId: string; club: string; player: string; position: string; fee: Money };
  /** Year end, when you rank (richList.ts). */
  RICH_LIST: {
    rank: number;
    worth: Money;
    entered: boolean;
    prevRank?: number;
    name: string;
    bank: string;
  };
  /** A quarter-end probe into your own-share trades (insider.ts). */
  INSIDER_PROBE_OPENED: { shares: number; side: 'buy' | 'sell'; fine: Money; founder: string };
  /** You paid the probe's fine, settled or after losing the fight (insiderRule.ts). */
  INSIDER_FINED: { founder: string; bank: string; fine: Money; fought: boolean };

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
  /** You bought a building (commands/realEstate.ts); `account` is 'company' or 'personal'. */
  PROPERTY_BOUGHT: { siteId: Id; address: string; price: Money; account: string; cityId: Id };
  /** The seller turned an offer down; no new offer on it until the listings refresh. */
  PROPERTY_OFFER_REJECTED: { siteId: Id; address: string; offer: Money };
  /** A For Sale building of yours sold (realEstate.ts). */
  PROPERTY_SOLD: { siteId: Id; address: string; price: Money; account: string; cityId: Id };

  // ─── Lobbying (lobbying.ts) ───────────────────────────────────────────────
  /** You hired a firm for a campaign (commands/lobbying.ts); scope is the campaign record id. */
  LOBBY_STARTED: { campaignId: string; title: string; firm: string; cost: Money };
  LOBBY_WON: { campaignId: string; title: string; firm: string; country: string };
  LOBBY_LOST: { campaignId: string; title: string; firm: string; country: string };
  /** The Ledger uncovered a campaign, won or lost: `fine` was paid and awareness fell. */
  LOBBY_EXPOSED: {
    campaignId: string;
    title: string;
    firm: string;
    country: string;
    bank: string;
    fine: Money;
  };

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
