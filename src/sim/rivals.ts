// Rival labs (SIMULATION §5, §18.1): who operates in a city, where their
// offices stand, their quality profiles and starting books (customers, ARR and
// cash). Price sheets live in rivalPrices.ts; expansion, closures and failures
// in rivalAi.ts.
import {
  COMPETITORS,
  OVERALL_WEIGHTS,
  RIVAL_BOOKS,
  RIVAL_PLACEMENT,
  RIVAL_QUALITY_SIGMA,
} from '../config/balance';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { CITIES } from '../data/cities';
import { RIVAL_BENCH_TITLES } from '../data/rivals';
import { PRODUCTS } from '../data/products';
import { difficultyOf } from './difficulty';
import {
  RIVAL_BRANCHES_BY_SIZE,
  RIVALS,
  STRATEGY_PROFILES,
  type RivalSpec,
  type Strategy,
} from '../data/rivals';
import { tileDistance } from './citygen';
import { clamp } from './math';
import { countryOfCity } from './rates';
import { rivalTargetPrice } from './rivalPrices';
import { initRivalShares } from './marketInit';
import { arrPerCustomer, matureCustomers, rivalWeeklyCosts, syncRivalEquity } from './rivalFinance';
import { stream, type Rng } from './rng';
import type { CountryState, GameState, Lot, RivalBank, RivalBranch } from './state';
import { dpow } from './detmath';
import { foldRivalCity } from './rivalOffices';

const STRATEGY_ORDER: Strategy[] = ['incumbent', 'community', 'disruptor', 'premium'];

export function overallOf(q: [number, number, number, number]): number {
  return (
    OVERALL_WEIGHTS.rates * q[0] +
    OVERALL_WEIGHTS.products * q[1] +
    OVERALL_WEIGHTS.service * q[2] +
    OVERALL_WEIGHTS.branch * q[3]
  );
}

/** Two letters for a bank's badge: the initials of its first two words. */
export function monogramOf(name: string): string {
  const words = name
    .replace(/[^A-Za-zÀ-ÿ ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0] ?? 'X';
  const second = words[1];
  return (second ? first[0]! + second[0]! : first.slice(0, 2)).toUpperCase();
}

/**
 * Rival banks for a city: the start city uses the New Game choice; a city
 * visited later shifts its usual count by the same amount (DESIGN §5.2).
 */
export function competitorsFor(state: GameState, cityId: string): number {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  if (cityId === state.meta.homeCityId) return state.meta.competitors;
  const shift = state.meta.competitors - (CITIES[state.meta.homeCityId]?.rivals ?? city.rivals);
  return Math.round(clamp(city.rivals + shift, COMPETITORS.min, COMPETITORS.max));
}

/**
 * Picks the rivals for a city and places their branches on free lots. The
 * start city draws from the shared `rivals` stream; cities generated later use
 * `rivals:{cityId}` so a visit never shifts the weekly rival draws.
 */
export function seedRivals(state: GameState, cityId: string, lots: Lot[]): void {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  const rng = stream(state, cityId === state.meta.homeCityId ? 'rivals' : `rivals:${cityId}`);
  const country = countryOfCity(state, cityId);

  // A bank you've bought or the regulator has seized is gone from every city.
  const gone = (id: string) => {
    const status = state.rivals[id]?.status;
    return status === 'acquired' || status === 'seized' || status === 'merged';
  };
  const candidates = shuffle(
    Object.values(RIVALS).filter((r) => r.home.includes(city.country) && !gone(r.id)),
    rng,
  ).sort((a, b) => STRATEGY_ORDER.indexOf(a.strategy) - STRATEGY_ORDER.indexOf(b.strategy));
  const chosen = candidates.slice(0, competitorsFor(state, cityId));
  const qualityShift = difficultyOf(state).rivalQuality;

  // Branch totals are per city size for the city's usual rival count; scale to the chosen count.
  const [minB, maxB] = RIVAL_BRANCHES_BY_SIZE[city.size];
  const drawn = rng.int(minB, maxB);
  const total =
    chosen.length === city.rivals
      ? drawn
      : Math.max(chosen.length, Math.round((drawn * chosen.length) / city.rivals));
  const counts = branchCounts(chosen, total, rng);

  chosen.forEach((spec, i) => {
    const bank = ensureRival(state, spec, country);
    if (!bank.cities.includes(cityId)) bank.cities.push(cityId);
    for (let k = 0; k < (counts[i] ?? 0); k++) {
      const lot = bestLot(lots, spec.strategy, bank, rng);
      if (!lot) break;
      lot.occupant = { type: 'rival', id: bank.id };
      const profile = STRATEGY_PROFILES[spec.strategy].quality;
      const quality = profile.map((q) =>
        clamp(q + qualityShift + rng.normal(0, RIVAL_QUALITY_SIGMA), 1, 5),
      ) as [number, number, number, number];
      const branch: RivalBranch = {
        id: seedBranchId(bank),
        cityId,
        lotId: lot.id,
        size: 0,
        openedWeek: 0,
        quality,
        overall: overallOf(quality),
        reviewCount: rng.int(RIVAL_PLACEMENT.reviewsMin, RIVAL_PLACEMENT.reviewsMax),
        customers: 0,
        arr: 0,
        contribution: 0,
        negativeWeeks: 0,
      };
      bank.branches.push(branch);
    }
    // One office per city (C2b): the branches drawn fold into one sized for them.
    const office = foldRivalCity(state, bank, cityId);
    if (office) seedMatureBooks(state, bank, office);
  });
  for (const spec of chosen) {
    const bank = state.rivals[spec.id];
    if (!bank) continue;
    if (bank.ceo === '') initRivalFinancials(state, bank);
    // A lab seeded into another city later keeps its cash; its costs and equity follow the new office.
    else {
      bank.costs = rivalWeeklyCosts(state, bank);
      syncRivalEquity(state, bank);
    }
  }
}

/**
 * `rb_{bank}_{n}` for the bank's next seeded branch. A bank seeded again in a
 * city visited later may have closed branches since, so skip ids still in use.
 */
function seedBranchId(bank: RivalBank): string {
  const taken = new Set(bank.branches.map((b) => b.id));
  let n = bank.branches.length + 1;
  while (taken.has(`rb_${bank.id}_${n}`)) n += 1;
  return `rb_${bank.id}_${n}`;
}

/** Offices present at the start are already mature: customers and the ARR they pay (§18.1). */
export function seedMatureBooks(state: GameState, bank: RivalBank, office: RivalBranch): void {
  office.customers = matureCustomers(office);
  office.arr = office.customers * arrPerCustomer(state, bank, office.cityId);
}

/**
 * Starting cash (RIVAL_BOOKS.startRunwayWeeks of running costs by strategy),
 * equity, CEO and listing. Uses its own stream so seeding draws never shift
 * office placement.
 */
export function initRivalFinancials(state: GameState, bank: RivalBank): void {
  const rng = stream(state, 'rivalInit');
  bank.costs = rivalWeeklyCosts(state, bank);
  bank.cash = rng.range(...RIVAL_BOOKS.startRunwayWeeks[bank.strategy]) * bank.costs;
  syncRivalEquity(state, bank);
  bank.ceo = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  initRivalShares(bank);
  initRivalBench(state, bank);
}

/** Names the rest of a rival's senior team, from its own stream so earlier draws never shift. */
export function initRivalBench(state: GameState, bank: RivalBank): void {
  const rng = stream(state, 'rivalBench');
  bank.execs = RIVAL_BENCH_TITLES.map((title) => ({
    title,
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
  }));
}

function ensureRival(state: GameState, spec: RivalSpec, c: CountryState): RivalBank {
  return state.rivals[spec.id] ?? newRivalBank(state, spec, c);
}

/**
 * A new rival bank with no branches yet, priced off country `c`'s rules for its
 * strategy, added to state.rivals. Used for the banks in CONTENT §15 and for
 * chartered banks (rivalCharters.ts).
 */
export function newRivalBank(
  state: GameState,
  spec: Pick<RivalSpec, 'id' | 'name' | 'strategy' | 'ink' | 'ticker'>,
  c: CountryState,
): RivalBank {
  const prices: Record<string, number> = {};
  const edge = difficultyOf(state).rivalRateEdge;
  for (const p of Object.values(PRODUCTS)) {
    prices[p.id] = rivalTargetPrice(p, spec.strategy, c, edge);
  }
  const bank: RivalBank = {
    id: spec.id,
    name: spec.name,
    strategy: spec.strategy,
    ink: spec.ink,
    monogram: monogramOf(spec.name),
    cities: [],
    branches: [],
    prices,
    priceLags: {},
    appRating: STRATEGY_PROFILES[spec.strategy].app,
    status: 'active',
    cash: 0,
    costs: 0,
    negativeQuarters: 0,
    equity: 0,
    listed: spec.ticker !== undefined,
    ceo: '',
    execs: [],
    qtd: { revenue: 0, netIncome: 0 },
    quarters: [],
    priceWar: {},
    shares: 0,
    price: 0,
    history: [],
    high52: 0,
    low52: 0,
    sentiment: 1,
  };
  if (spec.ticker) bank.ticker = spec.ticker;
  state.rivals[spec.id] = bank;
  return bank;
}

/** Disruptors get 1–2 branches each; everyone else splits the rest. */
function branchCounts(chosen: RivalSpec[], total: number, rng: Rng): number[] {
  const counts = chosen.map((r) => (r.strategy === 'disruptor' ? rng.int(1, 2) : 0));
  let left = Math.max(0, total - counts.reduce((a, b) => a + b, 0));
  const others = chosen.map((r, i) => (r.strategy === 'disruptor' ? -1 : i)).filter((i) => i >= 0);
  if (others.length === 0) return counts;
  let k = 0;
  while (left > 0) {
    const idx = others[k % others.length]!;
    counts[idx] = (counts[idx] ?? 0) + 1;
    left -= 1;
    k += 1;
  }
  return counts;
}

/** incomeFit(strategy) (§18.4): premium likes wealth, community likes modest areas, disruptors the young. */
export function incomeFit(lot: Lot, strategy: Strategy): number {
  if (strategy === 'premium') return dpow(lot.incomeIndex, 2);
  if (strategy === 'community') return 1 / lot.incomeIndex;
  if (strategy === 'disruptor') return RIVAL_PLACEMENT.disruptorBase + lot.mix.YP + lot.mix.STU;
  return 1;
}

/** score = footTraffic × incomeFit(strategy), discouraging clusters of the same bank. */
function bestLot(lots: Lot[], strategy: Strategy, bank: RivalBank, rng: Rng): Lot | undefined {
  let best: Lot | undefined;
  let bestScore = -Infinity;
  const own = lots.filter((l) => l.occupant?.id === bank.id);
  for (const lot of lots) {
    if (lot.occupant) continue;
    let score = lot.footTraffic * incomeFit(lot, strategy) * rng.range(...RIVAL_PLACEMENT.jitter);
    if (own.some((o) => tileDistance(o, lot) < RIVAL_PLACEMENT.spacing)) {
      score *= RIVAL_PLACEMENT.clusterPenalty;
    }
    if (score > bestScore) {
      bestScore = score;
      best = lot;
    }
  }
  return best;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
