// Every tuning constant for Vault Street lives here (CLAUDE.md non-negotiable 5).
// Names match the CAPS names used in docs/SIMULATION.md (§26 parameter index).
// Constants that the docs give inline in a formula get a name here too, with the
// section reference, so logic files never carry magic numbers.
import type { Difficulty, Phase, Tier } from '../data/types';

/**
 * Feature flags, one per ROADMAP stage. A stage's systems stay switched off on
 * `main` until they are fully wired, so the live site is always shippable.
 */
export const FEATURES = {
  /** Stage 1: headless simulation core. */
  simulation: true,
  /** Stage 2: playable founder loop in plain UI (enables New Game / Continue). */
  playableLoop: true,
  /** Stage 3: engraved isometric city map. */
  cityMap: true,
  /** Stage 4: HQ offices, departments and operations depth. */
  hq: true,
  /** Stage 5: rival AI, macro for every country, The Daily Ledger, incidents. */
  competition: true,
  /** Stage 6: governance, executives and capital markets. */
  capitalMarkets: false,
  /** Stage 7: ventures, conventions and real estate. */
  investments: false,
  /** Stage 8: every city, airports and travel. */
  multiCity: false,
  /** Stage 9: personal wealth, homes, cars, auctions, franchise. */
  personalEmpire: false,
  /** Stage 10: art pass, tutorial, sound, PWA. */
  polish: false,
} as const;

export type FeatureId = keyof typeof FEATURES;

// ─── TIME (SIMULATION §2, §26) ────────────────────────────────────────────────
export const DAY_MS = 1000;
export const SPEEDS = [0, 1, 2, 4] as const;
export const DAYS_PER_WEEK = 7;
export const WEEKS_PER_YEAR = 52;
export const START_DATE = '2027-01-04';

// ─── START ────────────────────────────────────────────────────────────────────
/** Default spendable cash; the New Game wizard offers START_CASH_OPTIONS. */
export const START_CASH = 750_000;
export const START_CASH_OPTIONS = [500_000, 750_000, 1_000_000, 1_250_000] as const;
/** Rival banks in each city (the wizard's competitor count); clamped to the rivals available. */
export const COMPETITORS = { min: 1, max: 5 } as const;

/**
 * Difficulty levels (DESIGN §5.2). Normal is the identity and the balance reference.
 * - demandMult scales branch prospects
 * - rivalQuality shifts every rival branch's quality coins at seeding
 * - rivalRateEdge moves rival rates in customers' favour (deposit rates up, loan rates down), pp
 * - lossMult scales default probabilities on new loans and business loans
 */
export const DIFFICULTY: Record<
  Difficulty,
  { demandMult: number; rivalQuality: number; rivalRateEdge: number; lossMult: number }
> = {
  easy: { demandMult: 1.15, rivalQuality: -0.3, rivalRateEdge: -0.1, lossMult: 0.85 },
  normal: { demandMult: 1, rivalQuality: 0, rivalRateEdge: 0, lossMult: 1 },
  hard: { demandMult: 0.92, rivalQuality: 0.2, rivalRateEdge: 0.1, lossMult: 1.1 },
  expert: { demandMult: 0.85, rivalQuality: 0.4, rivalRateEdge: 0.2, lossMult: 1.25 },
};
export const CHARTER_CAPITAL = 2_000_000;
export const START_SHARES = 10_000_000;
export const START_PERSONAL_CASH = 150_000;
export const START_CEO_SALARY = 120_000;
export const CHARTER_MIN_EQUITY = 2_000_000;

// ─── MACRO (§4) ───────────────────────────────────────────────────────────────
export const MACRO_MIN_PHASE_WEEKS = 13;
export const MACRO_TRANSITIONS: Record<Phase, { to: Phase; p: number }[]> = {
  expansion: [{ to: 'slowdown', p: 0.008 }],
  slowdown: [
    { to: 'recession', p: 0.025 },
    { to: 'expansion', p: 0.015 },
  ],
  recession: [{ to: 'recovery', p: 0.035 }],
  recovery: [{ to: 'expansion', p: 0.025 }],
};
/** Targets by phase. gdp, inflation, unemployment in percent; drifts and termPremium as decimals. */
export const MACRO_TARGETS: Record<
  Phase,
  {
    gdp: number;
    inflation: number;
    unemployment: number;
    hpiDrift: number;
    creDrift: number;
    termPremium: number;
  }
> = {
  expansion: {
    gdp: 2.6,
    inflation: 2.6,
    unemployment: 5.0,
    hpiDrift: 0.05,
    creDrift: 0.03,
    termPremium: 0.006,
  },
  slowdown: {
    gdp: 0.9,
    inflation: 3.2,
    unemployment: 5.6,
    hpiDrift: 0.01,
    creDrift: 0,
    termPremium: -0.003,
  },
  recession: {
    gdp: -1.6,
    inflation: 1.4,
    unemployment: 7.6,
    hpiDrift: -0.07,
    creDrift: -0.08,
    termPremium: 0.003,
  },
  recovery: {
    gdp: 1.9,
    inflation: 1.9,
    unemployment: 6.6,
    hpiDrift: 0.02,
    creDrift: 0.01,
    termPremium: 0.012,
  },
};
export const MACRO_EMA = 0.06;
export const MACRO_SIGMA = { gdp: 0.05, inflation: 0.04, unemployment: 0.03 } as const;
export const MACRO_INDEX_SIGMA = 0.002;
export const TERM_PREMIUM_EMA = 0.05;
export const GDP_HISTORY_WEEKS = 13;
export const HPI_HISTORY_WEEKS = 52;
/** Policy rule (§4.4). */
export const POLICY_INFLATION_WEIGHT = 1.5;
export const POLICY_GDP_WEIGHT = 0.5;
export const POLICY_GDP_NEUTRAL = 2.0;
export const POLICY_HOLD_BAND = 0.00125;
export const POLICY_STEP = 0.0025;
export const POLICY_BIG_STEP = 0.005;
export const POLICY_BIG_GAP = 0.01;
export const POLICY_FLOOR = 0.0025;
export const POLICY_CAP = 0.09;
export const GDP_FORECAST_SIGMA = 0.2;
/** Derived factors (§4.5). */
export const CREDIT_CYCLE = { floor: 0.8, slope: 0.16, base: 5.0 } as const;
export const LOAN_DEMAND = { gdpSlope: 0.05, rateSlope: 0.12, min: 0.6, max: 1.3 } as const;
export const DEPOSIT_GROWTH_SLOPE = 0.01;
export const MORTGAGE_LGD_SLOPE = 3;
export const EQUITY_MARKET_DRIFT: Record<Phase, number> = {
  expansion: 0.08,
  slowdown: 0,
  recession: -0.15,
  recovery: 0.18,
};
/** Weekly σ of the shared equity market shock (§19.1). */
export const MARKET_SHOCK_SIGMA = 0.018;

// ─── RATES (§5) ───────────────────────────────────────────────────────────────
export const DEPOSIT_BETA_UP = 0.45;
export const DEPOSIT_BETA_DOWN = 0.75;
export const DEPOSIT_LAG_WEEKS: [number, number] = [4, 8];
export const LOAN_PASS_THROUGH = 0.9;
export const LOAN_LAG_WEEKS = 2;
export const RIVAL_PRICE_DRIFT = 0.02;
/** Cards re-price only when FTP has moved this far since the last change. */
export const CARD_REPRICE_GAP = 0.01;

// ─── STAFF (§6) ───────────────────────────────────────────────────────────────
export const BASE_TELLER_WAGE = 24.0;
export const HOURS_PER_WEEK = 40;
export const MANAGER_BASE_SALARY = 72_000;
export const QUIT_BASE = 0.004;
export const HIRE_BASE = 1;
export const SERVICE_VISIT_RATE = 0.03;
export const MORALE = {
  base: 50,
  wageSwing: 40,
  wageSteep: 3,
  managerPeople: 0.15,
  waitPenalty: 25,
  noManager: 5,
  ema: 0.1,
} as const;
export const SKILL = {
  base: 35,
  wageSwing: 40,
  wageFloor: 0.8,
  wageRange: 0.6,
  managerPeople: 0.1,
  riseWeekly: 0.6,
  fallWeekly: 3,
  newHireFrac: 0.8,
} as const;
export const ATTRACTION_RANGE: [number, number] = [0.7, 1.3];
/** Capacity multipliers (§6.4): (0.7 + 0.3 × skill) × (0.85 + 0.15 × morale). */
export const CAPACITY_SKILL = { base: 0.7, slope: 0.3 } as const;
export const CAPACITY_MORALE = { base: 0.85, slope: 0.15 } as const;
export const WAIT_LABELS = { busy: 0.8, long: 1.1 } as const;
export const START_STAFF_SKILL = 50;
export const START_STAFF_MORALE = 70;
/** Manager candidates (§6.5). */
export const MANAGER_POOL_SIZE = 3;
export const MANAGER_POOL_REFRESH_WEEKS = 4;
export const MANAGER_SKILL = { mean: 60, sd: 15, min: 25, max: 98 } as const;
export const MANAGER_SALARY_SPREAD = { base: 0.7, slope: 0.6 } as const;
export const MANAGER_MARKETING = { base: 0.8, slope: 0.4 } as const;
export const NO_MANAGER_SERVICE = 0.3;

// ─── MARKETING (§7) ───────────────────────────────────────────────────────────
export const START_AWARENESS = 0.2;
export const GRAND_OPENING_BONUS = 0.15;
export const GRAND_OPENING_WEEKS = 6;
export const AWARENESS_DECAY = 0.03;
export const BRAND_DECAY = 0.02;
export const BRAND_PASSIVE_PER_BRANCH = 0.002;

// ─── RATINGS (§8) ─────────────────────────────────────────────────────────────
export const RATING_EMA = 0.2;
export const RATES_BASE = 3.0;
/** Rate competitiveness: one point per 0.5pp versus the market (§8). */
export const RATE_COMP_STEP = 0.005;
export const COMP_CLAMP = 2;
export const BALANCE_WEIGHT_FLOOR = 0.1;
export const PRODUCTS_RATING = {
  app: 0.3,
  appBase: 3,
  model: 0.1,
  modelBase: 5,
  breadthGood: 0.3,
  breadthBad: -0.5,
  breadthGoodShare: 0.8,
  breadthBadShare: 0.4,
} as const;
export const SERVICE_RATING = {
  base: 1.0,
  skill: 2.0,
  morale: 1.2,
  managerPeople: 0.5,
  modelSpeed: 0.08,
  wait: 1.5,
} as const;
export const BRANCH_RATING_WEIGHTS = {
  exterior: 0.25,
  lobby: 0.35,
  teller: 0.15,
  vault: 0.1,
  atm: 0.15,
} as const;
export const NO_ATM_QUALITY = 2.0;
export const UPKEEP_PENALTY = { perStep: 0.2, stepWeeks: 260 } as const;
export const OVERALL_WEIGHTS = { rates: 0.3, products: 0.2, service: 0.3, branch: 0.2 } as const;
export const REVIEW_RATE = 0.12;
export const REVIEW_CARDS_KEPT = 8;
export const REVIEW_CARD_SIGMA = 0.7;
/** Fee competitiveness denominator floor: $1 for $ fees, 0.25pp for % fees (§8, §9.7). */
export const FEE_COMP_MIN = { dollars: 1, pct: 0.0025 } as const;
export const FEE_COMP_SCALE = 0.25;

// ─── DEMAND (§9) ──────────────────────────────────────────────────────────────
export const CATCHMENT_MULT = 1.0;
export const PROSPECT_RATE = 0.04;
export const SATURATION_EXP = 2.8;
export const AWARENESS_FLOOR = 0.25;
export const DEMAND_NOISE = 0.05;
export const SHARE_EXP = 2.2;
export const RIVAL_RADIUS = 12;
export const DISTANCE_FALLOFF = 6;
export const TAKEUP_CAP = 0.95;
export const STARS_TAKEUP = { base: 0.6, slope: 0.2 } as const;
export const MORTGAGE_SPECIAL = {
  homeownerRef: 0.6,
  base: 0.6,
  perOffice: 0.2,
  min: 0.6,
  max: 1.2,
} as const;
export const APPROVAL_INCLUSION = { base: 0.85, slope: 0.03 } as const;
/** Price factors move one sensitivity unit per this rate gap (§9.7; tuned from 0.005). */
export const PF_RATE_STEP = 0.01;
export const PRICE_FACTOR_CLAMP = {
  deposit: [0.25, 2.0],
  loan: [0.2, 1.8],
  fee: [0.2, 1.8],
} as const satisfies Record<string, readonly [number, number]>;
export const FEE_STEP_MIN = { dollars: 2, pct: 0.0025 } as const;
export const FEE_PF_SCALE = 0.5;
export const PRODUCTS_PER_CUSTOMER = 1.6;

// ─── BOOKS (§10, §11) ─────────────────────────────────────────────────────────
export const GIC_RENEW_BASE = 0.72;
export const GIC_RENEW_CAP = 0.95;
export const STUDENT_CONVERSION = 0.08;
export const OVERALL_CHURN = { slope: 0.6, pivot: 3.2 } as const;
export const PREPAY_BASE = 0.001;
export const PREPAY_REFI = { slope: 0.003, threshold: 0.0075 } as const;
export const MORTGAGE_REPRICE_WEEKS = 260;
export const ADVERSE = { floor: 0.85, above: 0.25, below: 0.05, step: 0.01 } as const;
export const MODEL_PD = { base: 1.3, accuracy: 0.06, inclusion: 0.02 } as const;
export const REVOLVING_EMA = 0.2;
export const RECESSION_DRAW_MULT = 1.1;
export const INTERCHANGE = 0.015;
export const WEALTH_MARKET_BETA = 0.6;
export const FX_PER_CUSTOMER = 900;
export const SBL_BASE_PD = 0.025;
export const LOANDESK_BASE = 0.5;
export const LOANDESK = {
  bizSlope: 3.0,
  trafficRef: 8000,
  amountMedian: 70_000,
  amountSigma: 0.7,
  amountMin: 20_000,
  amountMax: 3_000_000,
  pentagonSigma: 1.6,
  recessionFinHealth: -1,
  collateralOdds: { none: 0.3, partial: 0.45, full: 0.25 },
  maxRateSpread: 0.0525,
  maxRateSlope: 0.006,
  maxRateSigma: 0.004,
  pdSlope: 0.22,
  collateralPd: { none: 1.2, partial: 1.0, full: 0.85 },
  collateralLgd: { none: 0.75, partial: 0.5, full: 0.3 },
  expiryWeeks: 2,
  acceptBelowMax: 0.97,
  acceptSlope: 0.6,
  acceptStep: 0.01,
  estimateSigma: 0.6,
  estimatorBase: 40,
  estimatorSlope: 50,
  riskBandVisibleProduct: 60,
  riskBands: { low: 0.02, high: 0.045 },
  delegatedThresholds: [0.02, 0.03, 0.045, 0.06, 0.08],
  delegatedMargin: 0.025,
  bigDefault: 500_000,
  /** Balances below this count as repaid. */
  dustBalance: 0.005,
} as const;
/** Pentagon weights for the hidden score (Mgmt, Track, Market, Comp, FinHealth) (§11). */
export const LOANDESK_WEIGHTS = [0.2, 0.2, 0.15, 0.15, 0.3] as const;

// ─── BRANCH (§12, §5.3) ───────────────────────────────────────────────────────
export const EQUIP_MAINT = 0.06;
export const FITOUT_UPKEEP = 0.02;
export const BRANCH_OVERHEAD = 450;
export const CLOSE_RECOVERY = 0.3;
/** Closing a branch forfeits this many weeks' rent from the lease deposit (DESIGN §5.3). */
export const CLOSE_RENT_WEEKS = 2;
/** Share of accounts and deposits that follow a closed branch to the nearest one (assumption). */
export const CLOSE_RETENTION = 0.85;
export const ATM_FEE = { usage: 0.25, fee: 2.5 } as const;
export const FITOUT_DAYS = 7;
export const LEASE_DEPOSIT_WEEKS = 6;
export const RENT_TRAFFIC_EXP = 0.6;
export const BRANCH_PNL_WEEKS = 52;
export const FITOUT_LIFE_WEEKS = 520;
export const EQUIPMENT_LIFE_WEEKS = 260;

// ─── TREASURY (§13) ───────────────────────────────────────────────────────────
export const LIQ_MIN = 0.1;
export const LIQ_TARGET_DEFAULT = 0.15;
export const LIQ_TARGET_RANGE: [number, number] = [0.1, 0.4];
export const LIQ_REPAY_BUFFER = 0.05;
export const FREEZE_RELEASE = 0.02;
export const BOND_SHARE_DEFAULT = 0.3;
export const BOND_SHARE_MAX = 0.8;
export const BOND_DURATION = 4.0;
export const BOND_YIELD_SPREAD = 0.001;
export const BOND_PULL_TO_PAR_WEEKS = 208;
export const OVERNIGHT_SPREAD = 0.002;
export const OVERNIGHT_LIMIT = 0.1;
export const WINDOW_SPREAD = 0.01;
export const WINDOW_STIGMA = { weeks: 4, rating: 0.05, newsChance: 0.2 } as const;
export const TREASURY_PENALTY = 0.005;
/** Funding spread by capital ratio (§13.6). */
export const RATING_SPREADS: { minCr: number; spread: number }[] = [
  { minCr: 0.14, spread: -0.001 },
  { minCr: 0.105, spread: 0 },
  { minCr: 0.08, spread: 0.0035 },
  { minCr: -Infinity, spread: 0.01 },
];
/** Overnight limit multiplier by tier (assumption, DESIGN §7). */
export const OVERNIGHT_LIMIT_MULT: Record<Tier, number> = {
  strong: 1,
  adequate: 1,
  watch: 0.75,
  restricted: 0.5,
  critical: 0.25,
};
export const DEPOSIT_PER_EMPLOYEE = 4_500;
/** Funding market (§13.6): offers regenerate every 2 weeks while you have a Treasury floor. */
export const FUNDING_REFRESH_WEEKS = 2;
/** Offer count = base + floor(perCoverage × treasuryCoverage′) + (CFO expertise ≥ cfoExpertise ? cfoBonus : 0). */
export const FUNDING_OFFERS = { base: 2, perCoverage: 3, cfoBonus: 1, cfoExpertise: 70 } as const;
/** Offer size = typeSize × max(1, deposits / sizeScale) × (1 ± sizeNoise), rounded to amountStep. */
export const FUNDING_SIZE = { scale: 100_000_000, noise: 0.25, amountStep: 100_000 } as const;
/** Offer rate noise: normal(0, FUNDING_RATE_NOISE). */
export const FUNDING_RATE_NOISE = 0.0008;

// ─── CAPITAL (§15) ────────────────────────────────────────────────────────────
export const OP_RISK_MULT = 1.0;
export const REO_RISK_WEIGHT = 1.0;
export const FIXED_ASSET_RISK_WEIGHT = 1.0;
export const TIER_THRESHOLDS: { tier: Tier; minCr: number }[] = [
  { tier: 'strong', minCr: 0.14 },
  { tier: 'adequate', minCr: 0.105 },
  { tier: 'watch', minCr: 0.08 },
  { tier: 'restricted', minCr: 0.06 },
  { tier: 'critical', minCr: -Infinity },
];
export const CAPITAL_GATE: Record<Tier, number> = {
  strong: 1,
  adequate: 1,
  watch: 1,
  restricted: 0.5,
  critical: 0,
};
export const CRITICAL_FINE_RWA = 0.001;
/**
 * Quarterly regulator review (§15): fail chance
 * failBase × (1 + HQ_EFFECTS.riskFine × (1 − riskCoverage′)) × (ethicsBase − avgManagerEthics/100).
 * With no branch managers, ethics reads as defaultEthics (assumption, DESIGN §7).
 * A failure fines a uniform share of trailing annual revenue in fineRange.
 */
export const REGULATOR_REVIEW = {
  failBase: 0.02,
  ethicsBase: 1.6,
  defaultEthics: 50,
  fineRange: [0.0005, 0.003] as [number, number],
} as const;
/** Risk floor loss records kept, in weeks (SCREENS §10: annualized 13-week loss rates). */
export const RISK_LOSS_WEEKS = 13;
/**
 * Delinquency proxy (assumption, DESIGN §7): the average weekly defaults of the
 * last `recentWeeks`, times the `pipelineWeeks` a loan spends in arrears before
 * default, as a share of the current balance.
 */
export const DELINQUENCY = { recentWeeks: 4, pipelineWeeks: 13 } as const;
export const RECAP_DISCOUNT = 0.5;
/**
 * Game over (DESIGN §5.18). Insolvency: corporate cash below zero for 4 weeks (no
 * corporate credit exists before Stage 5). Takeover: capital ratio below 4.5% for
 * 13 weeks (the 8-week wait plus the 5-week recapitalisation window; the offer
 * itself arrives with incidents).
 */
export const FAILURE = { insolvencyWeeks: 4, takeoverCr: 0.045, takeoverWeeks: 13 } as const;

// ─── RISK APPETITE (§16.8) ────────────────────────────────────────────────────
export const RISK_APPETITE = {
  volumeMult: [0.7, 0.85, 1.0, 1.15, 1.3],
  pdMult: [0.7, 0.85, 1.0, 1.2, 1.45],
} as const;
export const DEFAULT_RISK_APPETITE = 3;

// ─── HQ (§16) ─────────────────────────────────────────────────────────────────
/** Office listings per city by size, and how they're built (§16.1, CONTENT §9). */
export const OFFICE_LISTINGS = {
  countBySize: { S: 3, M: 5, L: 7, XL: 9 },
  /** Share of listings per district (the rest of the city has none). */
  districts: { financial: 0.5, downtown: 0.3, midtown: 0.2 },
  floors: [3, 10] as [number, number],
  /** Chance a building has 32 desks per floor rather than 24. */
  wideFloorChance: 0.5,
  /** Floor area per desk, m² (the original's 7-floor, 7,560 m² listing ≈ 45 m² × 24 desks). */
  areaPerDesk: 45,
} as const;
export const OFFICE_RENT_PER_FLOOR = 1_100;
export const OFFICE_DEPOSIT_WEEKS = 8;
export const FLOOR_FITOUT = 120_000;
export const FLOOR_FITOUT_LIFE_WEEKS = 520;
export const DESKS_PER_FLOOR_OPTIONS = [24, 32] as const;
export const EXEC_SUITE_DESKS = 7;
export const INVESTMENT_FLOOR_DESKS = 32;
/** Releasing a floor or office lets staff above the remaining desks go with this severance. */
export const SEVERANCE_WEEKS = 4;
/** Founder-mode ramp: full requirements at this size, or phased in from 3 to 6 branches (§16.3). */
export const FOUNDER_MODE_ASSETS = 250_000_000;
export const FOUNDER_RAMP = { fromBranches: 2, overBranches: 4 } as const;
/**
 * Required staff per department (CONTENT §9):
 * base + perBranch × branches + per$ × the department's dollar driver.
 */
export const DEPT_REQUIREMENTS = {
  finance: { base: 2, perBranch: 0.35, perAssets: 1 / 2e9 },
  hr: { base: 1, perEmployee: 1 / 80 },
  products: { base: 2, perBranch: 0.2, perDevelopment: 2 },
  treasury: { base: 1, perFunding: 1 / 1e9 },
  marketing: { base: 1, perBranch: 0.15, perCampaign: 2 },
  it: { base: 2, perBranch: 0.25, perAssets: 1 / 5e9 },
  risk: { base: 2, perBranch: 0.15, perLoans: 1 / 750e6 },
} as const;
/** Coverage (§16.4): staffEff, k, k′ and the shortfall curve. */
export const HQ_COVERAGE = {
  skillBase: 0.6,
  skillSlope: 0.4,
  moraleBase: 0.85,
  moraleSlope: 0.15,
  kMax: 1.2,
  curve: 0.7,
  /** Above full staffing the effect rises bonusSlope per unit of k, capped at +5%. */
  bonusSlope: 0.25,
  bonusCap: 0.05,
} as const;
/** Department skill target: like branch staff (§6.3) but from a higher base (HQ officers). */
export const DEPT_SKILL = { base: 55, wageSwing: 40 } as const;
/** A new department's starting staff target covers its requirement at this staff efficiency. */
export const DEPT_DEFAULT_EFF = 0.75;
/** Coverage effects when short (CONTENT §9). */
export const HQ_EFFECTS = {
  /** Statement delay ceil((delayFrom − k′) × 10) weeks below k′ 0.9. */
  financeDelayFrom: 0.9,
  financeDelayScale: 10,
  hrMoralePenalty: 15,
  devSpeedFloor: 0.3,
  modelCostPenalty: 0.3,
  campaignBase: 0.5,
  /** PD × (1 + riskPd × (1 − k′)); raised from 0.4 in Stage 4 tuning (CONTENT §9). */
  riskPd: 1.5,
  riskFine: 3,
  /** Loan Desk estimate noise × (1 + this × (1 − k′)). */
  riskEstimate: 1,
} as const;
/** Benefit effects flatten above the stated amount, capped at this multiple (CONTENT §10). */
export const BENEFIT_CAP = 1.5;
/** Above the stated amount, effects grow at this fraction of the linear slope. */
export const BENEFIT_FLATTEN = 0.5;
/** Remote Fridays: HQ effective staff −3%. */
export const REMOTE_FRIDAY_STAFF = 0.03;

// ─── PRODUCT DEVELOPMENT (§16.6) ──────────────────────────────────────────────
/** Development terms in weeks and their term score T. */
export const DEV_TERMS = [4, 8, 12, 24, 48] as const;
export const DEV_TERM_SCORE: Record<(typeof DEV_TERMS)[number], number> = {
  4: 0,
  8: 0.2,
  12: 0.4,
  24: 0.7,
  48: 1,
};
/** D = 0.40 T + 0.40 B + 0.20 team. */
export const DEV_WEIGHTS = { term: 0.4, budget: 0.4, team: 0.2 } as const;
/** Weekly budget: minimum, and the budget at which B reaches 1 ($5k → 0, $500k → 1). */
export const DEV_MIN_WEEKLY = 5_000;
export const DEV_MAX_BUDGET_SCORE_AT = 500_000;
export const DEV_BUDGET_STEP = 1_000;
/** team score while there's no Products floor. */
export const DEV_NO_FLOOR_TEAM = 0.5;
/** Star odds: normal with μ = base + slope × D and σ = DEV_SIGMA. */
export const DEV_MU = { base: 1.79, slope: 2.6 } as const;
export const DEV_SIGMA = 0.9;
export const DEV_MAX_STARS = 5;
/**
 * Target tier (decision log, DESIGN §7): the default price number moves with the
 * tier — rates −0.10pp / 0 / +0.15pp (CONTENT §6 senior_saver), fees ×0.85 / 1 /
 * ×1.25 — and Premium adds a small Products rating bump where it's offered.
 */
export const DEV_TIER = {
  rateAdd: { low: -0.001, medium: 0, premium: 0.0015 },
  feeMult: { low: 0.85, medium: 1, premium: 1.25 },
  productsBump: { low: 0, medium: 0, premium: 0.05 },
} as const;
export const PRODUCT_NAME_MAX = 32;

// ─── UNDERWRITING MODELS (§16.7) ──────────────────────────────────────────────
/** Custom model quality: 0.9 + 0.2 × productsCoverage′ × avgSkill/100. */
export const MODEL_QUALITY = { base: 0.9, slope: 0.2 } as const;
/** Bureau-hosted custom model: fixed quality and a 15% hosting markup. */
export const BUREAU_HOSTED = { qualityMult: 0.95, costMult: 1.15 } as const;
/** Internal History accuracy = 4 + min(5, loansBooked / 20,000 × 5). */
export const INTERNAL_HISTORY = { accuracyBase: 4, accuracyGain: 5, fullLoans: 20_000 } as const;
export const MODEL_SWITCH_WEEKS = 2;
/** Mix weights must sum to 1 within this tolerance (sliders in whole percent). */
export const MODEL_MIX_TOLERANCE = 0.005;
export const MODEL_RADAR_MAX = 10;
export const MODEL_NAME_MAX = 32;

// ─── IT (§16.9) ───────────────────────────────────────────────────────────────
export const APP_RATING = {
  base: 2.0,
  slope: 2.5,
  noTeamSkill: 70,
  ema: 0.05,
  ctoBonus: 0.4,
  ctoVacancy: 0.3,
} as const;

// ─── DELEGATION (§17.1) ───────────────────────────────────────────────────────
export const DELEGATE = {
  staffWait: [0.9, 1.3],
  wageBase: 0.95,
  wageSlope: 0.15,
  rateOffsetComp: 0.6,
  minMarginShare: 0.4,
  priceErrorSd: 0.0015,
  feeDiscount: 0.9,
  minAffinity: 0.05,
  marketingHorizon: 26,
} as const;

// ─── HISTORY ──────────────────────────────────────────────────────────────────
export const WEEKLY_HISTORY = 260;
export const EVENT_LOG_WEEKS = 8;

// ─── CITYGEN (Stage 1 lot list; CONTENT §3) ───────────────────────────────────
export const LOT_COUNT_BY_SIZE = { S: 36, M: 56, L: 80, XL: 110 } as const;
export const LOT_TRAFFIC_NOISE: [number, number] = [0.65, 1.35];
export const LOT_RENT_NOISE: [number, number] = [0.9, 1.1];
export const LOT_INCOME_NOISE: [number, number] = [0.9, 1.1];
export const CITYGEN = {
  /** District centres as fractions of the tile grid, with their spread (σ). */
  layout: {
    financial: { cx: 0.5, cy: 0.45, spread: 0.08 },
    downtown: { cx: 0.42, cy: 0.55, spread: 0.12 },
    midtown: { cx: 0.62, cy: 0.38, spread: 0.14 },
    university: { cx: 0.28, cy: 0.3, spread: 0.1 },
    suburbs: { cx: 0.75, cy: 0.75, spread: 0.2 },
    industrial: { cx: 0.2, cy: 0.78, spread: 0.12 },
    waterfront: { cx: 0.5, cy: 0.84, spread: 0.07 },
  },
  /** Keep lots this fraction away from the map edge. */
  edge: 0.03,
  maxStreetNumber: 999,
  maxSeed: 2 ** 31 - 1,
  /** Share of storefront lots per district, by city size. */
  districtShares: {
    S: {
      financial: 0.06,
      downtown: 0.16,
      midtown: 0.24,
      university: 0.1,
      suburbs: 0.28,
      industrial: 0.1,
      waterfront: 0.06,
    },
    M: {
      financial: 0.08,
      downtown: 0.18,
      midtown: 0.22,
      university: 0.1,
      suburbs: 0.24,
      industrial: 0.1,
      waterfront: 0.08,
    },
    L: {
      financial: 0.1,
      downtown: 0.2,
      midtown: 0.22,
      university: 0.1,
      suburbs: 0.2,
      industrial: 0.08,
      waterfront: 0.1,
    },
    XL: {
      financial: 0.12,
      downtown: 0.22,
      midtown: 0.2,
      university: 0.1,
      suburbs: 0.18,
      industrial: 0.08,
      waterfront: 0.1,
    },
  },
} as const;

/** Street grid and shoreline (Stage 3; ART_DIRECTION §2). Lots snap to street frontage. */
export const CITY_LAYOUT = {
  /** A street every 4th row and column: 3×3 blocks of buildings between them. */
  block: 4,
  /** No lots this many tiles from the map edge. */
  edgeTiles: 2,
  /** Shoreline row = tiles × (base + amplitude × cos(2π(waves·x/tiles + phase))). */
  shore: { base: 0.91, amplitude: 0.025, waves: 1.5 },
} as const;

// ─── RIVALS (§18, Stage 1 scope) ──────────────────────────────────────────────
export const RIVAL_QUALITY_SIGMA = 0.2;
export const RIVAL_PLACEMENT = {
  jitter: [0.7, 1.3] as [number, number],
  spacing: 6,
  clusterPenalty: 0.5,
  /** Disruptor lot fit = base + young professional share + student share. */
  disruptorBase: 0.5,
  reviewsMin: 400,
  reviewsMax: 6000,
} as const;
/** A small bank with no IT floor rests near 3.75 (§16.9). */
export const START_APP_RATING = 3.75;
/** visitRate = SERVICE_VISIT_RATE × (base − slope × appRating) (§6.4). */
export const VISIT_APP = { base: 1.2, slope: 0.1 } as const;
/** Chance a new review card quotes an active campaign instead of a category. */
export const REVIEW_CAMPAIGN_CHANCE = 0.5;
/** Foreclosed home value for REO unit counts: mortgage ticket × income ÷ loan-to-value. */
export const REO_LTV = 0.75;
export const INTEREST_PERIODS = { monthsPerYear: 12 } as const;
/** apps = new accounts ÷ max(approval, 0.2) (§10.6). */
export const APPROVAL_FLOOR_FOR_APPS = 0.2;
/** Loan Desk sector pick: weight for sectors that fit the lot's district versus others. */
export const SECTOR_DISTRICT_WEIGHT = { match: 4, other: 1 } as const;

// ─── COMMAND LIMITS ───────────────────────────────────────────────────────────
/** Hourly wage stepper step and allowed range as a multiple of the market wage. */
export const WAGE_STEP = 0.25;
export const WAGE_RANGE: [number, number] = [0.5, 3];
/** Staff target ceiling as a multiple of staff needed. */
export const MAX_STAFF_MULT = 3;
export const MANAGER_SALARY_RANGE: [number, number] = [0.5, 3];
export const BRANCH_NAME_MAX = 32;

// ═══ STAGE 5: COMPETITION, MACRO AND NEWS ═════════════════════════════════════
// Each system below owns its own section; keep additions inside the right one.

// ─── STAGE 5 MAP SITES (CONTENT §14, §16) ─────────────────────────────────────
/** Chance an employer's payroll already sits with one of the city's rivals. */
export const EMPLOYER_PARTNER_CHANCE = 0.6;

// ─── RIVAL AI (§18) ───────────────────────────────────────────────────────────
/** Starting capital ratio range by strategy (§18.5, simplified financials). */
export const RIVAL_START_CR: Record<
  'incumbent' | 'disruptor' | 'premium' | 'community',
  [number, number]
> = {
  incumbent: [0.125, 0.14],
  premium: [0.13, 0.15],
  community: [0.105, 0.125],
  disruptor: [0.08, 0.1],
};
/** A mature rival branch's deposits at quality RIVAL_QUALITY_REF and incomeIndex 1 (§18.1). */
export const RIVAL_MATURE_DEPOSITS = 45_000_000;
export const RIVAL_QUALITY_REF = 3.4;
/** Rival loans per $ of deposits (their LDR). */
export const RIVAL_LDR = 0.82;
/** Risk weight on a rival's loans for its capital ratio. */
export const RIVAL_LOAN_RISK_WEIGHT = 0.75;

// ─── RIVAL CORPORATE LENDING (§19.9) ──────────────────────────────────────────

// ─── INCIDENTS (§23) ──────────────────────────────────────────────────────────

// ─── BANK RUNS AND RECAPITALISATION (§13.8, §15) ──────────────────────────────

// ─── NEWS: THE DAILY LEDGER (§24) ─────────────────────────────────────────────

// ─── PARTNERSHIPS AND UNIVERSITIES (§13.7) ────────────────────────────────────
