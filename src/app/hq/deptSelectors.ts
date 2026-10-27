// Read-only views of one HQ department for its floor (SCREENS §10): coverage
// in plain words, the advisor's coverage-aware lines (CONTENT §25), salary
// stepper bounds and the desk picture's numbers. Nothing here mutates GameState.
import { FOUNDER_RAMP, HQ_COVERAGE, VENTURES } from '../../config/balance';
import { DEPARTMENTS, HQ_DEPTS } from '../../data/departments';
import { DEPT_SALARY_RANGE, DEPT_SALARY_STEP } from '../../sim/commands';
import { deptDesks, deptMarketSalary } from '../../sim/hq';
import type { DeptId, GameState, HqDeptId } from '../../sim/state';
import { moodTone } from '../branch/selectors';
import { executiveAdvisor } from '../executive/execSelectors';
import { seatedExecs } from '../../sim/execSeats';

/** UI-only thresholds for the advisor line (not simulation tuning). */
const ADVISOR = { lowMorale: 40 } as const;

/** Office units (a Starter is 1) at which requirements start (founder mode, SIMULATION §16.3). */
export const FOUNDER_FROM_BRANCHES = FOUNDER_RAMP.fromBranches + 1;

export const isHqDept = (d: DeptId): d is HqDeptId => (HQ_DEPTS as readonly string[]).includes(d);

export interface CoverageView {
  /** Staff the company's size calls for (rounded up). */
  needs: number;
  /** Raw coverage k as a share (0–1.2). */
  share: number;
  /** 0 founder mode (nothing required yet) … 1 full requirements. */
  ramp: number;
  status: 'founder' | 'ok' | 'short';
  /** "Needs 21 · Coverage 86%" or the founder-mode wording. */
  text: string;
  /** One line under the meter. */
  note: string;
}

export function coverageView(s: GameState, dept: HqDeptId): CoverageView {
  const c = s.hq.coverage[dept];
  const ramp = s.hq.ramp;
  const needs = Math.ceil((c?.required ?? 0) - 1e-9);
  const share = Math.min(HQ_COVERAGE.kMax, c?.k ?? 0);
  const pctText = `${Math.round(share * 100)}%`;
  if (ramp <= 0) {
    return {
      needs,
      share,
      ramp,
      status: 'founder',
      text: `Not required yet · Coverage ${pctText}`,
      note: `Founder mode: nothing is required until your sales offices add up to ${FOUNDER_FROM_BRANCHES} Starters (a Standard counts 2).${needs > 0 ? ` At today's size this floor would need ${needs}.` : ''}`,
    };
  }
  const short = (c?.kPrime ?? 1) < 1;
  return {
    needs,
    share,
    ramp,
    status: short ? 'short' : 'ok',
    text: `Needs ${needs} · Coverage ${pctText}`,
    note:
      ramp < 1
        ? `Requirements are phasing in (${Math.round(ramp * 100)}% applied) as the lab grows.`
        : short
          ? 'Short-staffed: hire up or raise pay to close the gap.'
          : 'Fully staffed for the lab you run today.',
  };
}

/** What each floor's advisor says when covered and when short (CONTENT §25). */
const LINES: Record<HqDeptId, [ok: string, short: string]> = {
  finance: [
    'Books are closed on time.',
    "We're short on finance staff. Statements are running late.",
  ],
  hr: [
    'Hiring is moving and morale is steady.',
    "We can't keep up with hiring, and morale is slipping across the lab.",
  ],
  products: [
    'Models and launches are on schedule.',
    "We're stretched thin. Developments are crawling.",
  ],
  treasury: ["Compute's under control.", "We're paying more for GPUs without more hands."],
  marketing: [
    'Every campaign is landing at full strength.',
    'Campaigns land half as hard without more people.',
  ],
  it: [
    'The app is stable and the reviews are kind.',
    "We're short on engineers. The app rating will slide.",
  ],
  risk: [
    'Losses are tracked and the regulator is calm.',
    "We're missing bad loans. Defaults and fines are creeping up.",
  ],
};

/** Everything the floor's advisor could say right now, most pressing first. */
export function deptAdvisor(s: GameState, dept: DeptId): string[] {
  if (dept === 'executive') return executiveAdvisor(s);
  const d = s.departments[dept];
  const name = DEPARTMENTS[dept].name;
  const lines: string[] = [];
  if (dept === 'treasury' && s.treasury.freeze) {
    lines.push('Funding freeze: new lending is stopped until liquidity recovers.');
  }
  if (!d || d.staff === 0) {
    lines.push(
      d && d.target > 0
        ? `Recruiting for ${name} has started. The first hires arrive next week.`
        : `This floor is empty. Raise Employees to start hiring.`,
    );
  }
  if (isHqDept(dept) && !(dept === 'treasury' && s.treasury.freeze)) {
    const cov = coverageView(s, dept);
    const [ok, short] = LINES[dept];
    if (cov.status === 'short') lines.push(short);
    else if (cov.status === 'founder')
      lines.push(`We're a small shop, so nobody's counting heads yet. ${ok}`);
    else lines.push(ok);
  }
  if (dept === 'investment' && d && d.staff > 0) {
    // SIMULATION §20.3: the pipeline shows 1 + floor(staff / 4) startups, up to the max.
    const shown = Math.min(
      VENTURES.pipelineMax,
      VENTURES.pipelineBase + Math.floor(d.staff / VENTURES.staffPerExtra),
    );
    const more =
      shown < VENTURES.pipelineMax
        ? ` Every ${VENTURES.staffPerExtra} more analysts finds another.`
        : '';
    lines.push(`We're tracking ${shown} startups that are raising.${more}`);
  }
  if (d) {
    const open = d.target - d.staff;
    if (open > 0 && d.staff > 0) lines.push(`We're hiring for ${open} open positions.`);
    if (d.morale < ADVISOR.lowMorale) lines.push("The team's frustrated about pay.");
  }
  return lines.length ? lines : ['All quiet on this floor.'];
}

/** Salary stepper bounds: $1,000 steps between half and three times the market salary. */
export function salaryBounds(s: GameState, dept: DeptId) {
  const market = deptMarketSalary(s, dept);
  const step = DEPT_SALARY_STEP;
  return {
    market,
    step,
    min: Math.ceil((market * DEPT_SALARY_RANGE[0]) / step) * step,
    max: Math.floor((market * DEPT_SALARY_RANGE[1]) / step) * step,
  };
}

/** Numbers for the office-interior picture: desks shown, filled and the mood colour. */
export function deskPicture(s: GameState, dept: DeptId, maxShown: number) {
  const d = s.departments[dept];
  const desks = deptDesks(s, dept);
  // The Executive suite seats you plus the hired executives.
  const staff = dept === 'executive' ? 1 + seatedExecs(s).length : (d?.staff ?? 0);
  const shown = Math.min(desks, maxShown);
  const filled = desks > 0 ? Math.round((Math.min(staff, desks) / desks) * shown) : 0;
  return { desks, staff, shown, filled, mood: moodTone(d?.morale ?? 0) };
}

/** Most staff figures drawn in a floor's team card; the rest show as "+n". */
export const MAX_FIGURES = 12;

/**
 * The team card's figure row (SCREENS §10 "staff figures with mood bubbles"):
 * people on staff first, then dashed outlines for open positions, capped at
 * `cap` figures with the remainder counted in `more`.
 */
export function staffFigures(staff: number, target: number, cap = MAX_FIGURES) {
  const open = Math.max(0, target - staff);
  const filled = Math.min(staff, cap);
  const openShown = Math.min(open, cap - filled);
  return { filled, open: openShown, more: staff + open - filled - openShown, staffOpen: open };
}
