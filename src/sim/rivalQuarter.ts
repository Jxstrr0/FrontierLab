// Rival quarter-end and failures (SIMULATION §18.5): quarterly earnings,
// dividends for listed rivals (paid to your holdings), the occasional CEO
// change, and the recession failure check. A failed rival is distressed for 8
// weeks, its network offered as a distressed sale in M&A; unless you buy it,
// its branches are then split among the other rivals in each city, or closed
// where there are none.
import {
  RIVAL_EXEC_RESIGN_CHANCE,
  RIVAL_FAILURE,
  RIVAL_FINANCE,
  RIVAL_LOAN_RISK_WEIGHT,
  RIVAL_PAYOUT,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { previousQuarter } from './calendar';
import { pushEvent } from './events';
import { payHolders } from './marketStocks';
import { clamp } from './math';
import { pendingOffer } from './mergerRules';
import { rivalBvps, rollDistressedAsk } from './mergerPricing';
import { stream, type Rng } from './rng';
import { rivalCapitalRatio, rivalLoans } from './rivalBooks';
import type { GameState, RivalBank } from './state';

const QUARTERS_KEPT = 8;
const QUARTERS_PER_YEAR = 4;

/** True when any country the rival operates in is in recession. */
function inRecession(state: GameState, bank: RivalBank): boolean {
  return bank.cities.some((id) => {
    const country = CITIES[id]?.country;
    return country !== undefined && state.world.countries[country]?.phase === 'recession';
  });
}

/** Quarter-end for every rival: report, pay, maybe change CEO, then the failure check. */
export function runRivalQuarter(state: GameState): void {
  const rng = stream(state, 'rivalsAi');
  const { year, q } = previousQuarter(state.meta.startDate, state.clock.day);
  const quarter = `Q${q} ${year}`;
  const banks = Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const bank of banks) {
    if (bank.status !== 'active') continue;
    report(state, bank, quarter);
    payDividend(state, bank, quarter);
    if (rng.chance(RIVAL_EXEC_RESIGN_CHANCE)) changeCeo(state, bank, rng);
    failureCheck(state, bank, rng);
  }
}

function report(state: GameState, bank: RivalBank, quarter: string): void {
  const prev = bank.quarters[bank.quarters.length - 1];
  const { revenue, netIncome } = bank.qtd;
  bank.quarters.push({ revenue, netIncome });
  if (bank.quarters.length > QUARTERS_KEPT)
    bank.quarters.splice(0, bank.quarters.length - QUARTERS_KEPT);
  bank.qtd = { revenue: 0, netIncome: 0 };
  const prevRevenue = prev?.revenue ?? 0;
  pushEvent(
    state,
    'RIVAL_EARNINGS',
    {
      rivalId: bank.id,
      company: bank.name,
      revenue,
      prevRevenue,
      pct: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
      netIncome,
      quarter,
    },
    2,
  );
}

/** A rival's share price: market price if listed, book value if private (src/sim/marketRivals.ts). */
export function rivalSharePrice(bank: RivalBank): number {
  return bank.price;
}

/**
 * Dividend = clamp(excessShare × excess, ratio × NI, maxRatio × NI), capped at
 * the excess over the strategy's capital target and paid only when profitable,
 * so the capital ratio settles near its target. Every rival pays; listed ones
 * announce it and pay your company's and your own holdings (§19.1).
 */
function payDividend(state: GameState, bank: RivalBank, quarter: string): void {
  const netIncome = bank.quarters[bank.quarters.length - 1]?.netIncome ?? 0;
  const target = RIVAL_FINANCE[bank.strategy].crTarget * rivalLoans(bank) * RIVAL_LOAN_RISK_WEIGHT;
  const excess = bank.equity - target;
  bank.dps = 0;
  if (netIncome <= 0 || excess <= 0) return;
  const p = RIVAL_PAYOUT;
  const dividend = Math.min(
    excess,
    clamp(p.excessShare * excess, p.ratio * netIncome, p.maxRatio * netIncome),
  );
  const dps = dividend / Math.max(1, bank.shares);
  bank.dps = dps;
  bank.equity -= dividend;
  bank.capitalRatio = rivalCapitalRatio(bank);
  if (!bank.listed) return;
  payHolders(state, bank.id, dps);
  pushEvent(
    state,
    'RIVAL_DIVIDEND',
    {
      rivalId: bank.id,
      company: bank.name,
      dps,
      yieldPct: bank.price > 0 ? ((dps * QUARTERS_PER_YEAR) / bank.price) * 100 : 0,
      quarter,
    },
    1,
  );
}

function changeCeo(state: GameState, bank: RivalBank, rng: Rng): void {
  const leaving = bank.ceo;
  bank.ceo = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  pushEvent(
    state,
    'RIVAL_EXEC_RESIGN',
    { rivalId: bank.id, company: bank.name, title: 'CEO', name: leaving },
    2,
  );
}

/** §18.5: in a recession, CR below 6% fails with 15% per quarter; below 2% it fails outright. */
function failureCheck(state: GameState, bank: RivalBank, rng: Rng): void {
  const insolvent = bank.capitalRatio < RIVAL_FAILURE.insolventCr;
  const atRisk = inRecession(state, bank) && bank.capitalRatio < RIVAL_FAILURE.maxCr;
  // Roll only for banks at risk, so healthy quarters leave the stream untouched.
  if (!insolvent && !(atRisk && rng.chance(RIVAL_FAILURE.chance))) return;
  bank.status = 'distressed';
  bank.distressedUntil = state.clock.week + RIVAL_FAILURE.distressWeeks;
  pushEvent(
    state,
    'BANK_FAILURE',
    { rivalId: bank.id, bank: bank.name, n: bank.branches.length },
    9,
  );
  offerDistressedSale(state, bank);
}

/**
 * §18.5: the seized network goes up for sale in M&A for its distressed weeks,
 * asking BVPS × P/B (0.4–0.7, floored per share). The roll uses the `mergers`
 * stream so the rival stream's draws don't shift.
 */
function offerDistressedSale(state: GameState, bank: RivalBank): void {
  const ask = rollDistressedAsk(bank, stream(state, 'mergers'));
  bank.distressedAsk = ask;
  const bvps = rivalBvps(bank);
  pushEvent(
    state,
    'DISTRESSED_SALE',
    {
      rivalId: bank.id,
      bank: bank.name,
      ask,
      pb: bvps > 0 ? ask / bvps : 0,
      weeks: RIVAL_FAILURE.distressWeeks,
      n: bank.branches.length,
    },
    7,
  );
}

/**
 * Weekly: once a distressed rival's 8 weeks are up, its branches go to the
 * other active rivals in each city (round robin, fewest branches first), or
 * close where no rival is left; the bank is then seized.
 */
export function splitDistressed(state: GameState): void {
  for (const bank of Object.values(state.rivals)) {
    if (bank.status !== 'distressed' || (bank.distressedUntil ?? 0) > state.clock.week) continue;
    // Your offer gets its answer first (M&A, tick step 8); a network you buy is never split.
    if (pendingOffer(state, bank.id)) continue;
    const takers = new Set<string>();
    const n = bank.branches.length;
    for (const branch of bank.branches) {
      const lot = state.world.lots[branch.lotId];
      const others = Object.values(state.rivals)
        .filter(
          (r) => r.status === 'active' && r.id !== bank.id && r.cities.includes(branch.cityId),
        )
        .sort((a, b) => a.branches.length - b.branches.length || (a.id < b.id ? -1 : 1));
      const taker = others[0];
      if (taker && lot) {
        taker.branches.push({ ...branch, negativeWeeks: 0 });
        lot.occupant = { type: 'rival', id: taker.id };
        taker.capitalRatio = rivalCapitalRatio(taker);
        takers.add(taker.name);
      } else if (lot?.occupant?.id === bank.id) {
        delete lot.occupant;
      }
    }
    bank.branches = [];
    bank.status = 'seized';
    delete bank.distressedUntil;
    delete bank.distressedAsk;
    bank.priceWar = {};
    pushEvent(
      state,
      'RIVAL_NETWORK_SPLIT',
      { rivalId: bank.id, bank: bank.name, n, takers: [...takers] },
      6,
    );
  }
}
