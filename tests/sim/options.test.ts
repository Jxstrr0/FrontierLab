import { describe, expect, it } from 'vitest';
import { advanceWeeks } from '../../src/sim/engine';
import { companyArr } from '../../src/sim/arr';
import { creditAvailable, lendersNearYou } from '../../src/sim/corporateDebt';
import { newGame, type NewGameOptions } from '../../src/sim/newGame';
import { officeContractArr } from '../../src/sim/contracts';
import { openScriptedBranch } from '../helpers/scenario';

const base: NewGameOptions = { seed: 7, cityId: 'cal' };

function arrAfter(opts: Partial<NewGameOptions>, weeks: number): number {
  const s = newGame({ ...base, ...opts });
  openScriptedBranch(s, 'midtown');
  advanceWeeks(s, weeks);
  // Difficulty scales customer demand; a few lumpy enterprise contracts (C5b)
  // would drown that out, so they are left out.
  const contracts = Object.keys(s.branches).reduce((t, id) => t + officeContractArr(s, id), 0);
  return companyArr(s) - contracts;
}

describe('new game options', () => {
  it('shows money in the chosen starting currency, $ by default', () => {
    expect(newGame(base).settings.currency).toBe('$');
    expect(newGame({ ...base, currency: '£' }).settings.currency).toBe('£');
  });

  it('sets the rival bank count from 1 to 5, defaulting to the city', () => {
    expect(Object.keys(newGame(base).rivals)).toHaveLength(3);
    expect(Object.keys(newGame({ ...base, competitors: 1 }).rivals)).toHaveLength(1);
    expect(Object.keys(newGame({ ...base, competitors: 5 }).rivals)).toHaveLength(5);
    expect(newGame({ ...base, competitors: 9 }).meta.competitors).toBe(5);
    expect(newGame({ ...base, competitors: 0 }).meta.competitors).toBe(1);
  });

  it('starts with the chosen cash and rejects values off the list', () => {
    const s = newGame({ ...base, startCash: 3_200_000 });
    expect(s.company.cash).toBe(3_200_000);
    expect(s.company.paidInCapital).toBe(3_200_000);
    expect(s.treasury.reserves).toBe(0);
    expect(() => newGame({ ...base, startCash: 123 })).toThrow(/Starting cash/);
  });

  it('makes Easy friendlier than Expert', () => {
    const easy = arrAfter({ difficulty: 'easy' }, 40);
    const normal = arrAfter({ difficulty: 'normal' }, 40);
    const expert = arrAfter({ difficulty: 'expert' }, 40);
    expect(easy).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(expert);
  }, 30_000);
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

  it('stays open while an undrawn credit line could cover the hole', () => {
    const s = newGame(base);
    openScriptedBranch(s, 'midtown');
    expect(lendersNearYou(s).length).toBeGreaterThan(0);
    const keepNegative = () => {
      s.company.cash = -Math.min(50_000, creditAvailable(s) / 2);
      advanceWeeks(s, 1);
    };
    for (let i = 0; i < 6; i++) keepNegative();
    expect(s.flags.gameOver).toBeUndefined();
    s.company.cash = -(creditAvailable(s) + 1_000_000);
    advanceWeeks(s, 1);
    expect(s.flags.gameOver).toBe('insolvency');
  });
});
