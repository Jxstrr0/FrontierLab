// Branch guidance (SIMULATION §17.2): the CFO moves delegated managers' deposit
// rates with liquidity, the CRO their loan rates and Loan Desk approvals with
// capital and losses; a switched-off half returns to zero.
import { describe, expect, it } from 'vitest';
import { GUIDANCE } from '../../src/config/balance';
import { PRODUCTS } from '../../src/data/products';
import { delegatedPrice, runDelegation } from '../../src/sim/branch/delegation';
import {
  guidanceMarketingMult,
  guidanceProducts,
  guidanceRateOffset,
  guidanceStaffing,
  guidanceThresholdMult,
  runBranchGuidance,
} from '../../src/sim/branchGuidance';
import * as cmd from '../../src/sim/commands';
import { migrate } from '../../src/sim/save/migrations';
import { stream } from '../../src/sim/rng';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { execGame, hire } from '../helpers/executives';

/** Puts the clock on a guidance week. */
const onCadence = (s: GameState) => {
  s.clock.week = GUIDANCE.everyWeeks * 10;
};

/** The test branch with a hired manager running every area. */
const managed = (s: GameState) => {
  const b = Object.values(s.branches)[0]!;
  const cand = s.people.managerCandidates[b.cityId]![0]!;
  expect(cmd.hireManager(s, b.id, cand.id).ok).toBe(true);
  for (const area of ['staffing', 'products', 'marketing'] as const)
    cmd.setDelegation(s, b.id, area, true);
  b.status = 'open';
  return b;
};

describe('branch guidance', () => {
  it('has the CFO pay savers more while liquidity is short, and trim when flush', () => {
    const s = execGame();
    hire(s, 'cfo');
    onCadence(s);
    s.company.liquidityRatio = s.treasury.liqTarget - 0.05;
    runBranchGuidance(s);
    expect(s.company.guidance.deposits).toBe(1);
    s.company.liquidityRatio = s.treasury.liqTarget + 0.2;
    runBranchGuidance(s);
    runBranchGuidance(s);
    expect(s.company.guidance.deposits).toBe(GUIDANCE.min);
  });

  it('has the CRO tighten lending when capital misses target, up to the cap', () => {
    const s = execGame();
    hire(s, 'cro');
    onCadence(s);
    s.company.capitalRatio = 0.09;
    for (let i = 0; i < 6; i++) runBranchGuidance(s);
    expect(s.company.guidance.loans).toBe(GUIDANCE.max);
    expect(guidanceRateOffset(s, 'loans')).toBeCloseTo(GUIDANCE.max * GUIDANCE.rateStep);
    expect(guidanceThresholdMult(s)).toBeCloseTo(1 - GUIDANCE.thresholdStep * GUIDANCE.max);
  });

  it('returns a half to zero when its delegation is switched off', () => {
    const s = execGame();
    hire(s, 'cro');
    onCadence(s);
    s.company.capitalRatio = 0.09;
    runBranchGuidance(s);
    expect(s.company.guidance.loans).toBe(1);
    expect(cmd.setExecDelegation(s, 'cro', 'guidance', false).ok).toBe(true);
    s.clock.week += 1;
    runBranchGuidance(s);
    expect(s.company.guidance.loans).toBe(0);
  });

  it('moves a delegated manager’s prices', () => {
    const s = execGame();
    const b = Object.values(s.branches)[0]!;
    const price = (id: string) => {
      s.rng.guidanceTest = [1, 2, 3, 4];
      return delegatedPrice(s, b, PRODUCTS[id]!, 100, stream(s, 'guidanceTest'));
    };
    const loan = price('personal_loan');
    const savings = price('savings');
    s.company.guidance = { ...s.company.guidance, deposits: 2, loans: 2 };
    expect(price('personal_loan')).toBeGreaterThan(loan);
    expect(price('savings')).toBeGreaterThanOrEqual(savings);
  });

  it('migrates v14 saves with the new switches off for seated executives', () => {
    const s = execGame();
    hire(s, 'cfo');
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    const ex = raw.executives as GameState['executives'];
    delete ex.seats.cfo!.delegations.guidance;
    delete (ex as Partial<GameState['executives']>).payPremium;
    delete (raw.company as Partial<GameState['company']>).guidance;
    raw.schemaVersion = 14;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.company.guidance).toEqual({
      deposits: 0,
      loans: 0,
      staffing: 0,
      marketing: 0,
      products: 0,
    });
    expect(up.executives.seats.cfo!.delegations.guidance).toBe(false);
    expect(up.executives.candidates.coo![0]!.delegations.payReviews).toBe(true);
    expect(up.executives.payPremium).toBeGreaterThan(0);
  });
  it('has the COO pay and staff more while morale is low, and trim when high', () => {
    const s = execGame();
    hire(s, 'coo');
    const b = managed(s);
    onCadence(s);
    b.staff.morale = GUIDANCE.moraleLow - 10;
    runBranchGuidance(s);
    expect(s.company.guidance.staffing).toBe(1);
    const coo = guidanceStaffing(s);
    expect(coo.wage).toBeCloseTo(1 + GUIDANCE.wageStep);
    // The manager's wage rises with the step.
    s.company.guidance.staffing = 0;
    runDelegation(s, b);
    const base = b.staff.wage;
    s.company.guidance.staffing = GUIDANCE.max;
    runDelegation(s, b);
    expect(b.staff.wage).toBeGreaterThan(base);
    b.staff.morale = GUIDANCE.moraleHigh + 5;
    s.company.guidance.staffing = 0;
    runBranchGuidance(s);
    expect(s.company.guidance.staffing).toBe(-1);
  });

  it('has the CMO push campaigns while brand awareness is low', () => {
    const s = execGame(['marketing']);
    hire(s, 'cmo');
    const b = managed(s);
    onCadence(s);
    s.world.cities[b.cityId]!.brandAwareness = 0.1;
    runBranchGuidance(s);
    runBranchGuidance(s);
    expect(s.company.guidance.marketing).toBe(2);
    expect(guidanceMarketingMult(s)).toBeCloseTo(1 + 2 * GUIDANCE.marketingStep);
    s.world.cities[b.cityId]!.brandAwareness = 0.9;
    for (let i = 0; i < 6; i++) runBranchGuidance(s);
    expect(s.company.guidance.marketing).toBe(GUIDANCE.min);
  });

  it('has the CPO cut fees and widen the lineup while product ratings are weak', () => {
    const s = execGame(['products']);
    hire(s, 'cpo');
    const b = managed(s);
    onCadence(s);
    b.ratings.products = GUIDANCE.productsLow - 1;
    runBranchGuidance(s);
    expect(s.company.guidance.products).toBe(1);
    expect(guidanceProducts(s).fee).toBeCloseTo(1 - GUIDANCE.feeStep);
    const fee = Object.values(PRODUCTS).find((p) => p.priceType !== 'rate')!;
    const priceAt = (step: number) => {
      s.company.guidance.products = step;
      return delegatedPrice(s, b, fee, 100);
    };
    expect(priceAt(GUIDANCE.max)).toBeLessThanOrEqual(priceAt(0));
    b.ratings.products = GUIDANCE.productsHigh;
    s.company.guidance.products = 0;
    runBranchGuidance(s);
    expect(s.company.guidance.products).toBe(-1);
  });

  it('leaves the new parts at zero without the switch or a delegated manager', () => {
    const s = execGame(['marketing', 'products']);
    for (const seat of ['coo', 'cmo', 'cpo'] as const) hire(s, seat);
    onCadence(s);
    // No managers yet: nothing to read, so nothing moves.
    runBranchGuidance(s);
    expect(s.company.guidance).toMatchObject({ staffing: 0, marketing: 0, products: 0 });
    const b = managed(s);
    b.staff.morale = 10;
    runBranchGuidance(s);
    expect(s.company.guidance.staffing).toBe(1);
    expect(cmd.setExecDelegation(s, 'coo', 'guidance', false).ok).toBe(true);
    s.clock.week += 1;
    runBranchGuidance(s);
    expect(s.company.guidance.staffing).toBe(0);
  });

  it('migrates v17 saves with the COO, CMO and CPO switches off for seated executives', () => {
    const s = execGame(['marketing']);
    hire(s, 'coo');
    hire(s, 'cmo');
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    const ex = raw.executives as GameState['executives'];
    delete ex.seats.coo!.delegations.guidance;
    delete ex.seats.cmo!.delegations.guidance;
    for (const c of ex.candidates.cpo ?? []) delete c.delegations.guidance;
    raw.company = { ...(raw.company as object), guidance: { deposits: 1, loans: 0 } };
    raw.schemaVersion = 17;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.company.guidance).toEqual({
      deposits: 1,
      loans: 0,
      staffing: 0,
      marketing: 0,
      products: 0,
    });
    expect(up.executives.seats.coo!.delegations.guidance).toBe(false);
    expect(up.executives.seats.cmo!.delegations.guidance).toBe(false);
    expect(up.executives.candidates.cpo![0]!.delegations.guidance).toBe(true);
  });
});
