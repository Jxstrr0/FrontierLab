import { describe, expect, it } from 'vitest';
import { CHARTER_CAPITAL } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import { totalDeposits } from '../../src/sim/balanceSheet';
import { newGame, type NewGameOptions } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { openScriptedBranch } from '../helpers/scenario';

const base: NewGameOptions = { seed: 7, cityId: 'cal' };

function depositsAfter(opts: Partial<NewGameOptions>, weeks: number): number {
  const s = newGame({ ...base, ...opts });
  openScriptedBranch(s, 'midtown');
  advanceWeeks(s, weeks);
  return totalDeposits(s);
}

describe('new game options', () => {
  it('sets the rival bank count from 1 to 5, defaulting to the city', () => {
    expect(Object.keys(newGame(base).rivals)).toHaveLength(3);
    expect(Object.keys(newGame({ ...base, competitors: 1 }).rivals)).toHaveLength(1);
    expect(Object.keys(newGame({ ...base, competitors: 5 }).rivals)).toHaveLength(5);
    expect(newGame({ ...base, competitors: 9 }).meta.competitors).toBe(5);
    expect(newGame({ ...base, competitors: 0 }).meta.competitors).toBe(1);
  });

  it('starts with the chosen cash and rejects values off the list', () => {
    const s = newGame({ ...base, startCash: 1_000_000 });
    expect(s.company.cash).toBe(1_000_000);
    expect(s.company.paidInCapital).toBe(1_000_000 + CHARTER_CAPITAL);
    expect(() => newGame({ ...base, startCash: 123 })).toThrow(/Starting cash/);
  });

  it('makes Easy friendlier than Expert', () => {
    const easy = depositsAfter({ difficulty: 'easy' }, 40);
    const normal = depositsAfter({ difficulty: 'normal' }, 40);
    const expert = depositsAfter({ difficulty: 'expert' }, 40);
    expect(easy).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(expert);
  }, 30_000);

  it('migrates a v1 save to the default options', () => {
    const s = newGame(base) as unknown as Record<string, unknown>;
    const meta = s.meta as Record<string, unknown>;
    delete meta.difficulty;
    delete meta.competitors;
    delete meta.startCash;
    s.schemaVersion = 1;
    const up = migrate(s as Record<string, unknown> & { schemaVersion: number });
    expect(up.schemaVersion).toBe(2);
    expect(up.meta).toMatchObject({ difficulty: 'normal', competitors: 3, startCash: 750_000 });
  });
});

describe('game over', () => {
  it('declares insolvency after four weeks of negative cash', () => {
    const s = newGame(base);
    s.company.cash = -1_000_000;
    advanceWeeks(s, 3);
    expect(s.flags.gameOver).toBeUndefined();
    advanceWeeks(s, 1);
    expect(s.flags.gameOver).toBe('insolvency');
    const day = s.clock.day;
    advanceWeeks(s, 1);
    expect(s.clock.day).toBe(day);
  });
});
