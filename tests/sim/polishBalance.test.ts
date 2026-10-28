// Polish pass, batch 2 (v0.1.50): balance fixes from the playtest read —
// researchers in pay reviews, counter-offers that a review can't undo, token
// grants, one grant per country from lobbying, startup sales off the mark,
// currencies that no longer all drift to their ceiling, distressed rivals'
// share prices, developed products that don't dominate their base, the
// Compute floor's staffing, office layoffs with severance, and candidates whose
// money switches start off.
import { describe, expect, it } from 'vitest';
import {
  DEPT_REQUIREMENTS,
  EXECUTIVES,
  FX,
  FX_START_INDEX,
  PAY_REVIEW,
  SEVERANCE_WEEKS,
  HOURS_PER_WEEK,
} from '../../src/config/balance';
import { CURRENCIES } from '../../src/data/currencies';
import { EXEC_SEATS } from '../../src/data/executives';
import { PRODUCTS } from '../../src/data/products';
import { updateStaff } from '../../src/sim/branch/staff';
import * as cmd from '../../src/sim/commands';
import { generateExecutive } from '../../src/sim/execCandidates';
import { resignChance } from '../../src/sim/execSeats';
import { runFx } from '../../src/sim/fx';
import { requiredStaff } from '../../src/sim/hq';
import { priceRivalShares } from '../../src/sim/marketRivals';
import { newGame } from '../../src/sim/newGame';
import { reviewedExecSalary, runPayReview } from '../../src/sim/payReviews';
import { developedSpec } from '../../src/sim/products';
import { stream } from '../../src/sim/rng';
import type { Executive } from '../../src/sim/state';
import { yourResearchers } from '../../src/sim/talent';
import { execGame, hire } from '../helpers/executives';
import { addCapital } from '../helpers/mergers';

describe('pay reviews', () => {
  it('raise researchers to market but never cut them', () => {
    const s = execGame(['products']);
    s.company.cash += 10_000_000;
    s.company.paidInCapital += 10_000_000;
    const free = Object.values(s.talent.researchers).find((r) => !r.employer)!;
    expect(cmd.hireResearcher(s, free.id).ok).toBe(true);
    const r = yourResearchers(s)[0]!;
    r.salary = 1_000;
    runPayReview(s);
    expect(r.salary).toBeGreaterThan(1_000);
    const raised = r.salary;
    r.salary = raised * 10;
    runPayReview(s);
    expect(r.salary).toBe(raised * 10);
  });

  it("don't cut an executive's pay for a year after a counter-offer", () => {
    const s = execGame();
    const cfo = hire(s, 'cfo');
    const high = reviewedExecSalary(s) * 2;
    cfo.salary = high;
    cfo.counterWeek = s.clock.week;
    runPayReview(s);
    expect(cfo.salary).toBe(high);
    s.clock.week += PAY_REVIEW.counterHoldWeeks;
    runPayReview(s);
    expect(cfo.salary).toBeLessThan(high);
  });
});

describe('equity grants', () => {
  it('only lower resignation when worth a share of salary', () => {
    const base = { loyalty: 50, salary: 400_000, grants: [] } as unknown as Executive;
    const grant = (shares: number) =>
      ({ ...base, grants: [{ shares, vested: 0, fairValue: 10 }] }) as unknown as Executive;
    const p = resignChance(base, 400_000);
    expect(resignChance(grant(1), 400_000)).toBeCloseTo(p);
    const enough = Math.ceil((EXECUTIVES.grantMinValue * base.salary) / 10);
    expect(resignChance(grant(enough), 400_000)).toBeCloseTo(p * EXECUTIVES.grantMult);
  });
});

describe('lobbying grants', () => {
  it('can be won once per country', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Lobby Lab' });
    addCapital(s, 50_000_000);
    const firm = 'site_cal_lobbyingFirm_parliamentRow';
    expect(cmd.lobbyBlock(s, firm, 'computeSubsidy')).toBeUndefined();
    s.lobbying.campaigns.push({
      id: 'l1',
      firmId: 'parliamentRow',
      campaignId: 'computeSubsidy',
      country: 'CA',
      cost: 1,
      startWeek: 0,
      resolveWeek: 1,
      status: 'won',
    });
    expect(cmd.lobbyBlock(s, firm, 'computeSubsidy')).toMatch(/already won/);
    expect(cmd.lobbyBlock(s, firm, 'fastTrack')).toBeUndefined();
  });
});

describe('currencies', () => {
  it('drift against each other, not all up into the ceiling', () => {
    const s = newGame({ seed: 7, cityId: 'cal', bankName: 'FX Lab' });
    for (let w = 0; w < 520; w++) runFx(s);
    const free = Object.entries(s.fx.level).filter(
      ([c]) => !CURRENCIES[c as keyof typeof CURRENCIES].peggedTo,
    );
    const logMean = free.reduce((sum, [, v]) => sum + Math.log(v!), 0) / free.length;
    expect(Math.exp(logMean)).toBeGreaterThan(FX_START_INDEX * 0.7);
    expect(Math.exp(logMean)).toBeLessThan(FX_START_INDEX * 1.4);
    expect(free.every(([, v]) => v! >= FX.max * FX_START_INDEX)).toBe(false);
  });
});

describe('distressed rivals', () => {
  it('trade toward their asking price', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Market Lab' });
    const bank = Object.values(s.rivals).find((r) => r.listed && r.status === 'active')!;
    expect(bank).toBeDefined();
    bank.status = 'distressed';
    bank.distressedAsk = bank.price * 0.2;
    const before = bank.price;
    for (let i = 0; i < 20; i++) priceRivalShares(s, stream(s, 'market'), 'expansion', 0);
    expect(bank.price).toBeLessThan(before * 0.7);
  });
});

describe('developed products', () => {
  it('Embeddings keep a margin and Enterprise signs fewer prospects', () => {
    const emb = developedSpec({
      id: 'x',
      stars: 3,
      developed: true,
      base: 'batch_api',
      templateId: 'embeddings_api',
      tier: 'low',
    })!;
    expect(emb.unitCost!).toBeLessThan(0.5 * 0.85);
    const ent = developedSpec({
      id: 'y',
      stars: 3,
      developed: true,
      base: 'team',
      templateId: 'enterprise',
    })!;
    expect(ent.takeUpMult).toBeLessThan(1);
    expect(PRODUCTS.batch_api!.unitCost).toBe(0.5);
  });
});

describe('Compute floor', () => {
  it('needs more staff as compute demand grows', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'GPU Lab' });
    s.compute.demandGpus = 0;
    const base = requiredStaff(s, 'treasury');
    s.compute.demandGpus = 20_000;
    expect(requiredStaff(s, 'treasury')).toBeCloseTo(
      base + 20_000 * DEPT_REQUIREMENTS.treasury.perGpu,
    );
  });
});

describe('sales office layoffs', () => {
  it('pay severance for staff let go', () => {
    const s = execGame();
    const branch = Object.values(s.branches)[0]!;
    branch.staff.count = 10;
    branch.staff.target = 7;
    const cost = updateStaff(s, branch);
    expect(branch.staff.count).toBe(7);
    expect(cost).toBeCloseTo(3 * branch.staff.wage * HOURS_PER_WEEK * SEVERANCE_WEEKS);
  });
});

describe('executive candidates', () => {
  it('start with the switches that spend your money or dilute you off', () => {
    const s = execGame();
    const cfo = generateExecutive(s, 'cfo');
    for (const d of EXEC_SEATS.cfo.delegations) expect(cfo.delegations[d.id]).toBe(!d.defaultOff);
    expect(cfo.delegations.shares).toBe(false);
    expect(cfo.delegations.privateInvests).toBe(false);
    expect(cfo.delegations.capital).toBe(true);
  });
});
