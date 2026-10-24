// M&A test helpers: a capitalised scripted bank in Calgary and its smallest
// rival there (the one whose deposits keep your city share under the cap).
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { balanceSheet } from '../../src/sim/balanceSheet';
import type { GameState, RivalBank } from '../../src/sim/state';
import { openScriptedBranch } from './scenario';

/** Extra paid-in capital as cash, so the balance identity still holds. */
export function addCapital(s: GameState, amount: number): void {
  s.company.cash += amount;
  s.company.paidInCapital += amount;
}

/** Seed 42 in Calgary with five rivals, one scripted branch, `weeks` played, then capital added. */
export function capitalisedBank(weeks = 26, capital = 120_000_000): GameState {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank', competitors: 5 });
  openScriptedBranch(s, 'midtown');
  advanceWeeks(s, weeks);
  addCapital(s, capital);
  return s;
}

/** The active rival in a city with the smallest deposits there. */
export function smallestRival(s: GameState, cityId = 'cal'): RivalBank {
  const deps = (r: RivalBank) =>
    r.branches.filter((b) => b.cityId === cityId).reduce((x, b) => x + b.deposits, 0);
  return Object.values(s.rivals)
    .filter((r) => r.status === 'active' && deps(r) > 0)
    .sort((a, b) => deps(a) - deps(b) || a.id.localeCompare(b.id))[0]!;
}

/** |equity − expectedEquity| (the balance identity gap). */
export function identityGap(s: GameState): number {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
}

export { cmd };
