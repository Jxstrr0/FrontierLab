// Migration 38 → 39 (audit batch D, SIMULATION §7): one awareness number per
// city. A city's brand awareness b folds into its sales office's awareness a
// as the effective awareness the office already had, 1 − (1 − a)(1 − b), so
// demand carries on where it was; then b is deleted from every city.
import type { GameState } from '../state';

type LegacyCity = { brandAwareness?: number };

export function migrateOneAwareness(state: GameState): void {
  const cities = (state.world?.cities ?? {}) as Record<string, LegacyCity>;
  for (const b of Object.values(state.branches ?? {})) {
    if (b.status === 'closed') continue;
    const brand = cities[b.cityId]?.brandAwareness ?? 0;
    b.awareness = 1 - (1 - b.awareness) * (1 - brand);
  }
  for (const c of Object.values(cities)) delete c.brandAwareness;
}
