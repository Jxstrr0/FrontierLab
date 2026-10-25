// Executive delegations (SIMULATION §17.2 table): each routine on its own, run
// through the commands it reuses, with the balance identity intact.
import { describe, expect, it } from 'vitest';
import { DEV_MIN_WEEKLY, EXEC_DELEGATION } from '../../src/config/balance';
import { DEV_TEMPLATES, isDigital } from '../../src/data/devTemplates';
import * as cmd from '../../src/sim/commands';
import { cfoTreasury, cpoDevelopments, ctoDigital } from '../../src/sim/execDelegationsFinance';
import { bestLot, cooExpansion, expansionPlan } from '../../src/sim/execDelegationsGrowth';
import { tileDistance } from '../../src/sim/citygen';
import {
  averageMorale,
  cmoBrand,
  cooBenefits,
  cooBranchOps,
  cooDivision,
  croAppetite,
} from '../../src/sim/execDelegationsPeople';
import { requiredStaff } from '../../src/sim/hq';
import { refreshManagerPool } from '../../src/sim/people';
import type { GameState } from '../../src/sim/state';
import { execGame, hire, identityGap } from '../helpers/executives';

const openFirst = (s: GameState) => {
  const b = Object.values(s.branches)[0]!;
  b.status = 'open';
  b.customers = 2_000;
  return b;
};

/** Fake trailing revenue so budget-capped delegations have room. */
const withRevenue = (s: GameState, weekly: number) => {
  s.history.weekly.push({
    ...(s.history.weekly.at(-1) ?? ({} as never)),
    week: 0,
    revenue: weekly,
  } as never);
};

describe('COO', () => {
  it('branch operations hires the best manager with default delegation', () => {
    const s = execGame();
    const b = openFirst(s);
    refreshManagerPool(s, b.cityId, true);
    const pool = s.people.managerCandidates[b.cityId]!;
    const score = (m: (typeof pool)[number]) =>
      m.skills.people + m.skills.product + m.skills.marketing + m.skills.ethics;
    const best = Math.max(...pool.map(score));
    cooBranchOps(s);
    const mgr = s.people.managers[b.managerId!]!;
    expect(score(mgr)).toBe(best);
    expect(b.delegation).toEqual(EXEC_DELEGATION.cooDelegation);
  });

  it('HR division sets each team to cover its requirement', () => {
    const s = execGame(['finance', 'risk']);
    openFirst(s);
    cooDivision(s);
    for (const id of ['finance', 'risk'] as const) {
      expect(s.departments[id]!.target).toBeGreaterThanOrEqual(Math.min(1, requiredStaff(s, id)));
    }
  });

  it('HR benefits adds a benefit step when morale is below target', () => {
    const s = execGame(['hr']);
    const b = openFirst(s);
    b.staff.morale = 40;
    expect(averageMorale(s).morale).toBeLessThan(EXEC_DELEGATION.moraleTarget);
    cooBenefits(s);
    expect(Object.keys(s.people.benefits).length).toBeGreaterThan(0);
  });
});

describe('CFO treasury', () => {
  it('switches auto-funding on and moves the bond share toward the band', () => {
    const s = execGame();
    openFirst(s);
    s.treasury.autoFunding = false;
    s.company.liquidityRatio = s.treasury.liqTarget + 0.1;
    const share = s.treasury.bondShare;
    cfoTreasury(s);
    expect(s.treasury.autoFunding).toBe(true);
    expect(s.treasury.bondShare).toBeCloseTo(share + EXEC_DELEGATION.bondStep);
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('CPO and CTO developments', () => {
  it('start within the revenue budget, digital needing IT', () => {
    const s = execGame(['products', 'it']);
    withRevenue(s, (DEV_MIN_WEEKLY * 3) / EXEC_DELEGATION.devBudgetShare);
    ctoDigital(s);
    expect(s.products.developments).toHaveLength(1);
    expect(isDigital(DEV_TEMPLATES[s.products.developments[0]!.templateId]!)).toBe(true);
    cpoDevelopments(s);
    expect(s.products.developments).toHaveLength(2);
    const dev = s.products.developments[1]!;
    expect(isDigital(DEV_TEMPLATES[dev.templateId]!)).toBe(false);
    expect(dev.weeklyBudget).toBeLessThanOrEqual(DEV_MIN_WEEKLY * 3);
  });

  it('skip when 1% of revenue is below the minimum budget', () => {
    const s = execGame(['products']);
    withRevenue(s, 1_000);
    cpoDevelopments(s);
    expect(s.products.developments).toHaveLength(0);
  });
});

describe('CMO brand', () => {
  it('starts a city campaign below target and stops it above', () => {
    const s = execGame(['marketing']);
    const b = openFirst(s);
    withRevenue(s, 10_000_000);
    s.world.cities[b.cityId]!.brandAwareness = 0.1;
    cmoBrand(s);
    expect(s.marketing.campaigns.filter((c) => c.targetId === b.cityId)).toHaveLength(1);
    s.world.cities[b.cityId]!.brandAwareness = 0.9;
    cmoBrand(s);
    expect(s.marketing.campaigns).toHaveLength(0);
  });
});

describe('CRO appetite', () => {
  it('steps appetite down when capital is short and up when it is ample', () => {
    const s = execGame();
    s.clock.week = EXEC_DELEGATION.croEveryWeeks * 3;
    s.company.riskAppetite = 3;
    s.company.capitalRatio = 0.08;
    croAppetite(s);
    expect(s.company.riskAppetite).toBe(2);
    s.company.capitalRatio = 0.3;
    croAppetite(s);
    expect(s.company.riskAppetite).toBe(3);
  });

  it('runs only through the seat’s toggle', () => {
    const s = execGame();
    hire(s, 'cro');
    expect(cmd.setExecDelegation(s, 'cro', 'appetite', true).ok).toBe(true);
    expect(cmd.setExecDelegation(s, 'cro', 'nope', true).ok).toBe(false);
  });
});

describe('COO Expansion (§17.2)', () => {
  const setup = () => {
    const s = execGame();
    openFirst(s);
    hire(s, 'coo');
    return s;
  };

  it('builds in a growth city when the spare cash allows, once per cadence', () => {
    const s = setup();
    cmd.setGrowthCity(s, 'cal', true);
    const before = Object.keys(s.branches).length;
    cooExpansion(s);
    expect(Object.keys(s.branches)).toHaveLength(before + 1);
    expect(s.executives.lastExpansionWeek).toBe(s.clock.week);
    const built = Object.values(s.branches).find((b) => b.status === 'fitout')!;
    expect(built.cityId).toBe('cal');
    expect(
      s.events.log.find((e) => e.type === 'NEW_BRANCH' && e.payload.by === 'coo'),
    ).toBeDefined();
    cooExpansion(s);
    expect(Object.keys(s.branches)).toHaveLength(before + 1);
    s.clock.week += EXEC_DELEGATION.expansionEveryWeeks;
    cooExpansion(s);
    expect(Object.keys(s.branches)).toHaveLength(before + 2);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('keeps the cash reserve and does nothing without growth cities', () => {
    const s = setup();
    s.executives.growthCities = {};
    const before = Object.keys(s.branches).length;
    cooExpansion(s);
    expect(Object.keys(s.branches)).toHaveLength(before);
    cmd.setGrowthCity(s, 'cal', true);
    // Weekly costs so high that 8 weeks of them exceed the cash on hand.
    withRevenue(s, s.company.cash);
    s.history.weekly.at(-1)!.netIncome = 0;
    expect(expansionPlan(s, 'cal').blocker).toMatch(/reserve/);
    cooExpansion(s);
    expect(Object.keys(s.branches)).toHaveLength(before);
    // Your own ask ignores the reserve.
    expect(expansionPlan(s, 'cal', false).blocker).toBeUndefined();
  });

  it('picks the busiest free storefront away from your branches', () => {
    const s = setup();
    const lot = bestLot(s, 'cal')!;
    expect(lot.occupant).toBeUndefined();
    const mine = Object.values(s.world.lots).filter((l) => l.occupant?.type === 'player');
    const score = (l: typeof lot) =>
      l.footTraffic *
      Math.min(
        1,
        Math.min(...mine.map((m) => tileDistance(l, m))) / EXEC_DELEGATION.expansionSpacing,
      );
    const best = Math.max(
      ...Object.values(s.world.lots)
        .filter((l) => l.cityId === 'cal' && !l.occupant)
        .map(score),
    );
    expect(score(lot)).toBe(best);
  });

  it('Open now needs a COO, works from another city, and growth cities must be visited', () => {
    const s = execGame();
    expect(cmd.cooOpenBranch(s, 'cal').ok).toBe(false);
    expect(cmd.setGrowthCity(s, 'tor', true).ok).toBe(false);
    hire(s, 'coo');
    s.world.currentCityId = 'tor';
    const r = cmd.cooOpenBranch(s, 'cal');
    expect(r.ok).toBe(true);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('hiring with Expansion on, or switching it on, seeds the growth cities from where you are', () => {
    const s = setup();
    expect(s.executives.growthCities).toEqual({ cal: true });
    cmd.setExecDelegation(s, 'coo', 'expansion', false);
    s.executives.growthCities = {};
    cmd.setExecDelegation(s, 'coo', 'expansion', true);
    expect(s.executives.growthCities).toEqual({ cal: true });
  });
});
