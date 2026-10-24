// Startup formulas (SIMULATION §20.2, §20.5): quarterly growth, the net margin
// a startup drifts toward, failure and IPO rules, round terms (price step, new
// shares, the two offer lots) and venture debt amortization. Pure functions of
// their inputs; the systems in ventures.ts and ventureDebt.ts apply them.
import { VENTURE_DEBT, VENTURE_MARGIN, VENTURES, WEEKS_PER_YEAR } from '../config/balance';
import { STARTUP_SECTORS } from '../data/startups';
import type { Pentagon } from '../data/types';
import { dpow } from './detmath';
import type { Rng } from './rng';
import type { Startup, StartupStage } from './state';

/** Pentagon order: Management, Product maturity, Market size, Competitiveness, Financial health. */
export const PENTAGON = { maturity: 1, finHealth: 4 } as const;
const SCORE_MIN = 1;
const SCORE_MAX = 10;
const FAIR_COIN = 0.5;

export const pentagonAvg = (p: Pentagon) => p.reduce((a, b) => a + b, 0) / p.length;

/** §20.2: mean quarterly growth = μ_sector + 0.03 × (avg − 5). */
export function growthMean(sectorMu: number, pentagon: Pentagon): number {
  return sectorMu + VENTURES.growthSlope * (pentagonAvg(pentagon) - VENTURES.pentagonMid);
}

/** §20.2: g ~ normal(mean, 0.12). */
export function drawGrowth(rng: Rng, sectorMu: number, pentagon: Pentagon): number {
  return rng.normal(growthMean(sectorMu, pentagon), VENTURES.growthSigma);
}

/**
 * §20.2 "net margin moves toward the sector margin as Product maturity rises":
 * the sector margin at maturity ≥ matureAt, minus gap × the missing share below it.
 */
export function targetMargin(sectorMargin: number, maturity: number): number {
  const missing = Math.max(0, VENTURE_MARGIN.matureAt - maturity) / VENTURE_MARGIN.matureAt;
  return sectorMargin - VENTURE_MARGIN.gap * missing;
}

/** One quarter's move of the margin toward its target (marginPull of the gap). */
export function nextMargin(margin: number, target: number): number {
  return margin + VENTURES.marginPull * (target - margin);
}

/** §20.2: failure chance per quarter = 0.03 × (1 + 0.35 × (5 − FinHealth)) × (recession ? 1.5 : 1). */
export function failureChance(finHealth: number, recession: boolean): number {
  const p =
    VENTURES.failBase *
    (1 + VENTURES.failSlope * (VENTURES.pentagonMid - finHealth)) *
    (recession ? VENTURES.failRecessionMult : 1);
  return Math.max(0, p);
}

const LATE_STAGES: StartupStage[] = ['C', 'D'];

/** §20.2: IPO possible once quarterly revenue > $50M, net income > 0 and stage ≥ C. */
export function ipoEligible(stage: StartupStage, revenue: number, netIncome: number): boolean {
  return LATE_STAGES.includes(stage) && revenue > VENTURES.ipoMinQuarterRevenue && netIncome > 0;
}

/** Quarters of cash left at the current burn (Infinity when profitable). */
export function runwayQuarters(cash: number, netIncome: number): number {
  return netIncome >= 0 ? Infinity : cash / -netIncome;
}

/** Each pentagon score drifts ±1 with 30% probability (clamped 1–10). */
export function driftPentagon(rng: Rng, p: Pentagon): Pentagon {
  return p.map((v) => {
    if (!rng.chance(VENTURES.driftChance)) return v;
    const step = rng.chance(FAIR_COIN) ? 1 : -1;
    return Math.min(SCORE_MAX, Math.max(SCORE_MIN, v + step));
  }) as Pentagon;
}

/** §20.2 price step: 1.2–3.0× with good growth (g > 0.1), else a 0.5–0.9× down round. */
export function drawPriceStep(rng: Rng, growth: number): number {
  const [lo, hi] = growth > VENTURES.goodGrowth ? VENTURES.upStep : VENTURES.downStep;
  return rng.range(lo, hi);
}

export interface RoundTerms {
  pricePerShare: number;
  /** New money raised: newShares × price. */
  amount: number;
  newShares: number;
  postMoney: number;
  /** Shares in each of the two offer lots (half the new shares each). */
  lotShares: number;
}

/**
 * §20.2 round: new money is `fraction` (15–30%) of post-money at the new price.
 * pre = shares × price, amount = pre × f / (1 − f); the new shares split into two
 * equal offer lots (a 30% round gives the original's two 15% lots).
 */
export function roundTerms(shares: number, price: number, fraction: number): RoundTerms {
  const newShares = Math.max(VENTURES.lots, Math.round((shares * fraction) / (1 - fraction)));
  const lotShares = Math.floor(newShares / VENTURES.lots);
  const issued = lotShares * VENTURES.lots;
  return {
    pricePerShare: price,
    amount: issued * price,
    newShares: issued,
    postMoney: (shares + issued) * price,
    lotShares,
  };
}

/** §20.5: weekly payment that amortizes `principal` over `weeks` at annual `rate`. */
export function amortizedPayment(principal: number, rate: number, weeks: number): number {
  if (weeks <= 0) return principal;
  const r = rate / WEEKS_PER_YEAR;
  if (r <= 0) return principal / weeks;
  return (principal * r) / (1 - dpow(1 + r, -weeks));
}

/** §20.5: the startup accepts when the rate ≤ policy rate + 8%. */
export function debtAccepted(rate: number, policyRate: number): boolean {
  return rate <= policyRate + VENTURE_DEBT.spread + 1e-9;
}

/** §20.5: the most venture debt a startup takes: 10% of post-money. */
export const maxVentureDebt = (s: Pick<Startup, 'postMoney'>) =>
  VENTURE_DEBT.maxShare * s.postMoney;

/** Sector spec, falling back to fintech for unknown ids (old saves, typos). */
export const sectorOf = (id: string) => STARTUP_SECTORS[id] ?? STARTUP_SECTORS.fintech!;

/** Total revenue of the last four quarters (annual run-rate when fewer are known). */
export function annualRevenue(s: Pick<Startup, 'quarters'>): number {
  const last = s.quarters.slice(-4);
  if (last.length === 0) return 0;
  const total = last.reduce((t, q) => t + q.revenue, 0);
  return (total * 4) / last.length;
}
