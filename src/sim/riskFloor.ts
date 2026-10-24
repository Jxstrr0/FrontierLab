// Risk & Compliance (SIMULATION §15, §16; SCREENS §10): weekly loss records by
// product, the selectors behind the Risk floor (loss table, delinquency, model
// performance, regulator status) and the quarterly regulator review.
import {
  DELINQUENCY,
  HQ_EFFECTS,
  REGULATOR_REVIEW,
  RISK_LOSS_WEEKS,
  WEEKS_PER_YEAR,
} from '../config/balance';
import type { Tier } from '../data/types';
import { pushEvent } from './events';
import { raiseIncident } from './incidents';
import { spend } from './ledger';
import { stream } from './rng';
import type { GameState, LossLine, LossWeek, RegulatorReview } from './state';

// ─── Recording (called from the books and the Loan Desk) ──────────────────────

export interface LossInput {
  /** Balance before this week's defaults. */
  balance: number;
  defaulted: number;
  loss: number;
  /** Booked PD, before the credit cycle and Risk shortfall. */
  pd: number;
  lgd: number;
}

function currentWeek(state: GameState): LossWeek {
  const losses = state.risk.losses;
  const last = losses.at(-1);
  if (last && last.week === state.clock.week) return last;
  const week: LossWeek = { week: state.clock.week, byProduct: {}, expected: 0 };
  losses.push(week);
  if (losses.length > RISK_LOSS_WEEKS) losses.splice(0, losses.length - RISK_LOSS_WEEKS);
  return week;
}

/** Adds one book's (or one loan's) week to the Risk floor's records. */
export function recordLoss(state: GameState, productId: string, x: LossInput): void {
  if (x.balance <= 0 && x.defaulted <= 0) return;
  const week = currentWeek(state);
  const line = (week.byProduct[productId] ??= {
    balance: 0,
    defaulted: 0,
    loss: 0,
    expectedDefaults: 0,
  });
  const expectedDefaults = (x.balance * x.pd) / WEEKS_PER_YEAR;
  line.balance += x.balance;
  line.defaulted += x.defaulted;
  line.loss += x.loss;
  line.expectedDefaults += expectedDefaults;
  week.expected += expectedDefaults * x.lgd;
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export interface LossRow {
  productId: string;
  /** Average balance over the recorded weeks. */
  avgBalance: number;
  /** Losses over the recorded weeks (up to 13). */
  losses: number;
  /** Annualized loss rate: losses ÷ average balance, scaled to a year. */
  lossRate: number;
  /** Annualized default rate. */
  defaultRate: number;
  /** Delinquency proxy: share of the balance in the arrears pipeline. */
  delinquency: number;
  weeks: number;
}

const blank = (): LossLine => ({ balance: 0, defaulted: 0, loss: 0, expectedDefaults: 0 });

/** Loss-rate table by product (annualized, last 13 weeks), largest balance first. */
export function lossTable(state: GameState): LossRow[] {
  const weeks = state.risk.losses;
  const ids = new Set(weeks.flatMap((w) => Object.keys(w.byProduct)));
  const recent = weeks.slice(-DELINQUENCY.recentWeeks);
  const rows: LossRow[] = [];
  for (const productId of ids) {
    const total = blank();
    for (const w of weeks) {
      const l = w.byProduct[productId];
      if (!l) continue;
      total.balance += l.balance;
      total.defaulted += l.defaulted;
      total.loss += l.loss;
    }
    if (total.balance <= 0) continue;
    const recentDefaults = recent.reduce((s, w) => s + (w.byProduct[productId]?.defaulted ?? 0), 0);
    const lastBalance = weeks.at(-1)?.byProduct[productId]?.balance ?? 0;
    const n = weeks.length;
    rows.push({
      productId,
      avgBalance: total.balance / n,
      losses: total.loss,
      // Σ balance over n weeks is n × the average, so this is the yearly rate.
      lossRate: (total.loss / total.balance) * WEEKS_PER_YEAR,
      defaultRate: (total.defaulted / total.balance) * WEEKS_PER_YEAR,
      delinquency:
        lastBalance > 0
          ? ((recentDefaults / Math.max(1, recent.length)) * DELINQUENCY.pipelineWeeks) /
            lastBalance
          : 0,
      weeks: n,
    });
  }
  return rows.sort((a, b) => b.avgBalance - a.avgBalance);
}

/** Company-wide delinquency proxy across every loan product. */
export function delinquency(state: GameState): number {
  const rows = lossTable(state);
  const balance = rows.reduce((s, r) => s + r.avgBalance, 0);
  return balance > 0 ? rows.reduce((s, r) => s + r.delinquency * r.avgBalance, 0) / balance : 0;
}

export interface ModelPerformance {
  /** Annualized default rate the booked PDs predicted. */
  predicted: number;
  /** Annualized default rate actually seen. */
  actual: number;
  expectedLoss: number;
  actualLoss: number;
  weeks: number;
}

/** Predicted vs actual default rate over the recorded weeks (SCREENS §10). */
export function modelPerformance(state: GameState): ModelPerformance {
  const t = blank();
  let expectedLoss = 0;
  for (const w of state.risk.losses) {
    expectedLoss += w.expected;
    for (const l of Object.values(w.byProduct)) {
      t.balance += l.balance;
      t.defaulted += l.defaulted;
      t.loss += l.loss;
      t.expectedDefaults += l.expectedDefaults;
    }
  }
  const rate = (x: number) => (t.balance > 0 ? (x / t.balance) * WEEKS_PER_YEAR : 0);
  return {
    predicted: rate(t.expectedDefaults),
    actual: rate(t.defaulted),
    expectedLoss,
    actualLoss: t.loss,
    weeks: state.risk.losses.length,
  };
}

/** Average ethics of the branch managers in post (or the default with none). */
export function avgManagerEthics(state: GameState): number {
  const ethics = Object.values(state.people.managers)
    .filter((m) => m.branchId)
    .map((m) => m.skills.ethics);
  if (ethics.length === 0) return REGULATOR_REVIEW.defaultEthics;
  return ethics.reduce((a, b) => a + b, 0) / ethics.length;
}

/** §15: 0.02 × (1 + 3 × (1 − riskCoverage′)) × (1.6 − avgManagerEthics/100). */
export function reviewFailChance(state: GameState): number {
  const kPrime = Math.min(1, state.hq.coverage.risk?.kPrime ?? 1);
  return (
    REGULATOR_REVIEW.failBase *
    (1 + HQ_EFFECTS.riskFine * (1 - kPrime)) *
    (REGULATOR_REVIEW.ethicsBase - avgManagerEthics(state) / 100)
  );
}

export interface RegulatorStatus {
  tier: Tier;
  capitalRatio: number;
  /** Chance the next quarterly review fails. */
  failChance: number;
  lastReview?: RegulatorReview;
  failedReviews: number;
}

export function regulatorStatus(state: GameState): RegulatorStatus {
  const status: RegulatorStatus = {
    tier: state.company.tier,
    capitalRatio: state.company.capitalRatio,
    failChance: reviewFailChance(state),
    failedReviews: state.risk.reviews.filter((r) => !r.passed).length,
  };
  const last = state.risk.reviews.at(-1);
  if (last) status.lastReview = last;
  return status;
}

// ─── Quarterly review (tick step 13) ─────────────────────────────────────────

/** Revenue (interest income + fee & other income) over the last 52 weekly closes. */
export function trailingRevenue(state: GameState): number {
  return state.history.weekly.slice(-WEEKS_PER_YEAR).reduce((sum, w) => sum + w.revenue, 0);
}

/**
 * §15: the regulator's quarterly review. A failure proposes a fine of 0.05–0.3% of
 * trailing revenue through the REGULATOR_AUDIT incident.
 */
export function regulatorReview(state: GameState): RegulatorReview {
  const rng = stream(state, 'regulator');
  const failed = rng.chance(reviewFailChance(state));
  const [lo, hi] = REGULATOR_REVIEW.fineRange;
  const fine = failed ? rng.range(lo, hi) * Math.max(0, trailingRevenue(state)) : 0;
  const review: RegulatorReview = { week: state.clock.week, passed: !failed, fine };
  state.risk.reviews.push(review);
  if (failed) {
    pushEvent(state, 'REGULATOR_AUDIT', { fine }, 1);
    // The fine waits on the REGULATOR_AUDIT incident's choice (pay, appeal or consultants).
    if (!raiseIncident(state, 'REGULATOR_AUDIT', 'company', 'company', { fine })) {
      spend(state, 'fines', fine);
    }
  }
  return review;
}
