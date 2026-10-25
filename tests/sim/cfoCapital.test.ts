// The CFO's Capital delegation (SIMULATION §17.2, §15): a bank knocked down to
// Critical climbs back to a safe capital ratio with a CFO steering it, using
// only the player's own commands (stock sales, risk appetite, new shares).
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION, PLACEMENT } from '../../src/config/balance';
import { capitalSnapshot } from '../../src/sim/capital';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { capitalNeeded, cfoCapital, cfoShares } from '../../src/sim/execDelegationsCapital';
import type { GameState } from '../../src/sim/state';
import { croAppetite } from '../../src/sim/execDelegationsPeople';
import { homeCountry } from '../../src/sim/treasury';
import { hire, identityGap } from '../helpers/executives';
import { bankWithFloors } from '../helpers/scenario';

/** A lending bank with an Executive suite, then a loss that leaves the ratio at `cr`. */
function shockedBank(cr: number, stocks = 0): GameState {
  const s = bankWithFloors(['executive'], { weeks: 156 });
  if (stocks > 0) buyStocks(s, stocks);
  const cap = capitalSnapshot(s);
  const loss = cap.cet1 - cr * cap.rwa;
  s.company.cash -= loss;
  s.company.paidInCapital -= loss;
  return s;
}

/** New paid-in capital spent on listed stocks (risk weight 2.5×), keeping the identity. */
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
  it('does nothing while the bank is Adequate or better', () => {
    const s = withCfo(bankWithFloors(['executive'], { weeks: 156 }));
    expect(['adequate', 'strong']).toContain(capitalSnapshot(s).tier);
    const shares = s.company.sharesOutstanding;
    steer(s);
    expect(s.company.sharesOutstanding).toBe(shares);
  });

  it('sells only the new shares a Restricted bank needs to reach the target', () => {
    // A 5pp regulator buffer makes 12.5% Restricted, so the shortfall is small
    // enough for part of a round; it also lifts the CFO's target to 17%.
    const s = withCfo(shockedBank(0.125));
    homeCountry(s).capitalBuffer = { pp: 5, untilWeek: s.clock.week + 52 };
    expect(capitalSnapshot(s).tier).toBe('restricted');
    const target = EXEC_DELEGATION.cfoTargetCr + 0.05;
    const shares = s.company.sharesOutstanding;
    steer(s);
    expect(s.stock.placements).toHaveLength(1);
    expect(s.company.sharesOutstanding - shares).toBeLessThan(shares * PLACEMENT.maxPct);
    const cr = capitalSnapshot(s).capitalRatio;
    expect(cr).toBeGreaterThanOrEqual(target);
    expect(cr).toBeLessThan(target + 0.02);
    expect(capitalNeeded(s)).toBe(0);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('sells the largest round allowed when a Critical bank is far short', () => {
    const s = withCfo(shockedBank(0.035));
    const shares = s.company.sharesOutstanding;
    const before = capitalSnapshot(s).capitalRatio;
    steer(s);
    expect(s.company.sharesOutstanding - shares).toBe(Math.round(shares * PLACEMENT.maxPct));
    expect(capitalSnapshot(s).capitalRatio).toBeGreaterThan(before);
    steer(s); // the next round waits for the 26-week gap
    expect(s.stock.placements).toHaveLength(1);
  });

  it('sells company stocks and trims risk appetite at Watch, without new shares', () => {
    const s = withCfo(shockedBank(0.09, 1_000_000));
    expect(capitalSnapshot(s).tier).toBe('watch');
    expect(holdsStocks(s)).toBe(true);
    s.company.riskAppetite = 3;
    while (s.clock.week % EXEC_DELEGATION.croEveryWeeks !== EXEC_DELEGATION.cfoAppetitePhase)
      s.clock.week++;
    const shares = s.company.sharesOutstanding;
    steer(s);
    expect(holdsStocks(s)).toBe(false);
    expect(s.company.riskAppetite).toBe(2);
    expect(s.company.sharesOutstanding).toBe(shares);
  });

  it('trims risk appetite alongside a CRO who tunes it, on its own week of the cycle', () => {
    const s = withCfo(shockedBank(0.09));
    hire(s, 'cro');
    expect(cmd.setExecDelegation(s, 'cro', 'appetite', true).ok).toBe(true);
    s.company.riskAppetite = 4;
    s.company.capitalRatio = capitalSnapshot(s).capitalRatio; // the weekly close's figure
    while (s.clock.week % EXEC_DELEGATION.croEveryWeeks !== 0) s.clock.week++;
    croAppetite(s); // the CRO's week: one step down, and the CFO waits
    cfoCapital(s);
    expect(s.company.riskAppetite).toBe(3);
    s.clock.week += EXEC_DELEGATION.cfoAppetitePhase;
    croAppetite(s); // the CFO's week: the CRO waits, the CFO steps down again
    cfoCapital(s);
    expect(s.company.riskAppetite).toBe(2);
  });

  it('with Share sales off, sells stocks and trims appetite but never new shares', () => {
    const s = withCfo(shockedBank(0.035, 1_000_000));
    expect(cmd.setExecDelegation(s, 'cfo', 'shares', false).ok).toBe(true);
    const shares = s.company.sharesOutstanding;
    advanceWeeks(s, 8);
    expect(holdsStocks(s)).toBe(false);
    expect(s.stock.placements).toHaveLength(0);
    expect(s.company.sharesOutstanding).toBe(shares);
  });

  it('brings a Critical bank back to a safe ratio, where without a CFO it fails', () => {
    const steered = withCfo(shockedBank(0.035));
    advanceWeeks(steered, 52);
    expect(steered.flags.gameOver).toBeUndefined();
    expect(['adequate', 'strong']).toContain(capitalSnapshot(steered).tier);
    expect(identityGap(steered)).toBeLessThan(1);

    const adrift = shockedBank(0.035);
    advanceWeeks(adrift, 52);
    // Takeover or insolvency, whichever comes first: this bank is short of both.
    expect(['takeover', 'insolvency']).toContain(adrift.flags.gameOver);
  });
});
