// Test setup for Stage 8 (one global enterprise): a Calgary bank with extra
// paid-in capital that flies to New York and London and opens a branch in each,
// through the same commands the UI uses.
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';
import { addCapital } from './markets';
import { openScriptedBranch } from './scenario';

/** Branch ids by city for the three-country bank. */
export interface WorldBank {
  s: GameState;
  branches: { cal: string; nyc: string; lon: string };
}

/** Calgary, New York and London branches (mid builds, lending on, ops delegated). */
export function worldBank(seed = 42): WorldBank {
  const s = newGame({ seed, cityId: 'cal', bankName: 'Globe Bank' });
  addCapital(s, 20_000_000);
  // C3b: the Loan Desk lends only what treasury reserves hold.
  cmd.topUpLendingFund(s, 12_000_000);
  const cal = openScriptedBranch(s, 'midtown');
  fly(s, 'nyc');
  const nyc = openScriptedBranch(s, 'midtown');
  fly(s, 'lon');
  const lon = openScriptedBranch(s, 'midtown');
  return { s, branches: { cal, nyc, lon } };
}

/** travelTo that throws on refusal, for test setup. */
export function fly(s: GameState, cityId: string): void {
  const r = cmd.travelTo(s, cityId);
  if (!r.ok) throw new Error(r.reason);
}
