// Save migration 11 → 12 (stage C5a): customer businesses. Every city already
// generated gets its businesses from its own stream, on the storefronts still
// free today, and its employers become anchor accounts.
import { seedBusinesses } from '../businesses';
import type { GameState } from '../state';

export function migrateBusinesses(state: GameState): void {
  state.businesses ??= {};
  for (const cityId of Object.keys(state.world.cities).sort()) {
    if (state.world.cities[cityId]?.generated) seedBusinesses(state, cityId);
  }
}
