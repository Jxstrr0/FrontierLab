// ROADMAP Stage 5 acceptance: a 10-year steady run (seed 42, Calgary) includes
// at least one recession, with visibly higher loan defaults than in expansion.
// Defaults are read against Canada's phase while every branch is Canadian:
// once the city-wide pool (SIMULATION §9.2) sends the bank abroad, its loans
// follow other countries' cycles.
import { describe, expect, it } from 'vitest';
import { WEEKS_PER_YEAR } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { steady } from '../../scripts/strategies';

describe('recession acceptance', () => {
  it('a 10-year run has a recession with higher defaults', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    steady.setup(s);
    const byPhase: Record<string, { losses: number; loanWeeks: number }> = {};
    let abroad = false;
    for (let w = 0; w < 10 * WEEKS_PER_YEAR; w++) {
      advanceWeeks(s, 1);
      steady.weekly(s);
      abroad ||= Object.values(s.branches).some((b) => CITIES[b.cityId]?.country !== 'CA');
      if (abroad) continue;
      const snap = s.history.weekly.at(-1)!;
      // Skip the founder phase, when one branch's book is too small to read.
      if (w < WEEKS_PER_YEAR || snap.totals.loans <= 0) continue;
      const phase = s.world.countries.CA!.phase;
      const row = (byPhase[phase] ??= { losses: 0, loanWeeks: 0 });
      row.losses += snap.pnl.loanLosses;
      row.loanWeeks += snap.totals.loans;
    }
    const rate = (p: string) =>
      byPhase[p] ? (byPhase[p].losses / byPhase[p].loanWeeks) * WEEKS_PER_YEAR : 0;
    expect(byPhase.recession).toBeDefined();
    expect(s.flags.gameOver).toBeUndefined();
    // Annual loss rates: recession clearly above expansion (SIMULATION §25: 0.4–1.0% vs 1.2–2.5%).
    expect(rate('recession')).toBeGreaterThan(rate('expansion') * 1.3);
  }, 120_000);
});
