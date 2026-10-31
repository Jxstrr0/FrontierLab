// Risk & Compliance (SIMULATION §15, SCREENS §10): the regulator review's fail
// chance and its fine path.
import { describe, expect, it } from 'vitest';
import { HQ_EFFECTS, REGULATOR_REVIEW } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import {
  avgManagerEthics,
  regulatorReview,
  regulatorStatus,
  reviewFailChance,
  trailingRevenue,
} from '../../src/sim/riskFloor';
import { stream } from '../../src/sim/rng';
import { bankWithFloors, runScript } from '../helpers/scenario';

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
