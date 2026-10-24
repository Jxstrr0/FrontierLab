// Save migrations (CLAUDE.md non-negotiable 7). Whenever GameState changes
// shape, bump SCHEMA_VERSION in state.ts and add `migrations[oldVersion]`,
// which upgrades a save from oldVersion to oldVersion + 1.
import { START_CASH } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { isFrontage, nearestFrontage } from '../cityLayout';
import { fullCoverage } from '../hq';
import { generateSites } from '../hqSites';
import { RIVALS } from '../../data/rivals';
import { generateCapitalMarketSites } from '../capitalSites';
import { generateCompetitionSites } from '../competitionSites';
import { initCapitalMarkets, initRivalShares } from '../marketInit';
import { emptyCorporateDebt } from '../corporateDebt';
import { initCountries } from '../macro';
import { initRivalFinancials, seedMatureBooks } from '../rivals';
import { SCHEMA_VERSION, type GameState } from '../state';

type RawSave = Record<string, unknown> & { schemaVersion: number };

export const migrations: Record<number, (s: RawSave) => RawSave> = {
  // 1 → 2: New Game options (difficulty, competitor count, starting cash).
  1: (s) => {
    const meta = s.meta as Record<string, unknown>;
    const world = s.world as { currentCityId: string };
    meta.difficulty = 'normal';
    meta.competitors = CITIES[world.currentCityId]?.rivals ?? 3;
    meta.startCash = START_CASH;
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
      if (city && isFrontage(city, lot.tile.x, lot.tile.y)) {
        usedIn(lot.cityId).add(`${lot.tile.x},${lot.tile.y}`);
      } else misplaced.push(lot);
    }
    for (const lot of misplaced) {
      const city = CITIES[lot.cityId];
      const spot = city && nearestFrontage(city, lot.tile.x, lot.tile.y, usedIn(lot.cityId));
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
};

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
