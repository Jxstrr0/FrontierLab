// Save migrations (CLAUDE.md non-negotiable 7). Whenever GameState changes
// shape, bump SCHEMA_VERSION in state.ts and add `migrations[oldVersion]`,
// which upgrades a save from oldVersion to oldVersion + 1.
// Frontier Lab's chain starts at schema 1 (stage C0, DESIGN decision A6).
// Vault Street's 37 steps were dropped: its saves live in a separate store
// and its export codes are turned away, so none can reach this chain.
import { CPO_TRAINING, CTO_COMPUTE, EXEC_DELEGATION } from '../../config/balance';
import { foldRivalCity } from '../rivalOffices';
import { startRunoff } from '../partnerships';
import { migrateCatalog } from './migrateCatalog';
import { migrateBankCleanup } from './migrateBankCleanup';
import { migrateCompute } from './migrateCompute';
import { migrateGpuLots } from './migrateGpuLots';
import { migrateBusinesses } from './migrateBusinesses';
import { migrateModel } from './migrateModel';
import { migrateSafety } from './migrateSafety';
import { migrateTalent } from './migrateTalent';
import { migrateTraining } from './migrateTraining';
import { migrateDealDesk } from './migrateDealDesk';
import { migrateSpotLimits } from './migrateSpotLimits';
import { migrateMoney } from './migrateMoney';
import { migrateRivalBooks } from './migrateRivalBooks';
import { SCHEMA_VERSION, type GameState } from '../state';
import { migrateSeedMoney } from './migrateSeedMoney';
import { migrateSeats } from './migrateSeats';
import { migrateAvatars } from './migrateAvatars';
import { migrateCurrencies } from './migrateCurrencies';
import { generatePersonalSites } from '../personalSites';
import { generateLandmarkTower } from '../landmarkTowers';

type RawSave = Record<string, unknown> & { schemaVersion: number };

/** 2 → 3: a rival's branches in one city fold into one office sized for them. */
function foldRivalCities(s: RawSave): RawSave {
  // Schema 2 rivals have GameState's shape less `size`, which counts as Starter.
  const state = s as unknown as GameState;
  for (const bank of Object.values(state.rivals ?? {})) {
    for (const b of bank.branches) b.size ??= 0;
    for (const cityId of new Set(bank.branches.map((b) => b.cityId))) {
      foldRivalCity(state, bank, cityId);
    }
  }
  return s;
}

export const migrations: Record<number, (s: RawSave) => RawSave> = {
  // 1 → 2 (stage C2a): branches become sales offices with a size; every
  // existing one starts at Starter. A second branch in a city keeps running.
  1: (s) => {
    const branches = (s.branches ?? {}) as Record<string, Record<string, unknown>>;
    for (const b of Object.values(branches)) if (b.size === undefined) b.size = 0;
    return s;
  },
  // 2 → 3 (stage C2b): rival labs hold one sales office per city, with a size.
  2: foldRivalCities,
  // 3 → 4 (stage C2c): data centers, none yet.
  3: (s) => {
    s.dataCenters ??= {};
    return s;
  },
  // 4 → 5 (stage C2d2): every sales office follows HQ prices until told otherwise.
  4: (s) => {
    const branches = (s.branches ?? {}) as Record<string, Record<string, unknown>>;
    for (const b of Object.values(branches)) b.ownPrices ??= false;
    return s;
  },
  // 5 → 6 (stage C3a): the AI catalog; bank books settle, customers go to the Free Tier.
  5: (s) => {
    migrateCatalog(s as unknown as GameState);
    return s;
  },
  // 6 → 7 (stage C3b): compute and AI P&L lines; the Loan Desk lends company cash.
  6: (s) => {
    migrateMoney(s as unknown as GameState);
    return s;
  },
  // 7 → 8 (stage C3c): REO sold into cash, bonds into reserves, covered bonds gone.
  7: (s) => {
    migrateBankCleanup(s as unknown as GameState);
    return s;
  },
  // 8 → 9 (stage C4a): the compute pool and the chip cycle.
  8: (s) => {
    migrateCompute(s as unknown as GameState);
    return s;
  },
  // 9 → 10 (stage C4b): GPU lots and the GPU market on the Compute floor.
  9: (s) => {
    migrateGpuLots(s as unknown as GameState);
    return s;
  },
  // 10 → 11 (stage C4c): spot limits, emergency burst, capacity crunch and outages.
  10: (s) => {
    migrateSpotLimits(s as unknown as GameState);
    return s;
  },
  // 11 → 12 (stage C5a): customer businesses on spare storefronts and anchor employers.
  11: (s) => {
    migrateBusinesses(s as unknown as GameState);
    return s;
  },
  12: (s) => {
    migrateDealDesk(s as unknown as GameState);
    return s;
  },
  // 13 → 14 (stage C6a): the AI model, licence cost per customer.
  13: (s) => {
    migrateModel(s as unknown as GameState);
    return s;
  },
  // 14 → 15 (stage C6b): training runs, rival models and the frontier.
  14: (s) => {
    migrateTraining(s as unknown as GameState);
    return s;
  },
  15: (s) => {
    migrateTalent(s as unknown as GameState);
    return s;
  },
  16: (s) => {
    migrateSafety(s as unknown as GameState);
    return s;
  },
  // 17 → 18 (stage C8a): data-centre and power deals at energy sites.
  17: (s) => {
    (s as unknown as GameState).powerDeals ??= {};
    return s;
  },
  // 18 → 19 (stage C8f): treasury reserves become spendable seed money.
  18: (s) => {
    migrateSeedMoney(s as unknown as GameState);
    return s;
  },
  // 19 → 20 (post-C8): the CTO's Compute delegation and its cover dial.
  19: (s) => {
    (s as unknown as GameState).executives.computeCover ??= CTO_COMPUTE.coverTarget;
    return s;
  },
  // 20 → 21: new vacation homes (CONTENT §20) get their map sites in cities
  // already generated. Existing sites keep their tiles: the generator skips ids
  // it already has before drawing from the city's stream.
  20: (s) => {
    const state = s as unknown as GameState;
    for (const city of Object.values(state.world.cities)) {
      if (city.generated) generatePersonalSites(state, city.id);
    }
    return s;
  },
  // 21 → 22: seven executive seats. The Chief Scientist folds into the CPO and
  // the Chief Infrastructure Officer into the CFO; the dormant CFO Funding and
  // CFO/CSO guidance switches go; the HR floor's manager-hiring switch becomes
  // the COO's Sales office operations.
  21: (s) => {
    migrateSeats(s as unknown as GameState);
    return s;
  },
  // 22 → 23: rival labs keep books on customers, ARR, cash and runway instead
  // of deposits, loans and a capital ratio.
  22: (s) => {
    migrateRivalBooks(s as unknown as GameState);
    return s;
  },
  // 23 → 24: runway (worked out from cash and the weekly closes) replaces the
  // stored credit ratio, so the ratio and the risk-weighted assets go.
  23: (s) => {
    const state = s as unknown as {
      company: { capitalRatio?: number };
      history: { weekly: { capitalRatio?: number; totals: { rwa?: number } }[] };
    };
    delete state.company.capitalRatio;
    for (const w of state.history.weekly) {
      delete w.capitalRatio;
      delete w.totals.rwa;
    }
    return s;
  },
  // 24 → 25: landmark towers. London and Moscow, if already generated, gain
  // their giant Financial District office listing.
  24: (s) => {
    const state = s as unknown as GameState;
    for (const city of Object.values(state.world.cities)) {
      if (city.generated) generateLandmarkTower(state, city.id);
    }
    return s;
  },
  // 25 → 26: the CPO's training style dial, Balanced (the old fixed 12-week runs).
  25: (s) => {
    (s as unknown as GameState).executives.trainingStyle ??= CPO_TRAINING.defaultStyle;
    return s;
  },
  // 26 → 27: frontier projects, none under way or finished.
  26: (s) => {
    (s as unknown as GameState).projects ??= { done: [] };
    return s;
  },
  // Schema 28 (new regions): CityState.licensed is optional; no city has paid yet.
  27: (s) => s,
  // 28 → 29 (portrait rework): looks, hair colours and outfit colours.
  28: (s) => {
    migrateAvatars(s as unknown as GameState);
    return s;
  },
  // Schema 30 (C-suite dials): the CSO's posture ceiling, the COO's expansion
  // reserve and the CPO's product focus start at the old fixed behaviour. The
  // CPO's new Research talent switch is a delegation toggle like any other, so a
  // seated CPO has it off until you switch it on.
  29: (s) => {
    const ex = (s as unknown as GameState).executives;
    ex.postureCeiling ??= EXEC_DELEGATION.croMaxAppetite;
    ex.expansionReserveWeeks ??= EXEC_DELEGATION.expansionReserveWeeks;
    ex.devFocus ??= EXEC_DELEGATION.devFocus;
    return s;
  },
  // Schema 31 (polish pass): Executive.counterWeek is optional; no counter is on record yet.
  30: (s) => s,
  // Schema 32 (owner's review B7): the Currencies investment is cut. Old
  // positions are sold at their last rate into the owner's cash and `fx` goes.
  31: (s) => {
    migrateCurrencies(s as unknown as GameState);
    return s;
  },
  // Schema 33 (owner's review, B1: one deal per employer): staff-plan (`payroll`)
  // partnerships are retired. An active one starts its 12-week run-off as if
  // released (the rest of its fee is written off, its seats fade); one already
  // running off is left alone.
  32: (s) => {
    const state = s as unknown as GameState;
    for (const p of Object.values(state.partnerships ?? {})) {
      if (p.kind === 'payroll' && p.status === 'active') startRunoff(state, p, 'released');
    }
    return s;
  },
  // Schema 34 (owner's review A3, B3: model launches and open weights): new
  // optional fields only (UnderwritingModel.launchedWeek / openWeek,
  // UnderwritingState.launch). Models switched on before this count as launched.
  33: (s) => {
    const state = s as unknown as GameState;
    for (const m of Object.values(state.underwriting?.models ?? {}))
      if (m.source === 'trained' && m.id === state.underwriting.activeModelId)
        m.launchedWeek ??= m.trainedWeek ?? state.clock.week;
    return s;
  },
  // Schema 35 (owner's review A4: public-sector tenders): the Deal Desk holds
  // tenders open or won, none yet in an older save.
  34: (s) => {
    const state = s as unknown as GameState;
    if (state.dealDesk) state.dealDesk.tenders ??= {};
    return s;
  },
};

/** Upgrades a raw save to the current schema, or throws if it can't. */
export function migrate(raw: RawSave): RawSave {
  let s = raw;
  if (s.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      'This save comes from a newer version of Frontier Lab. Update the game to load it.',
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
