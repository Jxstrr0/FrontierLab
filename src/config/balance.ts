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
  /** Stage 5: rival AI, macro for every country, The Weekly Ledger, incidents. */
  competition: true,
  /** Stage 6: governance, executives and capital markets. */
  capitalMarkets: true,
  /** Stage 7: ventures, conventions and real estate. */
  investments: true,
  /** Stage 8: every city, airports and travel. */
  multiCity: true,
  /** Stage 9: personal wealth, homes, cars, auctions, franchise. */
  personalEmpire: true,
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
export const START_CASH = 900_000;
export const START_CASH_OPTIONS = [600_000, 900_000, 1_200_000, 1_500_000] as const;
/** The Settings developer tools' one-tap payment into corporate cash (SCREENS §26). */
export const DEV_PAYMENT = 10_000_000;
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
export const CREDIT_CYCLE = { floor: 0.8, slope: 0.35, base: 5.0 } as const;
export const LOAN_DEMAND = { gdpSlope: 0.05, rateSlope: 0.12, min: 0.6, max: 1.3 } as const;
/**
 * The nominal index (§4.6): each country's price-and-wealth level, 1 at the
 * start, compounding weekly at (gdp + inflation + trend) % a year. Balances per
 * account, market wages and rival books all scale with it, so a world whose
 * cities are full keeps growing about 8–9% a year in an expansion and the late
 * game runs into the hundreds of billions and beyond (DESIGN §5.9, decision log
 * 2026-10-26). `trend` (percentage points) is the one dial for how fast.
 */
export const NOMINAL_INDEX = { trend: 4.0 } as const;
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
export const MANAGER_SKILL = { mean: 62, sd: 16, min: 25, max: 98 } as const;
export const MANAGER_SALARY_SPREAD = { base: 0.7, slope: 0.6 } as const;
/**
 * Paying a recruiter for a fresh candidate list (SIMULATION §6.5, §17.2): the
 * first reroll costs feeShare × the role's market salary, and each further one
 * before the pool's free refresh multiplies the fee by `growth`.
 */
export const CANDIDATE_REROLL = { feeShare: 0.075, growth: 2 } as const;
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
/** Fee competitiveness floor: $ fees, % fees and per-unit (API) prices (C3a). */
export const FEE_COMP_MIN = { dollars: 1, pct: 0.0025, unit: 0.1 } as const;
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
/**
 * The city-wide customer pool (§9.2): how many customers your bank can win in
 * a city of each size, across all your branches there. Prospects shrink by
 * (1 − (customers in city ÷ CITY_MARKET)^CITY_SATURATION_EXP), so a city tops
 * out at a handful of branches, like a real bank's network.
 */
export const CITY_MARKET = { S: 32_000, M: 38_000, L: 50_000, XL: 72_000 } as const;
export const CITY_SATURATION_EXP = 3;
/** Advice only (UI and scripted strategies): about how many branches a city of each size supports. */
export const CITY_BRANCH_GUIDE = { S: 5, M: 7, L: 9, XL: 12 } as const;
/**
 * Sales office sizes (stage C2a, CONVERSION_PLAN §4): one office per city,
 * upgraded in place. `mult` scales seats (teller stations, advisor offices),
 * staff needed, ATM throughput, safe deposit boxes, rent, lease deposit,
 * overhead and the cost and upkeep of the interior slots (lobby, teller line,
 * vault, ATM). The exterior is one piece at every size. `hqUnits` is how
 * many offices' worth of HQ work it makes (§16.3 founder ramp, CONTENT §9).
 */
export const OFFICE_SIZES = [
  { name: 'Starter', mult: 1, hqUnits: 1 },
  { name: 'Standard', mult: 2.5, hqUnits: 2 },
  { name: 'Large', mult: 5, hqUnits: 3 },
  { name: 'Flagship', mult: 9, hqUnits: 4 },
] as const;
/**
 * Whole-city catchment (§9.1, C2a): an office's traffic is the city's typical
 * storefront traffic × min(size mult, CITY_BRANCH_GUIDE) × density ×
 * OFFICE_TRAFFIC_MULT, so a Flagship draws on what a full branch network used to.
 */
export const OFFICE_TRAFFIC_MULT = 1.5;
/**
 * Data centers (stage C2c, SIMULATION §9.9): a second building kind, built on a
 * free storefront lot or at a regional energy site. Its parts (GPU hall, power,
 * cooling) are in src/data/dataCenters.ts. Until compute arrives (C4) it lifts
 * Service where latency is low and costs power and rent each week.
 */
export const DATA_CENTER = {
  /** Weekly power bill per running GPU at PUE 1 and a power index of 1. */
  powerPerGpuWeek: 12,
  /** Power index at a regional energy site; a city's index is its costIndex. */
  energySitePower: 0.5,
  /** Weekly land lease at an energy site, × the site's costIndex. */
  energySiteRent: 3_000,
  /** Data centers one energy site can hold. */
  perEnergySite: 3,
  /** A hall upgrade refits for this share of the new hall's build weeks. */
  upgradeWeeksShare: 0.5,
  /** Service lift (stars) for sales offices in the data center's city … */
  liftSameCity: 0.25,
  /** … and in cities within `nearKm` of it. */
  liftNear: 0.1,
  nearKm: 1_200,
} as const;
/**
 * Compute (stage C4a, SIMULATION §13.0): the chip cycle moves a global compute
 * price index between a glut, normal times and a shortage, like the macro
 * phases. Office compute is priced in GPU-weeks at spotPerGpuWeek × index;
 * data-center GPUs serve demand first and only the rest is bought at spot.
 */
export const COMPUTE = {
  /** Spot price of one GPU-week at an index of 1. Office compute costs convert to GPUs at this price. */
  spotPerGpuWeek: 40,
  /** Weekly pull of the index toward its phase target, and the weekly noise. */
  ema: 0.08,
  sigma: 0.012,
  clamp: [0.5, 2] as readonly [number, number],
  minPhaseWeeks: 13,
  targets: { glut: 0.8, normal: 1, shortage: 1.3 },
  transitions: {
    normal: [
      { to: 'shortage', p: 0.012 },
      { to: 'glut', p: 0.012 },
    ],
    shortage: [{ to: 'normal', p: 0.03 }],
    glut: [{ to: 'normal', p: 0.03 }],
  } as Record<'glut' | 'normal' | 'shortage', { to: 'glut' | 'normal' | 'shortage'; p: number }[]>,
  /** Weeks of index history kept for the chart. */
  historyWeeks: 104,
} as const;
/**
 * The GPU market on the Compute floor (stage C4b, SIMULATION §13.0): offers
 * refresh every refreshWeeks while you have the floor, counted like funding
 * offers (FUNDING_OFFERS). Price = spot × index × (1 − type discount) ×
 * (1 + understaffedMarkup × (1 − coverage′)) × noise(±priceNoise). Size =
 * the type's GPU range × max(1, demand / sizeScale), rounded to sizeStep.
 */
export const GPU_MARKET = {
  refreshWeeks: 2,
  sizeScale: 2_000,
  sizeStep: 50,
  priceNoise: 0.04,
  understaffedMarkup: 0.1,
} as const;
/**
 * Spot compute limits (stage C4c, SIMULATION §13.0). Clouds sell you spot GPUs
 * up to spotLimit = min(baseGpus + trailMult × trail, maxGpus) × phaseMult, where trail is
 * an EMA (trailEma) of the spot and burst GPUs you bought. Past it, auto
 * spot-buy takes an emergency burst of up to burstShare × spotLimit at
 * burstPremium × spot, and any burst week marks you for stigmaWeeks (GPU
 * offers cost stigmaMarkup more). Demand still unserved above crunchFrom of
 * the total puts new sign-ups on a waitlist.
 */
export const SPOT = {
  baseGpus: 1_000,
  /** No cloud sells more than this at spot: a big lab must own or reserve compute. */
  maxGpus: 20_000,
  trailEma: 0.08,
  trailMult: 1.25,
  phaseMult: { glut: 1.2, normal: 1, shortage: 0.85 },
  burstShare: 0.25,
  burstPremium: 1.6,
  stigmaWeeks: 4,
  stigmaMarkup: 0.08,
  crunchFrom: 0.02,
} as const;
/** Outages (stage C4c, §13.0): after afterWeeks of crunch, churn × churnMult until weeks after it ends. */
export const OUTAGE = { afterWeeks: 3, weeks: 2, churnMult: 1.8 } as const;
/**
 * Customer businesses (stage C5a, SIMULATION §11.0): when a city is generated,
 * `lotShare` of each district's free storefronts become named businesses
 * (keeping at least `keepFreePerDistrict` open for offices), and its
 * employers become anchor accounts.
 * Yearly AI budget = size budget × lot income × sector mult × noise, at today's
 * price list. In a city with rival offices, `rivalHeld` of businesses (and
 * `anchorRivalHeld` of anchors) start with a rival contract worth
 * `contractShare` of the budget, renewing at a quarter start every
 * `termQuarters` of its sector.
 */
export const BUSINESS = {
  lotShare: 0.5,
  keepFreePerDistrict: 1,
  sizes: {
    small: { weight: 0.55, budget: 6_000, budgetPip: -1, switchPip: -1 },
    mid: { weight: 0.33, budget: 25_000, budgetPip: 0, switchPip: 0 },
    large: { weight: 0.12, budget: 90_000, budgetPip: 1, switchPip: 1 },
    anchor: { weight: 0, budget: 360_000, budgetPip: 2, switchPip: 2 },
  },
  /** C5b: schema-12 budgets were set at these per-size bases; migration 12 → 13 rescales them. */
  oldBudgets: { small: 30_000, mid: 120_000, large: 450_000, anchor: 1_800_000 },
  /** Anchor budget scales with headcount against this reference. */
  anchorEmployeesRef: 2500,
  budgetSigma: 0.3,
  pentagonSigma: 1.2,
  rivalHeld: 0.5,
  anchorRivalHeld: 0.7,
  contractShare: [0.7, 1] as [number, number],
  /** Names are retried this many times for one not yet used in the city. */
  nameTries: 6,
} as const;
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
export const FEE_STEP_MIN = { dollars: 2, pct: 0.0025, unit: 0.2 } as const;
export const FEE_PF_SCALE = 0.5;
export const PRODUCTS_PER_CUSTOMER = 1.6;

// ─── BOOKS (§10, §11) ─────────────────────────────────────────────────────────
export const OVERALL_CHURN = { slope: 0.6, pivot: 3.2 } as const;
export const INTERCHANGE = 0.015;
// ─── DEAL DESK (§11, stage C5b) ───────────────────────────────────────────────
/** Enterprise contracts with the businesses on the map (SIMULATION §11). */
export const DEAL = {
  /** Weekly chance an unserved business asks your office for a proposal, before awareness and readiness. */
  rfpWeekly: 0.07,
  /** RFP odds × (1 + readinessSlope × (AI readiness − 5)). */
  readinessSlope: 0.12,
  /** A new RFP waits this many weeks for your bid. */
  expiryWeeks: 3,
  /** A business that turned you down (or that you declined) waits this long before asking again. */
  cooldownWeeks: 13,
  /** Contracts due at a quarter start show under "Renewals due" this many weeks ahead (A7). */
  renewalNoticeWeeks: 4,
  /** Win chance = winBase + starSlope × (your stars − rival stars) + discountSlope × discount, clamped. */
  winBase: 0.5,
  /** Added when no rival lab has an office in the city. */
  noRivalBonus: 0.2,
  starSlope: 0.15,
  discountSlope: 1.5,
  /** Per Switching-cost point above 5: harder to win a business from its vendor, easier to keep your own. */
  switchSlope: 0.04,
  /** Your own renewals start from this keep chance. */
  keepBase: 0.8,
  winClamp: [0.05, 0.95],
  discountMax: 0.4,
  discountStep: 0.01,
  /** A new office's discount limit for its manager (and the default first offer). */
  defaultLimit: 0.1,
  /** A delegated manager bids the smallest discount within the limit that reaches this chance… */
  delegateTarget: 0.6,
  /** …and declines an RFP that stays under this one even at the limit. */
  delegateFloor: 0.3,
  /** Share of contract revenue that runs on compute (base spot dollars, SIMULATION §13.0). */
  computeShare: 0.3,
  /** Share of contract revenue spent on account management. */
  serviceShare: 0.1,
  /** Yearly failure odds of a business: failYear × exp(−failSlope × (Financial health − 5)) × credit cycle. */
  failYear: 0.03,
  failSlope: 0.25,
  /** While an outage runs: weekly chance a contract walks, × (1 + sensitivitySlope × (Data sensitivity − 5)). */
  outageLossWeekly: 0.02,
  sensitivitySlope: 0.1,
  /** Each quarter start, an unserved business in a city with rival offices signs with one at this chance. */
  rivalSignQuarterly: 0.12,
  /** Contracts worth at least this a year make the news when won or lost. */
  bigDeal: 250_000,
} as const;

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
/** Reserves earn the policy rate minus this spread (the central bank's deposit facility, §13.4). */
export const RESERVE_RATE_SPREAD = 0.005;
export const LIQ_TARGET_DEFAULT = 0.15;
export const LIQ_TARGET_RANGE: [number, number] = [0.1, 0.4];
export const LIQ_REPAY_BUFFER = 0.05;
export const FREEZE_RELEASE = 0.02;
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
/** ARR per participating employee in a company partnership (§13.7, C3a): about a Team seat. */
export const ARR_PER_EMPLOYEE = 300;
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
 * Game over (DESIGN §5.18). Insolvency: corporate cash below zero for 4 weeks.
 * Takeover: the capital ratio stays below takeoverCr until the emergency
 * recapitalisation (RECAP, §15) is declined or fails to lift it in time.
 */
export const FAILURE = { insolvencyWeeks: 4, takeoverCr: 0.045 } as const;

// ─── RISK APPETITE (§16.8) ────────────────────────────────────────────────────
export const RISK_APPETITE = {
  volumeMult: [0.7, 0.85, 1.0, 1.15, 1.3],
  pdMult: [0.7, 0.85, 1.0, 1.2, 1.45],
} as const;
export const DEFAULT_RISK_APPETITE = 3;

// ─── HQ (§16) ─────────────────────────────────────────────────────────────────
/**
 * Office listings per city by size, and how they're built (§16.1, CONTENT §9).
 * A bank only ever needs a handful of offices, so each city lists just a few
 * (owner's ask, 2026-10-26; before: 3/5/7/9).
 */
export const OFFICE_LISTINGS = {
  countBySize: { S: 2, M: 2, L: 3, XL: 4 },
  /** Share of listings per district, by largest remainder (the rest of the city has none). */
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
/** Main offices (HQ buildings) you can lease: HQ plus one more in another country (C2d2). */
export const MAIN_OFFICES_MAX = 2;
export const FLOOR_FITOUT_LIFE_WEEKS = 520;
export const DESKS_PER_FLOOR_OPTIONS = [24, 32] as const;
export const EXEC_SUITE_DESKS = 7;
export const INVESTMENT_FLOOR_DESKS = 32;
/** Releasing a floor or office lets staff above the remaining desks go with this severance. */
export const SEVERANCE_WEEKS = 4;
/**
 * Founder-mode ramp: full requirements at this size, or phased in from 3 to 6
 * office units (§16.3; C2a: each office counts its OFFICE_SIZES hqUnits).
 */
export const FOUNDER_MODE_ASSETS = 250_000_000;
export const FOUNDER_RAMP = { fromBranches: 3, overBranches: 5 } as const;
/**
 * Required staff per department (CONTENT §9):
 * base + perBranch × office units (a Starter is 1, a Flagship 4) + per$ × the
 * department's dollar driver.
 */
export const DEPT_REQUIREMENTS = {
  finance: { base: 2, perBranch: 0.35, perAssets: 1 / 2e9, public: 4 },
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
 * tier — rates −0.10pp / 0 / +0.15pp (Loan Desk-style rate products), prices ×0.85 / 1 /
 * ×1.25 — and Premium adds a small Products rating bump where it's offered.
 */
export const DEV_TIER = {
  rateAdd: { low: -0.001, medium: 0, premium: 0.0015 },
  feeMult: { low: 0.85, medium: 1, premium: 1.25 },
  productsBump: { low: 0, medium: 0, premium: 0.05 },
} as const;
export const PRODUCT_NAME_MAX = 32;

// ─── THE AI MODEL (§16.7, stage C6a) ──────────────────────────────────────────
/** Custom model quality: 0.9 + 0.2 × productsCoverage′ × avgSkill/100. */
export const MODEL_QUALITY = { base: 0.9, slope: 0.2 } as const;
/** Vendor-hosted custom model: fixed quality and a 15% hosting markup. */
export const BUREAU_HOSTED = { qualityMult: 0.95, costMult: 1.15 } as const;
/**
 * Customer Feedback Reasoning = 4 + min(5, customers / 50,000 × 5); it can be
 * mixed in once the lab has minCustomers customers.
 */
export const INTERNAL_HISTORY = {
  accuracyBase: 4,
  accuracyGain: 5,
  fullCustomers: 50_000,
  minCustomers: 5_000,
} as const;
/**
 * What the model does (C6a): Efficiency scales the compute behind every
 * customer (×1 at efficiencyRef, the starting package), and model quality
 * (the radar mean) above qualityRef lets prices sit above market and wins
 * contracts; Safety counts with data-sensitive businesses.
 */
export const MODEL_EFFECTS = {
  efficiencyRef: 7,
  efficiencySlope: 0.05,
  qualityRef: 5.8,
  headroomSlope: 0.04,
  dealQuality: 0.05,
  dealSafety: 0.03,
} as const;
/** CPO delegation: a local package must beat the model by minGain after costWeight × $ per customer. */
export const MODEL_DELEGATE = { minGain: 0.3, costWeight: 0.02 } as const;
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
/** Storefronts per city on layout 1 (maps from saves before 2026-10-25 keep them). */
export const LOT_COUNT_BY_SIZE = { S: 36, M: 56, L: 80, XL: 110 } as const;
/**
 * Storefronts per city on layout 2+ (CONTENT §3): room for your bank plus room
 * for each rival bank in the city, so good corners feel slightly scarce and a
 * crowded city has more of them. With the usual rival count: S 20, M 32, L 44, XL 62.
 */
export const LOTS_BASE = { S: 12, M: 18, L: 24, XL: 32 } as const;
export const LOTS_PER_RIVAL = { S: 4, M: 4.5, L: 5, XL: 6 } as const;
/**
 * Cities grow (CONTENT §3): every `everyYears` at the year end, each generated
 * city (not a regional site) adds `share` × the storefronts it started with,
 * placed by district like the originals, until it has added `maxGrowth` × that
 * count. Gives both you and the rivals room to keep building in a long game.
 */
export const CITY_GROWTH = { everyYears: 2, share: 0.1, maxGrowth: 1.5 } as const;
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
export const INTEREST_PERIODS = { monthsPerYear: 12 } as const;
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
/** Books move this share of the gap to their target each week (§18.1). */
export const RIVAL_BOOK_EMA = 0.05;
/** Branches opened after the start ramp to their mature size over this many weeks (§18.1). */
export const RIVAL_RAMP_WEEKS = 156;
/**
 * Local competition on a rival branch's target deposits (assumption, DESIGN §7):
 * target × (1 / (1 + crowdK × max(0, crowd − crowdFree)) − playerK × Σ w × max(0, share − playerShareRef)),
 * where crowd and w use the share formula's distance weights within RIVAL_RADIUS (§9.3).
 */
export const RIVAL_COMPETITION = {
  crowdFree: 2,
  crowdK: 0.1,
  playerShareRef: 0.15,
  playerK: 1.2,
  min: 0.35,
} as const;
/** Loans = deposits × RIVAL_LDR × (1 + slope × (loanDemand − 1)). */
export const RIVAL_LDR_DEMAND_SLOPE = 0.3;
/**
 * Simplified weekly financials by strategy (§18.5): net interest margin on loans,
 * fee yield on deposits, cost and loss multipliers, how hard the credit cycle
 * bites (losses × (1 + cycleSens × (creditCycle − 1)); thin-file disruptors feel
 * a recession most), the capital ratio dividends steer toward, and the
 * expansion rate multiplier (disruptors 0.25×, §18.4).
 */
export const RIVAL_FINANCE: Record<
  'incumbent' | 'disruptor' | 'premium' | 'community',
  {
    nim: number;
    feeMult: number;
    costMult: number;
    lossMult: number;
    cycleSens: number;
    crTarget: number;
    expandMult: number;
  }
> = {
  incumbent: {
    nim: 0.03,
    feeMult: 1.1,
    costMult: 1,
    lossMult: 1,
    cycleSens: 4,
    crTarget: 0.13,
    expandMult: 1,
  },
  premium: {
    nim: 0.031,
    feeMult: 1.4,
    costMult: 1.3,
    lossMult: 0.7,
    cycleSens: 3,
    crTarget: 0.14,
    expandMult: 1,
  },
  community: {
    nim: 0.028,
    feeMult: 0.8,
    costMult: 0.95,
    lossMult: 1.1,
    cycleSens: 5,
    crTarget: 0.115,
    expandMult: 1,
  },
  disruptor: {
    nim: 0.026,
    feeMult: 0.4,
    costMult: 0.6,
    lossMult: 1.6,
    cycleSens: 7,
    crTarget: 0.085,
    expandMult: 0.25,
  },
};
/** NIM moves with the policy rate's gap from neutral (low rates squeeze deposit margins). */
export const RIVAL_NIM_POLICY_SLOPE = 0.25;
/** Gross loan yield over policy, for reported revenue. */
export const RIVAL_LOAN_YIELD_SPREAD = 0.03;
/** Fee income per $ of deposits a year, before the strategy multiplier. */
export const RIVAL_FEE_YIELD = 0.02;
/** Weekly cost of running a branch, × city cost index × strategy cost multiplier × the price list (§4.6). */
export const RIVAL_BRANCH_COST = 18_000;
/** Servicing cost per $ of deposits a year. */
export const RIVAL_SERVICING = 0.004;
/** Annual loss rate on loans in a neutral cycle, before the strategy multiplier. */
export const RIVAL_BASE_LOSS_RATE = 0.006;
/** Monthly expansion check (§18.4). */
export const RIVAL_EXPANSION = {
  everyWeeks: 4,
  minCr: 0.11,
  /**
   * Chance per monthly check, in each city it serves, that an eligible rival
   * grows its office there, divided by the units the next size adds (C2b).
   */
  chance: 0.06,
  /** Trailing profit needs this many reported quarters (so no openings in year one). */
  minQuarters: 4,
  /** Rivals stop opening once they hold this share of a city's lots… */
  maxRivalLotShare: 0.4,
  /** …or once fewer than this share of lots is free. */
  minFreeLotShare: 0.2,
  /** Build cost taken from equity, × city cost index × the nominal index. */
  buildCost: 450_000,
  reviews: [20, 120] as [number, number],
  /**
   * Entering a new city (§18.4): an eligible rival with at least entryMinUnits
   * units (offices counted by size multiplier, C2b) rolls entryChance each monthly check to open its first branch in a
   * generated city it doesn't serve, in a home country, or anywhere once it
   * serves abroadMinCities cities. The city with the most free lots wins.
   */
  entryChance: 0.05,
  entryMinUnits: 6,
  abroadMinCities: 3,
} as const;
/**
 * Rivals learn (§18.3): at each year end, every rival branch in a city where you
 * run branches moves each quality coin `step` toward your average overall rating
 * there when it's behind, up to `maxQuality`; a rival's app rating does the same
 * toward yours. So a rival you out-serve closes the gap over the years instead
 * of standing still.
 */
export const RIVAL_LEARNING = { step: 0.1, maxQuality: 4.6 } as const;
/**
 * New rivals get chartered (§18.7): at each year end, every generated city
 * (not a regional site) rolls `chance` when it has fewer active rival banks than
 * its usual count, or `roomChance` when it is full but still has `roomShare` of
 * its storefronts free. At most `maxPerYear` new banks a year. A new bank opens
 * `branches` storefronts in that city with `capital` × the nominal index of
 * starting equity, is private, and starts growing after a year like any rival.
 */
export const RIVAL_CHARTER = {
  chance: 0.35,
  roomChance: 0.08,
  roomShare: 0.35,
  maxPerYear: 3,
  branches: [2, 3] as [number, number],
  capital: 25_000_000,
  strategyWeights: { disruptor: 0.35, community: 0.3, premium: 0.2, incumbent: 0.15 },
} as const;
/**
 * Rivals buy each other (§18.8): at each quarter-end, every active rival with a
 * profitable year and capital `excessCr` above its strategy target rolls
 * `chance` to bid for the best smaller rival it shares a city or home country
 * with (equity at most `maxTargetShare` of its own). The price is book value ×
 * (1 + a premium in `premium`), paid to every holder; the premium comes off the
 * buyer's equity. The deal needs the buyer's pro-forma capital ratio to stay at
 * or above MERGERS.minProFormaCr. At most `maxPerQuarter` deals a quarter.
 */
export const RIVAL_MERGERS = {
  chance: 0.04,
  minQuarters: 4,
  excessCr: 0.015,
  maxTargetShare: 0.5,
  premium: [0.15, 0.4] as [number, number],
  maxPerQuarter: 1,
} as const;
/**
 * Rival ad campaigns (§18.9): each monthly check, a profitable rival rolls
 * `chance` × its strategy weight in each city it shares with your branches.
 * A campaign lifts its branches' overall rating there by `boost` for `weeks`
 * weeks (in the share formula and its own deposit target) and costs
 * `costPerBranch` a week per branch there, × the city's cost index and price list.
 */
export const RIVAL_MARKETING = {
  chance: 0.04,
  boost: 0.15,
  weeks: 12,
  costPerBranch: 6_000,
  weight: { incumbent: 1, premium: 1.2, community: 0.8, disruptor: 0.5 },
} as const;
/**
 * Rival tech (§18.9): at each year end, a rival with a profitable year spends
 * `spendShare` of that year's profit on technology: its app rating moves `appStep`
 * toward its strategy's `appCap`, and every branch's Products coin moves
 * `productStep` up to RIVAL_LEARNING.maxQuality. A disruptor that reaches
 * `growUpBranches` branches becomes an incumbent (full expansion speed, its
 * prices drift to the incumbent sheet).
 */
export const RIVAL_TECH = {
  spendShare: 0.05,
  appStep: { incumbent: 0.08, premium: 0.08, community: 0.1, disruptor: 0.12 },
  appCap: { incumbent: 4.4, premium: 4.6, community: 4.0, disruptor: 4.9 },
  productStep: 0.05,
  growUpBranches: 20,
} as const;
/**
 * Close a branch after this many negative weeks, ignoring its first graceWeeks
 * (§18.4). Weeks while its country is in one of `holdPhases` don't count: a
 * bank rides out a downturn instead of closing healthy branches (2026-10-26).
 */
export const RIVAL_CLOSURE = {
  negativeWeeks: 26,
  graceWeeks: 52,
  holdPhases: ['recession', 'recovery'] as readonly string[],
} as const;
/** Review cards shown on a rival branch panel (derived, not stored). */
export const RIVAL_REVIEW_CARDS = 4;
/** New reviews a rival branch collects each week. */
export const RIVAL_REVIEWS_PER_WEEK = 2;
/**
 * Quarterly dividends: clamp(excessShare × excess capital, ratio × net income,
 * maxRatio × net income), never more than the excess; paid only when profitable
 * and above the strategy's capital target.
 */
export const RIVAL_PAYOUT = { ratio: 0.45, maxRatio: 0.8, excessShare: 0.5 } as const;
/**
 * Rival share counts are fixed at the start: starting equity ÷ bookPerShare, so
 * every rival starts at a $20 book value per share. Prices then follow §19.5
 * (listed) or book value (private), see src/sim/marketRivals.ts.
 */
export const RIVAL_NOTIONAL_SHARE = {
  bookPerShare: 20,
} as const;
export const RIVAL_EXEC_RESIGN_CHANCE = 0.03;
/**
 * Recession failure check (§18.5): CR below maxCr fails with `chance` per quarter.
 * A rival whose CR falls below insolventCr is seized at quarter-end in any phase
 * (assumption, DESIGN §7: no zombie banks with negative equity).
 */
export const RIVAL_FAILURE = {
  maxCr: 0.06,
  chance: 0.15,
  insolventCr: 0.02,
  distressWeeks: 8,
} as const;
/** Price wars (§18.6). Bumps are shares cut off rival plan prices; decay per week once your streak ends. */
export const PRICE_WAR = {
  minRating: 4.0,
  streakWeeks: 8,
  everyWeeks: 4,
  chance: 0.3,
  bump: 0.05,
  cap: 0.2,
  decay: 0.005,
} as const;

// ─── RIVAL CORPORATE LENDING (§19.9) ──────────────────────────────────────────
export const CORPORATE_LENDING = {
  refreshWeeks: 4,
  offersPerRival: [2, 3] as [number, number],
  /** Loan offers up to this share of your equity, less corporate debt already owed. */
  maxEquityShare: 0.4,
  /** Smallest offer worth making. */
  minAmount: 50_000,
  amountStep: 10_000,
  /** Offer size as a share of the room left. */
  sizeRange: [0.3, 1] as [number, number],
  /** Rate = home policy + spread: best at crBest, worst at crWorst. */
  spreadBest: 0.025,
  spreadWorst: 0.05,
  crBest: 0.16,
  crWorst: 0.08,
  spreadNoise: 0.004,
  terms: [52, 78, 104, 130, 156] as const,
  /** Line of credit: limit share of equity per lender, rate = policy + lineSpread. */
  lineEquityShare: 0.2,
  lineSpread: 0.04,
  /** Balances below this count as repaid. */
  dust: 0.5,
} as const;

// ─── INCIDENTS (§23) ──────────────────────────────────────────────────────────
/**
 * Incident engine (§23, §17.1). Per-incident numbers live in src/data/incidents.ts.
 * An unresolved incident takes its worst option `deadlineWeeks` after it was raised;
 * each type waits `cooldownWeeks` per scope before it can fire again.
 * A delegated manager scores each option by expected cost, with noise
 * normal(0, managerError × (1 − (People + Ethics)/200)) as a share of that cost;
 * non-cash effects are valued in weeks of the branch's revenue (at least minWeeklyValue).
 * A branch with no manager reads ethics as defaultEthics; the CTO's expertise
 * comes from the CTO seat (EXECUTIVES.vacantCtoExpertise while it is empty).
 */
export const INCIDENTS = {
  deadlineWeeks: 4,
  cooldownWeeks: 8,
  managerError: 0.5,
  minWeeklyValue: 10_000,
  defaultEthics: 50,
  /** Rating modifiers are clamped to the 1–5 scale like every rating. */
  ratingMin: 1,
  ratingMax: 5,
  /** Morale stays on its 0–100 scale. */
  moraleMax: 100,
} as const;
/**
 * fraudShield, 0–10 (decision log): itWeight × IT coverage′ + modelWeight × the
 * AI model's Safety (1–10, C6a) + the branch ATM's bonus. A
 * company-level check (card fraud) has no ATM bonus.
 */
export const FRAUD_SHIELD = {
  itWeight: 4,
  modelWeight: 0.4,
  max: 10,
  atmBonus: { atm_none: 0, atm_wall: 0, atm_dual: 0.5, atm_smart: 1, atm_lobby: 1.5 } as Record<
    string,
    number
  >,
} as const;

// ─── BANK RUNS AND RECAPITALISATION (§13.8, §15) ──────────────────────────────
/**
 * Bank runs (§13.8): while the average overall rating is under maxOverall and the
 * tier is Restricted/Critical or the liquidity ratio is under maxLiquidity, a run
 * starts with weeklyChance and lasts `weeks`; deposit churn × runMult meanwhile.
 * BANK_RUN options: the central bank window borrows windowShare × deposits;
 * the price cut takes planCut off every plan price for boostWeeks;
 * a public statement succeeds with statementBase + statementPerPoint per CR point
 * above statementFromCr (capped at statementMax) and ends the run.
 */
export const BANK_RUN = {
  maxOverall: 2.6,
  maxLiquidity: 0.08,
  weeklyChance: 0.04,
  weeks: [3, 6] as [number, number],
  runMult: 6,
  windowShare: 0.1,
  planCut: 0.1,
  boostWeeks: 8,
  statementBase: 0.3,
  statementPerPoint: 0.05,
  statementFromCr: 0.08,
  statementMax: 0.95,
} as const;
/**
 * Emergency recapitalisation (§15): after offerWeeks in a row below
 * FAILURE.takeoverCr, the regulator offers forced new shares at RECAP_DISCOUNT of
 * book value per share, enough to reach targetCr (rounded up to roundTo). Still
 * below FAILURE.takeoverCr graceWeeks after accepting means a takeover.
 * minPrice floors the share price when book value is at or below zero.
 */
export const RECAP = {
  offerWeeks: 8,
  graceWeeks: 5,
  targetCr: 0.105,
  roundTo: 1_000,
  minPrice: 0.01,
} as const;

// ─── NEWS: THE WEEKLY LEDGER (§24) ─────────────────────────────────────────────
/** Articles per weekly issue, the Top tab's size and how many issues the archive keeps. */
export const NEWS_ARTICLES_MIN = 6;
export const NEWS_ARTICLES_MAX = 14;
export const NEWS_TOP_N = 6;
export const NEWS_ARCHIVE_ISSUES = 52;
/** Central bank stories from countries where you don't operate, per issue (moves first). */
export const NEWS_CB_ABROAD_MAX = 2;
/** Most stories of one kind per issue, so a busy quarter doesn't flood the paper. */
export const NEWS_GROUP_CAPS: Record<string, number> = {
  earnings: 3,
  dividend: 2,
  rivalBranch: 3,
  exec: 2,
  sports: 2,
  economy: 1,
  incident: 2,
  ventures: 2,
  /** Your routine stories (weekly figures, loans, a watch-tier capital note, rate watch). */
  youRoutine: 2,
  auctions: 1,
  world: 4,
  movers: 2,
  corporate: 1,
  commodities: 2,
  calendar: 2,
  sportsAbroad: 1,
  elections: 2,
};
/**
 * Story priority (higher leads; Top = the six highest). SIMULATION §24 order:
 * your company, central banks (yours first), rivals in your cities, earnings,
 * conventions/auctions, sports, then filler.
 */
export const NEWS_PRIORITY = {
  companyAlarm: 120,
  company: 100,
  companyRoutine: 82,
  /** Your week's figures: below rivals in your cities, above central banks abroad. */
  companyWeek: 66,
  cbHome: 95,
  cbOperated: 90,
  cbAbroadMove: 64,
  cbAbroadHold: 52,
  rivalLocal: 75,
  rivalAbroad: 40,
  earnings: 58,
  sports: 30,
  politicsLocal: 45,
  politicsAbroad: 24,
  ranking: 70,
  housing: 34,
  market: 26,
  economy: 22,
  rateWatch: 20,
  poll: 18,
  filler: 12,
  /** World desk stories (§24.1): home country, then everywhere else. */
  worldHome: 40,
  world: 36,
  /** A listed company's big weekly share move, and corporate news. */
  mover: 44,
  corporate: 28,
  column: 32,
  sportsAbroad: 22,
  electionLocal: 60,
  electionAbroad: 42,
  /** Commodities (§24.4): a sharp week, a one-year high or low, the monthly wrap. */
  commodityMove: 40,
  commodityRecord: 38,
  commodityWrap: 37,
  /** From the archive (§24.5). */
  archive: 31,
  /** World calendar (§24.6): announcements and rounds, then finals and closing days. */
  calendar: 46,
  calendarFinal: 52,
  /** Annual fixtures (prizes, awards, fireworks, the sale weekend). */
  annual: 38,
};
/**
 * The world desk (§24.1): stories drawn from every country each week, chosen by
 * its economy and season; a beat won't repeat in the same country for
 * `cooldownWeeks`.
 */
export const NEWS_WORLD = {
  perIssue: 4,
  /** World stories every issue keeps, however busy the week. */
  minPerIssue: 2,
  /** Chance the home country is the one picked for a slot (otherwise any other country). */
  homeShare: 0.25,
  cooldownWeeks: 26,
  /** Inflation (%) above which price stories appear; unemployment (%) below which hiring booms do. */
  highInflation: 3.5,
  lowUnemployment: 4.5,
  /** House prices up more than this over a year (decimal) bring rent stories. */
  housingHot: 0.04,
};
/** Company desk (§24.2): share moves of at least moverMin (%) get a story; weekly chance of corporate news per issue. */
export const NEWS_COMPANY_DESK = {
  moverMin: 6,
  /** …and at least this many of the company's own weekly standard deviations. */
  moverSigma: 2.2,
  corporateChance: 0.35,
  /** Jobs at a company's new site. */
  siteJobs: [150, 1200] as [number, number],
};
/**
 * Commodities (§24.4): each week a commodity's log price moves by its own noise,
 * plus driftPerWeek × its lean × the world mood (expansion 1 … recession −1),
 * plus a pull of `revert` back toward its base price grown with the world's
 * average nominal index. A week of at least `newsMove` (%) or a one-year high
 * or low is news; a wrap of all five runs on the first issue of each month.
 */
export const NEWS_COMMODITIES = {
  driftPerWeek: 0.004,
  revert: 0.03,
  newsMove: 8,
  /** Weeks a commodity goes without a one-year high (low) before the next one is news again. */
  recordGapWeeks: 8,
  historyWeeks: 53,
  /** The monthly wrap quotes each price's change over this many weeks. */
  wrapWeeks: 4,
  mood: { expansion: 1, recovery: 0.5, slowdown: -0.5, recession: -1 },
};
/**
 * From the archive (§24.5): every `everyWeeks` issue's lead story is kept for
 * good, and on those weeks the paper reprints the one from the furthest of
 * `yearsBack` that exists.
 */
export const NEWS_ARCHIVE = {
  everyWeeks: 4,
  yearsBack: [10, 5, 3, 2, 1],
  /** One-year-old stories are reprinted only on every n-th archive week, so others age to 2, 3, 5 or 10 years. */
  oneYearEvery: 2,
};
/**
 * World calendar (§24.6). Nations Cup goals per side ~ Poisson(goalBase +
 * goalEdge × (own − other strength), at least goalMin); the host plays with
 * +hostEdge strength; a level knockout game goes to penalties, won with
 * 0.5 + penaltyEdge × the strength gap. World Games golds per nation ~
 * Poisson(goldBase + goldPerStrength × strength, + hostGolds for the host);
 * silver and bronze the same.
 */
export const NEWS_CALENDAR = {
  goalBase: 1.3,
  goalEdge: 1.5,
  goalMin: 0.2,
  hostEdge: 0.1,
  penaltyEdge: 0.5,
  goldBase: 3,
  goldPerStrength: 30,
  hostGolds: 8,
  athletes: [8000, 12000] as [number, number],
  /** Golds won by the Games' star athlete. */
  starGolds: [3, 5] as [number, number],
  pavilions: [120, 200] as [number, number],
  /** Expo visitors, millions. */
  visitors: [18, 40] as [number, number],
  /** Sale-weekend spending (start-of-game home money): a good year, a weak one. */
  saleBoom: [6e9, 9e9] as [number, number],
  saleQuiet: [2e9, 4e9] as [number, number],
  /** Shoppers (millions) out over the sale weekend. */
  saleShoppers: [18, 34] as [number, number],
};
/** The Money Column (§24.3) runs every n weeks; a rate move within rateWindowWeeks sets its topic. */
export const NEWS_COLUMN = { everyWeeks: 2, rateWindowWeeks: 13 };
/**
 * Elections (§24 Politics): every country votes every termWeeks, staggered by
 * staggerWeeks per country; campaign news runs from campaignWeeks before.
 * The poll leader wins with leaderWinP, otherwise the runner-up.
 */
export const NEWS_ELECTIONS = {
  termWeeks: 208,
  staggerWeeks: 21,
  campaignWeeks: 6,
  leaderWinP: 0.7,
  /** Poll points the winner gains on the night, renormalised (a honeymoon that fades with drift). */
  winnerBounce: 8,
};
/** Weekly figures still print every n weeks when nothing notable happened; so does a Watch-tier capital note. */
export const NEWS_ROUTINE_EVERY_WEEKS = 4;
/** Weeks of history before a best-ever week counts as a record, and how far (decimal) it must top the old best. */
export const NEWS_RECORD_MIN_WEEKS = 12;
export const NEWS_RECORD_MARGIN = 0.1;
/** Housing story every n weeks per country you operate in, once a year of prices exists. */
export const NEWS_HOUSING_EVERY_WEEKS = 4;
/** A poll story every n weeks in your home country. Weekly poll drift (points, σ). */
export const NEWS_POLL_EVERY_WEEKS = 6;
export const NEWS_POLL_DRIFT = 1.2;
export const NEWS_POLL_FLOOR = 8;
/** Politics (§24): weekly chance a country's government tables a proposal, and the vote. */
export const NEWS_POLICY_PROPOSE_P = 0.012;
export const NEWS_POLICY_VOTE_WEEKS: [number, number] = [3, 8];
export const NEWS_POLICY_PASS_P = 0.5;
/** Share of proposals that are a capital buffer (the one with a game effect). */
export const NEWS_CAPITAL_BUFFER_SHARE = 0.3;
/** A passed capital buffer: tier thresholds rise by this many pp for this many weeks. */
export const CAPITAL_BUFFER_PP = 1;
export const CAPITAL_BUFFER_WEEKS = 52;
/** Sports: chance of a draw where leagues allow them, and how much strength tilts a match. */
export const SPORTS_DRAW_P = 0.24;
export const SPORTS_STRENGTH_WEIGHT = 0.9;
/** Win-probability bounds, and the chance a level game goes to extra time (no-draw leagues). */
export const SPORTS_WIN_P_RANGE: [number, number] = [0.15, 0.85];
export const SPORTS_EXTRA_TIME_P = 0.12;
/** League table points for a win and a draw. */
export const SPORTS_POINTS = { win: 3, draw: 1 };
/** Rankings: banks named in Fastest Growing, and the asset floor to qualify. */
export const RANKING_SIZE = 3;
export const RANKING_MIN_ASSETS = 1_000_000;
/**
 * Yield curve on the central bank panel (SCREENS §8): each tenor is the policy
 * rate plus this share of the term premium, so a negative premium (slowdown,
 * SIMULATION §4.2) inverts the curve.
 */
export const YIELD_CURVE: { label: string; premiumShare: number }[] = [
  { label: 'Overnight', premiumShare: 0 },
  { label: '2y', premiumShare: 0.45 },
  { label: '5y', premiumShare: 0.8 },
  { label: '10y', premiumShare: 1 },
];

// ─── PARTNERSHIPS AND UNIVERSITIES (§13.7) ────────────────────────────────────
/** Contract length L in weeks ("Year X of 7", CONTENT §14). */
export const PARTNER_CONTRACT_WEEKS = 364;
/** Signing fee = employees × PARTNER_FEE_PER_EMPLOYEE × income mult × city incomeIndex (CONTENT §14). */
export const PARTNER_FEE_PER_EMPLOYEE = 160;
// ARR_PER_EMPLOYEE ($300 per participating employee) sits with the treasury constants above.
/**
 * Participation curve over a contract of L weeks (§13.7): an S-curve from 0 to
 * `rampTo` by `rampWeeks` (logistic with this `steepness`, rescaled to hit both
 * ends exactly), linear to `peak` by `matureWeeks`, flat until L − `declineWeeks`,
 * then linear down to `end` at L.
 */
export const PARTICIPATION = {
  rampWeeks: 52,
  rampTo: 0.65,
  steepness: 8,
  matureWeeks: 104,
  peak: 0.8,
  declineWeeks: 104,
  end: 0.45,
} as const;
/** Share of the gap to the balance target closed each week (§13.7). */
export const PARTNER_BALANCE_STEP = 0.15;
/**
 * Relationship health (§13.7): target = base + perOverall × (hostOverall − pivot)
 * + perComp × c_package + perksBonus, eased by `ema`. Below `terminateBelow` for
 * `terminateWeeks` straight weeks the partner walks. The balance target scales
 * by balanceBase + balanceSlope × health/100. New partnerships start at `start`.
 */
export const PARTNER_HEALTH = {
  start: 60,
  base: 40,
  perOverall: 12,
  overallPivot: 3,
  perComp: 10,
  ema: 0.05,
  terminateBelow: 30,
  terminateWeeks: 8,
  balanceBase: 0.5,
  balanceSlope: 0.6,
} as const;
/** perksBonus = perMoralePoint × the benefits' morale bonus (HR, §16.5), capped at max. */
export const PARTNER_PERKS = { perMoralePoint: 1, max: 10 } as const;
/** A terminated, lapsed or released partnership's balance leaves over this many weeks. */
export const PARTNER_RUNOFF_WEEKS = 12;
/** Renewal fee = current signing fee × (base − health/100), in the last `windowWeeks` of the term. */
export const PARTNER_RENEWAL = { base: 1.5, windowWeeks: 52 } as const;
/**
 * University student partnership: students enrolled by city size, fee per
 * student × city incomeIndex, and a lower balance per participating student.
 */
export const STUDENT_PARTNERSHIP = {
  students: { S: 6000, M: 10000, L: 16000, XL: 24000 },
  feePerStudent: 30,
  arrPerStudent: 80,
} as const;
/**
 * University graduate program (DESIGN §5.8.10): yearly cost × the city's
 * wageIndex, paid up front and each year (P&L `benefits`); +skillBonus to
 * manager candidate skills (§17.2) and +hireBonus hires per week at branches
 * and HQ floors (§6.3).
 */
export const GRAD_PROGRAM = { yearlyCost: 120_000, skillBonus: 10, hireBonus: 1 } as const;

// ─── PERSONAL (SIMULATION §22) ────────────────────────────────────────────────
export const PERSONAL_TAX = 0;

// ─── TRAVEL (SIMULATION §22, DESIGN §5.17) ────────────────────────────────────
/** Free flying per week (the original's allowance); resets every weekly tick. */
export const TRAVEL_KM_PER_WEEK = 24_140;
/**
 * One-way fare past the allowance, × the destination's costIndex (the original
 * shows a flat £80,000). Paid from personal cash; any shortfall the bank pays
 * as a travel expense, so travel is never blocked.
 */
export const FLIGHT_FARE = 80_000;
/** Mean Earth radius for great-circle distances. */
export const EARTH_RADIUS_KM = 6_371;
/** Kilometres in a statute mile, for showing distances in miles (settings.units). */
export const KM_PER_MILE = 1.609344;
/** Private jet (§22): upkeep and depreciation per year of its value; resale haircut. */
export const JET = { upkeepRate: 0.08, depreciation: 0.06, resaleHaircut: 0.1 } as const;

// ─── PERSONAL EMPIRE (SIMULATION §22, Stage 9) ────────────────────────────────
/** Vacation homes: value tracks the country's hpi; upkeep per year; rebuild; sale fee. */
export const HOMES_CFG = {
  upkeepRate: 0.01,
  rebuildCost: 0.25,
  rebuildWeeks: 8,
  rebuildGain: 0.2,
  /** Offers run from 85% of asking (a linear acceptance ramp to 100%, as buildings). */
  offerMin: 0.85,
  /** Offer stepper step, as a share of asking. */
  offerStep: 0.01,
  /** A refused offer: the seller won't hear another for this many weeks (assumption). */
  refusalWeeks: 4,
  sellFee: 0.05,
  /** Purchases at or above this make The Weekly Ledger. */
  newsMin: 10_000_000,
} as const;
/** Weekly net worth kept for the Personal Wealth screen's weekly change. */
export const WEALTH_HISTORY_WEEKS = 53;
/** Cars: yearly value change (classics gain), upkeep, resale haircut. */
export const CARS_CFG = {
  depreciation: 0.12,
  classicGain: 0.03,
  upkeepRate: 0.02,
  resaleHaircut: 0.1,
} as const;
/**
 * Collectibles (SIMULATION §22): every piece not found to be fake drifts
 * +3%/yr with σ 8% at each year start (never below floorShare × what you paid);
 * insurance 0.2%/yr of value, weekly from personal cash.
 */
export const COLLECTIBLES_CFG = {
  drift: 0.03,
  sigma: 0.08,
  insuranceRate: 0.002,
  floorShare: 0.25,
} as const;
/**
 * Auctions: each house holds one every 4 weeks with 3–5 lots, previewed 2 weeks
 * ahead. Clearing = estimate × lognormal(1, 0.25); the winner pays clearing +
 * 12% premium. Appraisal 1% of price, 1 week. Consignment hammer = value ×
 * lognormal(1, 0.15), less a 10% seller fee, sold at the house's next auction.
 */
export const AUCTIONS = {
  everyWeeks: 4,
  previewWeeks: 2,
  lots: [3, 5],
  clearingSigma: 0.25,
  buyerPremium: 0.12,
  appraiseFee: 0.01,
  appraiseWeeks: 1,
  consignSigma: 0.15,
  sellerFee: 0.1,
  /** Each house's first sale is this many weeks out, the houses a week apart. */
  firstSaleWeeks: 3,
  staggerWeeks: 1,
  /** A lot's estimate = the item's estimate × (1 ± up to this), rounded. */
  estimateNoise: 0.1,
  estimateRound: 10_000,
  /** A hammer at ≥ this × estimate makes the Ledger as a record price. */
  recordFactor: 1.4,
  /** Results kept per house. */
  historyKeep: 24,
  /** Max-bid stepper: steps of this share of the estimate, up to bidMaxFactor × estimate. */
  bidStepShare: 0.05,
  bidMaxFactor: 3,
} as const;
/**
 * Sports franchise (DESIGN §5.16, SCREENS §20; numbers are our assumption).
 * Revenue a year ≈ revenueYield × value, split across tickets/broadcast/merch/
 * sponsorship; operations cost opsShare of revenue; payroll from the squad.
 * Value grows with league revenue (leagueGrowth/yr) ± performance. Kit
 * sponsorship by your bank adds kitAwareness brand awareness a week in every
 * city of the club's country (and forgoes the outside sponsor's money).
 */
export const FRANCHISE = {
  revenueYield: 0.12,
  revenueSplit: { tickets: 0.3, broadcasting: 0.4, merchandise: 0.15, sponsorship: 0.15 },
  opsShare: 0.25,
  /** Payroll (stars + others) ≈ this share of yearly revenue at seeding. */
  payrollShare: 0.55,
  /** The five stars' share of that payroll (the reference club: 82M of 132M). */
  starShare: 0.6,
  leagueGrowth: 0.05,
  /** Weekly σ of every club's value noise around leagueGrowth/52. */
  valueNoise: 0.004,
  /** Your club's value moves up to ± this at season end, by win %. */
  performanceSwing: 0.1,
  kitAwareness: 0.004,
  gamesPerSeason: 40,
  /** The season runs this many weeks from seasonStartWeek (week of the year). */
  seasonWeeks: 40,
  seasonStartWeek: 36,
  /** Finish position: the notional league's size and the win % mapped to 1st and last. */
  leagueSize: 12,
  finishWinPct: [0.25, 0.75],
  /** Win chance = 0.5 + (mean star rating − avgRating) × perRating, clamped to range. */
  winChance: { avgRating: 81, perRating: 0.025, range: [0.15, 0.85] },
  /** Football games can be drawn (other sports play to a result). */
  drawChance: 0.22,
  /** Fan mood (0–100): start range, per win/loss, weekly pull toward 50, per place above 6.5th at season end. */
  fanMood: { start: [45, 70], perWin: 0.8, perLoss: 0.8, drift: 0.02, perPlace: 2 },
  /** Tickets and merchandise × (base + perMood × fanMood/100): 1.0 at mood 50. */
  fanRevenue: { base: 0.6, perMood: 0.8 },
  /** Star players: rating range at seeding, contract years, rating drift per season. */
  starRating: [70, 92],
  contractYears: [1, 5],
  ratingDrift: 2,
  ratingRange: [40, 99],
  /** σ on win % when seeding each club's last-season finish. */
  seedFinishNoise: 0.06,
  /** Salary weight 1 + (rating − salaryPivot) × salaryPerRating, at least salaryFloor. */
  salaryPivot: 80,
  salaryPerRating: 0.04,
  salaryFloor: 0.3,
  maxStars: 5,
  /** An empty star slot plays at this rating (releasing a star never makes the side stronger). */
  replacementRating: 60,
  transferWindows: [
    [1, 4],
    [27, 34],
  ],
  /** Transfer market while a window is open: players, rating range, fee = salary × feeYears. */
  marketSize: [4, 6],
  marketRating: [68, 95],
  feeYears: [1.5, 3],
  /** Releasing a star pays this share of the salary left on the contract. */
  releaseShare: 0.5,
  /** Offers at or above offerMin × value are accepted (a flat threshold). */
  offerMin: 0.9,
  /** The offer stepper's floor and step, as shares of the valuation. */
  offerFloor: 0.8,
  offerStep: 0.01,
  /** Selling a club returns value × (1 − saleFee). */
  saleFee: 0.03,
  riskWeight: 2.5,
} as const;
/**
 * The rich list (§22): 50 fortunes drawn log-uniform in `fortune`, each growing
 * with the home country's nominal index (§4.6) plus its own real `growth` a year
 * (−2% to +5%: some fortunes outrun the economy, some fall behind). Sized to the
 * game world, so a founder can enter the list in the first decade and a long,
 * strong game can top it.
 */
export const RICH_LIST = {
  size: 50,
  growth: [-0.02, 0.05],
  fortune: [0.15e9, 2e9],
  /** Fortunes are rounded to this. */
  roundTo: 1e6,
} as const;
/** Insider trading (§22): trades in your own shares within 2 weeks of a quarter-end. */
export const INSIDER = {
  windowWeeks: 2,
  prob: 0.15,
  fineMult: 3,
  fineMin: 250_000,
  ratingHit: 0.1,
  ratingWeeks: 8,
  /** Fighting the probe (CONTENT §22 option): even odds of being cleared, else the fine doubles. */
  fightWin: 0.5,
  fightLoseMult: 2,
} as const;

// ─── EXECUTIVES (SIMULATION §17.2) ────────────────────────────────────────────
/**
 * execMult = multBase + multSlope × expertise/100 on the departments in an
 * executive's domain; an empty CTO seat reads `vacantCtoExpertise`.
 * Resignation p/week = resignBase × (resignLoyalty − loyalty/100) ×
 * (pay/market < underpaidRatio ? underpaidMult : 1) × (unvested grants ? grantMult : 1).
 * Market salary = (salaryBase + salaryPerBillion × total assets in $B) × city
 * wageIndex, capped at salaryMax (assumption, decision log). Candidates per seat
 * refresh every `refreshWeeks`; skills roll in `skillRange`.
 */
export const EXECUTIVES = {
  multBase: 0.9,
  multSlope: 0.25,
  vacantCtoExpertise: 30,
  resignBase: 0.002,
  resignLoyalty: 1.5,
  underpaidRatio: 0.9,
  underpaidMult: 2,
  /** Paid at least wellPaidRatio × market: resignation chance × wellPaidMult. */
  wellPaidRatio: 1.1,
  wellPaidMult: 0.5,
  grantMult: 0.5,
  salaryBase: 180_000,
  salaryPerBillion: 60_000,
  salaryMax: 2_500_000,
  refreshWeeks: 4,
  candidatesPerSeat: 3,
  skillRange: [35, 93] as [number, number],
  /** EXEC_POACHED counter-offer: salary × (1 + raise), loyalty + loyaltyGain. */
  counterRaise: 0.25,
  counterLoyalty: 10,
  /** Severance on firing, in weeks of salary. */
  severanceWeeks: 26,
  /** Grants vest yearly in equal parts over `vestYears`. */
  vestYears: 4,
} as const;

// ─── GOVERNANCE (DESIGN §5.13, SIMULATION §15) ────────────────────────────────
/**
 * Dividends are paid `payDelayWeeks` after the board declares them (a liability
 * until then). Watch tier caps a quarter's dividend at watchCap × trailing four
 * quarters' net income ÷ 4; Restricted and Critical forbid dividends.
 */
export const GOVERNANCE = {
  payDelayWeeks: 3,
  watchCap: 0.5,
  meetingsKept: 8,
} as const;

/**
 * Executive pay, candidates and grants (§17.2, SCREENS §10.1; assumptions in the
 * decision log). A candidate asks market × (askBase + askSlope × average skill/100).
 * Salaries can be set within salaryRange × market. An option's grant-date value
 * per share is max(price − strike, price × optionMinValue); RSUs are worth the
 * price. One grant is at most grantMaxPct of shares outstanding.
 */
export const EXEC_PAY = {
  askBase: 0.8,
  askSlope: 0.4,
  salaryRange: [0.5, 3] as [number, number],
  salaryStep: 5_000,
  optionMinValue: 0.25,
  grantMaxPct: 0.02,
  grantStep: 1_000,
} as const;

/**
 * Executive delegations (§17.2 table), each run weekly while its toggle is on.
 * COO: branch operations turns on `cooDelegation` for the manager it hires;
 * HR benefits, every benefitsEveryWeeks weeks, holds average morale at
 * moraleTarget (cuts back above moraleTarget + moraleSlack), spending at most
 * benefitsBudgetShare of the weekly payroll on benefits. CFO: statement delays × cfoDelayFactor (rounded
 * up); Treasury borrows when LR is more than lrBand under target; Dividends proposes dividendPayout of trailing net income. CPO and
 * CTO: developments of devWeeks at devTier with a weekly budget of at most
 * devBudgetShare of weekly revenue (trailing revenueWeeks average). CMO: holds
 * brand awareness near brandTarget (± brandSlack) within brandBudgetShare of
 * revenue. CRO: every croEveryWeeks weeks, lowers appetite when CR < croMinCr or
 * the loss rate > croMaxLoss, raises it when CR ≥ croRaiseCr and the loss rate ≤
 * croRaiseLoss, up to croMaxAppetite. CREO (Chief Real Estate Officer):
 * every rentEveryWeeks weeks, Rents sets each managed building's rent to the
 * level that holds its occupancy dial (propertyMath.rentForOccupancy; 100%
 * is the highest that still fills it); tenants of a managed building accept
 * rent up to × (1 + rentPricingPower × expertise/100) over market with no loss
 * of occupancy (§21.2); Buying buys listed buildings for the bank or for you.
 */
export const EXEC_DELEGATION = {
  cooDelegation: { staffing: true, products: true, marketing: true, troubles: true, loans: true },
  /** HR benefits: the morale floor the COO holds (a dial on their profile), default and stops. */
  moraleTarget: 70,
  moraleTargets: [70, 80, 90] as readonly number[],
  moraleSlack: 5,
  benefitsEveryWeeks: 4,
  benefitsBudgetShare: 0.08,
  cfoDelayFactor: 0.5,
  lrBand: 0.02,
  dividendPayout: 0.4,
  devWeeks: 12,
  devTier: 'medium',
  devBudgetShare: 0.01,
  revenueWeeks: 13,
  /** Brand campaigns: the awareness the CMO holds in each city (a dial on their profile), default and stops. */
  brandTarget: 0.5,
  brandTargets: [0.4, 0.5, 0.6, 0.7] as readonly number[],
  brandSlack: 0.05,
  brandBudgetShare: 0.03,
  croEveryWeeks: 4,
  croMinCr: 0.12,
  croMaxLoss: 0.012,
  croRaiseCr: 0.14,
  croRaiseLoss: 0.009,
  croMaxAppetite: 4,
  /**
   * CFO Capital (§17.2): acts at Watch or worse, raises equity at Restricted or
   * worse, aims for 12%. Its risk-appetite step comes every croEveryWeeks too,
   * cfoAppetitePhase weeks after the CRO's, so with both seated the dial can
   * move every 2 weeks in a capital squeeze but never twice in one week.
   */
  cfoTargetCr: 0.12,
  cfoAppetitePhase: 2,
  cfoRaiseStep: 0.01,
  /**
   * COO Expansion (§17.2): one branch at most every expansionEveryWeeks, only in
   * a growth city with room ≥ expansionMinRoom and fewer branches than its
   * guide, keeping expansionReserveWeeks of weekly costs in cash after the
   * build. Lots score footTraffic × min(1, distance to your nearest branch ÷
   * expansionSpacing tiles).
   */
  expansionEveryWeeks: 4,
  expansionReserveWeeks: 8,
  expansionMinRoom: 0.2,
  expansionSpacing: 12,
  /** COO Company troubles: option error shrinks with the COO's expertise like a manager's skills. */
  troublesError: 0.5,
  /** CREO Rents (§21.2): review cadence and the pricing power a 100-expertise chief brings. */
  rentEveryWeeks: 4,
  rentPricingPower: 0.1,
  /**
   * CREO occupancy dials (§21.2), one under each Rents switch: the occupancy
   * each review prices for, default and stops. 1 means as full as tenants allow
   * (REAL_ESTATE.occMax, the bestRent level); lower stops charge more per m²
   * but earn less in total.
   */
  occTarget: 1,
  occTargets: [0.8, 0.85, 0.9, 0.95, 1] as readonly number[],
  /**
   * CREO Buying (§21.1): every buyEveryWeeks weeks each Buying switch buys at
   * most one listed building, the best net yield at asking in any city. For the
   * bank: its buildings stay under buyAssetCap of total assets, the capital ratio
   * stays at or above buyMinCr after the purchase, expansionReserveWeeks of costs
   * stay in cash, and never at a restricted capital tier. For you: keeps
   * buyReserveYears of CEO salary, and a building costs at most buySpareShare
   * of the cash above that.
   */
  buyEveryWeeks: 4,
  buyAssetCap: 0.05,
  buyMinCr: 0.12,
  buyReserveYears: 1,
  buySpareShare: 0.5,
  /**
   * CFO Investing (§17.2): every investEveryWeeks weeks (on week ≡ investPhase)
   * each Investing switch sells listed stocks at or below investTrimAt of their
   * average cost (not bought again for investCooldownWeeks), buys one stock (the
   * largest gap to a market-cap weighting) and backs one Investment floor startup
   * scoring investMinScore or more on average. For the bank: never at a
   * restricted tier; stocks stay under investStockCap and startup stakes under
   * investVentureCap of total assets; one stock buy is at most investStockLot of
   * total assets; the capital ratio stays at or above buyMinCr after each buy and
   * expansionReserveWeeks of costs stay in cash. For you: keeps buyReserveYears
   * of CEO salary and spends at most investSpareShare of the cash above that on
   * one purchase. Stock buys under investMinTrade are skipped.
   */
  investEveryWeeks: 4,
  investPhase: 2,
  investTrimAt: 0.75,
  investCooldownWeeks: 52,
  investMinScore: 6,
  investStockCap: 0.05,
  investVentureCap: 0.03,
  investStockLot: 0.01,
  investSpareShare: 0.25,
  investMinTrade: 10_000,
} as const;

/**
 * Branch guidance (§17.2), the CFO and CRO steering delegated managers together.
 * Each half is a whole step in [min, max], moved one step every everyWeeks:
 * the CFO's deposit step up while liquidity is below liqTarget − liqLow and down
 * above liqTarget + liqHigh; the CRO's loan step up (tighter) when capital or
 * losses miss the croMinCr / croMaxLoss marks and down at croRaiseCr /
 * croRaiseLoss. A step moves delegated rate prices by rateStep and the
 * delegated Loan Desk PD threshold by × (1 − thresholdStep × loan step).
 * The COO, CMO and CPO steer the rest the same way (schema v18):
 * - COO staffing: up while delegated-staffing branches average morale below
 *   moraleLow, down above moraleHigh; a step adds wageStep to their wages and
 *   staffStep to their staff target.
 * - CMO marketing: up while average brand awareness in your branch cities is
 *   below EXEC_DELEGATION.brandTarget − brandBand, down above target + brandBand;
 *   a step adds marketingStep to the value managers put on awareness.
 * - CPO products: up while delegated-products branches average a products
 *   rating below productsLow, down at productsHigh or better; a step cuts
 *   delegated fees by feeStep and lowers the lineup's affinity bar by affinityStep.
 * A switched-off part returns to 0.
 */
export const GUIDANCE = {
  everyWeeks: 4,
  min: -1,
  max: 3,
  rateStep: 0.001,
  thresholdStep: 0.12,
  liqLow: 0.01,
  liqHigh: 0.05,
  moraleLow: 65,
  moraleHigh: 82,
  wageStep: 0.02,
  staffStep: 0.05,
  brandBand: 0.1,
  marketingStep: 0.2,
  productsLow: 3,
  productsHigh: 4,
  feeStep: 0.03,
  affinityStep: 0.25,
} as const;

/**
 * Pay reviews (COO, §17.2): on the cadence you choose (quarterly or annual,
 * in weeks) the COO sets each executive's and branch manager's pay to market
 * × (1 + the pay premium you choose), within premiumRange in premiumStep
 * steps, so pay rises with the market.
 */
export const PAY_REVIEW = {
  cadences: { quarterly: 13, annual: 52 } as const,
  defaultCadence: 'quarterly' as const,
  premiumRange: [-0.1, 0.3] as [number, number],
  premiumStep: 0.05,
  defaultPremium: 0.05,
} as const;

/**
 * Branch manager pay market and poaching (§17.1). Market pay is the hiring ask
 * (MANAGER_BASE_SALARY × wageIndex × the skill spread) × (1 + tenureGrowth ×
 * years at the bank): rivals pay more for experience. Weekly poaching chance:
 * poachBase × underpaidMult below underpaidRatio × market, × wellPaidMult at
 * wellPaidRatio × market or more. Salaries move in salaryStep.
 */
export const MANAGER_PAY = {
  tenureGrowth: 0.03,
  poachBase: 0.0006,
  underpaidRatio: 0.9,
  underpaidMult: 3,
  wellPaidRatio: 1.1,
  wellPaidMult: 0.5,
  salaryStep: 1_000,
} as const;

/**
 * "Where to look" (SCREENS §24, decision log 2026-10-25): the Company screen
 * ranks what most needs you. A branch counts as losing money after lossWeeks
 * weekly closes in the red once it is past its grand opening; a rating under
 * lowRating, average morale under lowMorale, city awareness under lowAwareness
 * (with a branch there) and liquidity more than liqBand under target are flagged.
 */
export const ATTENTION = {
  lossWeeks: 4,
  lowRating: 2.5,
  lowMorale: 50,
  lowAwareness: 0.2,
  liqBand: 0.03,
  /** Cash under this many weeks of running costs is flagged (and warned about on the build sheet). */
  cashCoverWeeks: 8,
  /** How many items the Company screen shows. */
  shown: 3,
} as const;

/**
 * Board votes (DESIGN §5.13; the docs give no formula, decision log). The
 * founder and executive holders vote For; outside holders approve with a ∈ [0,1];
 * forShare = insiders + (1 − insiders) × a, passing at passShare.
 * Dividend: payout = dps × shares × 4 ÷ max(NI_ttm, 1). With NI_ttm ≤ 0,
 * a = lossZero for no dividend, lossPaid otherwise; else a = zero for no
 * dividend, comfortable up to comfortablePayout, falling linearly to atMax at
 * maxPayout. CEO pay: market = ceoMarketMult × executive market salary; above
 * market a = clamp(atMarket − slope × (new/market − 1), range), else atMarket;
 * − bigRaisePenalty for a raise over bigRaise of current pay; − weakRoePenalty
 * when ROE_ttm < COE. Proposals: dividend in dpsStep, CEO pay in ceoStep up to
 * ceoMaxMult × market.
 */
export const BOARD_VOTE = {
  passShare: 0.5,
  lossZero: 0.9,
  lossPaid: 0.15,
  zero: 0.6,
  comfortable: 0.9,
  comfortablePayout: 0.6,
  maxPayout: 1.2,
  atMax: 0.1,
  ceoMarketMult: 1.5,
  atMarket: 0.9,
  slope: 0.8,
  range: [0.05, 0.95] as [number, number],
  bigRaise: 0.25,
  bigRaisePenalty: 0.2,
  weakRoePenalty: 0.15,
  dpsStep: 0.01,
  ceoStep: 5_000,
  ceoMaxMult: 4,
} as const;

// ─── MARKETS (SIMULATION §19) ─────────────────────────────────────────────────
/** Cost of equity (§19.2). */
export const COE = 0.1;
/** Private valuation: P/B = clamp(ROE/COE, pb) × discount (§19.2). */
export const PRIVATE_VALUATION = { pb: [0.5, 2.5] as [number, number], discount: 0.8 } as const;
/** Private placement (§19.3). */
export const PLACEMENT = { maxPct: 0.25, discount: 0.9, maxRounds: 3, gapWeeks: 26 } as const;
/** IPO (§19.4). */
export const IPO = {
  minEquity: 25_000_000,
  profitableQuarters: 4,
  minFinanceCoverage: 0.8,
  minRecessionCr: 0.14,
  floatPct: [0.1, 0.4] as [number, number],
  roeClamp: [0.5, 3] as [number, number],
  discount: 0.9,
} as const;
export const IPO_MIN_EQUITY = IPO.minEquity;
/** Your bank and listed rivals while public (§19.5). */
export const PUBLIC_PRICE = {
  roeClamp: [0.3, 3] as [number, number],
  irPenalty: 0.15,
  sentimentSigma: 0.02,
  sentimentRevert: 0.05,
  incidentShock: [0.03, 0.15] as [number, number],
  earningsShockMax: 0.08,
  dividendRaise: 0.03,
  dividendCut: 0.06,
  ema: 0.15,
  noise: 0.025,
} as const;
/** Secondary offering (§19.6). maxPct caps one issue (assumption, like a placement round). */
export const SECONDARY = {
  discount: 0.03,
  defaultFee: 0.0455,
  impact: [0.02, 0.05] as [number, number],
  maxPct: 0.25,
} as const;
export const SECONDARY_DISCOUNT = SECONDARY.discount;
/**
 * Share buybacks (§19.6a): a listed bank buys its own shares back from the
 * public at the market price plus a small premium, pays a broker's fee, and
 * retires them. One programme a quarter, up to maxPct of the shares; the public
 * keeps at least minFloat of the bank, and capital must stay Adequate or better.
 */
export const BUYBACK = {
  maxPct: 0.1,
  premium: 0.02,
  fee: 0.01,
  /** Price lift +1% to +4%, scaled by size up to maxPct. */
  impact: [0.01, 0.04] as [number, number],
  minFloat: 0.1,
  gapWeeks: 13,
  /** Buyback history kept on the stock record. */
  kept: 12,
} as const;
/**
 * Listed companies (§19.1). Earnings weeks add normal(0, earningsSurprise) plus
 * a tilt of earningsTilt × the sector's annual μ for the phase (assumption: a
 * tenth of the year's drift, so recessions bring misses). A surprise of at
 * least notableSurprise makes the paper. The index makes news when it moves
 * at least indexMoveNews in a week.
 */
export const STOCK_MARKET = {
  shockSigma: 0.018,
  earningsSurprise: 0.04,
  earningsTilt: 0.1,
  notableSurprise: 0.06,
  indexMoveNews: 0.03,
  priceFloor: 1,
  historyWeeks: 104,
  startIndex: 1000,
  /** Weeks in the 52-week high/low window. */
  rangeWeeks: 52,
  /** Generated top fund holders per listed company and their stake range. */
  fundHolders: 3,
  fundStake: [0.02, 0.09] as [number, number],
} as const;
/** Trading commission (§19.7). */
export const COMMISSION = 0.001;
/**
 * Trading limits (assumption, decision log): your company and you together
 * may own at most maxStake of any listed company or rival; a bigger stake
 * would be a takeover, which goes through M&A.
 */
export const TRADING = { maxStake: 0.3 } as const;
/**
 * Your share price (§19.5) beyond PUBLIC_PRICE: sentiment stays inside
 * sentimentRange; quarter-on-quarter earnings growth of earningsGrowthRef or
 * more gives the full ±earningsShockMax; a weekly move of moveNews or more is a
 * SHARE_PRICE_MOVE story.
 */
export const OWN_STOCK = {
  sentimentRange: [0.4, 1.8] as [number, number],
  earningsGrowthRef: 0.25,
  moveNews: 0.08,
} as const;
/**
 * How serious each incident is for your share price, 0–1: the sentiment shock
 * is incidentShock[0] + (incidentShock[1] − incidentShock[0]) × severity
 * (§19.5, −3% to −15%). Types not listed (reminders, city and personal cases,
 * and minor branch mishaps like a viral complaint or a flood) do not move it.
 * Assumption, decision log.
 */
export const INCIDENT_PRICE_SEVERITY: Record<string, number> = {
  ROBBERY: 0.15,
  ATM_SKIM: 0.15,
  STAFF_WALKOUT: 0.2,
  EXEC_POACHED: 0.25,
  BIG_DEFAULT: 0.35,
  CARD_FRAUD: 0.45,
  MIS_SELLING: 0.6,
  REGULATOR_AUDIT: 0.6,
  REGULATOR_LETTER: 0.75,
  DATA_BREACH: 0.85,
  BANK_RUN: 1,
  RECAP_OFFER: 1,
};
/** Listed and public: Finance k′ below minKPrime files late, fined fineRate × quarterly revenue (CONTENT §9). */
export const LATE_FILING = { minKPrime: 0.6, fineRate: 0.0002 } as const;
/** Risk weight on stocks held by the company (§15). */
export const STOCK_RISK_WEIGHT = 2.5;
export const QUARTERS_PER_YEAR = 4;

// ─── M&A (SIMULATION §19.8) ───────────────────────────────────────────────────
export const MERGERS = {
  reqHealthy: 0.3,
  reqWatch: 0.15,
  reqDistressed: -0.2,
  /** Rival CR below this counts as Watch tier for the premium it requires. */
  watchCr: 0.105,
  sigmoidScale: 0.06,
  retryWeeks: 2,
  /** Pro-forma capital after the deal may sit in the Watch tier (DESIGN decision log 2026-10-26). */
  minProFormaCr: 0.09,
  maxCityShare: 0.5,
  fastTrackShare: 0.65,
  /** A distressed sale skips the city share test: the regulator wants the network rescued. */
  distressedShareExempt: true,
  conversionWeeks: 8,
  moraleHit: 10,
  /** A distressed network's asking price as P/B (§18.5). */
  distressedPb: [0.4, 0.7] as [number, number],
  /** Floor on a distressed asking price per share (thin or negative equity, like the $1 price floor). */
  distressedMinAsk: 1,
  /** Offers kept in state.mergers.offers for the M&A tab. */
  offersKept: 12,
  /** A pending offer this large makes the paper (MERGER_OFFER story). */
  offerNewsMin: 10_000_000,
  /** Offer sheet stepper: price per share from lo × to hi × the reference price, in steps. */
  offerRange: [0.5, 3] as [number, number],
  offerStep: 0.1,
  /** An acquired branch's awareness = perStar × the rival branch's overall stars, clamped. */
  acquiredAwareness: { perStar: 0.12, min: 0.2, max: 0.6 },
  /**
   * C3a: a rival's book "deposits" stand for its customers until C5, one per
   * depositPerCustomer. They size the city share test and the plan seats an
   * acquired office starts with (split by ACQUIRED_PLAN_MIX).
   */
  depositPerCustomer: 10_000,
} as const;
/**
 * Share-for-share deals (§19.8): a listed bank may pay part of a takeover in
 * new shares, valued at its market price. The target's board counts each
 * share-paid dollar at (1 − boardDiscount), one deal may add at most
 * maxNewSharePct new shares, and the issue moves your price like a secondary
 * of the same size. The offer sheet steps the share part in stockStep.
 */
export const SHARE_DEALS = {
  boardDiscount: 0.05,
  maxNewSharePct: 0.5,
  stockStep: 0.25,
  impact: [0.02, 0.06] as [number, number],
} as const;
export const REBRAND_COST = 60_000;

// ─── VENTURES (SIMULATION §20) ────────────────────────────────────────────────
export const VENTURES = {
  /** §20.3: the Investment floor pipeline refreshes every N weeks with 1 + floor(staff / staffPerExtra), max. */
  pipelineEveryWeeks: 4,
  pipelineBase: 1,
  staffPerExtra: 4,
  pipelineMax: 8,
  /** Exclusive startups a convention adds. */
  conventionExtra: [3, 6] as [number, number],
  /** §20.2 quarterly growth g ~ normal(μ_sector + slope × (avg − mid), sigma). */
  growthSlope: 0.03,
  growthSigma: 0.12,
  pentagonMid: 5,
  /** Share of the gap to the maturity-scaled sector margin closed each quarter. */
  marginPull: 0.25,
  /** Each pentagon score drifts ±1 with this chance per quarter. */
  driftChance: 0.3,
  /** A new round opens when cash runway falls below this many quarters. */
  runwayQuarters: 4,
  newMoney: [0.15, 0.3] as [number, number],
  /** Price step per share: up round when g > goodGrowth, else a down round. */
  goodGrowth: 0.1,
  upStep: [1.2, 3.0] as [number, number],
  downStep: [0.5, 0.9] as [number, number],
  /** Two offer lots of 15% each, open 4 weeks (REFERENCE_NOTES §12). */
  lotPct: 0.15,
  lots: 2,
  roundWeeks: 4,
  /** Failure per quarter = base × (1 + slope × (mid − Financial health)) × (recession ? mult : 1). */
  failBase: 0.03,
  failSlope: 0.35,
  failRecessionMult: 1.5,
  /** IPO chance per quarter once quarterly revenue > min, net income > 0 and stage ≥ C. */
  ipoChance: 0.25,
  ipoMinQuarterRevenue: 50_000_000,
  /** Acquisition chance per quarter at a multiple of annual revenue. */
  acquireChance: 0.05,
  acquireMult: [2, 6] as [number, number],
  /** Quarterly results kept per startup. */
  quartersKept: 12,
} as const;
/** §20.5: offer up to maxShare of post-money; accepted if rate ≤ policy + spread; 156-week amortization. */
export const VENTURE_DEBT = { maxShare: 0.1, spread: 0.08, termWeeks: 156, lgd: 0.8 } as const;
/**
 * §20.2 net margin target: the sector margin once Product maturity reaches
 * matureAt, falling by `gap` × the missing share below it (young startups burn cash).
 */
export const VENTURE_MARGIN = { gap: 4, matureAt: 8 } as const;
/** Startup creation (§20.1): price per share, cap table, cash runway, history and the generator. */
/**
 * Generated names (CONTENT §15, §18; src/sim/nameGen.ts): coined brands keep
 * brandLength letters; startup names pick a pattern by weight; a description
 * uses the sector's handwritten lines with chance handwrittenBlurb, else a
 * template. A chartered bank uses a listed stem or brand with chance listedName,
 * else a generated one. tries bounds every retry loop.
 */
export const NAME_GEN = {
  brandLength: [4, 8] as [number, number],
  startupPatterns: { word: 0.5, coined: 0.25, coinedSuffix: 0.25 },
  handwrittenBlurb: 0.15,
  listedName: 0.4,
  tries: 40,
} as const;
export const VENTURE_GEN = {
  sharePrice: {
    seed: [0.4, 1.2],
    A: [1, 3],
    B: [2.5, 7],
    C: [6, 18],
    D: [12, 36],
  } as Record<'seed' | 'A' | 'B' | 'C' | 'D', [number, number]>,
  /** Founder's share of the company by stage; one or two funds hold the rest. */
  founderShare: { seed: 0.7, A: 0.55, B: 0.42, C: 0.32, D: 0.25 } as Record<
    'seed' | 'A' | 'B' | 'C' | 'D',
    number
  >,
  fundHolders: [1, 2] as [number, number],
  /** Cash at creation = runway quarters × quarterly burn (or a share of post-money if profitable). */
  startRunway: [2, 10] as [number, number],
  profitableCash: 0.08,
  /** Funding history: the last round raised roundShare of post-money, each earlier one stepDown of the next. */
  historyRoundShare: 0.12,
  historyStepDown: 0.4,
  /** Years since founding by stage, for generated startups. */
  ageYears: {
    seed: [0, 1],
    A: [1, 2],
    B: [2, 4],
    C: [3, 6],
    D: [4, 8],
  } as Record<'seed' | 'A' | 'B' | 'C' | 'D', [number, number]>,
  stageWeights: { seed: 30, A: 30, B: 20, C: 15, D: 5 } as Record<
    'seed' | 'A' | 'B' | 'C' | 'D',
    number
  >,
  pentagonRange: [3, 8] as [number, number],
  /** Quarterly results generated for a new startup. */
  historyQuarters: 4,
  /** The generator stops while this many private startups are active. */
  maxActive: 60,
  /** Finished startups you never held: keep only the most recent few. */
  endedKept: 12,
  nameTries: 20,
} as const;
/** §20.2 IPO: listing price = last round price × pop; the listed stock's volatility and growth cap. */
export const VENTURE_IPO = {
  pop: [1.0, 1.5] as [number, number],
  vol: 0.45,
  maxGrowth: 0.2,
  tickerLength: 4,
} as const;
/** Ledger thresholds for ventures stories (SIMULATION §24). */
export const VENTURE_NEWS = { bigRound: 50_000_000, bigExit: 100_000_000 } as const;
/** Risk weights (§15): venture equity like listed stocks; venture debt and buildings. */
export const VENTURE_RISK_WEIGHT = 2.5;
export const VENTURE_DEBT_RISK_WEIGHT = 1.5;
export const PROPERTY_RISK_WEIGHT = 1.0;

// ─── CONVENTIONS (CONTENT §19) ────────────────────────────────────────────────
/**
 * Announced this many weeks before opening, then open this many weeks: a month
 * each way, so a player reading monthly results never misses one (owner's ask,
 * 2026-10-26; before: 2 and 1).
 */
export const CONVENTIONS = { announceWeeks: 4, activeWeeks: 4 } as const;

// ─── REAL ESTATE (SIMULATION §21) ─────────────────────────────────────────────
export const REAL_ESTATE = {
  /** §21.1 listings refresh per city every N weeks; this share of unowned buildings is listed. */
  refreshWeeks: 4,
  listedShare: 0.4,
  /** Estimated value = size × marketRent × valueMult × cre / 100. */
  valueMult: 3.2,
  askRange: [0.95, 1.1] as [number, number],
  /** Offer acceptance = clamp((offer/asking − floor) / span, 0, 1). */
  offerFloor: 0.85,
  offerSpan: 0.15,
  /** §21.2 occTarget = clamp(base − slope × (rent/marketRent − 1), min, max); occ = ema(occ, target, ema). */
  occBase: 0.97,
  occSlope: 1.6,
  occMin: 0.3,
  occMax: 0.98,
  occEma: 0.06,
  /**
   * §21.2: an owned building's market rent eases toward the district rent ×
   * city rentIndex × cre/100 by rentEma a week (half-life about 14 weeks), so
   * values move with the property cycle first and rents follow months later.
   */
  rentEma: 0.05,
  /** Maintenance = size × marketRent × maintenance / 52; vacancy cost = size × (1 − occ) × vacancyPerSqm / 52. */
  maintenance: 0.55,
  vacancyPerSqm: 2,
  /** For Sale: completes in 2–8 weeks at value × normal(1, saleSigma). */
  saleWeeks: [2, 8] as [number, number],
  saleSigma: 0.04,
  /**
   * Property buildings per city by size, their floor area and starting occupancy.
   * Bigger cities have more buildings and taller, higher-value ones (owner's
   * ask, 2026-10-26; before: 4/6/8/10 buildings, all 1,500–12,000 m²).
   */
  buildingsPerCity: { S: 6, M: 9, L: 12, XL: 15 } as Record<'S' | 'M' | 'L' | 'XL', number>,
  sqmRangeBySize: {
    S: [1500, 5000],
    M: [2000, 7000],
    L: [3000, 12000],
    XL: [4000, 16000],
  } as Record<'S' | 'M' | 'L' | 'XL', [number, number]>,
  /** Outside the tall districts (financial, downtown, waterfront) a building is at most this big. */
  lowRiseMaxSqm: 5000,
  sqmPerFloor: 800,
  startOcc: [0.75, 0.95] as [number, number],
  /** Annual rent you can set, as a share of market rent, and the stepper step per m². */
  rentRange: [0.5, 1.6] as [number, number],
  rentStep: 5,
  /** Offer stepper on a listing: from this share of asking up to asking, in steps of this share. */
  offerMin: 0.8,
  offerStep: 0.01,
  /** A purchase or sale at least this large makes The Weekly Ledger. */
  newsMin: 10_000_000,
} as const;

// ─── LOBBYING (DESIGN §5.8.10, SCREENS §15) ───────────────────────────────────
export const LOBBYING = {
  /** The outcome arrives in 4–8 weeks. */
  resolveWeeks: [4, 8] as [number, number],
  /** An exposé: a fine of this share of the campaign cost and a brand awareness hit in your cities. */
  exposeFine: 0.5,
  exposeAwareness: 0.03,
  /** "Ease the capital buffer": tier thresholds drop by pp for N weeks. */
  bufferReliefPp: 1,
  bufferReliefWeeks: 52,
} as const;

// ─── CURRENCIES (SIMULATION §19.10) ───────────────────────────────────────────
export const FX = {
  /** Weight on annual GDP growth (percent) and on the policy rate in the weekly drift. */
  growthW: 1.0,
  rateW: 0.5,
  /** Weekly drift by business cycle phase: recessions weaken a currency. */
  phase: { expansion: 0.0003, slowdown: 0, recession: -0.0012, recovery: 0.0004 } as Record<
    Phase,
    number
  >,
  /** Scales each currency's own weekly volatility (src/data/currencies.ts). */
  volMult: 1,
  /** A pegged currency's weekly wobble around its anchor. */
  pegVol: 0.0004,
  /** The strength index stays within [min, max] × its start of 100. */
  min: 0.5,
  max: 2,
  /** Spread paid on every buy and sell, as a share of the amount. */
  spread: 0.0025,
  /** Weekly closes kept per currency. */
  historyWeeks: 260,
  /** A weekly move this large (vs your home currency) makes the Markets page. */
  newsMove: 0.02,
} as const;
/** Risk weight on company currency positions (§15). */
export const FX_RISK_WEIGHT = 1.0;
export const FX_START_INDEX = 100;

// ─── MILESTONES (DESIGN §5.18) ────────────────────────────────────────────────
export const MILESTONE_GOALS = {
  /** Flagship sales offices for 'Five Flagships' (C2a). */
  flagships: 5,
  /** Data centers open for 'Three data centers' (C2c). */
  dataCenters: 3,
  cities: 10,
  deposits: 1_000_000_000,
  countries: 5,
  assets: 10_000_000_000,
  acquisitions: 5,
  founderWorth: 1_000_000_000,
  allCities: 20,
  allCountries: 10,
  manyAcquisitions: 10,
  bigAssets: 100_000_000_000,
  richFounder: 10_000_000_000,
  hugeAssets: 1_000_000_000_000,
} as const;
/** Departments that must all be fully staffed (coverage k′ ≥ 1) for "HQ fully staffed". */
export const MILESTONE_HQ_DEPTS = [
  'finance',
  'hr',
  'products',
  'treasury',
  'marketing',
  'it',
  'risk',
] as const;

// ─── TUTORIAL PART 2 (SCREENS §27.2) ──────────────────────────────────────────
/**
 * When the "Your own fortune" guide starts: personal cash at or above
 * wealthCash (a year or so of CEO salary). The other guides start on game
 * conditions the sim already has (founder ramp, capital tier, IPO checklist,
 * city coverage).
 */
export const GUIDES = {
  wealthCash: 250_000,
} as const;
