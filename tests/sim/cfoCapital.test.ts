// The CFO's Capital and Share sales delegations (SIMULATION §17.2, §15): a lab
// whose runway runs short sells its stocks and raises new shares with a CFO
// steering it, using only the player's own commands.
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION, PLACEMENT, RUNWAY } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { capitalNeeded, cfoCapital, cfoShares } from '../../src/sim/execDelegationsCapital';
import { runwaySnapshot } from '../../src/sim/runway';
import type { GameState } from '../../src/sim/state';
import { hire, identityGap } from '../helpers/executives';
import { bankWithFloors } from '../helpers/scenario';

/**
 * A lab losing `burn` a week over the CFO's whole window, holding `months` of
 * runway in cash. Cash moves with paid-in capital, so the books still balance.
 */
function burningLab(burn: number, months: number, stocks = 0): GameState {
  const s = bankWithFloors(['executive'], { weeks: 156 });
  for (const w of s.history.weekly.slice(-EXEC_DELEGATION.revenueWeeks)) w.netIncome = -burn;
  if (stocks > 0) buyStocks(s, stocks);
  const target = months * burn * RUNWAY.weeksPerMonth;
  s.company.paidInCapital += target - s.company.cash;
  s.company.cash = target;
  return s;
}

/** A year of strong reported profits, so a share round prices near the top of its range. */
function profitable(s: GameState): GameState {
  for (const q of s.history.quarterly.slice(-4)) q.netIncome = 2_000_000;
  return s;
}

/** New paid-in capital spent on listed stocks, keeping the identity. */
function buyStocks(s: GameState, amount: number): void {
  s.company.cash += amount;
  s.company.paidInCapital += amount;
  let left = amount;
  for (const c of Object.values(s.market.companies).sort((a, b) => a.id.localeCompare(b.id))) {
    const n = Math.min(Math.floor(left / (c.price * 1.01)), cmd.maxBuy(s, 'company', c.id));
    if (n > 0 && cmd.trade(s, 'company', c.id, n).ok) left -= n * c.price * 1.01;
    if (left < amount * 0.05) break;
  }
}

const holdsStocks = (s: GameState) =>
  Object.values(s.market.holdings.company).some((h) => h.shares > 0);

const withCfo = (s: GameState) => {
  hire(s, 'cfo');
  expect(cmd.setExecDelegation(s, 'cfo', 'capital', true).ok).toBe(true);
  expect(cmd.setExecDelegation(s, 'cfo', 'shares', true).ok).toBe(true);
  return s;
};

/** One week of both CFO capital routines, in their tick order. */
const steer = (s: GameState) => {
  cfoCapital(s);
  cfoShares(s);
};

describe('CFO capital', () => {
  it('does nothing while runway is Comfortable or better', () => {
    const s = withCfo(burningLab(50_000, 15, 1_000_000));
    expect(runwaySnapshot(s).tier).toBe('comfortable');
    const shares = s.company.sharesOutstanding;
    steer(s);
    expect(s.company.sharesOutstanding).toBe(shares);
    expect(holdsStocks(s)).toBe(true);
  });

  it('sells only the new shares a short lab needs to reach the target runway', () => {
    const s = withCfo(profitable(burningLab(20_000, 10)));
    expect(runwaySnapshot(s).tier).toBe('tight');
    const shares = s.company.sharesOutstanding;
    steer(s);
    expect(s.stock.placements).toHaveLength(1);
    expect(s.company.sharesOutstanding - shares).toBeLessThan(shares * PLACEMENT.maxPct);
    const months = runwaySnapshot(s).months!;
    expect(months).toBeGreaterThanOrEqual(RUNWAY.cfoTargetMonths);
    expect(months).toBeLessThan(RUNWAY.cfoTargetMonths + 3);
    expect(capitalNeeded(s)).toBe(0);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('sells the largest round allowed when a Critical lab is far short', () => {
    const s = withCfo(burningLab(5_000_000, 2));
    expect(runwaySnapshot(s).tier).toBe('critical');
    const shares = s.company.sharesOutstanding;
    const before = runwaySnapshot(s).months!;
    steer(s);
    expect(s.company.sharesOutstanding - shares).toBe(Math.round(shares * PLACEMENT.maxPct));
    expect(runwaySnapshot(s).months!).toBeGreaterThan(before);
    steer(s); // the next round waits for the gap between placements
    expect(s.stock.placements).toHaveLength(1);
  });

  it('sells company stocks at Tight runway', () => {
    const s = withCfo(burningLab(50_000, 8, 1_000_000));
    expect(holdsStocks(s)).toBe(true);
    const cash = s.company.cash;
    cfoCapital(s);
    expect(holdsStocks(s)).toBe(false);
    expect(s.company.cash).toBeGreaterThan(cash);
  });

  it('counts a lab that is not burning cash as Strong', () => {
    const s = withCfo(bankWithFloors(['executive'], { weeks: 156 }));
    for (const w of s.history.weekly) w.netIncome = 1;
    expect(runwaySnapshot(s)).toMatchObject({ months: null, burn: 0, tier: 'strong' });
    expect(capitalNeeded(s)).toBe(0);
  });
});
