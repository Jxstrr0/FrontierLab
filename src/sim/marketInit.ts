// Stage 6 starting state (SIMULATION §19): the listed companies from CONTENT
// §17, rival share counts and prices, your bank's cap table (the founder owns
// every share), the personal account and empty governance, executive and M&A
// records. Used by newGame and the 6 → 7 save migration.
import { emptyEmpire } from './personalInit';
import {
  CPO_TRAINING,
  CTO_COMPUTE,
  EXEC_DELEGATION,
  PAY_REVIEW,
  RIVAL_NOTIONAL_SHARE,
  START_CEO_SALARY,
  START_PERSONAL_CASH,
  STOCK_MARKET,
} from '../config/balance';
import { EXCHANGES, SECTOR_BETA, STOCKS } from '../data/stocks';
import { fundHolders } from './marketHolders';
import { FOUNDER_ID } from './shares';
import type {
  ExecutivesState,
  Governance,
  GameState,
  MarketState,
  MergersState,
  OwnStock,
  RivalBank,
} from './state';
import { privateValuation } from './valuation';

export function initMarket(): MarketState {
  const companies: MarketState['companies'] = {};
  for (const s of Object.values(STOCKS)) {
    companies[s.id] = {
      id: s.id,
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      exchange: EXCHANGES[s.country],
      price: s.startPrice,
      shares: s.shares,
      eps: s.eps,
      growth: s.growth,
      vol: s.vol,
      beta: SECTOR_BETA[s.sector],
      divYield: s.divYield,
      history: [s.startPrice],
      high52: s.startPrice,
      low52: s.startPrice,
      topHolders: fundHolders(s.id),
    };
  }
  return {
    companies,
    index: STOCK_MARKET.startIndex,
    indexHistory: [STOCK_MARKET.startIndex],
    shock: 0,
    holdings: { company: {}, personal: {} },
  };
}

/**
 * Fixes a rival's share count from its starting equity at the notional book
 * value per share, and starts its price at book (the market moves it from there).
 */
export function initRivalShares(bank: RivalBank): void {
  const book = RIVAL_NOTIONAL_SHARE.bookPerShare;
  bank.shares = Math.max(1, Math.round(bank.equity / book));
  bank.price = bank.equity / bank.shares;
  bank.history = bank.listed ? [bank.price] : [];
  bank.high52 = bank.price;
  bank.low52 = bank.price;
  bank.sentiment = 1;
}

export function emptyGovernance(): Governance {
  return { ceoSalary: START_CEO_SALARY, dividendPerShare: 0, meetings: [] };
}

export function emptyExecutives(): ExecutivesState {
  return {
    seats: {},
    candidates: {},
    candidatesRefreshWeek: -1,
    rerolls: {},
    hadCto: false,
    remembered: {},
    growthCities: {},
    lastExpansionWeek: -1,
    payPremium: PAY_REVIEW.defaultPremium,
    lastPayReviewWeek: -1,
    payReviewCadence: PAY_REVIEW.defaultCadence,
    moraleTarget: EXEC_DELEGATION.moraleTarget,
    brandTarget: EXEC_DELEGATION.brandTarget,
    computeCover: CTO_COMPUTE.coverTarget,
    trainingStyle: CPO_TRAINING.defaultStyle,
    postureCeiling: EXEC_DELEGATION.croMaxAppetite,
    expansionReserveWeeks: EXEC_DELEGATION.expansionReserveWeeks,
    devFocus: EXEC_DELEGATION.devFocus,
    occTargets: { company: EXEC_DELEGATION.occTarget, personal: EXEC_DELEGATION.occTarget },
    trimmedStocks: { company: {}, personal: {} },
  };
}

export function emptyMergers(): MergersState {
  return { offers: [], integrations: [], deals: [] };
}

/** The cap table at the start: the founder holds every outstanding share. */
export function initStock(state: GameState): OwnStock {
  const stock: OwnStock = {
    status: 'private',
    price: 0,
    history: [],
    high52: 0,
    low52: 0,
    sentiment: 1,
    holders: [
      {
        id: FOUNDER_ID,
        name: state.meta.founderName,
        kind: 'founder',
        shares: state.company.sharesOutstanding,
      },
    ],
    placements: [],
  };
  return stock;
}

/** Adds every Stage 6 record to a state that has none (newGame and migration 6 → 7). */
export function initCapitalMarkets(state: GameState): void {
  state.company.goodwill ??= 0;
  state.executives = emptyExecutives();
  state.governance = emptyGovernance();
  state.market = initMarket();
  state.personal = { cash: START_PERSONAL_CASH, empire: emptyEmpire() };
  state.mergers = emptyMergers();
  state.stock = initStock(state);
  const price = privateValuation(state);
  state.stock.price = price;
  state.stock.history = [price];
  state.stock.high52 = price;
  state.stock.low52 = price;
}
