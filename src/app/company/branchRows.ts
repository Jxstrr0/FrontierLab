// Read-only view of each branch for the Branches list (SCREENS §25): the figures
// to show and sort by, and the issues worth a badge.
import { isDeposit, isLoan, PRODUCTS } from '../../data/products';
import { staffNeeded } from '../../sim/branch/staff';
import type { Branch, GameState } from '../../sim/state';

export type SortKey = 'name' | 'rating' | 'deposits' | 'loans' | 'income';

export interface Issue {
  text: string;
  tone: 'warn' | 'bad' | 'info';
}

export interface BranchRow {
  id: string;
  name: string;
  cityId: string;
  rating: number;
  deposits: number;
  loans: number;
  /** Net income of the latest weekly close; 0 for a branch with no history. */
  income: number;
  issues: Issue[];
}

function bookTotals(branch: Branch): { deposits: number; loans: number } {
  let deposits = 0;
  let loans = 0;
  for (const [pid, book] of Object.entries(branch.books)) {
    const spec = PRODUCTS[pid];
    if (!spec) continue;
    if (isDeposit(spec)) deposits += book.balance;
    else if (isLoan(spec)) loans += book.balance;
  }
  return { deposits, loans };
}

function issuesOf(s: GameState, branch: Branch): Issue[] {
  const issues: Issue[] = [];
  if (branch.status === 'fitout') issues.push({ text: 'Under construction', tone: 'info' });
  if (branch.status === 'closed') issues.push({ text: 'Closed', tone: 'bad' });
  if (branch.status !== 'open') return issues;
  if (branch.staff.count < staffNeeded(branch)) issues.push({ text: 'Understaffed', tone: 'warn' });
  if (!branch.managerId) issues.push({ text: 'No manager', tone: 'info' });
  const pending = Object.values(s.loanDesk.applications).filter(
    (a) => a.branchId === branch.id,
  ).length;
  if (pending > 0) {
    issues.push({ text: `${pending} loan application${pending === 1 ? '' : 's'}`, tone: 'warn' });
  }
  return issues;
}

export function branchRows(s: GameState): BranchRow[] {
  return Object.values(s.branches).map((b) => ({
    id: b.id,
    name: b.name,
    cityId: b.cityId,
    rating: b.ratings.overall,
    ...bookTotals(b),
    income: b.pnl.at(-1)?.income ?? 0,
    issues: issuesOf(s, b),
  }));
}

/** Names sort A to Z by default; figures sort high to low. `flip` reverses either. */
export function sortRows(rows: BranchRow[], key: SortKey, flip: boolean): BranchRow[] {
  const dir = flip ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (key === 'name') return dir * a.name.localeCompare(b.name);
    return -dir * (a[key] - b[key]) || a.name.localeCompare(b.name);
  });
}
