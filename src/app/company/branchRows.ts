// Read-only view of each office for the Branches list (SCREENS §25): the figures
// to show and sort by, the issues worth a badge, and the cities and countries to
// filter and group by once the bank spans several of them.
import { CITIES } from '../../data/cities';
import type { CountryId } from '../../data/types';
import { branchArr } from '../../sim/arr';
import { staffNeeded } from '../../sim/branch/staff';
import type { Branch, GameState } from '../../sim/state';

export type SortKey = 'name' | 'rating' | 'arr' | 'customers' | 'income';

export interface Issue {
  text: string;
  tone: 'warn' | 'bad' | 'info';
}

export interface BranchRow {
  id: string;
  name: string;
  cityId: string;
  rating: number;
  /** Annual recurring revenue of the office's plan and usage books. */
  arr: number;
  customers: number;
  /** Net income of the latest weekly close; 0 for a branch with no history. */
  income: number;
  issues: Issue[];
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
    arr: branchArr(s, b),
    customers: b.customers,
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

/** A row's country (CA, US, UK…). */
export const countryOf = (r: Pick<BranchRow, 'cityId'>): CountryId | undefined =>
  CITIES[r.cityId]?.country;

/**
 * Cities for the filter chips: your home country's first, then each other
 * country in the order you entered it, cities within a country in the order you
 * opened there.
 */
export function filterCities(s: GameState, rows: BranchRow[]): string[] {
  const order = countryOrder(s, rows);
  const cities = [...new Set(rows.map((r) => r.cityId))];
  const rank = (id: string) => order.indexOf(CITIES[id]?.country as CountryId);
  return cities
    .map((id, i) => ({ id, i }))
    .sort((a, b) => rank(a.id) - rank(b.id) || a.i - b.i)
    .map((x) => x.id);
}

/** Countries with branches: home first, then in the order you entered them. */
export function countryOrder(s: GameState, rows: BranchRow[]): CountryId[] {
  const home = CITIES[s.meta.homeCityId]?.country;
  const seen = rows.map(countryOf).filter((c): c is CountryId => !!c);
  const all = home && seen.includes(home) ? [home, ...seen] : seen;
  return all.filter((c, i) => all.indexOf(c) === i);
}

/** Sorted rows split by country, in `order` (countryOrder of every row), keeping the sort within each. */
export function groupByCountry(
  order: CountryId[],
  rows: BranchRow[],
): { country: CountryId; rows: BranchRow[] }[] {
  return order.map((country) => ({
    country,
    rows: rows.filter((r) => countryOf(r) === country),
  }));
}
