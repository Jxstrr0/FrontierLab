// Save migration 21 → 22: the Executive floor goes from nine seats to seven
// (DESIGN decision log 2026-10-27). The Chief Scientist (`csci`) folds into the
// CPO and the Chief Infrastructure Officer (`creo`) into the CFO: a seated
// chief moves into the other seat when it is empty, otherwise leaves with their
// grants settled the way a resignation settles them (settleOnExit), and the
// toggles they brought (training; the four Rents and Buying switches) land on
// the executive now in that seat and on the seat's remembered toggles. The
// seats' candidates, rerolls and open poaching cases are dropped. The dormant
// CFO Funding (`treasury`) and CFO/CSO `guidance` switches go, with the
// deposit and loan guidance steps they moved. The HR floor's manager-hiring
// switch (`people.hrHiring`) becomes the COO's Sales office operations: a
// seated COO gets it switched on when HR hiring was on.
import { EXEC_SEATS } from '../../data/executives';
import { settleOnExit } from '../execGrants';
import type { ExecSeat, Executive, GameState } from '../state';

/** A seat that folds into another, with the toggles it brings along. */
interface Fold {
  from: string;
  into: ExecSeat;
  toggles: readonly string[];
}

const FOLDS: readonly Fold[] = [
  { from: 'csci', into: 'cpo', toggles: ['training'] },
  { from: 'creo', into: 'cfo', toggles: ['bankRents', 'privateRents', 'bankBuys', 'privateBuys'] },
];

/** Delegation toggles removed from seats that stay. */
const DROPPED: readonly [ExecSeat, string][] = [
  ['cfo', 'treasury'],
  ['cfo', 'guidance'],
  ['cro', 'guidance'],
];

type Toggles = Record<string, boolean>;

export function migrateSeats(state: GameState): void {
  const ex = state.executives;
  // The old seat ids are no longer in ExecSeat, so the maps are read loosely here.
  const seats = ex.seats as Record<string, Executive | undefined>;
  const remembered = ex.remembered as Record<string, Toggles | undefined>;
  const candidates = ex.candidates as Record<string, Executive[] | undefined>;
  const rerolls = ex.rerolls as Record<string, number | undefined>;

  for (const fold of FOLDS) {
    const old = seats[fold.from];
    const kept = remembered[fold.from];
    // What the old seat brings: the seated chief's switches, else the seat's memory.
    const brought: Toggles = {};
    for (const id of fold.toggles) {
      const v = old ? old.delegations[id] : kept?.[id];
      if (v !== undefined) brought[id] = v;
    }
    const target = seats[fold.into];
    if (old && !target) {
      // Move into the empty seat: the new seat's other switches follow its memory, else stay off.
      old.seat = fold.into;
      const next: Toggles = {};
      for (const d of EXEC_SEATS[fold.into].delegations) {
        next[d.id] = brought[d.id] ?? remembered[fold.into]?.[d.id] ?? false;
      }
      old.delegations = next;
      seats[fold.into] = old;
    } else if (old) {
      // The seat is taken: the chief leaves, grants settled as on a resignation.
      settleOnExit(state, old);
      for (const [id, v] of Object.entries(brought)) target!.delegations[id] = v;
    } else if (target) {
      for (const id of fold.toggles) target.delegations[id] ??= brought[id] ?? false;
    }
    const memory = (remembered[fold.into] ??= {});
    for (const id of fold.toggles) {
      if (brought[id] !== undefined) memory[id] = brought[id]!;
    }
    // Waiting candidates get the new switches on, like any new hire.
    for (const c of candidates[fold.into] ?? []) {
      for (const id of fold.toggles) c.delegations[id] ??= true;
    }
    delete seats[fold.from];
    delete remembered[fold.from];
    delete candidates[fold.from];
    delete rerolls[fold.from];
    state.incidents.active = state.incidents.active.filter(
      (inc) =>
        !(inc.type === 'EXEC_POACHED' && (inc.data.seat === fold.from || inc.scope === fold.from)),
    );
  }

  for (const [seat, id] of DROPPED) {
    delete seats[seat]?.delegations[id];
    delete remembered[seat]?.[id];
    for (const c of candidates[seat] ?? []) delete c.delegations[id];
  }
  const guidance = state.company.guidance as unknown as Record<string, number> | undefined;
  if (guidance) {
    delete guidance.deposits;
    delete guidance.loans;
  }

  const people = state.people as { hrHiring?: boolean };
  if (people.hrHiring && seats.coo) seats.coo.delegations.branchOps = true;
  delete people.hrHiring;
}
