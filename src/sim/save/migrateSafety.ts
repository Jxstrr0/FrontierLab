// Save migration 16 → 17 (stage C7a): the safety ratio takes over the
// regulator's tier from the capital ratio (now the lenders' credit ratio).
// Sets the ratio and tier, restarts the low-ratio week count, and drops a
// pending emergency recapitalisation, which the mandated pause replaces.
import { safetySnapshot } from '../safety';
import type { GameState } from '../state';

export function migrateSafety(state: GameState): void {
  const c = state.company;
  const snap = safetySnapshot(state);
  c.safetyRatio = snap.ratio;
  if (c.tier !== snap.tier) c.tierWeeks = 0;
  c.tier = snap.tier;
  c.lowCapitalWeeks = 0;
  delete state.incidents.recap;
  state.incidents.active = state.incidents.active.filter((i) => i.type !== 'RECAP_OFFER');
}
