// Creates a fresh GameState (SIMULATION §26 START constants): the start city
// (worldGen.ts; other cities are made on first visit), every country's macro,
// the chosen corporate cash ($750k by default) and $2M of charter capital held
// in treasury reserves.
import {
  BOND_SHARE_DEFAULT,
  CHARTER_CAPITAL,
  COMPETITORS,
  DEFAULT_RISK_APPETITE,
  LIQ_TARGET_DEFAULT,
  START_APP_RATING,
  START_CASH,
  START_CASH_OPTIONS,
  START_DATE,
  START_SHARES,
} from '../config/balance';
import { DEFAULT_MODEL_ID } from '../data/bureaus';
import { CITIES } from '../data/cities';
import { PRODUCTS } from '../data/products';
import { capitalSnapshot } from './capital';
import { fullCoverage } from './hq';
import { emptyLedger } from './ledger';
import { initCountries } from './macro';
import { emptyFx } from './fx';
import {
  emptyConventions,
  emptyLobbying,
  emptyRealEstate,
  emptyVentures,
  initInvestments,
} from './investmentsInit';
import {
  emptyExecutives,
  emptyGovernance,
  emptyMergers,
  initCapitalMarkets,
  initMarket,
} from './marketInit';
import { emptyCorporateDebt } from './corporateDebt';
import type { LayoutVersion } from '../config/cityGeo';
import { SCHEMA_VERSION, type AvatarSpec, type GameState, type Settings } from './state';
import { packagedModel } from './underwriting';
import { generateCity } from './worldGen';
import { emptyEmpire, initPersonalEmpire } from './personalInit';
import type { Difficulty, HouseStyle, LogoShape } from '../data/types';
import { SEEDED_HOUSE_STYLE_IDS } from '../data/houseStyles';
import { DEFAULT_LOGO_SHAPE } from '../data/logoShapes';

export interface NewGameOptions {
  seed: number;
  cityId: string;
  bankName?: string;
  monogram?: string;
  brandInk?: string;
  /** The branch fronts' house style; defaults to one picked from the seed. */
  houseStyle?: HouseStyle;
  /** The outline of the bank's mark; defaults to the round medallion. */
  logoShape?: LogoShape;
  founderName?: string;
  founderAvatar?: AvatarSpec;
  startDate?: string;
  version?: string;
  difficulty?: Difficulty;
  /** Rival banks per city, 1–5; defaults to the city's usual count. */
  competitors?: number;
  /** One of START_CASH_OPTIONS. */
  startCash?: number;
  /** Currency symbol money is shown in (Settings). */
  currency?: Settings['currency'];
  /** The start city's street layout (cityGeo.ts); tests use 1 to check old saves' layout. */
  layout?: LayoutVersion;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: '$',
  units: 'km',
  weeklyResults: 'weekly',
  defaultSpeed: 1,
  autoPauseIncidents: true,
  autoPauseApplications: false,
  sound: false,
  reducedMotion: false,
  textScale: 1,
  layers: {},
  hqTabOrder: [],
  guides: true,
};

const DEFAULT_AVATAR: AvatarSpec = {
  head: 0,
  hair: 0,
  facial: 0,
  glasses: 0,
  attire: 0,
  tone: 0,
  shade: 1,
  eyes: 0,
  brows: 0,
  mouth: 0,
  age: 0,
};

export function newGame(opts: NewGameOptions): GameState {
  const city = CITIES[opts.cityId];
  if (!city) throw new Error(`Unknown city ${opts.cityId}`);
  const bankName = opts.bankName ?? 'Vault Street Bank';
  const model = packagedModel(DEFAULT_MODEL_ID);
  const startCash = opts.startCash ?? START_CASH;
  if (!(START_CASH_OPTIONS as readonly number[]).includes(startCash)) {
    throw new Error(`Starting cash must be one of ${START_CASH_OPTIONS.join(', ')}`);
  }
  const competitors = Math.round(
    Math.min(COMPETITORS.max, Math.max(COMPETITORS.min, opts.competitors ?? city.rivals)),
  );

  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      saveName: bankName,
      bankName,
      monogram: opts.monogram ?? 'VS',
      brandInk: opts.brandInk ?? '#2C4A7A',
      founderName: opts.founderName ?? 'Founder',
      founderAvatar: opts.founderAvatar ?? DEFAULT_AVATAR,
      seed: opts.seed,
      startDate: opts.startDate ?? START_DATE,
      createdWith: opts.version ?? 'dev',
      difficulty: opts.difficulty ?? 'normal',
      competitors,
      startCash,
      homeCityId: city.id,
      houseStyle:
        opts.houseStyle ?? SEEDED_HOUSE_STYLE_IDS[opts.seed % SEEDED_HOUSE_STYLE_IDS.length]!,
      logoShape: opts.logoShape ?? DEFAULT_LOGO_SHAPE,
    },
    clock: { day: 0, week: 0, speed: 0 },
    rng: {},
    settings: {
      ...structuredClone(DEFAULT_SETTINGS),
      currency: opts.currency ?? DEFAULT_SETTINGS.currency,
    },
    world: {
      currentCityId: city.id,
      countries: {},
      cities: {},
      lots: {},
      officeListings: {},
      sites: {},
      travel: { kmThisWeek: 0, totalKm: 0, flights: 0, faresPaid: 0 },
    },
    company: {
      cash: startCash,
      paidInCapital: startCash + CHARTER_CAPITAL,
      retainedEarnings: 0,
      goodwill: 0,
      sharesOutstanding: START_SHARES,
      taxPayable: 0,
      taxLossCarry: 0,
      fixedAssets: [],
      leaseDeposits: 0,
      tier: 'strong',
      tierWeeks: 0,
      negativeCashWeeks: 0,
      lowCapitalWeeks: 0,
      capitalRatio: 0,
      liquidityRatio: null,
      appRating: START_APP_RATING,
      riskAppetite: DEFAULT_RISK_APPETITE,
      applyRatesToAll: false,
      companyPrices: {},
      guidance: { deposits: 0, loans: 0, staffing: 0, marketing: 0, products: 0 },
    },
    branches: {},
    offices: {},
    departments: {},
    hq: { ramp: 0, coverage: fullCoverage() },
    people: {
      managers: {},
      managerCandidates: {},
      candidatesRefreshWeek: {},
      rerolls: {},
      benefits: {},
      hrHiring: true,
    },
    products: { catalog: {}, developments: [] },
    underwriting: { activeModelId: model.id, models: { [model.id]: model }, loansBooked: 0 },
    treasury: {
      reserves: CHARTER_CAPITAL,
      bondsMarket: 0,
      bondsBook: 0,
      bondBookYield: 0,
      liqTarget: LIQ_TARGET_DEFAULT,
      bondShare: BOND_SHARE_DEFAULT,
      autoFunding: true,
      freeze: false,
      overnight: 0,
      window: 0,
      windowStigmaWeeks: 0,
      lots: [],
      offers: [],
      offersRefreshWeek: -1,
    },
    loanDesk: { applications: {}, loans: {} },
    rivals: {},
    marketing: { campaigns: [], packages: [], cityBonus: {} },
    risk: { losses: [], reviews: [] },
    partnerships: {},
    corporateDebt: emptyCorporateDebt(),
    incidents: { active: [], cooldowns: {}, effects: [] },
    news: { issues: [], lastTemplate: {} },
    competition: { ratesStreak: {} },
    executives: emptyExecutives(),
    governance: emptyGovernance(),
    stock: {
      status: 'private',
      price: 0,
      history: [],
      high52: 0,
      low52: 0,
      sentiment: 1,
      holders: [],
      placements: [],
    },
    market: initMarket(),
    personal: { cash: 0, empire: emptyEmpire() },
    mergers: emptyMergers(),
    reo: {},
    ventures: emptyVentures(),
    conventions: emptyConventions(),
    realEstate: emptyRealEstate(),
    lobbying: emptyLobbying(),
    fx: emptyFx(),
    auctions: {},
    clubs: {},
    ledger: emptyLedger(),
    events: { log: [], scheduled: [] },
    history: { weekly: [], quarterly: [] },
    milestones: {},
    flags: { lessonsDone: [] },
    nextId: 0,
  };

  for (const spec of Object.values(PRODUCTS)) {
    state.products.catalog[spec.id] = { id: spec.id, stars: spec.startStars, developed: false };
  }

  initCountries(state, city.country);
  generateCity(state, city.id, { layout: opts.layout });

  const cap = capitalSnapshot(state);
  state.company.capitalRatio = cap.capitalRatio;
  state.company.tier = cap.tier;
  initCapitalMarkets(state);
  initInvestments(state);
  initPersonalEmpire(state);
  return state;
}
