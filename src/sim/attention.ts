// "Where to look" (SCREENS §24): a ranked read-only list of what most needs
// your attention, for a player who runs the top of the bank and leaves the
// branches to managers. Each item names the problem, how bad it is and the
// screen to open. Pure: reads state, mutates nothing. Thresholds in
// ATTENTION (balance.ts); the capital tiers and the CRO's loss target are the
// ones the rest of the sim already uses.
import { ATTENTION, EXEC_DELEGATION, GRAND_OPENING_WEEKS } from '../config/balance';
import { CITIES } from '../data/cities';
import { EXEC_SEAT_ORDER, EXEC_SEATS } from '../data/executives';
import type { DeptId } from '../data/types';
import { staffNeeded } from './branch/staff';
import { averageMorale, companyLossRate } from './execDelegationsPeople';
import { hasExecFloor } from './execSeats';
import type { Branch, GameState } from './state';

export type AttentionTone = 'bad' | 'warn' | 'info';

/** Where to go: the app maps these to its panels and modals. */
export type AttentionRoute =
  | { kind: 'company' }
  | { kind: 'branch'; branchId: string }
  | { kind: 'branches' }
  | { kind: 'hq'; dept?: DeptId }
  | { kind: 'incidents' };

export interface AttentionItem {
  id: string;
  tone: AttentionTone;
  /** Higher sorts first. */
  weight: number;
  title: string;
  detail: string;
  route: AttentionRoute;
}

const openBranches = (state: GameState): Branch[] =>
  Object.values(state.branches).filter((b) => b.status === 'open');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 'es'}`;

/** Every current issue, worst first; empty when the bank looks healthy. */
export function attentionItems(state: GameState): AttentionItem[] {
  const items: AttentionItem[] = [];
  const open = openBranches(state);

  // Capital tier.
  const tier = state.company.tier;
  if (tier === 'watch' || tier === 'restricted' || tier === 'critical') {
    const bad = tier !== 'watch';
    items.push({
      id: 'capital',
      tone: bad ? 'bad' : 'warn',
      weight: bad ? 100 : 70,
      title: `Capital ratio at ${tier[0]!.toUpperCase()}${tier.slice(1)}`,
      detail: bad
        ? 'Lending and growth are throttled until the ratio recovers.'
        : 'Funding costs more and dividends are capped while it stays here.',
      route: { kind: 'company' },
    });
  }

  // Open cases waiting on you.
  const cases = state.incidents.active.length;
  if (cases > 0) {
    items.push({
      id: 'cases',
      tone: 'bad',
      weight: 90,
      title: `${cases} open case${cases === 1 ? '' : 's'}`,
      detail: 'Unanswered cases take their worst option at the deadline.',
      route: { kind: 'incidents' },
    });
  }

  // Liquidity under target.
  const liq = state.company.liquidityRatio;
  if (liq !== null && liq < state.treasury.liqTarget - ATTENTION.liqBand) {
    items.push({
      id: 'liquidity',
      tone: state.treasury.freeze ? 'bad' : 'warn',
      weight: state.treasury.freeze ? 85 : 60,
      title: 'Liquidity under target',
      detail: state.treasury.freeze
        ? 'The funding market has frozen; Treasury is leaning on the central bank.'
        : 'Treasury has less quick cash than its target; it will borrow to make it up.',
      route: { kind: 'hq', dept: state.departments.treasury ? 'treasury' : undefined },
    });
  }

  // Loan applications about to expire.
  const expiring = Object.values(state.loanDesk.applications).filter(
    (a) => a.expiresWeek <= state.clock.week + 1,
  );
  if (expiring.length > 0) {
    const byBranch: Record<string, number> = {};
    for (const a of expiring) byBranch[a.branchId] = (byBranch[a.branchId] ?? 0) + 1;
    const worst = Object.entries(byBranch).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]!;
    items.push({
      id: 'applications',
      tone: 'warn',
      weight: 65,
      title: `${expiring.length} loan application${expiring.length === 1 ? '' : 's'} expiring`,
      detail: `Undecided applications lapse at the weekly close. Most at ${state.branches[worst[0]]?.name ?? 'a branch'}.`,
      route: { kind: 'branch', branchId: worst[0] },
    });
  }

  // Branches losing money for several weeks running, past their grand opening.
  const losing = open.filter((b) => {
    const recent = b.pnl.slice(-ATTENTION.lossWeeks);
    return (
      b.grandOpeningWeeksLeft === 0 &&
      b.pnl.length >= GRAND_OPENING_WEEKS + ATTENTION.lossWeeks &&
      recent.length === ATTENTION.lossWeeks &&
      recent.every((w) => w.income < 0)
    );
  });
  if (losing.length > 0) {
    const worst = [...losing].sort(
      (a, b) => (a.pnl.at(-1)?.income ?? 0) - (b.pnl.at(-1)?.income ?? 0),
    )[0]!;
    items.push({
      id: 'losses',
      tone: 'warn',
      weight: 55,
      title: `${plural(losing.length, 'branch')} losing money`,
      detail: `${ATTENTION.lossWeeks} weeks in the red. Worst: ${worst.name}.`,
      route: losing.length === 1 ? { kind: 'branch', branchId: worst.id } : { kind: 'branches' },
    });
  }

  // Poor ratings.
  const poor = open.filter((b) => b.ratings.overall < ATTENTION.lowRating);
  if (poor.length > 0) {
    const worst = [...poor].sort((a, b) => a.ratings.overall - b.ratings.overall)[0]!;
    items.push({
      id: 'ratings',
      tone: 'warn',
      weight: 50,
      title: `${plural(poor.length, 'branch')} rated under ${ATTENTION.lowRating}`,
      detail: `Customers are leaving. Lowest: ${worst.name} at ${worst.ratings.overall.toFixed(1)}.`,
      route: poor.length === 1 ? { kind: 'branch', branchId: worst.id } : { kind: 'branches' },
    });
  }

  // Understaffed branches.
  const short = open.filter((b) => b.staff.count < staffNeeded(b));
  if (short.length > 0) {
    items.push({
      id: 'staffing',
      tone: 'warn',
      weight: 45,
      title: `${plural(short.length, 'branch')} understaffed`,
      detail:
        'Queues grow and the service rating slips. A manager with Staffing delegated fixes this.',
      route: short.length === 1 ? { kind: 'branch', branchId: short[0]!.id } : { kind: 'branches' },
    });
  }

  // Loss rate above the CRO's ceiling.
  const loss = companyLossRate(state);
  if (loss > EXEC_DELEGATION.croMaxLoss) {
    items.push({
      id: 'lossRate',
      tone: 'warn',
      weight: 48,
      title: `Loan losses at ${(loss * 100).toFixed(1)}% a year`,
      detail: 'Above the 1.2% ceiling. Turn risk appetite down or buy a better bureau model.',
      route: { kind: 'hq', dept: state.departments.risk ? 'risk' : undefined },
    });
  }

  // Morale.
  const { morale } = averageMorale(state);
  if (open.length > 0 && morale < ATTENTION.lowMorale) {
    items.push({
      id: 'morale',
      tone: 'warn',
      weight: 40,
      title: `Average morale ${Math.round(morale)}`,
      detail: 'Staff quit and service suffers under 50. Wages and benefits lift it.',
      route: { kind: 'hq', dept: state.departments.hr ? 'hr' : undefined },
    });
  }

  // Branches without a manager.
  const unmanaged = open.filter((b) => !b.managerId);
  if (unmanaged.length > 0) {
    items.push({
      id: 'managers',
      tone: 'info',
      weight: 30,
      title: `${plural(unmanaged.length, 'branch')} without a manager`,
      detail: 'Every decision there is yours until one is hired.',
      route:
        unmanaged.length === 1
          ? { kind: 'branch', branchId: unmanaged[0]!.id }
          : { kind: 'branches' },
    });
  }

  // Empty executive seats and switched-off delegations.
  if (hasExecFloor(state)) {
    const empty = EXEC_SEAT_ORDER.filter((seat) => !state.executives.seats[seat]);
    if (empty.length > 0) {
      items.push({
        id: 'seats',
        tone: 'info',
        weight: 25,
        title: `${empty.length} executive seat${empty.length === 1 ? '' : 's'} empty`,
        detail: `${empty.map((s) => EXEC_SEATS[s].short).join(', ')}: nobody is running those delegations.`,
        route: { kind: 'hq', dept: 'executive' },
      });
    }
    let off = 0;
    for (const seat of EXEC_SEAT_ORDER) {
      const exec = state.executives.seats[seat];
      if (exec) for (const d of EXEC_SEATS[seat].delegations) if (!exec.delegations[d.id]) off += 1;
    }
    if (off > 0) {
      items.push({
        id: 'delegations',
        tone: 'info',
        weight: 20,
        title: `${off} delegation${off === 1 ? '' : 's'} switched off`,
        detail: 'Those decisions still come to you.',
        route: { kind: 'hq', dept: 'executive' },
      });
    }
  }

  // Low awareness in a city with branches.
  const quiet = [...new Set(open.map((b) => b.cityId))]
    .filter((c) => (state.world.cities[c]?.brandAwareness ?? 0) < ATTENTION.lowAwareness)
    .sort();
  if (quiet.length > 0) {
    items.push({
      id: 'awareness',
      tone: 'info',
      weight: 15,
      title: `Few people know you in ${quiet.length === 1 ? (CITIES[quiet[0]!]?.name ?? quiet[0]) : `${quiet.length} cities`}`,
      detail: 'Brand awareness under 20%. Campaigns bring prospects through the door.',
      route: { kind: 'hq', dept: state.departments.marketing ? 'marketing' : undefined },
    });
  }

  const order: Record<AttentionTone, number> = { bad: 2, warn: 1, info: 0 };
  return items.sort((a, b) => order[b.tone] - order[a.tone] || b.weight - a.weight);
}
