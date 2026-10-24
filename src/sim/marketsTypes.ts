// Stage 6 state types (schema v7): executives and their equity grants, the
// board and dividends, your bank's shares (cap table, private valuation or
// market price, placements, IPO), the stock market with company and personal
// holdings, the personal account and rival M&A. Re-exported from state.ts.
// See docs/DATA_MODEL.md §7, §8 and SIMULATION §17.2, §19.
import type { Id, Money, Rate, Score, Week } from '../data/types';
import type { AvatarSpec } from './state';

// ─── Executives (SIMULATION §17.2) ────────────────────────────────────────────

/** The six hired seats; the CEO seat is you. */
export type ExecSeat = 'coo' | 'cfo' | 'cpo' | 'cmo' | 'cto' | 'cro';

/** A stock option or RSU grant vesting yearly over four years (SCREENS §10.1). */
export interface EquityGrant {
  id: Id;
  type: 'option' | 'rsu';
  shares: number;
  /** Exercise price per share (options only; 0 for RSUs). */
  strike: Money;
  grantWeek: Week;
  /** Shares vested so far. */
  vested: number;
  /** Grant-date value per share, expensed straight-line over the vesting period. */
  fairValue: Money;
}

export interface Executive {
  id: Id;
  seat: ExecSeat;
  name: string;
  portrait: AvatarSpec;
  leadership: Score;
  expertise: Score;
  loyalty: Score;
  /** Annual salary. */
  salary: Money;
  hiredWeek: Week;
  /** Delegation toggles by id (src/data/executives.ts). */
  delegations: Record<string, boolean>;
  grants: EquityGrant[];
}

export interface ExecutivesState {
  seats: Partial<Record<ExecSeat, Executive>>;
  /** Candidates per seat; the pool refreshes every few weeks (§17.2). */
  candidates: Partial<Record<ExecSeat, Executive[]>>;
  candidatesRefreshWeek: Week;
}

// ─── Board and dividends (DESIGN §5.13, SCREENS §10.2) ────────────────────────

export interface BoardVote {
  /** The proposed value (dividend per share or CEO salary). */
  proposed: Money;
  /** Share of votes for, 0–1. */
  forShare: number;
  passed: boolean;
}

export interface BoardMeeting {
  week: Week;
  /** Quarter label, e.g. "2027 Q2". */
  quarter: string;
  dividend: BoardVote;
  salary: BoardVote;
}

export interface Governance {
  /** Your annual CEO salary, paid into personal cash weekly (§22). */
  ceoSalary: Money;
  /** The last dividend per share the board approved (0 if none). */
  dividendPerShare: Money;
  /** Quarter label of the last meeting held; one meeting per quarter. */
  lastBoardQuarter?: string;
  lastBoardWeek?: Week;
  /** A declared dividend waiting to be paid (a liability until then). */
  pendingDividend?: { perShare: Money; total: Money; declaredWeek: Week; payWeek: Week };
  /** Last 8 meetings, oldest first. */
  meetings: BoardMeeting[];
}

// ─── Your shares (SIMULATION §19.2–19.6) ──────────────────────────────────────

export interface Shareholder {
  id: Id;
  name: string;
  kind: 'founder' | 'fund' | 'public' | 'executive' | 'regulator';
  shares: number;
}

export interface Placement {
  week: Week;
  shares: number;
  price: Money;
  investor: string;
  /** Capital raised after fees. */
  raised: Money;
}

/** An IPO launched and waiting to list at the next quarter-end tick (§19.4). */
export interface PendingIpo {
  bankId: string;
  floatPct: number;
  shares: number;
  price: Money;
  fee: Rate;
  launchedWeek: Week;
}

export interface OwnStock {
  status: 'private' | 'public';
  ticker?: string;
  exchange?: string;
  /** Market price while public; private valuation per share while private. */
  price: Money;
  /** Weekly closes (or valuations), oldest first. */
  history: number[];
  high52: Money;
  low52: Money;
  /** Mean-reverting sentiment multiplier around 1 (§19.5). */
  sentiment: number;
  /** The cap table; shares sum to company.sharesOutstanding. */
  holders: Shareholder[];
  placements: Placement[];
  ipo?: PendingIpo;
  listedWeek?: Week;
  /** Price the IPO was offered at, for the listing story. */
  ipoPrice?: Money;
  /** Why the last pending IPO was withdrawn at listing (shown on the Equity tab). */
  ipoWithdrawn?: { week: Week; reason: string };
  /** Market step's event cursor: events of `week` already read (§19.5 shocks). */
  scan?: { week: Week; count: number };
}

// ─── Stock market (SIMULATION §19.1, §19.7) ───────────────────────────────────

export type Sector = 'banking' | 'technology' | 'energy' | 'auto' | 'retail' | 'realEstate';

export interface ListedCompany {
  id: Id;
  ticker: string;
  name: string;
  sector: Sector;
  exchange: string;
  price: Money;
  shares: number;
  /** Trailing annual EPS. */
  eps: number;
  growth: number;
  vol: number;
  beta: number;
  divYield: number;
  history: number[];
  high52: Money;
  low52: Money;
  topHolders: { name: string; pct: number }[];
}

export interface Holding {
  shares: number;
  avgCost: Money;
}

/** Holdings are keyed by listed company id, rival bank id, or 'self' (your own bank, personal only). */
export interface MarketState {
  companies: Record<Id, ListedCompany>;
  /** Cap-weighted index of every listed company, 1000 at the start. */
  index: number;
  indexHistory: number[];
  /** This week's shared market shock (§19.1). */
  shock: number;
  holdings: { company: Record<Id, Holding>; personal: Record<Id, Holding> };
}

/** The founder's own money (§22). Homes, cars and the rest arrive in Stage 9. */
export interface PersonalState {
  cash: Money;
}

// ─── Rival M&A (SIMULATION §19.8) ─────────────────────────────────────────────

export interface MergerOffer {
  id: Id;
  rivalId: Id;
  pricePerShare: Money;
  total: Money;
  premium: number;
  madeWeek: Week;
  /** The answer arrives at this week's tick. */
  respondWeek: Week;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  distressed: boolean;
  /** Why it was blocked or rejected, for the UI. */
  reason?: string;
}

/** Acquired branches converting to your brand (§19.8). */
export interface Integration {
  rivalId: Id;
  name: string;
  branchIds: Id[];
  startWeek: Week;
  weeksLeft: number;
}

export interface DealRecord {
  rivalId: Id;
  name: string;
  week: Week;
  price: Money;
  goodwill: Money;
  branches: number;
  distressed: boolean;
}

export interface MergersState {
  offers: MergerOffer[];
  integrations: Integration[];
  deals: DealRecord[];
}

/** While an acquired branch converts: the old brand it still wears (§19.8). */
export interface BranchConversion {
  rivalId: Id;
  name: string;
  ink: string;
  monogram: string;
  weeksLeft: number;
}
