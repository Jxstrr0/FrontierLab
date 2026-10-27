// ROADMAP Stage 5 acceptance: a 10-year steady run (seed 42, Calgary) includes
// at least one recession, with visibly higher loan defaults than in expansion.
// Defaults are read against Canada's phase while every office is Canadian:
// once the city-wide pool (SIMULATION §9.2) sends the company abroad, its loans
// follow other countries' cycles.
// C3a: the only loans left are the Loan Desk's business loans, a few dozen lumpy
// whole-loan defaults, so realised losses are too noisy to compare by phase. The
// check reads the default hazard the sim applies to each loan instead
// (pd × creditCycle, SIMULATION §11), weighted by balance, and that loans default at all.
import { describe, expect, it } from 'vitest';
import { WEEKS_PER_YEAR } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { advanceWeeks } from '../../src/sim/engine';
import { creditCycle } from '../../src/sim/macro';
import { newGame } from '../../src/sim/newGame';
import { steady } from '../../scripts/strategies';

describe('recession acceptance', () => {
  it('a 10-year run has a recession with higher defaults', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    steady.setup(s);
    const byPhase: Record<string, { hazard: number; balance: number }> = {};
    let abroad = false;
    let losses = 0;
    for (let w = 0; w < 10 * WEEKS_PER_YEAR; w++) {
      advanceWeeks(s, 1);
      steady.weekly(s);
      losses += s.history.weekly.at(-1)!.pnl.loanLosses;
      abroad ||= Object.values(s.branches).some((b) => CITIES[b.cityId]?.country !== 'CA');
      if (abroad) continue;
      const ca = s.world.countries.CA!;
      const row = (byPhase[ca.phase] ??= { hazard: 0, balance: 0 });
      for (const loan of Object.values(s.loanDesk.loans)) {
        if (loan.status !== 'current') continue;
        row.hazard += loan.balance * loan.pd * creditCycle(ca);
        row.balance += loan.balance;
      }
    }
    const rate = (p: string) => (byPhase[p]?.balance ? byPhase[p].hazard / byPhase[p].balance : 0);
    expect(byPhase.recession).toBeDefined();
    expect(s.flags.gameOver).toBeUndefined();
    expect(losses).toBeGreaterThan(0);
    // Annual default rates: recession clearly above expansion (SIMULATION §25).
    expect(rate('recession')).toBeGreaterThan(rate('expansion') * 1.3);
  }, 120_000);
});
