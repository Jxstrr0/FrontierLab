// Builds the tutorial's views of the game (TutorialObs for Part 1, LessonObs
// for Part 2) from the GameState and the open panel, modal and sheet. Pure:
// reads only, so tests can call it on a newGame().
import { FEATURES } from '../../config/balance';
import { basePrice, isOffered } from '../../sim/branch/pricing';
import { ipoChecklist } from '../../sim/equityOffers';
import type { DeptId, GameState, Manager } from '../../sim/state';
import { cityCoverage } from '../city/lotInfo';
import { hqDepts } from '../hq/officeSelectors';
import type { ModalRoute, PanelRoute } from '../store';
import type { LessonObs } from './lessons';
import type { TutorialObs } from './steps';

export function observe(
  s: GameState,
  panel: PanelRoute | null,
  modal: ModalRoute | null,
): TutorialObs {
  const branches = Object.values(s.branches)
    .filter((b) => b.status !== 'closed')
    .map((b) => ({
      id: b.id,
      lotId: b.lotId,
      savings: basePrice(s, b, 'savings'),
      personalLoan: isOffered(b, 'personal_loan'),
      managerId: b.managerId,
      campaigns: Object.entries(b.campaigns)
        .map(([id, level]) => `${id}:${level}`)
        .sort()
        .join(','),
      marketingDelegated: b.delegation.marketing,
    }));
  const own = new Set(branches.map((b) => b.id));
  return {
    panelType: panel?.type ?? null,
    panelBranchId: panel?.type === 'branch' ? panel.branchId : undefined,
    modalType: modal?.type ?? null,
    running: s.clock.speed > 0,
    week: s.clock.week,
    branches,
    loansBooked: s.underwriting.loansBooked,
    pendingApps: Object.values(s.loanDesk.applications).filter((a) => own.has(a.branchId)).length,
  };
}

/**
 * The guide (DESIGN §5.20: the first branch manager): your first branch's
 * manager once hired, else the first candidate in this city's pool.
 */
export function guideOf(s: GameState): Manager | undefined {
  const withManager = Object.values(s.branches)
    .filter((b) => b.managerId && s.people.managers[b.managerId])
    .at(0);
  if (withManager?.managerId) return s.people.managers[withManager.managerId];
  return s.people.managerCandidates[s.world.currentCityId]?.[0];
}

/** Part 2's view (SCREENS §27.2). Mechanics behind a switched-off feature never start a guide. */
export function observeLessons(
  s: GameState,
  panel: PanelRoute | null,
  modal: ModalRoute | null,
  sheet: string | null,
): LessonObs {
  const open = Object.values(s.branches).filter((b) => b.status !== 'closed').length;
  const cover = cityCoverage(s, s.world.currentCityId);
  return {
    panelType: panel?.type ?? null,
    panelTab: panel?.type === 'branch' || panel?.type === 'investmentBank' ? panel.tab : undefined,
    hqDept: shownFloor(s, panel),
    modalType: modal?.type ?? null,
    sheetType: sheet,
    tutorialStep: s.flags.tutorialStep,
    guidesOn: s.settings.guides,
    lessonsDone: s.flags.lessonsDone,
    lesson: s.flags.lesson,
    hqRamp: FEATURES.hq && open > 0 ? s.hq.ramp : 0,
    offices: Object.keys(s.offices).length,
    depts: Object.keys(s.departments) as DeptId[],
    execs: Object.values(s.executives.seats).filter(Boolean).length,
    tier: s.company.tier,
    ipoReady: FEATURES.capitalMarkets && ipoChecklist(s).every((r) => r.ok),
    listed: s.stock.status === 'public' || !!s.stock.ipo,
    cityCovered: FEATURES.multiCity && cover.ours > 0 && cover.full,
    flights: s.world.travel.flights,
    personalCash: FEATURES.personalEmpire ? s.personal.cash : 0,
  };
}

/** The floor an open HQ panel shows (the route's, else the first tab), as HqPanel picks it. */
function shownFloor(s: GameState, panel: PanelRoute | null): DeptId | undefined {
  const hq =
    panel?.type === 'hq' ||
    (panel?.type === 'office' && !!s.world.officeListings[panel.listingId]?.officeId);
  if (!hq) return undefined;
  const depts = hqDepts(s);
  const want = panel?.type === 'hq' ? panel.dept : undefined;
  return want && depts.includes(want) ? want : depts[0];
}
