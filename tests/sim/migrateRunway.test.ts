// Save migration 23 → 24 (src/sim/save/migrations.ts): runway replaces the
// stored credit ratio, so the company's ratio and each weekly close's ratio and
// risk-weighted assets are dropped, and nothing else changes.
import { describe, expect, it } from 'vitest';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { runwaySnapshot } from '../../src/sim/runway';
import { migrations } from '../../src/sim/save/migrations';

describe('save migration 23 → 24', () => {
  it('drops the credit ratio and risk-weighted assets, keeping the rest', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Lab' });
    advanceWeeks(s, 3);
    const old = s as unknown as {
      company: { capitalRatio?: number };
      history: { weekly: { capitalRatio?: number; totals: { rwa?: number } }[] };
    };
    old.company.capitalRatio = 0.2;
    for (const w of old.history.weekly) {
      w.capitalRatio = 0.2;
      w.totals.rwa = 1_000_000;
    }
    const cash = s.company.cash;
    const weeks = s.history.weekly.length;
    migrations[23]!(s as never);
    expect('capitalRatio' in s.company).toBe(false);
    expect(s.history.weekly).toHaveLength(weeks);
    for (const w of s.history.weekly) {
      expect('capitalRatio' in w).toBe(false);
      expect('rwa' in w.totals).toBe(false);
    }
    expect(s.company.cash).toBe(cash);
    expect(runwaySnapshot(s).cash).toBe(cash);
  });
});
