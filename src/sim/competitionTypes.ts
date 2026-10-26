// Stage 5 state types (schema v6): payroll and student partnerships, corporate
// debt from rival banks, incidents with their timed effects, The Weekly Ledger's
// issues and the price-war tracker. Re-exported from state.ts; kept here so
// state.ts stays readable. See docs/DATA_MODEL.md §6 and §8.
import type { CountryId, Id, Money, Rate, Week } from '../data/types';

// ─── Partnerships (SIMULATION §13.7) ──────────────────────────────────────────

export interface Partnership {
  id: Id;
  /** Employer or university site. */
  siteId: Id;
  /** Payroll accounts for an employer's staff, or student accounts at a university. */
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

/** A university's graduate program you pay for yearly (DESIGN §5.8.10). */
export interface GradProgram {
  siteId: Id;
  startWeek: Week;
  /** The next yearly fee falls due this week. */
  renewWeek: Week;
}

// ─── Corporate debt from rival banks (SIMULATION §19.9) ───────────────────────

export interface CorporateLoan {
  id: Id;
  /** Rival bank id. */
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
  lenderId: Id;
  amount: Money;
  rate: Rate;
  termWeeks: number;
  payment: Money;
  expiresWeek: Week;
}

export interface CreditLine {
  lenderId: Id;
  drawn: Money;
  rate: Rate;
}

export interface CorporateDebt {
  loans: Record<Id, CorporateLoan>;
  /** Lines of credit by lender (limit = 20% of equity, computed live). */
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
  /** Rival bank holding the payroll today, if any. */
  partnerRivalId?: Id;
}
