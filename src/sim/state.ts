// GameState types (docs/DATA_MODEL.md). Everything here is plain JSON so it
// serializes directly. Stage 1 holds the founder-phase systems; later stages add
// fields with a schemaVersion bump and a migration (src/sim/save/migrations.ts).
import type { BuildSpec } from '../data/equipment';
import type {
  CountryId,
  Difficulty,
  DistrictId,
  Id,
  Money,
  Pct,
  Pentagon,
  Phase,
  Rate,
  RatingCategory,
  Score,
  SegmentMix,
  Stars,
  Tier,
  Week,
} from '../data/types';

export const SCHEMA_VERSION = 3;

export interface GameState {
  schemaVersion: number;
  meta: Meta;
  clock: Clock;
  /** sfc32 state per stream name (SIMULATION §3). */
  rng: Record<string, number[]>;
  settings: Settings;
  world: World;
  company: Company;
  branches: Record<Id, Branch>;
  people: People;
  products: ProductsState;
  underwriting: UnderwritingState;
  treasury: Treasury;
  loanDesk: { applications: Record<Id, LoanApplication>; loans: Record<Id, BusinessLoan> };
  rivals: Record<Id, RivalBank>;
  /** Foreclosed homes per city at recovery value (SIMULATION §21.3; modes arrive in Stage 7). */
  reo: Record<Id, ReoPool>;
  /** Accumulates P&L lines and cash movements since the last weekly close. */
  ledger: Ledger;
  events: { log: GameEvent[]; scheduled: ScheduledEvent[] };
  history: { weekly: WeeklySnapshot[]; quarterly: QuarterReport[] };
  milestones: Record<string, Week>;
  flags: { gameOver?: 'takeover' | 'insolvency' };
  /** Monotonic counter for generated ids. */
  nextId: number;
}

export interface Meta {
  saveName: string;
  bankName: string;
  monogram: string;
  brandInk: string;
  founderName: string;
  founderAvatar: AvatarSpec;
  seed: number;
  startDate: string;
  createdWith: string;
  /** New Game options (schema v2). */
  difficulty: Difficulty;
  /** Rival banks per city, 1–5. */
  competitors: number;
  startCash: number;
}

export interface Clock {
  day: number;
  week: Week;
  speed: 0 | 1 | 2 | 4;
  pausedReason?: string;
}

export interface Settings {
  currency: '$' | 'C$' | '£' | '€' | '¥';
  units: 'km' | 'mi';
  weeklyResults: 'weekly' | 'quarterly' | 'off';
  defaultSpeed: 1 | 2 | 4;
  autoPauseIncidents: boolean;
  autoPauseApplications: boolean;
  sound: boolean;
  reducedMotion: boolean;
  textScale: 1 | 1.15 | 1.3;
  layers: Record<string, boolean>;
}

export interface AvatarSpec {
  head: number;
  hair: number;
  facial: number;
  glasses: number;
  attire: number;
  tone: number;
  shade: number;
}

// ─── World ────────────────────────────────────────────────────────────────────

export interface World {
  currentCityId: Id;
  countries: Partial<Record<CountryId, CountryState>>;
  cities: Record<Id, CityState>;
  lots: Record<Id, Lot>;
}

export interface CountryState {
  id: CountryId;
  phase: Phase;
  weeksInPhase: number;
  /** Annual % growth, % inflation, % unemployment (percent units, SIMULATION §4.4). */
  gdp: number;
  inflation: number;
  unemployment: number;
  hpi: number;
  cre: number;
  policyRate: Rate;
  termPremium: Rate;
  gdpHistory: number[];
  hpiHistory: number[];
  lastDecision?: { week: Week; change: Rate };
  /** FTP rates seen at the previous weekly tick, to detect moves (§5, §13.4). */
  prevFtpShort: Rate;
  prevFtpLong: Rate;
  /** FTP when card APRs last re-priced (§5). */
  cardAnchor: Rate;
  startPolicy: Rate;
  /** Fee products re-price yearly by inflation: price = base × feeIndex. */
  feeIndex: number;
  /** Equity market return this week (feeds wealth AUM until markets arrive). */
  marketReturn: number;
  /** Week a forced recession should start (balance-script option, §4.1). */
  forceRecessionAtWeek?: Week;
}

export interface CityState {
  id: Id;
  generated: boolean;
  /** City brand awareness b (SIMULATION §7). */
  brandAwareness: Pct;
  /** Market reference price m(p, city) per product (§5). */
  marketRef: Record<string, number>;
}

export interface Lot {
  id: Id;
  cityId: Id;
  tile: { x: number; y: number };
  district: DistrictId;
  kind: 'storefront';
  address: string;
  footTraffic: number;
  mix: SegmentMix;
  incomeIndex: number;
  homeownerShare: Pct;
  weeklyRent: Money;
  deposit: Money;
  occupant?: { type: 'player' | 'rival'; id: Id };
  buildingSeed: number;
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  cash: Money;
  paidInCapital: Money;
  /** Cumulative net income (dividends arrive in Stage 6). */
  retainedEarnings: Money;
  sharesOutstanding: number;
  taxPayable: Money;
  taxLossCarry: Money;
  fixedAssets: FixedAsset[];
  /** Lease security deposits held by landlords (an asset). */
  leaseDeposits: Money;
  tier: Tier;
  tierWeeks: number;
  /** Consecutive weeks with corporate cash below zero (insolvency check). */
  negativeCashWeeks: number;
  /** Consecutive weeks with the capital ratio below FAILURE.takeoverCr. */
  lowCapitalWeeks: number;
  capitalRatio: number;
  /** Liquid assets ÷ deposits; null while there are no deposits. */
  liquidityRatio: number | null;
  appRating: Stars;
  riskAppetite: 1 | 2 | 3 | 4 | 5;
  applyRatesToAll: boolean;
  companyPrices: Record<string, number>;
}

export interface FixedAsset {
  id: Id;
  kind: 'fitout' | 'equipment';
  slot: string;
  cost: Money;
  lifeWeeks: number;
  ageWeeks: number;
  ownerId: Id;
}

export interface Branch {
  id: Id;
  cityId: Id;
  lotId: Id;
  name: string;
  builtDay: number;
  openedWeek?: Week;
  status: 'fitout' | 'open' | 'closed';
  build: BuildSpec;
  lease: { weeklyRent: Money; deposit: Money };
  staff: BranchStaff;
  managerId?: Id;
  delegation: Delegation;
  awareness: Pct;
  grandOpeningWeeksLeft: number;
  ratings: Ratings;
  reviewCards: ReviewCard[];
  offered: Record<string, { on: boolean; price: number }>;
  books: Record<string, Book>;
  campaigns: Record<string, number>;
  signupChurn: { mult: number; weeksLeft: number; weeksTotal: number };
  customers: number;
  waitIndex: number;
  capacity: number;
  /** Load and service figures from the last tick, for the UI. */
  last: { prospects: number; captured: number; served: number; share: number };
  pnl: BranchPnl[];
  /** Loan Desk outcomes for the current week (schema v3). */
  desk: DeskWeek;
}

export interface BranchStaff {
  count: number;
  target: number;
  wage: number;
  skill: Score;
  morale: Score;
  quitAccumulator: number;
}

export interface Delegation {
  staffing: boolean;
  products: boolean;
  marketing: boolean;
  troubles: boolean;
  loans: boolean;
}

export interface Ratings {
  rates: Stars;
  products: Stars;
  service: Stars;
  branch: Stars;
  overall: Stars;
  reviewCount: number;
}

/** Loan Desk outcomes in one week; reset when the week changes. */
export interface DeskWeek {
  week: Week;
  approved: number;
  /** Offers the business turned down. */
  refused: number;
  declined: number;
  expired: number;
}

export interface Book {
  accounts: number;
  balance: Money;
  bookRate: Rate;
  pd: Rate;
  lgd: Pct;
  last: {
    newAccounts: number;
    newVolume: Money;
    deltaAccounts: number;
    churned: number;
    defaulted: Money;
  };
}

export type BranchPnlLine =
  | 'loanInterest'
  | 'fundingCredit'
  | 'fees'
  | 'wealthServices'
  | 'depositInterest'
  | 'fundingCharge'
  | 'losses'
  | 'staff'
  | 'manager'
  | 'rent'
  | 'marketing'
  | 'equipment'
  | 'servicing'
  | 'overhead';

export interface BranchPnl {
  week: Week;
  revenue: Money;
  income: Money;
  lines: Record<BranchPnlLine, Money>;
}

export interface ReviewCard {
  week: Week;
  category: RatingCategory;
  stars: number;
  text: string;
  portraitSeed: number;
}

// ─── People, products, underwriting ───────────────────────────────────────────

export interface People {
  managers: Record<Id, Manager>;
  /** Candidate pool per city; refreshes every 4 weeks (SIMULATION §6.5). */
  managerCandidates: Record<Id, Manager[]>;
  candidatesRefreshWeek: Record<Id, Week>;
}

export interface Manager {
  id: Id;
  name: string;
  portrait: AvatarSpec;
  skills: { people: Score; product: Score; marketing: Score; ethics: Score };
  salary: Money;
  sinceWeek: Week;
  branchId?: Id;
}

export interface ProductsState {
  catalog: Record<Id, { id: Id; stars: Stars; developed: boolean }>;
}

export interface UnderwritingModel {
  id: Id;
  name: string;
  source: 'bureau' | 'custom';
  mix: Record<string, number>;
  /** Accuracy, Speed, Inclusion, FraudShield, Fairness (1–10). */
  radar: Pentagon;
  costPerApp: Money;
}

export interface UnderwritingState {
  activeModelId: Id;
  models: Record<Id, UnderwritingModel>;
  loansBooked: number;
}

// ─── Treasury, Loan Desk ──────────────────────────────────────────────────────

export interface Treasury {
  reserves: Money;
  bondsMarket: Money;
  bondsBook: Money;
  bondBookYield: Rate;
  liqTarget: Pct;
  bondShare: Pct;
  autoFunding: boolean;
  freeze: boolean;
  overnight: Money;
  window: Money;
  windowStigmaWeeks: number;
}

/** Pentagon order: Management, Track record, Market, Competitiveness, Financial health. */
export interface LoanApplication {
  id: Id;
  branchId: Id;
  business: string;
  sector: string;
  amount: Money;
  termWeeks: number;
  collateral: 'none' | 'partial' | 'full';
  maxRate: Rate;
  pentagon: Pentagon;
  /** Hidden PD before the credit cycle multiplier. */
  hiddenPd: Rate;
  lgd: Pct;
  /** Noisy estimate shown as a risk band when visible (§11). */
  estPd: Rate;
  createdWeek: Week;
  expiresWeek: Week;
}

export interface BusinessLoan {
  id: Id;
  branchId: Id;
  business: string;
  sector: string;
  principal: Money;
  balance: Money;
  rate: Rate;
  /** PD before the credit cycle multiplier. */
  pd: Rate;
  lgd: Pct;
  termWeeks: number;
  weeksLeft: number;
  payment: Money;
  status: 'current' | 'defaulted' | 'repaid';
}

// ─── Rivals, REO ──────────────────────────────────────────────────────────────

export interface RivalBank {
  id: Id;
  name: string;
  strategy: 'incumbent' | 'disruptor' | 'premium' | 'community';
  ink: string;
  monogram: string;
  cities: Id[];
  branches: RivalBranch[];
  /** One rate sheet per rival (all its branches share it). */
  prices: Record<string, number>;
  /** Pending deposit-beta / loan pass-through moves (§5). */
  priceLags: Record<string, { target: number; weeksLeft: number }>;
  appRating: Stars;
  status: 'active' | 'distressed' | 'seized' | 'acquired';
}

export interface RivalBranch {
  id: Id;
  cityId: Id;
  lotId: Id;
  openedWeek: Week;
  /** Rates, Products, Service, Branch. */
  quality: [Stars, Stars, Stars, Stars];
  overall: Stars;
  reviewCount: number;
}

export interface ReoPool {
  units: number;
  value: Money;
}

// ─── Ledger, events, history ──────────────────────────────────────────────────

export type PnlLine =
  | 'loanInterest'
  | 'reserveInterest'
  | 'bondCoupon'
  | 'depositInterest'
  | 'wholesaleInterest'
  | 'accountFees'
  | 'cardFees'
  | 'wealthFees'
  | 'serviceFees'
  | 'atmFees'
  | 'originationFees'
  | 'realizedGains'
  | 'branchStaff'
  | 'managers'
  | 'rent'
  | 'marketing'
  | 'equipment'
  | 'overhead'
  | 'servicing'
  | 'underwriting'
  | 'fines'
  | 'loanLosses'
  | 'depreciation'
  | 'tax';

export type CashCategory = 'ops' | 'investing' | 'financing';

export interface Ledger {
  pnl: Record<PnlLine, Money>;
  cash: Record<CashCategory, Money>;
}

export interface GameEvent {
  week: Week;
  type: string;
  scope?: Id;
  payload: Record<string, unknown>;
  priority: number;
}

export interface ScheduledEvent {
  day: number;
  type: 'fitoutDone';
  payload: { branchId: Id };
}

export interface WeeklySnapshot {
  week: Week;
  revenue: Money;
  netIncome: Money;
  netRevenue: Money;
  cashFlow: { ops: Money; investing: Money; financing: Money; net: Money };
  totals: {
    assets: Money;
    deposits: Money;
    loans: Money;
    equity: Money;
    rwa: Money;
    liquid: Money;
    taxPayable: Money;
  };
  pnl: Record<PnlLine, Money>;
  capitalRatio: number;
  tier: Tier;
}

export interface QuarterReport {
  /** Last week included in this quarter. */
  endWeek: Week;
  year: number;
  q: 1 | 2 | 3 | 4;
  revenue: Money;
  netIncome: Money;
  eps: number;
  roe: number;
}
