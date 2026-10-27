// Rival quarter-end (SIMULATION §18.5): quarterly earnings, dividends out of
// spare cash (paid to your holdings of listed rivals), a funding round for a lab
// running out of runway, the occasional CEO change, and the insolvency check. A
// failed rival is in administration for 8 weeks, its network offered as a
// distressed sale in M&A; unless you buy it, its offices are then split among
// the other rivals in each city, or closed where there are none.
import {
  RIVAL_BOOKS,
  RIVAL_EXEC_RESIGN_CHANCE,
  RIVAL_FAILURE,
  RIVAL_PAYOUT,
  RIVAL_RAISE,
} from '../config/balance';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { previousQuarter } from './calendar';
import { pushEvent } from './events';
import { payHolders } from './marketStocks';
import { clamp } from './math';
import { pendingOffer } from './mergerRules';
import { rollDistressedAsk } from './mergerPricing';
import { stream, type Rng } from './rng';
import { refreshRivalFinances } from './rivalBooks';
import { rivalArr, rivalFairPerShare, rivalRunwayWeeks, syncRivalEquity } from './rivalFinance';
import type { GameState, RivalBank } from './state';
import { giveRivalOffice, rivalUnits } from './rivalOffices';

const QUARTERS_KEPT = 8;
const QUARTERS_PER_YEAR = 4;

/** Quarter-end for every rival: report, pay, maybe raise, maybe change CEO, then the insolvency check. */
export function runRivalQuarter(state: GameState): void {
  const rng = stream(state, 'rivalsAi');
  const { year, q } = previousQuarter(state.meta.startDate, state.clock.day);
  const quarter = `Q${q} ${year}`;
  const banks = Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const bank of banks) {
    if (bank.status !== 'active') continue;
    report(state, bank, quarter);
    payDividend(state, bank, quarter);
    raiseRound(state, bank, rng);
    // One roll per seat's worth of risk, so a fuller team makes the news a little more often.
    if (rng.chance(RIVAL_EXEC_RESIGN_CHANCE * (1 + bank.execs.length)))
      changeExec(state, bank, rng);
    failureCheck(state, bank);
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

/** A rival's share price: market price if listed, fair value if private (src/sim/marketRivals.ts). */
export function rivalSharePrice(bank: RivalBank): number {
  return bank.price;
}

/**
 * Dividend = clamp(excessShare × excess, ratio × NI, maxRatio × NI), capped at
 * the cash over RIVAL_BOOKS.cashTargetWeeks of running costs and paid only when
 * profitable, so a lab keeps its runway. Every rival pays; listed ones announce
 * it and pay your company's and your own holdings (§19.1).
 */
function payDividend(state: GameState, bank: RivalBank, quarter: string): void {
  const netIncome = bank.quarters[bank.quarters.length - 1]?.netIncome ?? 0;
  const excess = bank.cash - RIVAL_BOOKS.cashTargetWeeks * bank.costs;
  bank.dps = 0;
  if (netIncome <= 0 || excess <= 0) return;
  const p = RIVAL_PAYOUT;
  const dividend = Math.min(
    excess,
    clamp(p.excessShare * excess, p.ratio * netIncome, p.maxRatio * netIncome),
  );
  const dps = dividend / Math.max(1, bank.shares);
  bank.dps = dps;
  bank.cash -= dividend;
  syncRivalEquity(state, bank);
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

/**
 * §18.5 funding round: a lab that lost money last quarter with under
 * RIVAL_RAISE.maxRunwayWeeks of cash rolls `chance` to sell new shares worth
 * `weeks` of running costs at its fair value less `discount`, diluting every
 * holder (your stake included). Draws only when at risk, so healthy quarters
 * leave the stream untouched.
 */
export function raiseRound(state: GameState, bank: RivalBank, rng: Rng): boolean {
  const lost = (bank.quarters[bank.quarters.length - 1]?.netIncome ?? 0) < 0;
  if (!lost || rivalRunwayWeeks(bank) >= RIVAL_RAISE.maxRunwayWeeks) return false;
  if (!rng.chance(RIVAL_RAISE.chance)) return false;
  const amount = RIVAL_RAISE.weeks * bank.costs;
  if (amount <= 0) return false;
  const price = Math.max(
    RIVAL_RAISE.minPrice,
    rivalFairPerShare(bank) * (1 - RIVAL_RAISE.discount),
  );
  const newShares = Math.round(amount / price);
  bank.shares += newShares;
  bank.cash += amount;
  syncRivalEquity(state, bank);
  pushEvent(
    state,
    'RIVAL_RAISE',
    { rivalId: bank.id, bank: bank.name, amount, newShares, price, weeks: RIVAL_RAISE.weeks },
    4,
  );
  return true;
}

/** One of the CEO or the bench steps down and is replaced (§18.1). */
function changeExec(state: GameState, bank: RivalBank, rng: Rng): void {
  const seat = rng.int(0, bank.execs.length);
  const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  let title = 'CEO';
  let leaving = bank.ceo;
  if (seat === 0) bank.ceo = name;
  else {
    const exec = bank.execs[seat - 1]!;
    title = exec.title;
    leaving = exec.name;
    exec.name = name;
  }
  pushEvent(
    state,
    'RIVAL_EXEC_RESIGN',
    { rivalId: bank.id, company: bank.name, title, name: leaving },
    seat === 0 ? 2 : 1,
  );
}

/** True when the lab's cash has run out for good (§18.5, RIVAL_FAILURE). */
export function insolvent(bank: RivalBank): boolean {
  return (
    bank.negativeQuarters >= RIVAL_FAILURE.insolventQuarters ||
    bank.cash < -RIVAL_FAILURE.maxDebtWeeks * bank.costs
  );
}

/**
 * §18.5: negative cash at two quarter-ends in a row, or a hole deeper than
 * RIVAL_FAILURE.maxDebtWeeks of costs, puts the lab into administration.
 */
function failureCheck(state: GameState, bank: RivalBank): void {
  bank.negativeQuarters = bank.cash < 0 ? bank.negativeQuarters + 1 : 0;
  if (!insolvent(bank)) return;
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
 * §18.5: the network goes up for sale in M&A for its distressed weeks, asking
 * ARR × a distressed multiple (0.5–0.8, floored per share). The roll uses the
 * `mergers` stream so the rival stream's draws don't shift.
 */
function offerDistressedSale(state: GameState, bank: RivalBank): void {
  const ask = rollDistressedAsk(bank, stream(state, 'mergers'));
  bank.distressedAsk = ask;
  const arrPerShare = rivalArr(bank) / Math.max(1, bank.shares);
  pushEvent(
    state,
    'DISTRESSED_SALE',
    {
      rivalId: bank.id,
      bank: bank.name,
      ask,
      multiple: arrPerShare > 0 ? ask / arrPerShare : 0,
      weeks: RIVAL_FAILURE.distressWeeks,
      n: bank.branches.length,
    },
    7,
  );
}

/**
 * Weekly: once a distressed rival's 8 weeks are up, its offices go to the
 * other active rivals in each city (round robin, fewest units first), or
 * close where no rival is left; the lab is then wound up.
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
        .sort((a, b) => rivalUnits(a) - rivalUnits(b) || (a.id < b.id ? -1 : 1));
      const taker = others[0];
      if (taker && lot) {
        // It joins the taker's office in the city, or becomes it (C2b).
        giveRivalOffice(state, taker, branch);
        refreshRivalFinances(state, taker);
        takers.add(taker.name);
      } else if (lot?.occupant?.id === bank.id) {
        delete lot.occupant;
      }
    }
    bank.branches = [];
    bank.status = 'seized';
    bank.cash = 0;
    bank.costs = 0;
    syncRivalEquity(state, bank);
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
