// Risk & Compliance (SIMULATION §15, SCREENS §10): loss records and table maths,
// model performance, the regulator review's fail chance and its fine path.
import { describe, expect, it } from 'vitest';
import { HQ_EFFECTS, REGULATOR_REVIEW, RISK_LOSS_WEEKS } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import {
  avgManagerEthics,
  lossTable,
  modelPerformance,
  recordLoss,
  regulatorReview,
  regulatorStatus,
  reviewFailChance,
  trailingRevenue,
} from '../../src/sim/riskFloor';
import { stream } from '../../src/sim/rng';
import { bankWithFloors, runScript } from '../helpers/scenario';

describe('loss records', () => {
  it('keeps 13 weeks and computes annualized rates and delinquency', () => {
    const s = newGame({ seed: 1, cityId: 'cal' });
    for (let w = 0; w < 20; w++) {
      s.clock.week = w;
      // PD 5.2%: expected defaults 1,000 a week on $1M; half of it lost.
      recordLoss(s, 'personal_loan', {
        balance: 1_000_000,
        defaulted: 1_000,
        loss: 500,
        pd: 0.052,
        lgd: 0.5,
      });
      recordLoss(s, 'mortgage', { balance: 4_000_000, defaulted: 0, loss: 0, pd: 0.01, lgd: 0.2 });
    }
    expect(s.risk.losses).toHaveLength(RISK_LOSS_WEEKS);
    expect(s.risk.losses[0]!.week).toBe(20 - RISK_LOSS_WEEKS);

    const [mortgage, personal] = lossTable(s);
    expect(mortgage!.productId).toBe('mortgage');
    expect(mortgage!.lossRate).toBe(0);
    expect(personal!.avgBalance).toBeCloseTo(1_000_000);
    expect(personal!.losses).toBeCloseTo(500 * 13);
    expect(personal!.lossRate).toBeCloseTo(0.026); // 500 / 1M × 52
    expect(personal!.defaultRate).toBeCloseTo(0.052);
    expect(personal!.delinquency).toBeCloseTo(0.013); // 1,000 × 13 weeks / 1M

    const perf = modelPerformance(s);
    // Predicted: (1M × 5.2% + 4M × 1%) / 5M = 1.84%; actual 1,000 × 52 / 5M = 1.04%.
    expect(perf.predicted).toBeCloseTo(0.0184);
    expect(perf.actual).toBeCloseTo(0.0104);
    expect(perf.actualLoss).toBeCloseTo(500 * 13);
    expect(perf.expectedLoss).toBeCloseTo((500 + (4e6 * 0.01 * 0.2) / 52) * 13);
  });

  it('fills from the books and the Loan Desk during play', () => {
    const s = runScript(40);
    const ids = lossTable(s).map((r) => r.productId);
    expect(ids).toContain('mortgage');
    expect(ids).toContain('sbl');
    expect(s.risk.losses.at(-1)!.week).toBe(s.clock.week);
    const perf = modelPerformance(s);
    expect(perf.predicted).toBeGreaterThan(0);
    expect(perf.actual).toBeGreaterThan(0);
  });
});

describe('regulator review', () => {
  it('fail chance follows §15', () => {
    const s = bankWithFloors(['risk']);
    const ethics = avgManagerEthics(s);
    expect(ethics).toBe(Object.values(s.people.managers).find((m) => m.branchId)!.skills.ethics);
    expect(reviewFailChance(s)).toBeCloseTo(
      REGULATOR_REVIEW.failBase * (REGULATOR_REVIEW.ethicsBase - ethics / 100),
    );
    s.hq.coverage.risk.kPrime = 0.5;
    expect(reviewFailChance(s)).toBeCloseTo(
      REGULATOR_REVIEW.failBase *
        (1 + HQ_EFFECTS.riskFine * 0.5) *
        (REGULATOR_REVIEW.ethicsBase - ethics / 100),
    );
  });

  it('runs every quarter', () => {
    const s = runScript(30);
    expect(s.risk.reviews.map((r) => r.week)).toEqual([13, 26]);
    expect(regulatorStatus(s).lastReview?.week).toBe(26);
  });

  it('proposes a fine of 0.05–0.3% of trailing revenue on a failed review', () => {
    const s = bankWithFloors(['risk'], { weeks: 40 });
    advanceWeeks(s, 1);
    // Seeded scenario: step the regulator stream until its next draw fails the review.
    const p = reviewFailChance(s);
    stream(s, 'regulator'); // creates the stream on first use
    for (;;) {
      const copy = [...s.rng.regulator!];
      if (stream(s, 'regulator').next() < p) {
        s.rng.regulator = copy;
        break;
      }
    }
    const revenue = trailingRevenue(s);
    expect(revenue).toBeGreaterThan(0);
    const fines0 = s.ledger.pnl.fines;
    const review = regulatorReview(s);
    expect(review.passed).toBe(false);
    const [lo, hi] = REGULATOR_REVIEW.fineRange;
    expect(review.fine).toBeGreaterThanOrEqual(lo * revenue);
    expect(review.fine).toBeLessThanOrEqual(hi * revenue);
    // Stage 5: the fine waits on the REGULATOR_AUDIT incident's choice.
    expect(s.ledger.pnl.fines - fines0).toBe(0);
    expect(s.events.log.find((e) => e.type === 'REGULATOR_AUDIT')).toMatchObject({
      payload: { fine: review.fine },
    });
    const audit = s.incidents.active.find((i) => i.type === 'REGULATOR_AUDIT');
    expect(audit?.data.fine).toBeCloseTo(review.fine);
    expect(audit?.options.find((o) => o.id === 'pay')?.cost).toBe(Math.round(review.fine));
    expect(regulatorStatus(s)).toMatchObject({ lastReview: review, failedReviews: 1 });
  });
});
