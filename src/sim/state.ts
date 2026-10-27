// GameState types (docs/DATA_MODEL.md). Everything here is plain JSON so it
// serializes directly. Stage 1 holds the founder-phase systems; later stages add
// fields with a schemaVersion bump and a migration (src/sim/save/migrations.ts).
import type { LayoutVersion } from '../config/cityGeo';
import type { BuildSpec } from '../data/equipment';
import type {
  CountryId,
  DeptId,
  Difficulty,
  DistrictId,
  Id,
  Money,
  Pct,
  Pentagon,
  HqDeptId,
  HouseStyle,
  LogoShape,
  Phase,
  Rate,
  RatingCategory,
  Score,
  SegmentMix,
  Stars,
  Tier,
  Week,
} from '../data/types';
import type {
  CompetitionState,
  CorporateDebt,
  EmployerInfo,
  GradProgram,
  IncidentsState,
  NewsState,
  Partnership,
} from './competitionTypes';
import type {
  BranchConversion,
  ExecutivesState,
  Governance,
  MarketState,
  MergersState,
  OwnStock,
  PersonalState,
} from './marketsTypes';
import type {
  ConventionsState,
  FxState,
  LobbyingState,
  RealEstateState,
  VenturesState,
} from './investmentsTypes';
export type * from './competitionTypes';
export type * from './marketsTypes';
export type * from './investmentsTypes';
export type * from './personalTypes';
import type { AuctionHouseState, ClubState } from './personalTypes';

export const SCHEMA_VERSION = 10;

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
  /** Your data centers (stage C2c, SIMULATION §9.9; schema 4). */
  dataCenters: Record<Id, DataCenter>;
  /** The compute pool and the chip cycle (C4a). */
  compute: ComputeState;
  /** Leased HQ offices (Stage 4, SIMULATION §16.1). */
  offices: Record<Id, Office>;
  /** HQ departments that have at least one floor (§16.2). */
  departments: Partial<Record<DeptId, Department>>;
  /** Coverage of every HQ department, recomputed each week (§16.3–16.4). */
  hq: HqState;
  people: People;
  products: ProductsState;
  underwriting: UnderwritingState;
  treasury: Treasury;
  loanDesk: { applications: Record<Id, LoanApplication>; loans: Record<Id, BusinessLoan> };
  rivals: Record<Id, RivalBank>;
  /** HQ brand campaigns and agency packages (§16.10). */
  marketing: MarketingState;
  /** Risk floor records: weekly losses by product and regulator reviews (§15, §16). */
  risk: RiskState;
  /** Payroll and student partnerships (Stage 5, SIMULATION §13.7). */
  partnerships: Record<Id, Partnership>;
  /** Business loans and lines of credit from rival banks (§19.9). */
  corporateDebt: CorporateDebt;
  /** Open incidents, cooldowns and timed effects (§23). */
  incidents: IncidentsState;
  /** The Weekly Ledger archive (§24). */
  news: NewsState;
  /** Price-war tracking (§18.6). */
  competition: CompetitionState;
  /** Senior executives and candidate pools (Stage 6, SIMULATION §17.2). */
  executives: ExecutivesState;
  /** Board meetings, CEO pay and dividends (DESIGN §5.13). */
  governance: Governance;
  /** Your bank's shares: cap table, valuation or price, placements, IPO (§19.2–19.6). */
  stock: OwnStock;
  /** Listed companies, the index and holdings (§19.1, §19.7). */
  market: MarketState;
  /** The founder's own money (§22). */
  personal: PersonalState;
  /** Rival M&A offers, integrations and completed deals (§19.8). */
  mergers: MergersState;
  /** Foreclosed homes per city (SIMULATION §21.3): value tracks house prices; hold, rent or sell. */
  /** Startups, the Investment floor pipeline and venture debt (Stage 7, SIMULATION §20). */
  ventures: VenturesState;
  /** This year's and next year's convention runs (CONTENT §19). */
  conventions: ConventionsState;
  /** Owned buildings and buildings for sale (§21.1–21.2, §21.4). */
  realEstate: RealEstateState;
  /** Lobbying campaigns and their effects (DESIGN §5.8.10). */
  lobbying: LobbyingState;
  /** Currency strength levels and positions (SIMULATION §19.10). */
  fx: FxState;
  /** Auction houses' sales by house id (Stage 9, SIMULATION §22). */
  auctions: Record<Id, AuctionHouseState>;
  /** Every sports club by club id, yours or not (SCREENS §20). */
  clubs: Record<Id, ClubState>;
  /** Accumulates P&L lines and cash movements since the last weekly close. */
  ledger: Ledger;
  events: { log: GameEvent[]; scheduled: ScheduledEvent[] };
  history: { weekly: WeeklySnapshot[]; quarterly: QuarterReport[] };
  milestones: Record<string, Week>;
  /**
   * `tutorialStep` (Stage 10): undefined = never offered, 0 = offer prompt,
   * 1–9 = the SCREENS §27.1 steps, 10 = closing card, 11 = finished or skipped
   * (src/data/tutorial.ts; 1–7, 8 and 9 before schema v24).
   * `lesson`: the Part 2 guide in progress (SCREENS §27.2) and its step.
   * `lessonsDone`: guides and first-look tips already seen (schema v24).
   */
  flags: {
    gameOver?: 'takeover' | 'insolvency';
    tutorialStep?: number;
    lesson?: { id: string; step: number };
    lessonsDone: string[];
  };
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
  /** The start city (schema v9): the bank's domicile — home central bank, tax, exchange. */
  homeCityId: Id;
  /** The look every branch front shares (schema v19), chosen at New Game. */
  houseStyle: HouseStyle;
  /** The outline of the bank's mark (schema v20), chosen at New Game. */
  logoShape: LogoShape;
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
  /** How often the results modal opens: every week, every month, every quarter or never. */
  weeklyResults: 'weekly' | 'monthly' | 'quarterly' | 'off';
  defaultSpeed: 1 | 2 | 4;
  autoPauseIncidents: boolean;
  autoPauseApplications: boolean;
  sound: boolean;
  reducedMotion: boolean;
  textScale: 1 | 1.15 | 1.3;
  layers: Record<string, boolean>;
  /** The HQ bottom tabs in the order you arranged them (schema v22); departments not listed follow in DEPT_ORDER. */
  hqTabOrder: DeptId[];
  /** Part 2 of the tutorial: guides for new mechanics and first-look tips (schema v24). */
  guides: boolean;
}

export interface AvatarSpec {
  head: number;
  hair: number;
  facial: number;
  glasses: number;
  attire: number;
  tone: number;
  shade: number;
  /** Face detail (schema v21): eye shape, brows, mouth and age lines. */
  eyes: number;
  brows: number;
  mouth: number;
  age: number;
}

// ─── World ────────────────────────────────────────────────────────────────────

export interface World {
  currentCityId: Id;
  countries: Partial<Record<CountryId, CountryState>>;
  cities: Record<Id, CityState>;
  lots: Record<Id, Lot>;
  /** Office buildings for lease (Stage 4). */
  officeListings: Record<Id, OfficeListing>;
  /** Credit bureaus, marketing agencies and other non-bank buildings on the map. */
  sites: Record<Id, Site>;
  /** Flying (Stage 8, DESIGN §5.17): the weekly allowance and lifetime totals. */
  travel: TravelState;
}

export interface TravelState {
  /** Free km flown since the last weekly tick (TRAVEL_KM_PER_WEEK allowance). */
  kmThisWeek: number;
  totalKm: number;
  flights: number;
  /** Fares paid, lifetime (personal and bank share together). */
  faresPaid: Money;
}

export interface OfficeListing {
  id: Id;
  cityId: Id;
  tile: { x: number; y: number };
  district: DistrictId;
  address: string;
  floors: number;
  desksPerFloor: 24 | 32;
  /** Floor area in m². */
  area: number;
  weeklyRent: Money;
  deposit: Money;
  buildingSeed: number;
  /** Set while you lease it. */
  officeId?: Id;
}

export type SiteKind =
  | 'bureau'
  | 'agency'
  | 'rivalHq'
  | 'employer'
  | 'university'
  | 'investmentBank'
  | 'property'
  | 'conventionCenter'
  | 'lobbyingFirm'
  | 'autoDealer'
  | 'auctionHouse'
  | 'vacationHome';

export interface Site {
  id: Id;
  cityId: Id;
  kind: SiteKind;
  /**
   * Bureau name, agency id, rival bank id, employer/university name, investment
   * bank id, lobbying firm id, convention centre name, or the property's own id.
   */
  refId: string;
  /** Employer details on employer and university sites (Stage 5). */
  employer?: EmployerInfo;
  /** Building details on property sites (Stage 7, SIMULATION §21.1). */
  property?: {
    sqm: number;
    floors: number;
    /** Occupancy while nobody in the game owns it; set at its first listing and when you sell it. */
    occupancy?: Pct;
  };
  tile: { x: number; y: number };
  district: DistrictId;
  address: string;
  buildingSeed: number;
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
  /** Fee products re-price yearly with the economy's nominal growth (§4.6): price = base × feeIndex. */
  feeIndex: number;
  /** Equity market return this week (feeds wealth AUM until markets arrive). */
  marketReturn: number;
  /** The nominal index (§4.6): price-and-wealth level, 1 at the start, compounding with growth. */
  nominal: number;
  /**
   * The price-list level (§4.6): catalogue prices × this. Set to `nominal` at
   * each year end, when rents are reviewed by the same step.
   */
  listIndex: number;
  /** Extra capital buffer from a passed policy (§24 Politics): tier thresholds rise by pp. */
  capitalBuffer?: { pp: number; untilWeek: Week };
  /** Week a forced recession should start (balance-script option, §4.1). */
  forceRecessionAtWeek?: Week;
}

export interface CityState {
  id: Id;
  generated: boolean;
  /**
   * Which street layout the city was generated on (cityGeo.ts): 1 is the
   * original shared grid (cities from saves before v11), 2 its own geography.
   */
  layout: LayoutVersion;
  /** City brand awareness b (SIMULATION §7). */
  brandAwareness: Pct;
  /** Market reference price m(p, city) per product (§5). */
  marketRef: Record<string, number>;
  /** Storefronts added since the city was generated (city growth, CONTENT §3). */
  grownLots?: number;
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
  /** Cumulative net income less dividends declared. */
  retainedEarnings: Money;
  /** Goodwill from acquisitions (§19.8), deducted from CET1. */
  goodwill: Money;
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
  /**
   * HQ prices per country while Apply-to-all is on (schema v9): each country's
   * branches charge their own country's list, since policy rates differ.
   */
  companyPrices: Partial<Record<CountryId, Record<string, number>>>;
  /** HQ product lineup (on/off per product), set by setCompanyOffered. Absent until first used. */
  companyOffered?: Record<string, boolean>;
  /** University graduate program (Stage 5). */
  gradProgram?: GradProgram;
  /** The fit-out you last built with (schema v14): the build sheet and the COO start from it. */
  lastBuild?: BuildSpec;
  /**
   * Branch guidance from the C-suite (schema v15, §17.2): whole steps that move
   * delegated managers' pricing, Loan Desk approvals, wages, marketing and
   * lineup. Staffing, marketing and products joined in schema v18.
   */
  guidance: BranchGuidance;
}

/**
 * Positive deposits pays savers more; positive loans charges borrowers more and
 * approves less; positive staffing pays and staffs more; positive marketing
 * spends more on campaigns; positive products offers more and charges less.
 */
export interface BranchGuidance {
  deposits: number;
  loans: number;
  staffing: number;
  marketing: number;
  products: number;
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
  /** Sales office size level, an index into OFFICE_SIZES (schema 2, stage C2a). */
  size: number;
  lease: { weeklyRent: Money; deposit: Money };
  staff: BranchStaff;
  managerId?: Id;
  delegation: Delegation;
  awareness: Pct;
  grandOpeningWeeksLeft: number;
  ratings: Ratings;
  reviewCards: ReviewCard[];
  offered: Record<string, { on: boolean; price: number }>;
  /** Sets its own prices and lineup while HQ prices apply everywhere else (schema 5, stage C2d2). */
  ownPrices: boolean;
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
  /** An acquired branch still converting to your brand (Stage 6). */
  converting?: BranchConversion;
}

/**
 * A data center (stage C2c): on a storefront lot in a city (`lotId`) or at a
 * regional energy site (`siteId`). `build` names its parts in DC_PARTS.
 */
export interface DataCenter {
  id: Id;
  cityId: Id;
  lotId?: Id;
  siteId?: Id;
  name: string;
  status: 'fitout' | 'open';
  /** Weeks of fit-out left (0 once open). */
  weeksLeft: number;
  builtWeek: Week;
  openedWeek?: Week;
  build: { hall: string; power: string; cooling: string };
  /** On a lot: the lease, as for a sales office. At an energy site: the land lease (no deposit). */
  lease: { weeklyRent: Money; deposit: Money };
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
  /** Applications that arrived this week. */
  arrived: number;
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
    /** Loans that defaulted this week (business loans only; added in v12). */
    defaultedLoans?: number;
  };
}

/** An office P&L row's lines (C3b: AI revenue lines and the compute bill). */
export type BranchPnlLine =
  | 'plans'
  | 'api'
  | 'apps'
  | 'loanDesk'
  | 'otherIncome'
  | 'compute'
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
  /** GPUs this office's customers used this week (C4a; absent on older rows). */
  gpus?: number;
}

export type ChipPhase = 'glut' | 'normal' | 'shortage';

/** The compute pool and the chip cycle (stage C4a, SIMULATION §13.0). */
export interface ComputeState {
  /** Compute price index: 1 is a normal market. */
  index: number;
  phase: ChipPhase;
  weeksInPhase: number;
  /** Last week's totals: GPUs the offices used and GPUs running in your data centers. */
  demandGpus: number;
  ownedGpus: number;
  /** Weekly index history, oldest first. */
  history: number[];
  /** GPUs rented in active lots at the last tally (C4b). */
  rentedGpus: number;
  /** Rented GPU reservations and the GPU market's offers (C4b). */
  lots: GpuLot[];
  offers: GpuOffer[];
  /** Week the next set of offers arrives; −1 without a Compute floor. */
  offersRefreshWeek: Week;
}

/** A GPU reservation rented from the market: fixed GPUs at a fixed weekly price until endWeek. */
export interface GpuLot {
  id: Id;
  type: string;
  provider: string;
  gpus: number;
  /** Price per GPU-week, fixed for the term. */
  price: Money;
  startWeek: Week;
  endWeek: Week;
  radar: Pentagon;
}

export interface GpuOffer {
  id: Id;
  type: string;
  provider: string;
  /** Most GPUs you can rent from this offer. */
  gpus: number;
  price: Money;
  termWeeks: number;
  radar: Pentagon;
  expiresWeek: Week;
}

export interface ReviewCard {
  week: Week;
  category: RatingCategory;
  stars: number;
  text: string;
  portraitSeed: number;
}

// ─── HQ ───────────────────────────────────────────────────────────────────────

export type { DeptId, HqDeptId } from '../data/types';

export interface Office {
  id: Id;
  listingId: Id;
  cityId: Id;
  /** One department per floor slot; null is an empty floor. */
  floors: (DeptId | null)[];
  desksPerFloor: 24 | 32;
  weeklyRent: Money;
  deposit: Money;
  sinceWeek: Week;
}

export interface Department {
  id: DeptId;
  staff: number;
  target: number;
  /** Annual salary per employee. */
  salary: Money;
  skill: Score;
  morale: Score;
  quitAccumulator: number;
}

export interface Coverage {
  required: number;
  /** Raw staffing ratio k (0–1.2). */
  k: number;
  /** k′ after the founder-mode ramp: the coverage every effect reads. */
  kPrime: number;
  /** effect(k′) = k′^0.7, plus up to +5% above full staffing. */
  eff: number;
}

export interface HqState {
  /** Founder-mode ramp, 0 (no requirements) to 1 (§16.3). */
  ramp: number;
  coverage: Record<HqDeptId, Coverage>;
}

// ─── Marketing and risk floors ────────────────────────────────────────────────

export interface BrandCampaign {
  id: Id;
  /** Campaign id in src/data/brandCampaigns.ts. */
  campaignId: string;
  scope: 'city' | 'country';
  /** City id or country id. */
  targetId: string;
  startWeek: Week;
}

export interface AgencyPackageRun {
  id: Id;
  agencyId: string;
  packageId: string;
  cityId: Id;
  weeksLeft: number;
  weeksTotal: number;
  /** Brand boost applied each remaining week. */
  boostPerWeek: number;
}

export interface MarketingState {
  campaigns: BrandCampaign[];
  packages: AgencyPackageRun[];
  /** Branch-rating bonus per city from prestige packages: cityId → { bonus, weeksLeft }. */
  cityBonus: Record<Id, { bonus: number; weeksLeft: number }>;
}

export interface LossWeek {
  week: Week;
  /** Exposure, defaults and losses by product id (sbl covers Loan Desk loans). */
  byProduct: Record<string, LossLine>;
  /** Expected loss from booked PDs this week, for model performance. */
  expected: Money;
}

/** One product's week on the Risk floor. Balances are before this week's defaults. */
export interface LossLine {
  balance: Money;
  /** Balance that defaulted this week. */
  defaulted: Money;
  /** Loss after recoveries. */
  loss: Money;
  /** Defaults the booked PDs predicted (balance × PD / 52, before the credit cycle). */
  expectedDefaults: Money;
}

export interface RegulatorReview {
  week: Week;
  passed: boolean;
  fine: Money;
}

export interface RiskState {
  /** Last 13 weeks of losses (§16, Risk floor). */
  losses: LossWeek[];
  reviews: RegulatorReview[];
}

// ─── People, products, underwriting ───────────────────────────────────────────

export interface People {
  managers: Record<Id, Manager>;
  /** Candidate pool per city; refreshes every 4 weeks (SIMULATION §6.5). */
  managerCandidates: Record<Id, Manager[]>;
  candidatesRefreshWeek: Record<Id, Week>;
  /** Paid rerolls per city since its pool last refreshed for free (schema v17). */
  rerolls: Record<Id, number>;
  /** HR benefit control values by benefit id (§16.5). */
  benefits: Record<string, number>;
  /** With an HR floor, HR hires a manager for every open branch without one (§16.11, schema v25). */
  hrHiring: boolean;
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

export interface ProductEntry {
  id: Id;
  stars: Stars;
  developed: boolean;
  /** Developed products (§16.6): name, base product, template and tier. */
  name?: string;
  base?: string;
  templateId?: string;
  tier?: DevTier;
  createdWeek?: Week;
}

export type DevTier = 'low' | 'medium' | 'premium';

export interface Development {
  id: Id;
  name: string;
  templateId: string;
  tier: DevTier;
  weeks: 4 | 8 | 12 | 24 | 48;
  weeklyBudget: Money;
  spent: Money;
  /** Progress in nominal weeks; done at `weeks`. */
  progress: number;
  /** Star odds [1★..5★] fixed at the start. */
  odds: number[];
  startWeek: Week;
}

export interface ProductsState {
  catalog: Record<Id, ProductEntry>;
  developments: Development[];
  /** Digital templates already completed (each runs once; CONTENT §6). Absent until the first. */
  digitalDone?: string[];
}

export interface UnderwritingModel {
  id: Id;
  name: string;
  source: 'bureau' | 'custom';
  /** Bureau hosting a custom model (no Products floor needed, §16.7). */
  hostedBy?: string;
  mix: Record<string, number>;
  /** Accuracy, Speed, Inclusion, FraudShield, Fairness (1–10). */
  radar: Pentagon;
  costPerApp: Money;
}

export interface UnderwritingState {
  activeModelId: Id;
  /** While switching models (2 weeks), the old model blends out linearly (§16.7). */
  switching?: { fromId: Id; weeksLeft: number };
  models: Record<Id, UnderwritingModel>;
  loansBooked: number;
}

// ─── Treasury, Loan Desk ──────────────────────────────────────────────────────

export interface Treasury {
  /** The Loan Desk's lending fund (C3b); government bonds were removed in C3c. */
  reserves: Money;
  liqTarget: Pct;
  autoFunding: boolean;
  freeze: boolean;
  overnight: Money;
  window: Money;
  windowStigmaWeeks: number;
  /** Wholesale funding lots bought from the funding market (§13.6). */
  lots: FundingLot[];
  offers: FundingOffer[];
  offersRefreshWeek: Week;
}

/** Radar order: Cost, Term, Stability, Flexibility, Discretion. */
export interface FundingLot {
  id: Id;
  type: string;
  counterparty: string;
  amount: Money;
  rate: Rate;
  startWeek: Week;
  maturityWeek: Week;
  radar: Pentagon;
}

export interface FundingOffer {
  id: Id;
  type: string;
  counterparty: string;
  /** Maximum you can borrow. */
  amount: Money;
  rate: Rate;
  termWeeks: number;
  radar: Pentagon;
  expiresWeek: Week;
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
  /** 'merged' is bought by another rival (§18.8); 'acquired' is bought by you. */
  status: 'active' | 'distressed' | 'seized' | 'acquired' | 'merged';
  /** A chartered bank (§18.7): its home countries and the week it opened. */
  home?: CountryId[];
  charteredWeek?: Week;
  /** When merged: the rival that bought it (§18.8). */
  mergedInto?: Id;
  /** Running ad campaigns by city (§18.9): overall-rating boost and weeks left. */
  campaigns?: Record<Id, { boost: number; weeksLeft: number }>;
  /** Stage 5 (§18.5): simplified financials. */
  equity: Money;
  capitalRatio: number;
  listed: boolean;
  ticker?: string;
  ceo: string;
  /** The rest of the senior team (§18.1), shown on the rival HQ panel. */
  execs: { title: string; name: string }[];
  /** Revenue and net income since the quarter began. */
  qtd: { revenue: Money; netIncome: Money };
  /** Reported quarters, oldest first (last 8). */
  quarters: { revenue: Money; netIncome: Money }[];
  /** Deposit-rate bump from price wars by city, in rate units (§18.6). */
  priceWar: Record<Id, Rate>;
  /** While distressed: the week its network is split among other rivals (§18.5). */
  distressedUntil?: Week;
  /** While distressed: the asking price per share of its network in M&A (§18.5, set by failureCheck). */
  distressedAsk?: Money;
  /** Stage 6 (§19): shares outstanding (fixed), price (market if listed, book if private). */
  shares: number;
  price: Money;
  /** Weekly closes, oldest first (listed rivals only). */
  history: number[];
  high52: Money;
  low52: Money;
  /** Mean-reverting sentiment around 1 (listed rivals, §19.5 model). */
  sentiment: number;
  /** Last quarter's dividend per share (0 when it skipped one). */
  dps?: Money;
}

/** A rival lab's sales office: one per city (C2b), sized like yours. */
export interface RivalBranch {
  id: Id;
  cityId: Id;
  lotId: Id;
  /** Office size (0 = Starter … 3 = Flagship, OFFICE_SIZES). */
  size: number;
  openedWeek: Week;
  /** Rates, Products, Service, Branch. */
  quality: [Stars, Stars, Stars, Stars];
  overall: Stars;
  reviewCount: number;
  /** Stage 5 aggregate books (§18.1). */
  deposits: Money;
  loans: Money;
  /** Last week's contribution (earnings minus costs). */
  contribution: Money;
  /** Consecutive weeks of negative contribution (closes at 26, §18.4). */
  negativeWeeks: number;
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
  | 'compute'
  | 'underwriting'
  | 'hqStaff'
  | 'benefits'
  | 'development'
  | 'fines'
  | 'incidents'
  | 'corporateInterest'
  | 'amortization'
  | 'execPay'
  | 'grantExpense'
  | 'integration'
  | 'commissions'
  | 'dividendIncome'
  | 'investmentGains'
  | 'acquisitionGain'
  | 'ventureDebtInterest'
  | 'rentalIncome'
  | 'propertyGains'
  | 'propertyCosts'
  | 'lobbying'
  | 'travel'
  | 'franchiseRevenue'
  | 'franchiseCosts'
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
    /** Annual recurring revenue at the close (C3a); absent in weeks closed before schema 6. */
    arr?: Money;
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
  /** Mobile app rating at the week's close (IT floor trend). Missing in older saves. */
  appRating?: Stars;
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
