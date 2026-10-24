// The game's difficulty settings (DESIGN §5.2, balance.ts DIFFICULTY).
import { DIFFICULTY } from '../config/balance';
import type { GameState } from './state';

export function difficultyOf(state: GameState): (typeof DIFFICULTY)['normal'] {
  return DIFFICULTY[state.meta.difficulty] ?? DIFFICULTY.normal;
}
