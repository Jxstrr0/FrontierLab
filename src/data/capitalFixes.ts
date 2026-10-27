// How to lift a weak safety ratio (SIMULATION §15, stage C7a), in plain words.
// Shown as a checklist under the safety meter at Watch or worse, and folded
// into the Weekly Inference's safety story so the warning says what to do.
// (File name kept from the bank game's capital fixes.)
import type { Tier } from './types';

export type ListingStatus = 'private' | 'public';

/** The fastest fix, the same whether private or listed. */
export const RAISE_FIX: Record<ListingStatus, string> = {
  private:
    'Hire safety staff: raise the staff target on the HQ Safety & Alignment floor (lease one if you have none).',
  public:
    'Hire safety staff: raise the staff target on the HQ Safety & Alignment floor (lease one if you have none).',
};

/** The other levers, in the order worth trying. */
export const OTHER_FIXES: readonly string[] = [
  'Pay the Safety team better: skill and morale count as much as headcount.',
  'Seat a Chief Safety Officer on the Executive floor: their expertise lifts the Safety team.',
  'Train a model with a Safety focus, or switch to a safer one in Manage Models.',
  'A model far ahead of the frontier carries more risk: grow the Safety team before you ship it.',
];

/** The extra warning at Critical (SIMULATION §15, the mandated pause). */
export const CRITICAL_FIX_NOTE =
  'Below 40% for 8 weeks, the regulator orders a pause. Refuse it, or stay below, and it revokes the licence for 26 weeks.';

/** The target a struggling lab should climb back to. */
export const CAPITAL_FIX_TITLE: Partial<Record<Tier, string>> = {
  watch: 'How to get back above 85%',
  restricted: 'How to fix this: aim for 85% or more',
  critical: 'How to fix this: aim for 85% or more',
};

/** The newspaper's one-line version, completing "To recover, the lab can …". */
export const CAPITAL_FIX_NEWS: Record<ListingStatus, string> = {
  private:
    'hire safety staff on its HQ Safety & Alignment floor, seat a Chief Safety Officer, or train a safer model',
  public:
    'hire safety staff on its HQ Safety & Alignment floor, seat a Chief Safety Officer, or train a safer model',
};
