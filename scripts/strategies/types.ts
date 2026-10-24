// A scripted player for the headless balance run (SIMULATION §25). Strategies
// act only through commands, exactly like the UI.
import type { GameState } from '../../src/sim/state';

export interface Strategy {
  name: string;
  /** Called once after newGame, before the first tick. */
  setup(state: GameState): void;
  /** Called once per week, after the tick. */
  weekly(state: GameState): void;
}
