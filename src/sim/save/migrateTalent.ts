// Save migration 15 → 16 (stage C6c): the talent war. Seeds the researchers
// (most at rival labs). It also used to seed candidates for the Chief Scientist
// seat; that seat folded into the CPO in schema 22 (migrateSeats.ts), so the
// seeding was dropped rather than generate candidates for a seat that no longer
// exists.
import type { GameState } from '../state';
import { seedResearchers } from '../talent';

export function migrateTalent(state: GameState): void {
  state.talent = { researchers: {} };
  seedResearchers(state);
}
