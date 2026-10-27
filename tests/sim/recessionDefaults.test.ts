// ROADMAP Stage 5 acceptance, as reworked in C5b: a 10-year steady run (seed 42,
// Calgary) includes at least one recession, and businesses fail more often in it
// than in an expansion. There are no loan defaults any more; the Deal Desk's
// equivalent is the weekly failure odds of the businesses under contract
// (failYear × exp(−failSlope × (Financial health − 5)) × credit cycle,
// SIMULATION §11.2). As in the old test, that hazard is read against Canada's
// phase while every office is Canadian, and the run must also see real failures.
import { describe, expect, it } from 'vitest';
import { DEAL, WEEKS_PER_YEAR } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { advanceWeeks } from '../../src/sim/engine';
import { creditCycle } from '../../src/sim/macro';
import { newGame } from '../../src/sim/newGame';
import { steady } from '../../scripts/strategies';

describe('recession acceptance', () => {
  it('a 10-year run has a recession with higher business failure odds', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    steady.setup(s);
    const byPhase: Record<string, { hazard: number; weeks: number }> = {};
    let abroad = false;
    let failed = 0;
    const names = (): Map<string, string> =>
      new Map(Object.values(s.businesses).map((b) => [b.id, b.name]));
    let before = names();
    for (let w = 0; w < 10 * WEEKS_PER_YEAR; w++) {
      advanceWeeks(s, 1);
      steady.weekly(s);
      // A failed business is re-rolled in place under the same id (contracts.ts).
      const after = names();
      for (const [id, name] of before)
        if (after.get(id) !== undefined && after.get(id) !== name) failed += 1;
      before = after;
      abroad ||= Object.values(s.branches).some((b) => CITIES[b.cityId]?.country !== 'CA');
      if (abroad) continue;
      const ca = s.world.countries.CA!;
      const row = (byPhase[ca.phase] ??= { hazard: 0, weeks: 0 });
      for (const b of Object.values(s.businesses)) {
        if (b.cityId !== 'cal' || !b.vendor || b.size === 'anchor') continue;
        row.hazard +=
          DEAL.failYear * Math.exp(-DEAL.failSlope * (b.pentagon[4] - 5)) * creditCycle(ca);
        row.weeks += 1;
      }
    }
    const rate = (p: string) => (byPhase[p]?.weeks ? byPhase[p].hazard / byPhase[p].weeks : 0);
    expect(byPhase.recession).toBeDefined();
    expect(s.flags.gameOver).toBeUndefined();
    expect(failed).toBeGreaterThan(0);
    expect(rate('recession')).toBeGreaterThan(rate('expansion') * 1.3);
  }, 120_000);
});
