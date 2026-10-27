// Closing a branch (DESIGN §5.3): cash back, accounts moving to the nearest
// office (C2a: one per city, so the nearest city's) with most of their ARR, and the balance identity
// holding afterwards.
import { describe, expect, it } from 'vitest';
import { companyArr } from '../../src/sim/arr';
import { balanceSheet, loanTotals } from '../../src/sim/balanceSheet';
import { officeContractArr } from '../../src/sim/contracts';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { openScriptedBranch } from '../helpers/scenario';
import { fly } from '../helpers/world';

function twoBranches() {
  const s = newGame({ seed: 11, cityId: 'cal', startCash: 3_500_000 });
  const a = openScriptedBranch(s, 'midtown');
  fly(s, 'sas');
  const b = openScriptedBranch(s);
  advanceWeeks(s, 30);
  return { s, a, b };
}

describe('closeBranch', () => {
  it('returns cash, moves loans and most ARR, and keeps the books balanced', () => {
    const { s, a, b } = twoBranches();
    const quote = cmd.closeQuote(s, a)!;
    expect(quote.targetId).toBe(b);
    const cash = s.company.cash;
    // The office's contracts end with it (no other office in Calgary), so they
    // leave the ARR on top of the customers who don't follow.
    const contracts = officeContractArr(s, a);
    const arr = companyArr(s);
    const loans = loanTotals(s).total;
    const r = cmd.closeBranch(s, a);
    expect(r.ok).toBe(true);
    expect(s.branches[a]).toBeUndefined();
    expect(s.company.cash - cash).toBeCloseTo(quote.cashBack, 0);
    expect(loanTotals(s).total).toBeCloseTo(loans, 0);
    // Most customers follow to the other office; the rest leave with their ARR.
    expect(companyArr(s)).toBeLessThan(arr);
    expect(companyArr(s)).toBeGreaterThan((arr - contracts) * 0.85);
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
    advanceWeeks(s, 4);
    const after = balanceSheet(s);
    expect(Math.abs(after.equity - after.expectedEquity)).toBeLessThan(1);
  });

  it('ends the contracts of an only office, since they have nowhere to go (C5b)', () => {
    const { s, a, b } = twoBranches();
    expect(cmd.closeBranch(s, a).ok).toBe(true);
    // Calgary's office held contracts with its own businesses; Saskatoon's cannot take them.
    const held = Object.values(s.businesses).filter(
      (x) => x.vendor?.type === 'player' && x.vendor.id === b,
    );
    const r = cmd.closeBranch(s, b);
    expect(r.ok).toBe(true);
    for (const x of held) expect(x.vendor?.type).not.toBe('player');
    expect(
      Object.values(s.businesses).some((x) => x.vendor?.type === 'player' && x.vendor.id === b),
    ).toBe(false);
  });
});
