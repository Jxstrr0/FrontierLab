// Direction dials (SIMULATION §17.2, SCREENS §10.1): the CSO's posture
// ceiling, the COO's cash reserve and the CPO's product focus are settings the
// routines read and the commands only accept the stops; the CPO's Models
// reaches data vendors in any office city; Research talent hires from the open
// market within the budget; migration 28 → 29 fills the defaults.
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION, RESEARCHERS } from '../../src/config/balance';
import { BUREAU_PACKAGES } from '../../src/data/bureaus';
import { DEV_TEMPLATES, isDigital } from '../../src/data/devTemplates';
import { PRODUCTS } from '../../src/data/products';
import * as cmd from '../../src/sim/commands';
import { cpoDevelopments, cpoModels, nextDevelopment } from '../../src/sim/execDelegationsFinance';
import { expansionNext, expansionReserve } from '../../src/sim/execDelegationsGrowth';
import { croAppetite, posturePlan } from '../../src/sim/execDelegationsPeople';
import { cpoTalent, talentPlan } from '../../src/sim/execDelegationsResearch';
import { migrations } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { allResearchers, yourResearchers } from '../../src/sim/talent';
import { execGame, hire, identityGap } from '../helpers/executives';

const withRevenue = (s: GameState, weekly: number) => {
  s.history.weekly.push({
    ...(s.history.weekly.at(-1) ?? ({} as never)),
    week: 0,
    revenue: weekly,
    netIncome: weekly * 0.9,
  } as never);
};

describe('dial commands', () => {
  it('accept only the stops', () => {
    const s = execGame();
    expect(cmd.setPostureCeiling(s, 5).ok).toBe(true);
    expect(s.executives.postureCeiling).toBe(5);
    expect(cmd.setPostureCeiling(s, 2).ok).toBe(false);
    expect(cmd.setExpansionReserve(s, 26).ok).toBe(true);
    expect(s.executives.expansionReserveWeeks).toBe(26);
    expect(cmd.setExpansionReserve(s, 10).ok).toBe(false);
    expect(cmd.setDevFocus(s, 'lending').ok).toBe(true);
    expect(s.executives.devFocus).toBe('lending');
    expect(cmd.setDevFocus(s, 'nope' as never).ok).toBe(false);
  });
});

describe('CSO posture ceiling', () => {
  it('steps up only to the ceiling while Strong, and always down when weak', () => {
    const s = execGame();
    hire(s, 'cro');
    s.clock.week = EXEC_DELEGATION.croEveryWeeks * 3;
    s.company.tier = 'strong';
    s.company.riskAppetite = 3;
    cmd.setPostureCeiling(s, 3);
    croAppetite(s);
    expect(s.company.riskAppetite).toBe(3);
    expect(posturePlan(s, 3).next).toBe('hold');
    cmd.setPostureCeiling(s, 5);
    expect(posturePlan(s, 5).next).toBe('up');
    croAppetite(s);
    croAppetite(s);
    expect(s.company.riskAppetite).toBe(5);
    s.company.tier = 'watch';
    expect(posturePlan(s, 5).next).toBe('down');
    croAppetite(s);
    expect(s.company.riskAppetite).toBe(4);
  });

  it('defaults to the old fixed ceiling', () => {
    const s = execGame();
    expect(s.executives.postureCeiling).toBe(EXEC_DELEGATION.croMaxAppetite);
  });
});

describe('COO cash reserve', () => {
  it('scales the reserve with the dial and reports the next move', () => {
    const s = execGame();
    hire(s, 'coo');
    withRevenue(s, 100_000);
    const base = expansionReserve(s);
    expect(base).toBeGreaterThan(0);
    cmd.setExpansionReserve(s, 26);
    expect(expansionReserve(s)).toBeCloseTo((base * 26) / 8, 6);
    const next = expansionNext(s);
    expect(next.reserve).toBeCloseTo(expansionReserve(s), 6);
    expect(next.plan !== undefined || next.blocker !== undefined).toBe(true);
  });
});

describe('CPO product focus', () => {
  it('picks the focus category first, then falls back to the rest', () => {
    const s = execGame(['products']);
    withRevenue(s, 5_000_000);
    cmd.setDevFocus(s, 'lending');
    const plan = nextDevelopment(s, 'lending');
    expect(plan.inFocus).toBe(true);
    expect(PRODUCTS[plan.template!.base!]!.category).toBe('lending');
    cpoDevelopments(s);
    expect(s.products.developments[0]!.templateId).toBe(plan.template!.id);
    // Mark every API template developed: the next pick comes from another category.
    for (const t of Object.values(DEV_TEMPLATES)) {
      if (isDigital(t) || PRODUCTS[t.base!]!.category !== 'lending') continue;
      s.products.catalog[`dev_${t.id}`] = { templateId: t.id } as never;
    }
    const after = nextDevelopment(s, 'lending');
    expect(after.inFocus).toBe(false);
    expect(after.template).toBeDefined();
    expect(PRODUCTS[after.template!.base!]!.category).not.toBe('lending');
  });
});

describe('CPO Models across office cities', () => {
  it('reaches a data vendor in an office city when you are elsewhere', () => {
    const s = execGame(['products']);
    const b = Object.values(s.branches)[0]!;
    b.status = 'open';
    s.world.currentCityId = 'van';
    const pkg = Object.values(BUREAU_PACKAGES).find((p) => p.bureau === 'Northscore')!;
    expect(cmd.reachableBureaus(s, 'player')).not.toContain('Northscore');
    expect(cmd.reachableBureaus(s, 'cpo')).toContain('Northscore');
    expect(cmd.buyBureauModel(s, pkg.id, 'player').ok).toBe(false);
    expect(cmd.buyBureauModel(s, pkg.id, 'cpo').ok).toBe(true);
  });

  it('the routine never touches rivals or cities without an office', () => {
    const s = execGame(['products']);
    hire(s, 'cpo');
    s.world.currentCityId = 'van';
    const before = s.underwriting.activeModelId;
    cpoModels(s);
    // Calgary's office is not open yet, so nothing is reachable: no change.
    expect(s.underwriting.activeModelId).toBe(before);
  });
});

describe('CPO Research talent', () => {
  const setup = () => {
    const s = execGame(['products']);
    hire(s, 'cpo');
    s.clock.week = EXEC_DELEGATION.talentEveryWeeks * 5;
    return s;
  };

  it('waits without revenue, then hires the best free researcher within budget', () => {
    const s = setup();
    expect(talentPlan(s).pick).toBeUndefined();
    cpoTalent(s);
    expect(yourResearchers(s)).toHaveLength(0);
    withRevenue(s, 2_000_000);
    const plan = talentPlan(s);
    expect(plan.pick).toBeDefined();
    expect(plan.pick!.employer).toBeUndefined();
    const bestFree = Math.max(
      ...allResearchers(s)
        .filter((r) => !r.employer)
        .map((r) => r.stars),
    );
    expect(plan.pick!.stars).toBe(bestFree);
    cpoTalent(s);
    expect(yourResearchers(s)).toHaveLength(1);
    expect(yourResearchers(s)[0]!.id).toBe(plan.pick!.id);
    // A free agent has no signing bonus: cash moves with the weekly payroll, not at the hire.
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('keeps researcher pay inside the budget share and the team under the cap', () => {
    const s = setup();
    withRevenue(s, 2_000_000);
    const budget = talentPlan(s).budget;
    for (let w = 0; w < 40; w++) {
      s.clock.week += EXEC_DELEGATION.talentEveryWeeks;
      cpoTalent(s);
    }
    const payroll = yourResearchers(s).reduce((n, r) => n + r.salary, 0);
    expect(payroll).toBeLessThanOrEqual(budget);
    expect(yourResearchers(s).length).toBeLessThanOrEqual(RESEARCHERS.maxTeam);
    expect(yourResearchers(s).length).toBeGreaterThan(1);
  });

  it('runs only off the cadence weeks and through the toggle', () => {
    const s = setup();
    withRevenue(s, 2_000_000);
    s.clock.week += 1;
    cpoTalent(s);
    expect(yourResearchers(s)).toHaveLength(0);
    expect(s.executives.seats.cpo!.delegations.talent).toBe(true);
  });
});

describe('migration 28 → 29', () => {
  it('fills the new dials with the old fixed behaviour', () => {
    const s = execGame();
    const raw = s as unknown as { schemaVersion: number; executives: Record<string, unknown> };
    delete raw.executives.postureCeiling;
    delete raw.executives.expansionReserveWeeks;
    delete raw.executives.devFocus;
    raw.schemaVersion = 28;
    const out = migrations[28]!(raw as never) as unknown as GameState;
    expect(out.executives.postureCeiling).toBe(EXEC_DELEGATION.croMaxAppetite);
    expect(out.executives.expansionReserveWeeks).toBe(EXEC_DELEGATION.expansionReserveWeeks);
    expect(out.executives.devFocus).toBe('any');
    expect(SCHEMA_VERSION).toBe(29);
  });
});
