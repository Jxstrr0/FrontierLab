// View helpers for the Risk & Compliance floor (SCREENS §10, SIMULATION §15):
// the week of the next quarterly regulator review, product names for the
// loss table, and the model performance comparison. Pure apart from reads.
import { DAYS_PER_WEEK } from '../../../config/balance';
import { isQuarterStart } from '../../../sim/calendar';
import { productSpec } from '../../../sim/products';
import type { GameState } from '../../../sim/state';

/** A quarter is at most 14 weekly ticks long, so the search never needs more. */
const MAX_QUARTER_WEEKS = 14;

/** The first weekly close after `week` that starts a quarter (the review runs then). */
export function nextReviewWeek(startDate: string, week: number): number {
  for (let w = week + 1; w <= week + MAX_QUARTER_WEEKS; w++) {
    if (isQuarterStart(startDate, w * DAYS_PER_WEEK)) return w;
  }
  return week + MAX_QUARTER_WEEKS;
}

/** Display name for a loss-table product ("sbl" is the Deal Desk's enterprise contracts). */
export function lossProductName(state: GameState, productId: string): string {
  if (productId === 'sbl') return 'Enterprise contracts';
  return productSpec(state, productId)?.name ?? productId;
}

/** Actual defaults this far above prediction read as the model under-calling risk. */
const MODEL_TOLERANCE = 0.1;

export type ModelVerdict = 'none' | 'under' | 'over' | 'close';

/** How actual defaults compare with what the booked PDs predicted. */
export function modelVerdict(predicted: number, actual: number): ModelVerdict {
  if (predicted <= 0 && actual <= 0) return 'none';
  if (actual > predicted * (1 + MODEL_TOLERANCE)) return 'under';
  if (actual < predicted * (1 - MODEL_TOLERANCE)) return 'over';
  return 'close';
}

export const MODEL_VERDICT_TEXT: Record<ModelVerdict, string> = {
  none: 'No loan history yet.',
  under: 'More defaults than the model expected: risk is being under-called.',
  over: 'Fewer defaults than expected: the model is cautious.',
  close: 'Defaults are running close to what the model expected.',
};

/** Bar heights for a pair of rates, scaled so the larger fills the chart. */
export function pairBars(a: number, b: number): [number, number] {
  const top = Math.max(a, b);
  if (top <= 0) return [0, 0];
  return [a / top, b / top];
}
