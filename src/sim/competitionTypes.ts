// Stage 5 state types (schema v6): payroll and student partnerships, corporate
// debt from rival banks, incidents with their timed effects, The Daily Ledger's
// issues and the price-war tracker. Re-exported from state.ts; kept here so
// state.ts stays readable. See docs/DATA_MODEL.md §6 and §8.
import type { Id, Money, Rate, Week } from '../data/types';

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
  /** Signing fee paid (an intangible asset amortized over the term). */
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

// ─── The Daily Ledger (SIMULATION §24) ────────────────────────────────────────

export type LedgerTab = 'banking' | 'business' | 'markets' | 'politics' | 'sports';

export interface LedgerArticle {
  id: string;
  tab: LedgerTab;
  /** Icon vignette id (src/app/weekly/ledgerIcons.tsx). */
  icon: string;
  headline: string;
  body: string;
  /** Higher leads the front page; Top shows the six highest. */
  priority: number;
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
