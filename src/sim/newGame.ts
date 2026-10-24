// Creates a fresh GameState (SIMULATION §26 START constants): one city with its
// lots and rivals, the home country's macro, the chosen corporate cash ($750k by
// default) and $2M of charter capital held in treasury reserves.
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
import { generateLots } from './citygen';
import { fullCoverage } from './hq';
import { generateSites } from './hqSites';
import { emptyLedger } from './ledger';
import { initCountries } from './macro';
import { generateCapitalMarketSites } from './capitalSites';
import { generateCompetitionSites } from './competitionSites';
import { generateInvestmentSites } from './investmentSites';
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
import { refreshManagerPool } from './people';
import { updateMarketRefs } from './rates';
import { seedRivals } from './rivals';
import { SCHEMA_VERSION, type AvatarSpec, type GameState, type Settings } from './state';
import { packagedModel } from './underwriting';
import type { Difficulty } from '../data/types';

export interface NewGameOptions {
  seed: number;
  cityId: string;
  bankName?: string;
  monogram?: string;
  brandInk?: string;
  founderName?: string;
  founderAvatar?: AvatarSpec;
  startDate?: string;
  version?: string;
  difficulty?: Difficulty;
  /** Rival banks per city, 1–5; defaults to the city's usual count. */
  competitors?: number;
  /** One of START_CASH_OPTIONS. */
  startCash?: number;
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
};

const DEFAULT_AVATAR: AvatarSpec = {
  head: 0,
  hair: 0,
  facial: 0,
  glasses: 0,
  attire: 0,
  tone: 0,
  shade: 1,
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
    },
    clock: { day: 0, week: 0, speed: 0 },
    rng: {},
    settings: structuredClone(DEFAULT_SETTINGS),
    world: {
      currentCityId: city.id,
      countries: {},
      cities: {},
      lots: {},
      officeListings: {},
      sites: {},
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
    },
    branches: {},
    offices: {},
    departments: {},
    hq: { ramp: 0, coverage: fullCoverage() },
    people: { managers: {}, managerCandidates: {}, candidatesRefreshWeek: {}, benefits: {} },
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
    personal: { cash: 0 },
    mergers: emptyMergers(),
    reo: {},
    ventures: emptyVentures(),
    conventions: emptyConventions(),
    realEstate: emptyRealEstate(),
    lobbying: emptyLobbying(),
    ledger: emptyLedger(),
    events: { log: [], scheduled: [] },
    history: { weekly: [], quarterly: [] },
    milestones: {},
    flags: {},
    nextId: 0,
  };

  for (const spec of Object.values(PRODUCTS)) {
    state.products.catalog[spec.id] = { id: spec.id, stars: spec.startStars, developed: false };
  }

  initCountries(state, city.country);
  state.world.cities[city.id] = { id: city.id, generated: true, brandAwareness: 0, marketRef: {} };
  const lots = generateLots(state, city.id);
  seedRivals(state, city.id, lots);
  for (const lot of lots) state.world.lots[lot.id] = lot;
  generateSites(state, city.id);
  generateCompetitionSites(state, city.id);
  generateCapitalMarketSites(state, city.id);
  generateInvestmentSites(state, city.id);
  updateMarketRefs(state);
  refreshManagerPool(state, city.id, true);

  const cap = capitalSnapshot(state);
  state.company.capitalRatio = cap.capitalRatio;
  state.company.tier = cap.tier;
  initCapitalMarkets(state);
  initInvestments(state);
  return state;
}
