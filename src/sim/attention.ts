// "Where to look" (SCREENS §24): a ranked read-only list of what most needs
// your attention, for a player who runs the top of the bank and leaves the
// branches to managers. Each item names the problem, how bad it is and the
// screen to open. Pure: reads state, mutates nothing. Thresholds in
// ATTENTION (balance.ts); the safety tiers and the CRO's loss target are the
// ones the rest of the sim already uses.
import { ATTENTION, EXEC_DELEGATION, GRAND_OPENING_WEEKS, LIQ_MIN, SPOT } from '../config/balance';
import { CITIES } from '../data/cities';
import { EXEC_SEAT_ORDER, EXEC_SEATS } from '../data/executives';
import type { DeptId } from '../data/types';
import { staffNeeded } from './branch/staff';
import { cashCoverWeeks } from './cashCover';
import { averageMorale, companyLossRate } from './execDelegationsPeople';
import { hasExecFloor } from './execSeats';
import type { Branch, GameState } from './state';
import { pauseBlock } from './safety';

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

const offices = (n: number) => `${n} sales office${n === 1 ? '' : 's'}`;

/** Every current issue, worst first; empty when the bank looks healthy. */
export function attentionItems(state: GameState): AttentionItem[] {
  const items: AttentionItem[] = [];
  const open = openBranches(state);

  // Safety tier (C7a) and a mandated pause.
  const block = pauseBlock(state);
  if (block) {
    items.push({
      id: 'pause',
      tone: 'bad',
      weight: 110,
      title: state.company.pause?.reason === 'revoked' ? 'Licence revoked' : 'Mandated pause',
      detail: block,
      route: { kind: 'company' },
    });
  }
  const tier = state.company.tier;
  if (tier === 'watch' || tier === 'restricted' || tier === 'critical') {
    const bad = tier !== 'watch';
    items.push({
      id: 'capital',
      tone: bad ? 'bad' : 'warn',
      weight: bad ? 100 : 70,
      title: `Safety ratio at ${tier[0]!.toUpperCase()}${tier.slice(1)}`,
      detail: bad
        ? 'The regulator is throttling growth. Staff up the Safety & Alignment floor.'
        : 'Dividends are capped and audits get likelier. Staff up the Safety & Alignment floor.',
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

  // Corporate cash: below zero, or thin against running costs.
  const cover = cashCoverWeeks(state);
  if (state.company.cash < 0) {
    items.push({
      id: 'cash',
      tone: 'bad',
      weight: 95,
      title: 'Corporate cash below zero',
      detail: `Four weeks in the red with no credit to draw is insolvency (week ${state.company.negativeCashWeeks + 1} now).`,
      route: { kind: 'company' },
    });
  } else if (cover !== null && cover < ATTENTION.cashCoverWeeks) {
    items.push({
      id: 'cash',
      tone: 'warn',
      weight: 65,
      title: `Cash covers ${cover < 1 ? 'under 1 week' : `${Math.floor(cover)} week${Math.floor(cover) === 1 ? '' : 's'}`} of costs`,
      detail:
        'Wages, rent and salaries would use it up in that time; hold off on builds until there is more cover.',
      route: { kind: 'company' },
    });
  }

  // Compute (C4c): an outage, a capacity crunch, or paying for emergency burst.
  const c = state.compute;
  const computeRoute = state.departments.treasury
    ? ({ kind: 'hq', dept: 'treasury' } as const)
    : ({ kind: 'company' } as const);
  if (c.outageWeeksLeft > 0) {
    items.push({
      id: 'compute',
      tone: 'bad',
      weight: 88,
      title: 'Outage: too little compute',
      detail:
        'Demand has outrun your GPUs for weeks and customers are leaving. Reserve GPUs or build a data center.',
      route: computeRoute,
    });
  } else if (c.crunchWeeks > 0) {
    items.push({
      id: 'compute',
      tone: 'bad',
      weight: 84,
      title: 'Capacity crunch',
      detail:
        'New customers are on a waitlist. Reserve GPUs on the Compute floor before it turns into an outage.',
      route: computeRoute,
    });
  } else if (c.burstStigmaWeeks >= SPOT.stigmaWeeks) {
    items.push({
      id: 'compute',
      tone: 'warn',
      weight: 62,
      title: 'Buying emergency compute',
      detail: 'Spot ran out, so burst GPUs cost a premium. Reserved GPUs are cheaper.',
      route: computeRoute,
    });
  }

  // Liquidity: a freeze, under the minimum, or under target with nothing topping it up.
  const liq = state.company.liquidityRatio;
  const t = state.treasury;
  const liqRoute = {
    kind: 'hq',
    dept: state.departments.treasury ? 'treasury' : undefined,
  } as const;
  if (t.freeze) {
    items.push({
      id: 'liquidity',
      tone: 'bad',
      weight: 85,
      title: 'Spending frozen',
      detail:
        'Liquid assets are under the minimum and auto-funding is off, so new spending is on hold.',
      route: liqRoute,
    });
  } else if (liq !== null && liq < LIQ_MIN) {
    items.push({
      id: 'liquidity',
      tone: 'warn',
      weight: 70,
      title: 'Liquidity under the minimum',
      detail: 'Drawing on the emergency credit line to cover it, which costs reputation.',
      route: liqRoute,
    });
  } else if (liq !== null && !t.autoFunding && liq < t.liqTarget - ATTENTION.liqBand) {
    items.push({
      id: 'liquidity',
      tone: 'warn',
      weight: 60,
      title: 'Liquidity under target',
      detail:
        'Auto-funding is off, so nothing tops it up: borrow on the Compute floor or turn auto-funding on.',
      route: liqRoute,
    });
  }

  // New RFPs about to expire (C5b).
  const expiring = Object.values(state.dealDesk.rfps).filter(
    (a) => a.kind === 'new' && a.dueWeek <= state.clock.week + 1,
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
      title: `${expiring.length} proposal request${expiring.length === 1 ? '' : 's'} expiring`,
      detail: `RFPs without a bid lapse at the weekly close. Most at ${state.branches[worst[0]]?.name ?? 'a sales office'}.`,
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
      title: `${offices(losing.length)} losing money`,
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
      title: `${offices(poor.length)} rated under ${ATTENTION.lowRating}`,
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
      title: `${offices(short.length)} understaffed`,
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
      title: `Bad debts at ${(loss * 100).toFixed(1)}% a year`,
      detail: 'Above the 1.2% ceiling. Turn launch posture down or license a better data package.',
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
      title: `${offices(unmanaged.length)} without a manager`,
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
