// Folding one sales office into another (stage C2a, SIMULATION §19.8): a city
// holds one office of yours, so the branches of a rival you buy join your
// office there. The keeper takes every book, customer and loan, grows to the
// size that holds both, and adds the other's lease; the other's lot is freed.
import { emptyBook } from './books';
import { MAX_OFFICE_SIZE, sizeMult, sizeMultOf } from './officeSize';
import { staffNeeded } from './staff';
import type { Book, Branch, GameState } from '../state';

/** Adds a whole book into another, blending rates and risk by balance. */
function addBook(into: Book, from: Book): void {
  const total = into.balance + from.balance;
  if (total > 0) {
    into.bookRate = (into.balance * into.bookRate + from.balance * from.bookRate) / total;
    into.pd = (into.balance * into.pd + from.balance * from.pd) / total;
    into.lgd = (into.balance * into.lgd + from.balance * from.lgd) / total;
  }
  into.balance = total;
  into.accounts += from.accounts;
}

/** The smallest size whose multiplier holds `mult`, capped at the largest. */
export function sizeFor(mult: number): number {
  for (let s = 0; s <= MAX_OFFICE_SIZE; s++) if (sizeMultOf(s) >= mult - 1e-9) return s;
  return MAX_OFFICE_SIZE;
}

/** Moves everything of `other` into `keeper` and removes `other`. */
export function foldIntoOffice(state: GameState, keeper: Branch, other: Branch): void {
  for (const [pid, from] of Object.entries(other.books)) {
    addBook((keeper.books[pid] ??= emptyBook()), from);
  }
  keeper.customers += other.customers;
  for (const loan of Object.values(state.loanDesk.loans)) {
    if (loan.branchId === other.id) loan.branchId = keeper.id;
  }
  for (const app of Object.values(state.loanDesk.applications)) {
    if (app.branchId === other.id) delete state.loanDesk.applications[app.id];
  }
  for (const a of state.company.fixedAssets) if (a.ownerId === other.id) a.ownerId = keeper.id;
  keeper.size = Math.max(keeper.size, sizeFor(sizeMult(keeper) + sizeMult(other)));
  keeper.lease.weeklyRent += other.lease.weeklyRent;
  keeper.lease.deposit += other.lease.deposit;
  keeper.staff.count += other.staff.count;
  keeper.staff.target = Math.max(keeper.staff.target, staffNeeded(keeper));
  keeper.staff.count = Math.min(keeper.staff.count, keeper.staff.target);

  if (other.managerId) delete state.people.managers[other.managerId];
  const lot = state.world.lots[other.lotId];
  if (lot) delete lot.occupant;
  state.events.scheduled = state.events.scheduled.filter((e) => e.payload.branchId !== other.id);
  delete state.branches[other.id];
}
