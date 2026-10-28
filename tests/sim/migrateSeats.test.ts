// Save migration 21 → 22 (src/sim/save/migrateSeats.ts): the Chief Scientist
// folds into the CPO and the Chief Infrastructure Officer into the CFO; the
// dormant CFO Funding and CFO/CSO guidance switches go; the HR floor's hiring
// switch becomes the COO's Sales office operations.
import { describe, expect, it } from 'vitest';
import * as cmd from '../../src/sim/commands';
import { generateExecutive } from '../../src/sim/execCandidates';
import { migrations } from '../../src/sim/save/migrations';
import type { Executive, GameState } from '../../src/sim/state';
import { execGame, hire, holderTotal, identityGap } from '../helpers/executives';

/** The old seats, typed loosely the way the migration reads them. */
const seats = (s: GameState) => s.executives.seats as Record<string, Executive | undefined>;
const remembered = (s: GameState) =>
  s.executives.remembered as Record<string, Record<string, boolean> | undefined>;
const candidates = (s: GameState) =>
  s.executives.candidates as Record<string, Executive[] | undefined>;

/** Seats a pre-22 chief: a candidate rolled for `seatLike`, moved to the old seat id. */
function seatOld(
  s: GameState,
  seat: 'csci' | 'creo',
  delegations: Record<string, boolean>,
): Executive {
  const exec = generateExecutive(s, seat === 'csci' ? 'cpo' : 'cfo');
  (exec as { seat: string }).seat = seat;
  exec.delegations = { ...delegations };
  seats(s)[seat] = exec;
  return exec;
}

const migrate = (s: GameState) => migrations[21]!(s as never);

describe('save migration 21 → 22', () => {
  it('moves a seated Chief Scientist into an empty CPO seat with their training switch', () => {
    const s = execGame();
    const chief = seatOld(s, 'csci', { training: false });
    s.executives.remembered.cpo = { pricing: false, developments: true };
    migrate(s);
    expect(s.executives.seats.cpo).toBe(chief);
    expect(chief.seat).toBe('cpo');
    expect(seats(s).csci).toBeUndefined();
    // The brought switch keeps its value; the CPO's others follow the seat's memory, else stay off.
    expect(chief.delegations).toEqual({
      pricing: false,
      developments: true,
      models: false,
      training: false,
      talent: false,
      guidance: false,
    });
    expect(s.executives.remembered.cpo).toMatchObject({ training: false });
  });

  it('releases a Chief Scientist when the CPO seat is taken, settling their grants', () => {
    const s = execGame();
    const cpo = hire(s, 'cpo');
    expect(cmd.setExecDelegation(s, 'cpo', 'training', false).ok).toBe(true);
    // A grant made while the chief briefly held the CPO seat, then moved to the old seat.
    const chief = hire(s, 'cfo');
    expect(cmd.addGrant(s, 'cfo', 'rsu', 5_000).ok).toBe(true);
    delete s.executives.seats.cfo;
    (chief as { seat: string }).seat = 'csci';
    chief.delegations = { training: true };
    seats(s).csci = chief;
    const shares = s.company.sharesOutstanding;
    migrate(s);
    expect(s.executives.seats.cpo).toBe(cpo);
    expect(seats(s).csci).toBeUndefined();
    expect(chief.grants).toEqual([]);
    expect(s.company.sharesOutstanding).toBe(shares);
    expect(holderTotal(s)).toBe(s.company.sharesOutstanding);
    expect(identityGap(s)).toBeLessThan(1);
    // The seated CPO takes the chief's switch value.
    expect(cpo.delegations.training).toBe(true);
  });

  it('folds the Chief Infrastructure Officer into the CFO the same way', () => {
    const s = execGame();
    const chief = seatOld(s, 'creo', {
      bankRents: true,
      privateRents: false,
      bankBuys: false,
      privateBuys: true,
    });
    migrate(s);
    expect(s.executives.seats.cfo).toBe(chief);
    expect(chief.delegations).toMatchObject({
      bankRents: true,
      privateRents: false,
      bankBuys: false,
      privateBuys: true,
      capital: false,
    });
    expect(seats(s).creo).toBeUndefined();
  });

  it('copies remembered toggles, cleans the old seats’ candidates and rerolls, and drops the dead switches', () => {
    const s = execGame();
    remembered(s).csci = { training: false };
    remembered(s).creo = {
      bankRents: false,
      privateRents: true,
      bankBuys: true,
      privateBuys: false,
    };
    candidates(s).csci = [generateExecutive(s, 'cpo')];
    candidates(s).creo = [generateExecutive(s, 'cfo')];
    (s.executives.rerolls as Record<string, number>).creo = 2;
    // A CFO seated before schema 22: no building switches yet, the dead ones on.
    const cfo = hire(s, 'cfo');
    for (const id of ['bankRents', 'privateRents', 'bankBuys', 'privateBuys'])
      delete cfo.delegations[id];
    cfo.delegations.treasury = true;
    cfo.delegations.guidance = true;
    remembered(s).cro = { appetite: true, guidance: true };
    (s.company.guidance as unknown as Record<string, number>).deposits = 2;
    (s.company.guidance as unknown as Record<string, number>).loans = 1;
    for (const c of s.executives.candidates.cfo!) c.delegations.treasury = true;
    const inc = {
      id: 'inc_x',
      type: 'EXEC_POACHED',
      scopeKind: 'company',
      scope: 'csci',
      createdWeek: 0,
      deadlineWeek: 9,
      data: { seat: 'csci' },
      options: [],
    };
    s.incidents.active.push(inc as never);
    migrate(s);
    expect(s.executives.remembered.cpo).toMatchObject({ training: false });
    expect(s.executives.remembered.cfo).toMatchObject({
      bankRents: false,
      privateRents: true,
      bankBuys: true,
      privateBuys: false,
    });
    expect(cfo.delegations).toMatchObject({
      bankRents: false,
      privateRents: true,
      bankBuys: true,
      privateBuys: false,
    });
    expect(candidates(s).csci).toBeUndefined();
    expect(candidates(s).creo).toBeUndefined();
    expect(remembered(s).csci).toBeUndefined();
    expect(remembered(s).creo).toBeUndefined();
    expect((s.executives.rerolls as Record<string, number>).creo).toBeUndefined();
    expect(s.incidents.active.some((i) => i.id === 'inc_x')).toBe(false);
    expect('treasury' in cfo.delegations).toBe(false);
    expect('guidance' in cfo.delegations).toBe(false);
    expect(s.executives.remembered.cro).toEqual({ appetite: true });
    for (const c of s.executives.candidates.cfo!) {
      expect('treasury' in c.delegations).toBe(false);
      expect(c.delegations.bankRents).toBe(true);
    }
    expect(s.company.guidance).toEqual({ staffing: 0, marketing: 0, products: 0 });
  });

  it('turns a seated COO’s Sales office operations on when HR hiring was on', () => {
    const on = execGame();
    const coo = hire(on, 'coo');
    coo.delegations.branchOps = false;
    (on.people as { hrHiring?: boolean }).hrHiring = true;
    migrate(on);
    expect(coo.delegations.branchOps).toBe(true);
    expect('hrHiring' in on.people).toBe(false);

    const off = execGame();
    const coo2 = hire(off, 'coo');
    coo2.delegations.branchOps = false;
    (off.people as { hrHiring?: boolean }).hrHiring = false;
    migrate(off);
    expect(coo2.delegations.branchOps).toBe(false);
    expect('hrHiring' in off.people).toBe(false);
  });
});
