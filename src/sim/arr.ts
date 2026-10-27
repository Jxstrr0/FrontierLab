// Annual recurring revenue (C3a, SIMULATION §10.7): the yearly value of every
// plan and usage book, the lab's headline growth number. Plan books hold seats
// × price × billing periods; usage books hold a year of usage at today's price;
// partnership mini-books hold their seats' ARR.
import { isRecurring } from '../data/products';
import { productSpec } from './products';
import type { Branch, GameState } from './state';

/** ARR of one office's plan and usage books. */
export function branchArr(state: GameState, branch: Branch): number {
  let total = 0;
  for (const [pid, book] of Object.entries(branch.books)) {
    const spec = productSpec(state, pid);
    if (spec && isRecurring(spec)) total += book.balance;
  }
  return total;
}

/** ARR across every open or converting office plus partnership plans. */
export function companyArr(state: GameState): number {
  let total = 0;
  for (const b of Object.values(state.branches))
    if (b.status !== 'closed') total += branchArr(state, b);
  for (const p of Object.values(state.partnerships)) total += p.balance;
  return total;
}
