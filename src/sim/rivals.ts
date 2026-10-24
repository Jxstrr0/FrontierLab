// Rival banks (SIMULATION §5, §18.1–18.3): who operates in a
// city, where their branches stand, their quality profiles, and rate sheets that
// follow FTP with deposit beta. Expansion, closures and failures live in rivalAi.ts.
import {
  CARD_REPRICE_GAP,
  DEPOSIT_BETA_DOWN,
  DEPOSIT_BETA_UP,
  DEPOSIT_LAG_WEEKS,
  LOAN_LAG_WEEKS,
  LOAN_PASS_THROUGH,
  OVERALL_WEIGHTS,
  RIVAL_LDR,
  RIVAL_LOAN_RISK_WEIGHT,
  RIVAL_MATURE_DEPOSITS,
  RIVAL_PLACEMENT,
  RIVAL_PRICE_DRIFT,
  RIVAL_QUALITY_REF,
  RIVAL_QUALITY_SIGMA,
  RIVAL_START_CR,
} from '../config/balance';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { CITIES } from '../data/cities';
import { isDeposit, PRODUCTS, type ProductSpec } from '../data/products';
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
import { countryOfCity, defaultPrice, ftpLong, ftpShort } from './rates';
import { initRivalShares } from './marketInit';
import { stream, type Rng } from './rng';
import type { CountryState, GameState, Lot, RivalBank, RivalBranch } from './state';
import { dpow } from './detmath';

const STRATEGY_ORDER: Strategy[] = ['incumbent', 'community', 'disruptor', 'premium'];

/** Price offset or fee multiplier a strategy applies to a product's default (CONTENT §15). */
export function rivalTargetPrice(
  spec: ProductSpec,
  strategy: Strategy,
  c: CountryState,
  edge = 0,
  depositBump = 0,
): number {
  const p = STRATEGY_PROFILES[strategy];
  const base = defaultPrice(spec, c);
  let price: number;
  if (spec.priceType !== 'rate') price = base * (1 + p.fees);
  else if (spec.id === 'savings') price = base + p.savings;
  else if (spec.id === 'gic1y') price = base + p.gic;
  else if (spec.id === 'mortgage') price = base + p.mortgage;
  else if (spec.id === 'credit_card') price = base + p.cardApr;
  else price = base + p.loans;
  // Difficulty edge: better deposit rates, cheaper loans (in pp).
  if (spec.priceType === 'rate') price += isDeposit(spec) ? edge / 100 : -edge / 100;
  // Price wars (§18.6) lift deposit rates.
  if (spec.priceType === 'rate' && isDeposit(spec)) price += depositBump;
  return clamp(price, spec.min, spec.max);
}

export function overallOf(q: [number, number, number, number]): number {
  return (
    OVERALL_WEIGHTS.rates * q[0] +
    OVERALL_WEIGHTS.products * q[1] +
    OVERALL_WEIGHTS.service * q[2] +
    OVERALL_WEIGHTS.branch * q[3]
  );
}

function monogramOf(name: string): string {
  const words = name
    .replace(/[^A-Za-zÀ-ÿ ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0] ?? 'X';
  const second = words[1];
  return (second ? first[0]! + second[0]! : first.slice(0, 2)).toUpperCase();
}

/** Picks the rivals for a city and places their branches on free lots. */
export function seedRivals(state: GameState, cityId: string, lots: Lot[]): void {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  const rng = stream(state, 'rivals');
  const country = countryOfCity(state, cityId);

  const candidates = shuffle(
    Object.values(RIVALS).filter((r) => r.home.includes(city.country)),
    rng,
  ).sort((a, b) => STRATEGY_ORDER.indexOf(a.strategy) - STRATEGY_ORDER.indexOf(b.strategy));
  const chosen = candidates.slice(0, state.meta.competitors);
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
      if (!lot) return;
      lot.occupant = { type: 'rival', id: bank.id };
      const profile = STRATEGY_PROFILES[spec.strategy].quality;
      const quality = profile.map((q) =>
        clamp(q + qualityShift + rng.normal(0, RIVAL_QUALITY_SIGMA), 1, 5),
      ) as [number, number, number, number];
      const branch: RivalBranch = {
        id: `rb_${bank.id}_${bank.branches.length + 1}`,
        cityId,
        lotId: lot.id,
        openedWeek: 0,
        quality,
        overall: overallOf(quality),
        reviewCount: rng.int(RIVAL_PLACEMENT.reviewsMin, RIVAL_PLACEMENT.reviewsMax),
        deposits: 0,
        loans: 0,
        contribution: 0,
        negativeWeeks: 0,
      };
      seedMatureBooks(branch);
      bank.branches.push(branch);
    }
  });
  for (const spec of chosen) {
    const bank = state.rivals[spec.id];
    if (bank && bank.equity === 0) initRivalFinancials(state, bank);
  }
}

/** A rival branch's mature deposit size (§18.1): city size × quality. */
export function matureDeposits(branch: Pick<RivalBranch, 'cityId' | 'overall'>): number {
  const income = CITIES[branch.cityId]?.incomeIndex ?? 1;
  return RIVAL_MATURE_DEPOSITS * income * (branch.overall / RIVAL_QUALITY_REF);
}

/** Branches present at the start are already mature. */
export function seedMatureBooks(branch: RivalBranch): void {
  branch.deposits = matureDeposits(branch);
  branch.loans = branch.deposits * RIVAL_LDR;
}

/**
 * Starting equity (from a strategy capital ratio over its loans), CEO and
 * listing. Uses its own stream so seeding draws never shift branch placement.
 */
export function initRivalFinancials(state: GameState, bank: RivalBank): void {
  const rng = stream(state, 'rivalInit');
  const loans = bank.branches.reduce((sum, b) => sum + b.loans, 0);
  const cr = rng.range(...RIVAL_START_CR[bank.strategy]);
  bank.capitalRatio = cr;
  bank.equity = loans * RIVAL_LOAN_RISK_WEIGHT * cr;
  bank.ceo = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  initRivalShares(bank);
}

function ensureRival(state: GameState, spec: RivalSpec, c: CountryState): RivalBank {
  const existing = state.rivals[spec.id];
  if (existing) return existing;
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
    equity: 0,
    capitalRatio: 0,
    listed: spec.ticker !== undefined,
    ceo: '',
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

/**
 * Weekly rival pricing (tick step 3). Deposit rates follow FTP moves with beta
 * over 4–8 weeks, loan rates pass 90% through within 2 weeks, and every price
 * drifts 2% of the gap per week toward the strategy target.
 */
export function updateRivalPrices(state: GameState): void {
  const rng = stream(state, 'rivals');
  const edge = difficultyOf(state).rivalRateEdge;
  for (const c of Object.values(state.world.countries)) {
    if (!c) continue;
    const dShort = ftpShort(c) - c.prevFtpShort;
    const dLong = ftpLong(c) - c.prevFtpLong;
    let dCard = 0;
    if (Math.abs(ftpShort(c) - c.cardAnchor) >= CARD_REPRICE_GAP) {
      dCard = ftpShort(c) - c.cardAnchor;
      c.cardAnchor = ftpShort(c);
    }
    for (const rival of Object.values(state.rivals)) {
      if (rival.status !== 'active' || !rivalInCountry(rival, c)) continue;
      for (const spec of Object.values(PRODUCTS)) {
        if (spec.priceType !== 'rate') continue;
        const delta = spec.id === 'credit_card' ? dCard : spec.tenor === 'long' ? dLong : dShort;
        if (delta !== 0) queueMove(rival, spec, delta, rng);
      }
    }
  }
  for (const rival of Object.values(state.rivals)) {
    if (rival.status !== 'active') continue;
    const c = countryOfCity(state, rival.cities[0]!);
    const bump = priceWarBump(rival);
    for (const spec of Object.values(PRODUCTS)) {
      let price = rival.prices[spec.id] ?? rivalTargetPrice(spec, rival.strategy, c, edge, bump);
      const lag = rival.priceLags[spec.id];
      if (lag) {
        price += (lag.target - price) / Math.max(1, lag.weeksLeft);
        lag.weeksLeft -= 1;
        if (lag.weeksLeft <= 0) delete rival.priceLags[spec.id];
      }
      const target = rivalTargetPrice(spec, rival.strategy, c, edge, bump);
      price += RIVAL_PRICE_DRIFT * (target - price);
      rival.prices[spec.id] = clamp(price, spec.min, spec.max);
    }
  }
}

/** The largest active price-war bump on a rival's rate sheet (§18.6). */
export function priceWarBump(rival: RivalBank): number {
  let max = 0;
  for (const v of Object.values(rival.priceWar)) max = Math.max(max, v);
  return max;
}

function queueMove(rival: RivalBank, spec: ProductSpec, delta: number, rng: Rng): void {
  const current = rival.prices[spec.id] ?? 0;
  const existing = rival.priceLags[spec.id];
  const base = existing ? existing.target : current;
  if (spec.category === 'deposits') {
    const beta = delta > 0 ? DEPOSIT_BETA_UP : DEPOSIT_BETA_DOWN;
    const weeks = rng.int(...DEPOSIT_LAG_WEEKS);
    rival.priceLags[spec.id] = {
      target: base + beta * delta,
      weeksLeft: Math.max(existing?.weeksLeft ?? 0, weeks),
    };
  } else {
    rival.priceLags[spec.id] = {
      target: base + LOAN_PASS_THROUGH * delta,
      weeksLeft: Math.max(existing?.weeksLeft ?? 0, LOAN_LAG_WEEKS),
    };
  }
}

function rivalInCountry(rival: RivalBank, c: CountryState): boolean {
  return rival.cities.some((id) => CITIES[id]?.country === c.id);
}

/** Year-end: rival $ fees re-price by inflation (§5). */
export function repriceRivalFees(state: GameState): void {
  for (const rival of Object.values(state.rivals)) {
    const c = countryOfCity(state, rival.cities[0]!);
    for (const spec of Object.values(PRODUCTS)) {
      if (spec.priceType === 'feeMonthly' || spec.priceType === 'feeAnnual') {
        const p = rival.prices[spec.id];
        if (p !== undefined)
          rival.prices[spec.id] = clamp(p * (1 + c.inflation / 100), spec.min, spec.max);
      }
    }
  }
}
