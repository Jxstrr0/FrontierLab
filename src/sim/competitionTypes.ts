// Stage 5 state types (schema v6): student partnerships, corporate
// debt from rival banks, incidents with their timed effects, The Weekly Ledger's
// issues and the price-war tracker. Re-exported from state.ts; kept here so
// state.ts stays readable. See docs/DATA_MODEL.md §6 and §8.
import type { CountryId, Id, Money, Pentagon, Rate, Week } from '../data/types';

// ─── Partnerships (SIMULATION §13.7) ──────────────────────────────────────────

export interface Partnership {
  id: Id;
  /** Employer or university site. */
  siteId: Id;
  /**
   * Student seats at a university. `payroll` (an employer's staff plans) was
   * retired at schema 32; it survives only on a deal running off from an old save.
   */
  kind: 'payroll' | 'student';
  hostBranchId: Id;
  /** The deposit product offered as the package. */
  productId: string;
  startWeek: Week;
  termWeeks: number;
  /** Total fees paid: the signing fee plus any renewals (an intangible asset amortized over the term). */
  fee: Money;
  /** Fee not yet amortized: the intangible asset on the balance sheet. */
  unamortized: Money;
  /** The partnership's own deposit mini-book. */
  balance: Money;
  accounts: number;
  /** 0–100. */
  health: number;
  /** Consecutive weeks with health under the termination line. */
  lowHealthWeeks: number;
  status: 'active' | 'runoff';
  /** Weeks left while the balance runs off after termination or lapse. */
  runoffWeeksLeft?: number;
}

// ─── Power deals at energy sites (stage C8a, SIMULATION §13.7a) ─────────────────

/** A data-centre and power deal: owned capacity and cheaper power over a long contract. */
export interface PowerDeal {
  id: Id;
  /** The regional energy site. */
  siteId: Id;
  startWeek: Week;
  termWeeks: number;
  /** Total fees paid: the signing fee plus renewals (an intangible amortized over the term). */
  fee: Money;
  /** Fee not yet amortized. */
  unamortized: Money;
  /** Contracted GPUs this week; they join the compute pool. */
  gpus: number;
  /** Take-or-pay price per contracted GPU-week, fixed at signing. */
  price: Money;
  /** 0–100. */
  health: number;
  lowHealthWeeks: number;
  status: 'active' | 'runoff';
  runoffWeeksLeft?: number;
}

/** A university's graduate program you pay for yearly (DESIGN §5.8.10). */
export interface GradProgram {
  siteId: Id;
  startWeek: Week;
  /** The next yearly fee falls due this week. */
  renewWeek: Week;
}

// ─── Corporate debt from investment banks (SIMULATION §19.9) ──────────────────

export interface CorporateLoan {
  id: Id;
  /** Investment bank site id (older saves may hold a rival lab id). */
  lenderId: Id;
  principal: Money;
  balance: Money;
  rate: Rate;
  termWeeks: number;
  weeksLeft: number;
  /** Weekly amortized payment. */
  payment: Money;
  startWeek: Week;
}

export interface CorporateLoanOffer {
  id: Id;
  /** Investment bank site id. */
  lenderId: Id;
  amount: Money;
  rate: Rate;
  termWeeks: number;
  payment: Money;
  expiresWeek: Week;
}

export interface CreditLine {
  /** Investment bank site id (older saves may hold a rival lab id). */
  lenderId: Id;
  drawn: Money;
  rate: Rate;
}

export interface CorporateDebt {
  loans: Record<Id, CorporateLoan>;
  /** Lines of credit by lender (limit = CORPORATE_LENDING.lineEquityShare of equity, computed live). */
  lines: Record<Id, CreditLine>;
  offers: CorporateLoanOffer[];
  offersRefreshWeek: Week;
}

// ─── Incidents (SIMULATION §23, CONTENT §22) ──────────────────────────────────

export type IncidentScopeKind = 'branch' | 'city' | 'company' | 'personal';

export interface IncidentOption {
  id: string;
  label: string;
  /** Up-front cost shown on the button (0 for none). */
  cost: Money;
  /** One-line effect preview. */
  effect: string;
}

export interface Incident {
  id: Id;
  /** Incident id from CONTENT §22, e.g. 'ROBBERY'. */
  type: string;
  scopeKind: IncidentScopeKind;
  /** Branch id, city id, 'company' or 'personal'. */
  scope: Id;
  createdWeek: Week;
  /** Unresolved by this week: the worst option is chosen (§23). */
  deadlineWeek: Week;
  /** Amounts rolled when the incident was raised (losses, fines, affected customers…). */
  data: Record<string, number | string>;
  options: IncidentOption[];
}

/** A modifier left behind by an incident choice, active until `untilWeek`. */
export interface TimedEffect {
  /** What it changes, e.g. 'rating', 'incidentP', 'closed', 'takeup', 'savingsBoost', 'riskCoverage', 'awareness'. */
  kind: string;
  /** Branch id, city id or 'company'. */
  scope: Id;
  /** Sub-target, e.g. the rating category or incident type. */
  target?: string;
  value: number;
  untilWeek: Week;
}

export interface IncidentsState {
  active: Incident[];
  /** Earliest week each `${type}:${scope}` may fire again. */
  cooldowns: Record<string, Week>;
  effects: TimedEffect[];
  /** Weeks left in a bank run (§13.8), absent when none. */
  bankRunWeeksLeft?: number;
  /** Emergency recapitalisation offer state (§15). */
  recap?: { offeredWeek: Week; declined?: boolean; acceptedWeek?: Week };
}

// ─── The Weekly Ledger (SIMULATION §24) ────────────────────────────────────────

export type LedgerTab = 'world' | 'banking' | 'business' | 'markets' | 'politics' | 'sports';

export interface LedgerArticle {
  id: string;
  tab: LedgerTab;
  /** Icon vignette id (src/app/weekly/ledgerIcons.tsx). */
  icon: string;
  headline: string;
  body: string;
  /** Higher leads the front page; Top shows the six highest. */
  priority: number;
  /** `${template}:${subject}#${variant}`, so tests can check no repeats (optional, Stage 5). */
  ref?: string;
}

export interface LedgerIssue {
  week: Week;
  /** ISO date of the issue. */
  date: string;
  articles: LedgerArticle[];
}

export interface NewsState {
  /** The last 52 issues, oldest first. */
  issues: LedgerIssue[];
  /** Template used for each subject (`${type}:${subject}`) in its latest issue, so it never repeats next week. */
  lastTemplate: Record<string, { week: Week; idx: number }>;
  /** The news desk's memory: politics, sports seasons, polls, rankings (optional, created on first issue). */
  desk?: NewsDesk;
}

/** A bill before a country's lawmakers (§24 Politics). */
export interface PolicyProposal {
  country: CountryId;
  /** Policy id in src/data/newsWorld.ts. */
  policyId: string;
  party: string;
  voteWeek: Week;
}

export interface NewsDesk {
  /** Events of `week` already reported: the first `count` in log order. Later ones arrived mid-week. */
  cursor?: { week: Week; count: number };
  proposals: PolicyProposal[];
  /** Season records per league and club: [won, drawn, lost]. */
  seasons: Record<string, Record<string, [number, number, number]>>;
  /** Poll shares (percent) per country, by party index. */
  polls: Partial<Record<CountryId, number[]>>;
  /** Total assets per bank ('you' for yours) when the ranking year began. */
  assetMarks: Record<Id, Money>;
  /** World desk (§24.1): week each `${beat}:${country}` last ran, for its cooldown. */
  worldRecent: Record<string, Week>;
  /** Elections (§24 Politics): each country's governing party (index in PARTIES) and next vote. */
  elections: Partial<Record<CountryId, { governing: number; nextWeek: Week }>>;
  /** World calendar (§24.6): stories already written for a coming week (a tournament's rounds, an expo's close). */
  scheduled: ScheduledStory[];
  /** Commodities (§24.4): weekly prices per commodity id, newest last, at most a year and a week. */
  commodities: Record<string, number[]>;
  /** From the archive (§24.5): every fourth issue's lead story, kept for good. */
  archive: ArchivedStory[];
}

/** A Ledger story written ahead for `week` (fields as a news Story). */
export interface ScheduledStory {
  week: Week;
  key: string;
  subject: string;
  tab: LedgerTab;
  icon: string;
  priority: number;
  group?: string;
  tokens: Record<string, string>;
}

export interface ArchivedStory {
  week: Week;
  /** ISO date of the issue. */
  date: string;
  tab: LedgerTab;
  icon: string;
  headline: string;
  body: string;
  /** Set once the story has been reprinted, so it runs again at most once. */
  reprinted?: boolean;
}

// ─── Competition tracker ──────────────────────────────────────────────────────

export interface CompetitionState {
  /** Weeks in a row your Rates rating in each city has been ≥ 4.0 (§18.6). */
  ratesStreak: Record<Id, number>;
}

/** Employer details on an employer or university site (CONTENT §14). */
export interface EmployerInfo {
  /** Employer type id in src/data/employers.ts. */
  type: string;
  name: string;
  employees: number;
  incomeMult: number;
  /** Rival that holds this employer's anchor account when the city is seeded (C5a). */
  partnerRivalId?: Id;
}

/** Business size (stage C5a): anchors are the city's major employers. */
export type BusinessSize = 'small' | 'mid' | 'large' | 'anchor';

/**
 * A customer business (stage C5a, SIMULATION §11.0): on a spare storefront
 * (`lotId`) or, for anchors, an employer site (`siteId`). Pentagon order:
 * AI readiness, Budget, Data sensitivity, Switching cost, Financial health.
 */
export interface Business {
  id: Id;
  cityId: Id;
  name: string;
  /** Sector id in src/data/dealSectors.ts ('anchor' for employers). */
  sector: string;
  size: BusinessSize;
  lotId?: Id;
  siteId?: Id;
  pentagon: Pentagon;
  /** Yearly AI budget in money of the week it was set. */
  budget: Money;
  /**
   * Who serves it today: one of your sales offices (`id` is the office id) or a
   * rival lab. None while it has no AI vendor.
   */
  vendor?: { type: 'player' | 'rival'; id: Id };
  /** Yearly value of its current contract. */
  contractValue?: Money;
  /** The quarter-start week its contract comes up for renewal. */
  renewalWeek?: Week;
  /** The week your contract with it began (C5b). */
  startWeek?: Week;
  /** It won't ask you for a proposal again before this week (C5b). */
  quietUntil?: Week;
}

/**
 * A request for proposal on the Deal Desk (stage C5b, SIMULATION §11): a new
 * one from a business without an AI vendor (bid now), or a renewal due at the
 * next quarter start (set an offer; it is settled in the renewal season).
 */
/**
 * A public-sector tender (SIMULATION §11.7, owner's review A4): a city's public
 * body asks for sealed bids, awards one long contract, and drops a lab the
 * regulator restricts.
 */
export interface Tender {
  id: Id;
  /** The public body, e.g. "Calgary Transit Commission". */
  name: string;
  /** Its PUBLIC_BODIES row (icon and wording). */
  bodyId: string;
  cityId: Id;
  /** Your sales office in the city that bids for it and earns it. */
  branchId: Id;
  /** Yearly budget: the contract's value at no discount. */
  budget: Money;
  termWeeks: number;
  status: 'open' | 'active';
  openWeek: Week;
  /** Open: the week bids close and the award is made. */
  closeWeek: Week;
  /** Open: your sealed bid as a discount off the budget (none = not bidding). */
  bid?: number;
  /** Active: the yearly value you won it at, and the week it ends. */
  value?: Money;
  endWeek?: Week;
}

export interface Rfp {
  id: Id;
  /** Your sales office in the business's city. */
  branchId: Id;
  businessId: Id;
  kind: 'new' | 'renewal';
  createdWeek: Week;
  /** New: the last week to bid. Renewal: the quarter-start week it is settled. */
  dueWeek: Week;
  /** Renewals: your offered discount off the business's budget (none = no bid on a rival's contract). */
  offer?: number;
}
