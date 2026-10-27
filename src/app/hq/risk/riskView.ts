// View helpers for the Safety & Alignment floor (SCREENS §10, SIMULATION §15):
// the week of the next quarterly safety audit. Pure apart from reads.
import { DAYS_PER_WEEK } from '../../../config/balance';
import { isQuarterStart } from '../../../sim/calendar';

/** A quarter is at most 14 weekly ticks long, so the search never needs more. */
const MAX_QUARTER_WEEKS = 14;

/** The first weekly close after `week` that starts a quarter (the review runs then). */
export function nextReviewWeek(startDate: string, week: number): number {
  for (let w = week + 1; w <= week + MAX_QUARTER_WEEKS; w++) {
    if (isQuarterStart(startDate, w * DAYS_PER_WEEK)) return w;
  }
  return week + MAX_QUARTER_WEEKS;
}
