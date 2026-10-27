// The CFO's Capital delegation (SIMULATION §17.2, §15): a lab knocked down to
// Critical raises capital with a CFO steering it, using
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

/** Risk-weighted assets a lab has with no deposit book are small, so the scenario adds a
 * long-lived equipment fit-out funded by the treasury (overnight wholesale), keeping equity
 * above the charter floor at the ratios these tests aim for. */
const LEVERAGED_KIT = 25_000_000;

/** A lab with an Executive suite and a debt-funded asset base, then a write-down of that
 * equipment that leaves the ratio at `cr` (cash untouched, so the lab stays solvent). */
function shockedBank(cr: number, stocks = 0): GameState {
  const s = bankWithFloors(['executive'], { weeks: 156 });
  const kit = {
    id: 'test-kit',
    kind: 'equipment' as const,
    slot: 'kit',
    cost: LEVERAGED_KIT,
    lifeWeeks: 5_200,
    ageWeeks: 0,
    ownerId: 'hq',
  };
  s.company.fixedAssets.push(kit);
  s.treasury.reserves -= LEVERAGED_KIT;
  if (stocks > 0) buyStocks(s, stocks);
  // Writing the kit down lowers CET1 and RWA together (risk weight 1).
  const cap = capitalSnapshot(s);
  const loss = (cap.cet1 - cr * cap.rwa) / (1 - cr);
  kit.cost -= loss;
  s.company.paidInCapital -= loss;
  return s;
}

/** A year of strong reported profits, so a share round prices near the top of its range. */
function profitable(s: GameState): GameState {
  for (const q of s.history.quarterly.slice(-4)) q.netIncome = 2_000_000;
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
    const s = withCfo(profitable(shockedBank(0.125)));
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

  it('raises capital for a Critical lab, which fails without a CFO', () => {
    // Until C7 replaces the bank capital rules, a loss-making lab can't climb all
    // the way back: the check is that the CFO's round leaves it clearly stronger.
    const steered = withCfo(profitable(shockedBank(0.035)));
    const adrift = shockedBank(0.035);
    advanceWeeks(steered, 4);
    advanceWeeks(adrift, 4);
    expect(steered.stock.placements).toHaveLength(1);
    expect(capitalSnapshot(steered).capitalRatio).toBeGreaterThan(
      capitalSnapshot(adrift).capitalRatio + 0.01,
    );
    expect(identityGap(steered)).toBeLessThan(1);

    advanceWeeks(adrift, 48);
    // Takeover or insolvency, whichever comes first: this lab is short of both.
    expect(['takeover', 'insolvency']).toContain(adrift.flags.gameOver);
  });
});
