// Builds the tutorial's view of the game (TutorialObs) from the GameState and
// the open panel and modal. Pure: reads only, so tests can call it on a newGame().
import { basePrice, isOffered } from '../../sim/branch/pricing';
import type { GameState, Manager } from '../../sim/state';
import type { ModalRoute, PanelRoute } from '../store';
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
