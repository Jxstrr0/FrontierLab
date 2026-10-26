// Save migrations (CLAUDE.md non-negotiable 7). Whenever GameState changes
// shape, bump SCHEMA_VERSION in state.ts and add `migrations[oldVersion]`,
// which upgrades a save from oldVersion to oldVersion + 1.
import { initPersonalEmpire } from '../personalInit';
import { generatePersonalSites } from '../personalSites';
import { CITIES } from '../../data/cities';
import { cityGeometry } from '../cityGeo';
import { isFrontage, nearestFrontage } from '../cityLayout';
import { fullCoverage } from '../hq';
import { generateSites } from '../hqSites';
import { RIVALS } from '../../data/rivals';
import { generateCapitalMarketSites } from '../capitalSites';
import { generateCompetitionSites } from '../competitionSites';
import { generateInvestmentSites } from '../investmentSites';
import { initInvestments } from '../investmentsInit';
import { initCapitalMarkets, initRivalShares } from '../marketInit';
import { emptyCorporateDebt } from '../corporateDebt';
import { initCountries } from '../macro';
import { checkMilestones } from '../milestones';
import { faceDetail, type BaseAvatar } from '../people';
import { initRivalBench, initRivalFinancials, seedMatureBooks } from '../rivals';
import { EXEC_DELEGATION, FX_START_INDEX, PAY_REVIEW } from '../../config/balance';
import { COUNTRIES } from '../../data/countries';
import { SEEDED_HOUSE_STYLE_IDS } from '../../data/houseStyles';
import { DEFAULT_LOGO_SHAPE } from '../../data/logoShapes';
import type { CountryId } from '../../data/types';
import { SCHEMA_VERSION, type BranchGuidance, type ExecSeat, type GameState } from '../state';

type RawSave = Record<string, unknown> & { schemaVersion: number };

/** Every v1 game started with this much; START_CASH has since moved (v0.10.4). */
const V1_START_CASH = 750_000;

export const migrations: Record<number, (s: RawSave) => RawSave> = {
  // 1 → 2: New Game options (difficulty, competitor count, starting cash).
  1: (s) => {
    const meta = s.meta as Record<string, unknown>;
    const world = s.world as { currentCityId: string };
    meta.difficulty = 'normal';
    meta.competitors = CITIES[world.currentCityId]?.rivals ?? 3;
    meta.startCash = V1_START_CASH;
    const company = s.company as Record<string, unknown>;
    company.negativeCashWeeks = 0;
    company.lowCapitalWeeks = 0;
    return s;
  },
  // 2 → 3: per-branch Loan Desk tallies for the current week.
  2: (s) => {
    const branches = s.branches as Record<string, Record<string, unknown>>;
    for (const b of Object.values(branches)) {
      b.desk = { week: 0, approved: 0, refused: 0, declined: 0, expired: 0 };
    }
    return s;
  },
  // 3 → 4: lots move onto tiles facing the Stage 3 street grid. Lots already on
  // frontage stay put; the rest snap to the nearest free frontage tile.
  3: (s) => {
    const lots = Object.values(
      (s.world as { lots: Record<string, { id: string; cityId: string; tile: Tile }> }).lots,
    ).sort((a, b) => (a.id < b.id ? -1 : 1));
    const used = new Map<string, Set<string>>();
    const usedIn = (cityId: string) => used.get(cityId) ?? used.set(cityId, new Set()).get(cityId)!;
    const misplaced: typeof lots = [];
    for (const lot of lots) {
      const city = CITIES[lot.cityId];
      if (city && isFrontage(cityGeometry(city, 1), lot.tile.x, lot.tile.y)) {
        usedIn(lot.cityId).add(`${lot.tile.x},${lot.tile.y}`);
      } else misplaced.push(lot);
    }
    for (const lot of misplaced) {
      const city = CITIES[lot.cityId];
      const spot =
        city && nearestFrontage(cityGeometry(city, 1), lot.tile.x, lot.tile.y, usedIn(lot.cityId));
      if (!spot) continue;
      lot.tile = spot;
      usedIn(lot.cityId).add(`${spot.x},${spot.y}`);
    }
    return s;
  },
  // 4 → 5: Stage 4 HQ. Adds offices, departments, coverage, benefits, product
  // developments, funding lots and offers, HQ marketing and risk records, the
  // new P&L lines, and each city's office listings and map sites.
  4: (s) => {
    s.offices = {};
    s.departments = {};
    s.hq = { ramp: 0, coverage: fullCoverage() };
    s.marketing = { campaigns: [], packages: [], cityBonus: {} };
    s.risk = { losses: [], reviews: [] };
    (s.people as Record<string, unknown>).benefits = {};
    (s.products as Record<string, unknown>).developments = [];
    Object.assign(s.treasury as Record<string, unknown>, {
      lots: [],
      offers: [],
      offersRefreshWeek: -1,
    });
    const addLines = (pnl: Record<string, number>) => {
      for (const line of NEW_PNL_LINES) pnl[line] ??= 0;
    };
    addLines((s.ledger as { pnl: Record<string, number> }).pnl);
    for (const w of (s.history as { weekly: { pnl: Record<string, number> }[] }).weekly) {
      addLines(w.pnl);
    }
    const world = s.world as Record<string, unknown>;
    world.officeListings = {};
    world.sites = {};
    const state = s as unknown as GameState;
    for (const cityId of Object.keys(state.world.cities).sort()) generateSites(state, cityId);
    return s;
  },
  // 5 → 6: Stage 5 competition. Every country gets a macro economy, rivals get
  // financials and branch books, cities get rival head offices, employers and a
  // university, and the new partnership, corporate debt, incident, news and
  // price-war state starts empty.
  5: (s) => {
    const state = s as unknown as GameState;
    state.partnerships = {};
    state.corporateDebt = emptyCorporateDebt();
    state.incidents = { active: [], cooldowns: {}, effects: [] };
    state.news = { issues: [], lastTemplate: {} };
    state.competition = { ratesStreak: {} };
    const addLines = (pnl: Record<string, number>) => {
      for (const line of STAGE5_PNL_LINES) pnl[line] ??= 0;
    };
    addLines(state.ledger.pnl);
    for (const w of state.history.weekly) addLines(w.pnl);
    for (const bank of Object.values(state.rivals)) {
      const spec = RIVALS[bank.id];
      Object.assign(bank, {
        equity: 0,
        capitalRatio: 0,
        listed: spec?.ticker !== undefined,
        ceo: '',
        qtd: { revenue: 0, netIncome: 0 },
        quarters: [],
        priceWar: {},
      });
      if (spec?.ticker) bank.ticker = spec.ticker;
      for (const b of bank.branches) {
        Object.assign(b, { deposits: 0, loans: 0, contribution: 0, negativeWeeks: 0 });
        seedMatureBooks(b);
      }
    }
    for (const id of Object.keys(state.rivals).sort())
      initRivalFinancials(state, state.rivals[id]!);
    const home = CITIES[Object.values(state.branches)[0]?.cityId ?? state.world.currentCityId];
    if (home) initCountries(state, home.country);
    for (const cityId of Object.keys(state.world.cities).sort()) {
      generateCompetitionSites(state, cityId);
    }
    return s;
  },
  // 6 → 7: Stage 6 governance and capital markets. Rivals get share counts and
  // prices, cities get investment bank offices, branches can convert after an
  // acquisition, and the executive, board, cap table, stock market, personal
  // and M&A records start fresh (the founder holds every share).
  6: (s) => {
    const state = s as unknown as GameState;
    const addLines = (pnl: Record<string, number>) => {
      for (const line of STAGE6_PNL_LINES) pnl[line] ??= 0;
    };
    addLines(state.ledger.pnl);
    for (const w of state.history.weekly) addLines(w.pnl);
    for (const bank of Object.values(state.rivals)) {
      Object.assign(bank, { shares: 0, price: 0, history: [], high52: 0, low52: 0, sentiment: 1 });
      initRivalShares(bank);
    }
    for (const cityId of Object.keys(state.world.cities).sort()) {
      generateCapitalMarketSites(state, cityId);
    }
    initCapitalMarkets(state);
    return s;
  },
  // 7 → 8: Stage 7 investments. New P&L lines, foreclosed-home pools get a mode
  // and a house price mark, cities get property buildings, a convention centre
  // and a lobbying firm, and ventures, conventions, real estate and lobbying
  // start fresh.
  7: (s) => {
    const state = s as unknown as GameState;
    const addLines = (pnl: Record<string, number>) => {
      for (const line of STAGE7_PNL_LINES) pnl[line] ??= 0;
    };
    addLines(state.ledger.pnl);
    for (const w of state.history.weekly) addLines(w.pnl);
    for (const [cityId, pool] of Object.entries(state.reo)) {
      const country = CITIES[cityId]?.country;
      pool.mode = 'hold';
      pool.hpiRef = (country && state.world.countries[country]?.hpi) || 100;
    }
    for (const cityId of Object.keys(state.world.cities).sort()) {
      generateInvestmentSites(state, cityId);
    }
    initInvestments(state);
    return s;
  },

  // 8 → 9: Stage 8 travel. The start city is recorded as home, travel starts
  // fresh, a travel expense line appears, and HQ prices become per country
  // (the existing list belongs to the home country).
  8: (s) => {
    const state = s as unknown as GameState;
    const raw = state as unknown as { company: { companyPrices: Record<string, unknown> } };
    const home = Object.values(state.branches)[0]?.cityId ?? state.world.currentCityId;
    state.meta.homeCityId = home;
    state.world.travel = { kmThisWeek: 0, totalKm: 0, flights: 0, faresPaid: 0 };
    state.ledger.pnl.travel ??= 0;
    for (const w of state.history.weekly) w.pnl.travel ??= 0;
    const old = raw.company.companyPrices;
    const country = CITIES[home]!.country;
    state.company.companyPrices = Object.keys(old).length
      ? { [country]: old as Record<string, number> }
      : {};
    return s;
  },

  // 9 → 10: Stage 9 personal empire. Every visited city gains its car dealer,
  // auction house and vacation homes; new P&L lines; the empire, auctions,
  // clubs and rich list start fresh.
  9: (s) => {
    const state = s as unknown as GameState;
    for (const line of STAGE9_PNL_LINES) {
      state.ledger.pnl[line] ??= 0;
      for (const w of state.history.weekly) w.pnl[line] ??= 0;
    }
    for (const cityId of Object.keys(state.world.cities).sort()) {
      generatePersonalSites(state, cityId);
    }
    initPersonalEmpire(state);
    return s;
  },

  // 10 → 11: per-city geography (layout versions). Every city already generated
  // keeps the original shared grid (layout 1), so its lots, buildings and map
  // never move; cities visited from now on get their own geography (layout 2).
  10: (s) => {
    const state = s as unknown as GameState;
    for (const city of Object.values(state.world.cities)) city.layout = 1;
    return s;
  },

  // 11 → 12: audit fixes. Rivals get a senior team below the CEO, and each
  // branch's Loan Desk tally counts this week's arrivals (unknown, so 0).
  11: (s) => {
    const state = s as unknown as GameState;
    for (const id of Object.keys(state.rivals).sort()) initRivalBench(state, state.rivals[id]!);
    for (const b of Object.values(state.branches)) b.desk.arrived ??= 0;
    // Milestones already reached are recorded now, quietly (no toasts or stories).
    checkMilestones(state, true);
    return s;
  },

  // 12 → 13: hands-off play. Executive seats remember their last holder's
  // delegation toggles, the COO gets a list of growth cities and an expansion
  // clock, and candidates waiting in the pools now come with every delegation
  // on (the new default for hires).
  12: (s) => {
    const state = s as unknown as GameState;
    const ex = state.executives;
    ex.remembered ??= {};
    ex.growthCities ??= {};
    ex.lastExpansionWeek ??= -1;
    for (const pool of Object.values(ex.candidates)) {
      for (const c of pool ?? [])
        for (const id of Object.keys(c.delegations)) c.delegations[id] = true;
    }
    return s;
  },
  // v14: the CFO's share sales split out of Capital (each keeps what Capital
  // did, so nothing changes until you flip one), and the last fit-out you built.
  13: (s) => {
    const state = s as unknown as GameState;
    const ex = state.executives;
    const cfo = ex.seats.cfo;
    if (cfo) cfo.delegations.shares ??= !!cfo.delegations.capital;
    const mem = ex.remembered.cfo;
    if (mem) mem.shares ??= !!mem.capital;
    for (const c of ex.candidates.cfo ?? []) c.delegations.shares ??= true;
    const newest = Object.values(state.branches).sort((a, b) => b.builtDay - a.builtDay)[0];
    if (newest && !state.company.lastBuild) state.company.lastBuild = { ...newest.build };
    return s;
  },
  // v15: CFO + CRO branch guidance and the COO's pay reviews. Seated executives
  // (and the toggles a seat remembers) start with the new switches off, so
  // nothing changes until you flip one; waiting candidates get them on, the
  // default for hires.
  14: (s) => {
    const state = s as unknown as GameState;
    state.company.guidance ??= { deposits: 0, loans: 0 } as BranchGuidance;
    const ex = state.executives;
    ex.payPremium ??= PAY_REVIEW.defaultPremium;
    ex.lastPayReviewWeek ??= -1;
    const added: [ExecSeat, string][] = [
      ['cfo', 'guidance'],
      ['cro', 'guidance'],
      ['coo', 'payReviews'],
    ];
    for (const [seat, id] of added) {
      const exec = ex.seats[seat];
      if (exec) exec.delegations[id] ??= false;
      const mem = ex.remembered[seat];
      if (mem) mem[id] ??= false;
      for (const c of ex.candidates[seat] ?? []) c.delegations[id] ??= true;
    }
    return s;
  },
  // v16: Russia joins the world (Moscow and St Petersburg). Its economy starts
  // fresh from the macro stream, as initCountries does for a new game, and its
  // currency starts level with where the others began.
  15: (s) => {
    const state = s as unknown as GameState;
    const home = CITIES[Object.values(state.branches)[0]?.cityId ?? state.world.currentCityId];
    if (home) initCountries(state, home.country);
    for (const c of Object.keys(COUNTRIES) as CountryId[]) {
      if (state.fx.level[c] !== undefined) continue;
      state.fx.level[c] = FX_START_INDEX;
      state.fx.history[c] = [FX_START_INDEX];
    }
    return s;
  },
  // v17: paid candidate rerolls. Counts start at zero for every pool.
  16: (s) => {
    const state = s as unknown as GameState;
    state.people.rerolls ??= {};
    state.executives.rerolls ??= {};
    return s;
  },
  // v18: branch guidance from the COO (staffing), CMO (marketing) and CPO
  // (products). Like v15, seated executives start with the switches off and
  // waiting candidates with them on.
  17: (s) => {
    const state = s as unknown as GameState;
    const g = (state.company.guidance ??= { deposits: 0, loans: 0 } as BranchGuidance);
    g.staffing ??= 0;
    g.marketing ??= 0;
    g.products ??= 0;
    const ex = state.executives;
    for (const seat of ['coo', 'cmo', 'cpo'] as ExecSeat[]) {
      const exec = ex.seats[seat];
      if (exec) exec.delegations.guidance ??= false;
      const mem = ex.remembered[seat];
      if (mem) mem.guidance ??= false;
      for (const c of ex.candidates[seat] ?? []) c.delegations.guidance ??= true;
    }
    return s;
  },
  // v19: the house style of your branch fronts. Older banks get one picked
  // from their seed, so existing saves still differ from one another.
  18: (s) => {
    const state = s as unknown as GameState;
    state.meta.houseStyle ??=
      SEEDED_HOUSE_STYLE_IDS[state.meta.seed % SEEDED_HOUSE_STYLE_IDS.length]!;
    return s;
  },
  // v20: the outline of the bank's mark. Older banks keep the round medallion
  // they have always worn.
  19: (s) => {
    const state = s as unknown as GameState;
    state.meta.logoShape ??= DEFAULT_LOGO_SHAPE;
    return s;
  },
  // v21: the delegation dials. Older banks keep what the switches always did:
  // morale held at 70, awareness at 50%, pay reviewed once a quarter.
  20: (s) => {
    const state = s as unknown as GameState;
    const ex = state.executives;
    ex.payReviewCadence ??= PAY_REVIEW.defaultCadence;
    ex.moraleTarget ??= EXEC_DELEGATION.moraleTarget;
    ex.brandTarget ??= EXEC_DELEGATION.brandTarget;
    return s;
  },
  // v22: the HQ tabs can be arranged. An empty order is the usual DEPT_ORDER.
  21: (s) => {
    const state = s as unknown as GameState;
    state.settings.hqTabOrder ??= [];
    return s;
  },
  // v23: portraits gained eyes, brows, mouth and age. Every face in the save
  // (founder, managers, candidates, executives, startup and venture CEOs) gets
  // them. The founder keeps the look they chose; everyone else gets the face
  // a new game would give the same parts (people.ts faceDetail).
  22: (s) => {
    const meta = s.meta as { founderAvatar?: Record<string, unknown> };
    if (meta.founderAvatar) {
      Object.assign(meta.founderAvatar, { eyes: 0, brows: 0, mouth: 0, age: 0 });
    }
    addFaceDetail(s);
    return s;
  },
  // v24: tutorial Part 2. Part 1 gained two steps, so the closing card moved
  // from 8 to 10 and "finished" from 9 to 11. Guides start switched on, minus
  // the ones for things the bank has already done (learnedLessons).
  23: (s) => {
    const state = s as unknown as GameState;
    const step = state.flags.tutorialStep;
    if (step === 8 || step === 9) state.flags.tutorialStep = step + 2;
    state.settings.guides ??= true;
    state.flags.lessonsDone ??= learnedLessons(state);
    return s;
  },
};

/** The v22 portrait fields; an object with all of them and no `eyes` is a face. */
const V22_FACE_KEYS = ['head', 'hair', 'facial', 'glasses', 'attire', 'tone', 'shade'] as const;

function addFaceDetail(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) addFaceDetail(item);
    return;
  }
  const o = node as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    const v = o[key];
    if (!v || typeof v !== 'object') continue;
    if (Array.isArray(v)) {
      addFaceDetail(v);
      continue;
    }
    const face = v as Record<string, unknown>;
    if (V22_FACE_KEYS.every((k) => typeof face[k] === 'number') && face.eyes === undefined) {
      Object.assign(face, faceDetail(face as unknown as BaseAvatar));
      continue;
    }
    addFaceDetail(v);
  }
}

/** Guides an older bank has no need for: it already has an HQ, floors, executives, a listing or flights. */
function learnedLessons(state: GameState): string[] {
  const done: string[] = [];
  if (Object.keys(state.offices).length > 0) done.push('hq');
  if (Object.values(state.executives.seats).some(Boolean)) done.push('exec');
  if (state.stock.status !== 'private') done.push('ipo');
  if (state.world.travel.flights > 0) done.push('travel', 'place-airport');
  for (const dept of Object.keys(state.departments)) done.push(`floor-${dept}`);
  return done;
}

const STAGE9_PNL_LINES = ['franchiseRevenue', 'franchiseCosts', 'dealerFees'] as const;

const STAGE7_PNL_LINES = [
  'ventureDebtInterest',
  'rentalIncome',
  'propertyGains',
  'propertyCosts',
  'lobbying',
] as const;

const STAGE6_PNL_LINES = [
  'execPay',
  'grantExpense',
  'integration',
  'commissions',
  'dividendIncome',
  'investmentGains',
  'acquisitionGain',
] as const;
const NEW_PNL_LINES = ['hqStaff', 'benefits', 'development'] as const;
const STAGE5_PNL_LINES = ['incidents', 'corporateInterest', 'amortization'] as const;

type Tile = { x: number; y: number };

/** Upgrades a raw save to the current schema, or throws if it can't. */
export function migrate(raw: RawSave): RawSave {
  let s = raw;
  if (s.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      'This save comes from a newer version of Vault Street. Update the game to load it.',
    );
  }
  while (s.schemaVersion < SCHEMA_VERSION) {
    const step = migrations[s.schemaVersion];
    if (!step) throw new Error(`No migration from save version ${s.schemaVersion}.`);
    s = step(s);
    s.schemaVersion += 1;
  }
  return s;
}
