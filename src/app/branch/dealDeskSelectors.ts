// Read-only views of the Deal Desk (SCREENS §5.3, SIMULATION §11, stage C5b):
// an office's open requests for proposal, the ones waiting on you, its
// contracts and their yearly value, and the summary strip. Nothing here
// mutates GameState.
import { contractsOf, deskWeek } from '../../sim/branch/dealDesk';
import type { Branch, GameState, Rfp } from '../../sim/state';

/** An office's open RFPs: new ones soonest due first, then renewals by due week. */
export function officeRfps(state: GameState, branchId: string): { fresh: Rfp[]; renewals: Rfp[] } {
  const mine = Object.values(state.dealDesk.rfps)
    .filter((r) => r.branchId === branchId)
    .sort((a, b) => a.dueWeek - b.dueWeek || (a.id < b.id ? -1 : 1));
  return {
    fresh: mine.filter((r) => r.kind === 'new'),
    renewals: mine.filter((r) => r.kind === 'renewal'),
  };
}

/** Whether an RFP still needs the player: every new one, and a rival's renewal with no offer. */
export function rfpWaiting(state: GameState, rfp: Rfp): boolean {
  if (rfp.kind === 'new') return true;
  const b = state.businesses[rfp.businessId];
  return b?.vendor?.type === 'rival' && rfp.offer === undefined;
}

/** New RFPs waiting at each office, by office id (map pins, city list, company rows). */
export function newRfpsByBranch(state: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of Object.values(state.dealDesk.rfps)) {
    if (r.kind === 'new') out[r.branchId] = (out[r.branchId] ?? 0) + 1;
  }
  return out;
}

/** An office's contracts: how many and their summed yearly value (contract ARR). */
export function contractTotals(state: GameState, branchId: string): { count: number; arr: number } {
  const list = contractsOf(state, branchId);
  return { count: list.length, arr: list.reduce((sum, b) => sum + (b.contractValue ?? 0), 0) };
}

export interface DealDeskStrip {
  /** RFPs that arrived this week (DeskWeek.arrived). */
  arrived: number;
  won: number;
  lost: number;
  /** Won ÷ (won + lost); undefined before any bid is settled this week. */
  winRate?: number;
  /** Contracts the office holds and their yearly value. */
  contracts: number;
  arr: number;
  /** New RFPs waiting for a bid now. */
  waiting: number;
}

/** The Deal Desk summary strip (SCREENS §5.3). */
export function dealDeskStrip(state: GameState, branch: Branch): DealDeskStrip {
  const desk = deskWeek(state, branch);
  const settled = desk.won + desk.lost;
  const held = contractTotals(state, branch.id);
  return {
    arrived: desk.arrived,
    won: desk.won,
    lost: desk.lost,
    winRate: settled > 0 ? desk.won / settled : undefined,
    contracts: held.count,
    arr: held.arr,
    waiting: officeRfps(state, branch.id).fresh.length,
  };
}
