// How to lift a weak capital ratio (SIMULATION §15), in plain words. Shown as
// a checklist under the capital meter at Watch or worse, and folded into the
// Weekly Ledger's capital story so the warning says what to do about it.
import type { Tier } from './types';

export type ListingStatus = 'private' | 'public';

/** The fastest fix: new shares add straight to equity. */
export const RAISE_FIX: Record<ListingStatus, string> = {
  private: 'Sell new shares: tap an investment bank on the map, then Equity → Private placement.',
  public: 'Sell new shares: tap an investment bank on the map, then Equity → Secondary offering.',
};

/** The other levers, in the order worth trying. */
export const OTHER_FIXES: readonly string[] = [
  'Sell stocks and startup stakes the company holds. They count 2.5× against your capital.',
  'Turn risk appetite down on the HQ Finance floor so new loans are safer.',
  'Hold off on new branches, property and dividends while profits rebuild capital.',
  'Or seat a CFO on the Executive floor and switch on Capital: they will do all of this for you.',
];

/** The extra warning at Critical (SIMULATION §15, emergency recapitalisation). */
export const CRITICAL_FIX_NOTE =
  'Below 4.5% for 8 weeks, the regulator offers an emergency rescue. Accept it, or it takes over the bank.';

/** The target a struggling bank should climb back to. */
export const CAPITAL_FIX_TITLE: Partial<Record<Tier, string>> = {
  watch: 'How to get back above 10.5%',
  restricted: 'How to fix this: aim for 10.5% or more',
  critical: 'How to fix this: aim for 10.5% or more',
};

/** The newspaper's one-line version, completing "To recover, the bank can …". */
export const CAPITAL_FIX_NEWS: Record<ListingStatus, string> = {
  private:
    'sell new shares through an investment bank (Equity → Private placement), sell the stocks it holds, or turn risk appetite down on the HQ Finance floor',
  public:
    'sell new shares through an investment bank (Equity → Secondary offering), sell the stocks it holds, or turn risk appetite down on the HQ Finance floor',
};
