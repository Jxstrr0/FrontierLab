// Branch guidance (SIMULATION §17.2): the CFO moves delegated managers' deposit
// rates with liquidity, the CRO their loan rates and Loan Desk approvals with
// capital and losses; a switched-off half returns to zero.
import { describe, expect, it } from 'vitest';
import { GUIDANCE } from '../../src/config/balance';
import { PRODUCTS } from '../../src/data/products';
import { delegatedPrice } from '../../src/sim/branch/delegation';
import {
  guidanceRateOffset,
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
    s.company.guidance = { deposits: 2, loans: 2 };
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
    expect(up.company.guidance).toEqual({ deposits: 0, loans: 0 });
    expect(up.executives.seats.cfo!.delegations.guidance).toBe(false);
    expect(up.executives.candidates.coo![0]!.delegations.payReviews).toBe(true);
    expect(up.executives.payPremium).toBeGreaterThan(0);
  });
});
