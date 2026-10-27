// Save migration 10 → 11 (stage C4c): spot limits, burst, crunch and outages.
// Auto spot-buy starts on, and the spot trail starts at today's gap so an old
// save isn't squeezed by a limit it never built up.
import { allocation } from '../compute';
import type { GameState } from '../state';

export function migrateSpotLimits(state: GameState): void {
  const c = state.compute;
  c.autoSpotBuy ??= true;
  c.crunchWeeks ??= 0;
  c.outageWeeksLeft ??= 0;
  c.burstStigmaWeeks ??= 0;
  c.weekCharge ??= 0;
  c.weekCost ??= 0;
  c.spotTrail = 0;
  const a = allocation(state);
  c.spotTrail = Math.max(0, a.demand - a.capacity);
}
