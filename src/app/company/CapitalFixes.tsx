// "How to fix this" checklist under the capital meter (SIMULATION §15): shown at
// Watch, Restricted and Critical so a weak ratio always comes with the levers
// that lift it. The words live in src/data/capitalFixes.ts.
import {
  CAPITAL_FIX_TITLE,
  CRITICAL_FIX_NOTE,
  OTHER_FIXES,
  RAISE_FIX,
  type ListingStatus,
} from '../../data/capitalFixes';
import type { Tier } from '../../data/types';

export function CapitalFixes(p: { tier: Tier; listing: ListingStatus }) {
  const title = CAPITAL_FIX_TITLE[p.tier];
  if (!title) return null;
  return (
    <div class={`cap-fixes is-${p.tier}`} data-tutorial="capital-fixes">
      <div class="cap-fixes-title">{title}</div>
      <ol class="cap-fixes-list">
        {[RAISE_FIX[p.listing], ...OTHER_FIXES].map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ol>
      {p.tier === 'critical' && <p class="cap-fixes-warn">{CRITICAL_FIX_NOTE}</p>}
    </div>
  );
}
