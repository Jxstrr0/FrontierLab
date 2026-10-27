// Deal Desk test setup (stage C5b): a Calgary game with one open sales office whose
// manager does not decide RFPs, controlled rivals, and shortcuts to put contracts and
// RFPs on the books without waiting for the weekly dice.
import { DEAL } from '../../src/config/balance';
import { contractValueAt } from '../../src/sim/branch/dealDesk';
import { businessesIn } from '../../src/sim/businesses';
import { quarterStartWeek } from '../../src/sim/calendar';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newId } from '../../src/sim/ids';
import { newGame } from '../../src/sim/newGame';
import type { Business, GameState, Rfp } from '../../src/sim/state';
import { openScriptedBranch } from './scenario';

export const CITY = 'cal';

/** Seed 42 in Calgary, one open office (Enterprise contracts on, decisions left to the player). */
export function dealGame(seed = 42): { s: GameState; id: string } {
  const s = newGame({ seed, cityId: CITY });
  const id = openScriptedBranch(s, 'midtown');
  cmd.setDelegation(s, id, 'loans', false);
  advanceWeeks(s, 2);
  return { s, id };
}

/**
 * Leaves Calgary with exactly one rival office of `stars` (returns its id), or with
 * none when `stars` is undefined.
 */
export function setRivals(s: GameState, stars?: number): string | undefined {
  let kept: string | undefined;
  for (const r of Object.values(s.rivals).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const here = r.branches.filter((o) => o.cityId === CITY);
    r.branches = r.branches.filter((o) => o.cityId !== CITY);
    if (stars !== undefined && !kept && r.status === 'active' && here[0]) {
      here[0].overall = stars;
      r.branches.push(here[0]);
      kept = r.id;
    }
  }
  return kept;
}

/** Calgary businesses (by id) that live on a storefront, so they can be re-rolled. */
export const lotBusinesses = (s: GameState): Business[] =>
  businessesIn(s, CITY)
    .filter((b) => b.lotId && b.size !== 'anchor')
    .sort((a, b) => (a.id < b.id ? -1 : 1));

/** Calgary businesses without an AI vendor and not waiting out a cooldown. */
export const unserved = (s: GameState): Business[] =>
  lotBusinesses(s).filter((b) => !b.vendor && (b.quietUntil ?? 0) <= s.clock.week);

/** Puts an open RFP for `b` on the desk. */
export function addRfp(
  s: GameState,
  branchId: string,
  b: Business,
  kind: Rfp['kind'] = 'new',
  extra: Partial<Rfp> = {},
): Rfp {
  const rfp: Rfp = {
    id: newId(s, 'rfp'),
    branchId,
    businessId: b.id,
    kind,
    createdWeek: s.clock.week,
    dueWeek: s.clock.week + DEAL.expiryWeeks,
    ...extra,
  };
  s.dealDesk.rfps[rfp.id] = rfp;
  return rfp;
}

/** Gives `branchId` a contract with `b` at `discount`, due at the `quarters`-th quarter start. */
export function giveContract(
  s: GameState,
  branchId: string,
  b: Business,
  discount = 0,
  quarters = 1,
): void {
  b.vendor = { type: 'player', id: branchId };
  b.contractValue = contractValueAt(b, discount);
  b.startWeek = s.clock.week;
  b.renewalWeek = quarterStartWeek(s.meta.startDate, s.clock.week, quarters);
}

/** Gives `b` a rival's contract (renewing at the next quarter start), as the game seeds them. */
export function giveRivalContract(s: GameState, rivalId: string, b: Business): void {
  b.vendor = { type: 'rival', id: rivalId };
  b.contractValue = Math.round((b.budget * 0.6) / 100) * 100;
  b.renewalWeek = quarterStartWeek(s.meta.startDate, s.clock.week, 1);
  delete b.startWeek;
}
