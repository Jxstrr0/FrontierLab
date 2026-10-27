// Save migration 14 → 15 (stage C6b): training runs and rival models. The lab
// has trained no models yet; every rival lab gets a starting model and the
// frontier's base is the best of them, so a loaded game starts level.
import { seedRivalModels } from '../rivalModels';
import type { GameState } from '../state';

export function migrateTraining(state: GameState): void {
  state.training = { generation: 0, frontierBase: 0 };
  seedRivalModels(state);
}
