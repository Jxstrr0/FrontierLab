// The founder's desk (CONTENT §22b, 2026-10-30): eight small company cases for
// a lab's first three years. Every case rolls at FOUNDER_DESK.baseP while the
// desk is open (before untilWeek, with an open sales office, no founder case
// pending and gapWeeks since the last), and fires once a game (its spec's
// cooldown is INCIDENTS.onceWeeks). Numbers in incidentParams.ts.
import { FOUNDER_DESK, MANAGER_SALARY_RANGE } from '../../config/balance';
import { INCIDENT_PARAMS, INCIDENT_SPECS } from '../../data/incidents';
import { ownedGpus, spotPrice } from '../compute';
import { bookRaise } from '../equityIpo';
import { investorPool } from '../equityOffers';
import { pushEvent } from '../events';
import { clamp } from '../math';
import { clearManager, managerBaseSalary } from '../payReviews';
import type { Branch, GameState } from '../state';
import { privateValuation } from '../valuation';
import { addEffect } from './effects';
import { incidentScale, maybeNews, num, ratingHit, type IncidentRule } from './helpers';

const P = INCIDENT_PARAMS;
const DESK_KEY = 'FOUNDER_DESK:company';

export const openBranches = (state: GameState): Branch[] =>
  Object.values(state.branches)
    .filter((b) => b.status === 'open')
    .sort((a, b) => (a.id < b.id ? -1 : 1));

/** True while the founder's desk takes cases: early game, an open office, none pending, gap kept. */
export function founderDeskOpen(state: GameState): boolean {
  if (state.clock.week >= FOUNDER_DESK.untilWeek) return false;
  if (openBranches(state).length === 0) return false;
  if (state.incidents.active.some((i) => i.type in FOUNDER_RULES)) return false;
  return (state.incidents.cooldowns[DESK_KEY] ?? 0) <= state.clock.week;
}

/** The desk's weekly chance for a case, 0 when the desk is closed or `when` fails. */
const deskChance = (state: GameState, type: string, when = true): number =>
  founderDeskOpen(state) && when ? (INCIDENT_SPECS[type]?.baseP ?? 0) : 0;

/** Every founder case: the desk rests gapWeeks after one is raised. */
const restDesk = (state: GameState): void => {
  state.incidents.cooldowns[DESK_KEY] = state.clock.week + FOUNDER_DESK.gapWeeks;
};

/** Awareness at every open sales office moves by `delta` (0–1 scale). */
export function bumpAwareness(state: GameState, delta: number, cityId?: string): void {
  for (const b of openBranches(state)) {
    if (cityId && b.cityId !== cityId) continue;
    b.awareness = clamp(b.awareness + delta, 0, 1);
  }
}

const VIRAL_DEMO: IncidentRule = {
  chance: (state) =>
    deskChance(
      state,
      'VIRAL_DEMO',
      openBranches(state).some((b) => b.customers > 0),
    ),
  prepare(state, _scope, data) {
    data.push = P.VIRAL_DEMO.pushCost * incidentScale(state);
  },
  costs: (_s, _scope, data) => ({ push: num(data, 'push'), enjoy: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId) {
    const v = P.VIRAL_DEMO;
    bumpAwareness(state, optionId === 'push' ? v.pushAwareness : v.enjoyAwareness);
  },
};

const FEATURE_REQUEST: IncidentRule = {
  chance: (state) =>
    deskChance(
      state,
      'FEATURE_REQUEST',
      openBranches(state).some((b) => b.customers > 0),
    ),
  prepare(state, _scope, data) {
    data.build = P.FEATURE_REQUEST.buildCost * incidentScale(state);
  },
  costs: (_s, _scope, data) => ({ build: num(data, 'build'), promise: 0, decline: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId) {
    const f = P.FEATURE_REQUEST;
    if (optionId === 'build')
      ratingHit(state, 'company', 'products', f.buildProducts, f.buildWeeks);
    else if (optionId === 'promise')
      ratingHit(state, 'company', 'products', f.promiseProducts, f.promiseWeeks);
  },
};

/** The angel's terms: new shares for angelPct of the lab at the private valuation less the discount. */
function angelTerms(state: GameState) {
  const outstanding = state.company.sharesOutstanding;
  const shares = Math.round(outstanding * FOUNDER_DESK.angelPct);
  const price =
    (privateValuation(state) / Math.max(1, outstanding)) * (1 - FOUNDER_DESK.angelDiscount);
  return { shares, price, raised: shares * price };
}

const ANGEL_OFFER: IncidentRule = {
  // Only a private lab that isn't mid-IPO, once investors can value it.
  chance: (state) =>
    deskChance(
      state,
      'ANGEL_OFFER',
      state.stock.status === 'private' && !state.stock.ipo && angelTerms(state).raised > 0,
    ),
  roll(state, _scope, rng) {
    const { shares, price, raised } = angelTerms(state);
    return {
      shares,
      price,
      raised,
      pct: FOUNDER_DESK.angelPct,
      investor: rng.pick(investorPool(state)),
    };
  },
  costs: () => ({ take: 0, decline: 0 }),
  onRaise: restDesk,
  apply(state, inc, optionId) {
    if (optionId !== 'take') return;
    const investor = String(inc.data.investor ?? 'An angel investor');
    const shares = num(inc.data, 'shares');
    const price = num(inc.data, 'price');
    const gross = shares * price;
    const id = `angel:${investor.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    bookRaise(
      state,
      { id, name: investor, kind: 'fund' },
      {
        shares,
        price,
        gross,
        feeRate: 0,
        fee: 0,
        net: gross,
      },
    );
    state.stock.placements.push({ week: state.clock.week, shares, price, investor, raised: gross });
    state.stock.price = privateValuation(state);
    pushEvent(
      state,
      'PLACEMENT',
      { bank: state.meta.bankName, investor, shares, price, raised: gross },
      4,
    );
  },
};

const PRESS_INTERVIEW: IncidentRule = {
  chance: (state) => deskChance(state, 'PRESS_INTERVIEW'),
  costs: () => ({ talk: 0, decline: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId, rng) {
    if (optionId !== 'talk') return;
    const p = P.PRESS_INTERVIEW;
    bumpAwareness(state, p.awareness);
    if (!rng.chance(p.gaffeChance)) return 'The piece ran. The city knows our name now.';
    ratingHit(state, 'company', 'overall', p.gaffeOverall, p.gaffeWeeks);
    return 'The piece ran, with one quote we wish it had not.';
  },
};

/** Open offices with a manager, by id. */
const managed = (state: GameState) => openBranches(state).filter((b) => !!b.managerId);

const MANAGER_POACHED: IncidentRule = {
  chance: (state) =>
    deskChance(
      state,
      'MANAGER_POACHED',
      managed(state).length > 0 && Object.values(state.rivals).some((r) => r.status === 'active'),
    ),
  roll(state, _scope, rng) {
    const b = rng.pick(managed(state));
    const mgr = state.people.managers[b.managerId!]!;
    const rivals = Object.values(state.rivals)
      .filter((r) => r.status === 'active')
      .sort((x, y) => (x.id < y.id ? -1 : 1));
    const local = rivals.filter((r) => r.cities.includes(b.cityId));
    const rival = rng.pick(local.length > 0 ? local : rivals);
    return {
      branchId: b.id,
      branch: b.name,
      manager: mgr.name,
      rival: rival.name,
      raise: mgr.salary * P.MANAGER_POACHED.raiseShare,
    };
  },
  costs: () => ({ counter: 0, release: 0 }),
  onRaise: restDesk,
  apply(state, inc, optionId) {
    const b = state.branches[String(inc.data.branchId)];
    const mgr = b?.managerId ? state.people.managers[b.managerId] : undefined;
    if (!b || !mgr) return 'They had already moved on.';
    if (optionId === 'counter') {
      const cap = managerBaseSalary(state, b.cityId) * MANAGER_SALARY_RANGE[1];
      mgr.salary = Math.round(Math.min(cap, mgr.salary + num(inc.data, 'raise')));
      return `${mgr.name} is staying.`;
    }
    clearManager(state, b);
    return `${mgr.name} has joined ${String(inc.data.rival)}.`;
  },
};

/** This week's compute bill at the burst premium, for a lab that runs on rented GPUs. */
function burstBill(state: GameState): number {
  const c = P.CLOUD_OUTAGE;
  return Math.max(c.minBurst, state.compute.demandGpus * spotPrice(state) * c.burstPremium);
}

const CLOUD_OUTAGE: IncidentRule = {
  // A lab with no GPUs of its own and customers to serve.
  chance: (state) =>
    deskChance(state, 'CLOUD_OUTAGE', ownedGpus(state) <= 0 && state.compute.demandGpus > 0),
  prepare(state, _scope, data) {
    data.burst = burstBill(state);
  },
  costs: (_s, _scope, data) => ({ burst: num(data, 'burst'), ride: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId, rng) {
    if (optionId !== 'ride') return;
    state.compute.outageWeeksLeft = Math.max(
      state.compute.outageWeeksLeft,
      P.CLOUD_OUTAGE.outageWeeks,
    );
    maybeNews(state, 1, rng, 'CLOUD_OUTAGE');
  },
};

const HACKATHON: IncidentRule = {
  chance: (state) => deskChance(state, 'HACKATHON'),
  prepare(state, _scope, data) {
    data.sponsor = P.HACKATHON.sponsorCost * incidentScale(state);
  },
  costs: (_s, _scope, data) => ({ sponsor: num(data, 'sponsor'), pass: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId) {
    if (optionId !== 'sponsor') return;
    const h = P.HACKATHON;
    addEffect(state, 'takeup', 'company', h.takeup, h.takeupWeeks, h.product);
    bumpAwareness(state, h.awareness, state.world.currentCityId);
  },
};

const CAMPUS_CREDITS: IncidentRule = {
  chance: (state) => deskChance(state, 'CAMPUS_CREDITS'),
  prepare(state, _scope, data) {
    data.credits = P.CAMPUS_CREDITS.creditsCost * incidentScale(state);
  },
  costs: (_s, _scope, data) => ({ give: num(data, 'credits'), decline: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId) {
    if (optionId !== 'give') return;
    const c = P.CAMPUS_CREDITS;
    addEffect(state, 'takeup', 'company', c.takeup, c.takeupWeeks, c.product);
  },
};

export const FOUNDER_RULES: Record<string, IncidentRule> = {
  VIRAL_DEMO,
  FEATURE_REQUEST,
  ANGEL_OFFER,
  PRESS_INTERVIEW,
  MANAGER_POACHED,
  CLOUD_OUTAGE,
  HACKATHON,
  CAMPUS_CREDITS,
};
