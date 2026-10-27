// Sales office guidance (SIMULATION §17.2): the COO moves delegated managers'
// wages and staffing with morale, the CMO their campaign push with awareness
// and the CPO their fees and lineup with the products rating; a switched-off
// part returns to zero. The CFO and CSO rate steps went in schema 22.
import { describe, expect, it } from 'vitest';
import { GUIDANCE } from '../../src/config/balance';
import { PRODUCTS } from '../../src/data/products';
import { delegatedPrice, runDelegation } from '../../src/sim/branch/delegation';
import {
  guidanceMarketingMult,
  guidanceOf,
  guidanceProducts,
  guidanceStaffing,
  runBranchGuidance,
} from '../../src/sim/branchGuidance';
import * as cmd from '../../src/sim/commands';
import { stream } from '../../src/sim/rng';
import { type GameState } from '../../src/sim/state';
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

describe('sales office guidance', () => {
  it('has no CFO or CSO switch, and reads an older save’s guidance without its rate steps', () => {
    const s = execGame();
    hire(s, 'cfo');
    hire(s, 'cro');
    expect(cmd.setExecDelegation(s, 'cfo', 'guidance', true).ok).toBe(false);
    expect(cmd.setExecDelegation(s, 'cro', 'guidance', true).ok).toBe(false);
    expect(cmd.setExecDelegation(s, 'cfo', 'treasury', true).ok).toBe(false);
    s.company.guidance = {
      deposits: 2,
      loans: 1,
      staffing: 1,
      marketing: 0,
      products: -1,
    } as never;
    expect(guidanceOf(s)).toEqual({ staffing: 1, marketing: 0, products: -1 });
  });

  it('moves a delegated manager’s fee prices and leaves rate prices alone', () => {
    const s = execGame();
    const b = Object.values(s.branches)[0]!;
    const price = (id: string) => {
      s.rng.guidanceTest = [1, 2, 3, 4];
      return delegatedPrice(s, b, PRODUCTS[id]!, 100, stream(s, 'guidanceTest'));
    };
    // Plans are priced off the market fee, which the CPO's products step cuts;
    // the Loan Desk's rate no longer moves with guidance.
    const loan = price('sbl');
    const plus = price('plus');
    s.company.guidance = { ...s.company.guidance, products: 2 };
    expect(price('sbl')).toBe(loan);
    expect(price('plus')).toBeLessThan(plus);
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
});
