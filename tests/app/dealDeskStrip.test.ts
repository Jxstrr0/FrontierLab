// Deal Desk summary strip and selectors (SCREENS §5.3, stage C5b): this week's
// RFPs, won, lost, win rate over settled bids, contracts held and their yearly
// value, and the requests waiting at each office.
import { describe, expect, it } from 'vitest';
import {
  dealDeskStrip,
  newRfpsByBranch,
  officeRfps,
  rfpWaiting,
} from '../../src/app/branch/dealDeskSelectors';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import type { Business, GameState, Rfp } from '../../src/sim/state';

function withBranch(): { s: GameState; id: string } {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Desk Lab' });
  const lot = Object.values(s.world.lots).find((l) => !l.occupant && l.cityId === 'cal')!;
  const r = cmd.buildBranch(s, { lotId: lot.id, build: REFERENCE_BUILDS.basic });
  if (!r.ok) throw new Error(r.reason);
  s.dealDesk.rfps = {};
  return { s, id: r.branchId };
}

const rfp = (
  id: string,
  branchId: string,
  businessId: string,
  kind: Rfp['kind'],
  dueWeek: number,
) => ({ id, branchId, businessId, kind, createdWeek: 0, dueWeek }) as Rfp;

/** Signs the first `n` businesses to office `id` at `value` a year each. */
function sign(s: GameState, id: string, n: number, value: number): Business[] {
  const list = Object.values(s.businesses).slice(0, n);
  for (const b of list) {
    b.vendor = { type: 'player', id };
    b.contractValue = value;
  }
  return list;
}

describe('deal desk strip', () => {
  it('starts empty, with no win rate', () => {
    const { s, id } = withBranch();
    for (const b of Object.values(s.businesses)) if (b.vendor?.type === 'player') delete b.vendor;
    expect(dealDeskStrip(s, s.branches[id]!)).toEqual({
      arrived: 0,
      won: 0,
      lost: 0,
      winRate: undefined,
      contracts: 0,
      arr: 0,
      waiting: 0,
    });
  });

  it("reads this week's desk counts, contracts and the waiting requests", () => {
    const { s, id } = withBranch();
    const b = s.branches[id]!;
    b.desk = { week: s.clock.week, arrived: 7, won: 3, lost: 1, declined: 2, expired: 0 };
    const [b1, b2, b3] = Object.values(s.businesses);
    sign(s, id, 2, 12_000);
    s.dealDesk.rfps = {
      R1: rfp('R1', id, b3!.id, 'new', s.clock.week + 2),
      R2: rfp('R2', 'elsewhere', b3!.id, 'new', s.clock.week + 2),
      R3: rfp('R3', id, b1!.id, 'renewal', s.clock.week + 4),
    };
    const strip = dealDeskStrip(s, b);
    expect(strip.arrived).toBe(7);
    expect(strip.won).toBe(3);
    expect(strip.lost).toBe(1);
    expect(strip.winRate).toBeCloseTo(3 / 4);
    expect(strip.contracts).toBe(2);
    expect(strip.arr).toBe(24_000);
    expect(strip.waiting).toBe(1);
    expect(newRfpsByBranch(s)).toEqual({ [id]: 1, elsewhere: 1 });
    expect(officeRfps(s, id).renewals.map((r) => r.id)).toEqual(['R3']);
    expect(b2).toBeDefined();
  });

  it("ignores last week's desk counts", () => {
    const { s, id } = withBranch();
    const b = s.branches[id]!;
    b.desk = { week: s.clock.week - 1, arrived: 9, won: 4, lost: 0, declined: 1, expired: 0 };
    expect(dealDeskStrip(s, b).arrived).toBe(0);
  });

  it('counts a rival renewal as waiting until you make or skip an offer', () => {
    const { s, id } = withBranch();
    const [own, theirs] = Object.values(s.businesses);
    own!.vendor = { type: 'player', id };
    theirs!.vendor = { type: 'rival', id: Object.keys(s.rivals)[0] ?? 'r1' };
    const mine = rfp('R1', id, own!.id, 'renewal', 13);
    mine.offer = 0.05;
    const rival = rfp('R2', id, theirs!.id, 'renewal', 13);
    expect(rfpWaiting(s, mine)).toBe(false);
    expect(rfpWaiting(s, rival)).toBe(true);
    rival.offer = 0.1;
    expect(rfpWaiting(s, rival)).toBe(false);
  });
});
