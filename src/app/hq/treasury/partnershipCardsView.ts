// Read-only view for the Treasury floor's partnership cards (SCREENS §10
// Treasury, §14 Yours): one entry per payroll or student partnership, active
// or running off, with who it is with, how many people it covers, where it is
// in its contract, its deposit mini-book and health, and the panel a tap
// opens. Formulas come from src/sim/partnerships.ts.
import { headcount, yearOfTerm } from '../../../sim/partnerships';
import type { GameState, Partnership } from '../../../sim/state';
import type { PanelRoute } from '../../store';

export interface PartnershipCardView {
  id: string;
  /** Employer or university name. */
  name: string;
  /** "Staff payroll" or "Student accounts". */
  kindLabel: string;
  /** Headcount the deal covers, with its noun ("employees" or "students"). */
  people: number;
  peopleLabel: 'Employees' | 'Students';
  /** "Year 3 of 7" while active; "Running off · 8 weeks left" after it ends. */
  termText: string;
  active: boolean;
  balance: number;
  accounts: number;
  health: number;
  /** The employer or university panel; undefined when the site has left the map. */
  route?: PanelRoute;
}

/** Active deals first, then the biggest deposit books. */
export function partnershipCards(state: GameState): PartnershipCardView[] {
  return Object.values(state.partnerships)
    .map((p) => cardView(state, p))
    .sort((a, b) => Number(b.active) - Number(a.active) || b.balance - a.balance);
}

function cardView(state: GameState, p: Partnership): PartnershipCardView {
  const site = state.world.sites[p.siteId];
  const active = p.status === 'active';
  const { year, of } = yearOfTerm(state, p);
  const left = p.runoffWeeksLeft ?? 0;
  return {
    id: p.id,
    name: site ? (site.employer?.name ?? site.refId) : 'A former partner',
    kindLabel: p.kind === 'student' ? 'Student accounts' : 'Staff payroll',
    people: site ? headcount(site, p.kind) : 0,
    peopleLabel: p.kind === 'student' ? 'Students' : 'Employees',
    termText: active
      ? `Year ${year} of ${of}`
      : `Running off · ${left} ${left === 1 ? 'week' : 'weeks'} left`,
    active,
    balance: p.balance,
    accounts: p.accounts,
    health: p.health,
    route: !site
      ? undefined
      : site.kind === 'university'
        ? { type: 'university', siteId: site.id }
        : { type: 'employer', siteId: site.id },
  };
}
