// Governance (DESIGN §5.13, SIMULATION §15, §22): board votes, regulator caps on
// dividends by tier, the declaration → payment flow (cash, liability, personal
// cash, identity every week), once-a-quarter meetings and CEO pay.
import { describe, expect, it } from 'vitest';
import { BOARD_VOTE, GOVERNANCE, WEEKS_PER_YEAR } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { boardBlocker } from '../../src/sim/governance';
import {
  ceoMarketSalary,
  dividendApproval,
  dividendCapPerShare,
  forShare,
  insiderShare,
  salaryApproval,
} from '../../src/sim/governanceVotes';
import { FOUNDER_ID, issueShares, sharesHeld } from '../../src/sim/shares';
import type { GameState } from '../../src/sim/state';
import { execGame, identityGap } from '../helpers/executives';

/** Sets trailing net income: four quarters of `quarterly` each. */
function withIncome(s: GameState, quarterly: number) {
  s.history.quarterly = [1, 2, 3, 4].map((q) => ({
    endWeek: q * 13,
    year: 2027,
    q: q as 1 | 2 | 3 | 4,
    revenue: quarterly * 3,
    netIncome: quarterly,
    eps: 0,
    roe: 0,
  }));
}

/** dps whose annual payout ratio is `ratio` of trailing net income. */
const dpsFor = (s: GameState, ratio: number) =>
  (ratio * 4 * 1_000_000) / 4 / s.company.sharesOutstanding;

describe('board votes', () => {
  it('forShare = insiders + (1 − insiders) × a', () => {
    expect(forShare(1, 0)).toBe(1);
    expect(forShare(0.4, 0.5)).toBeCloseTo(0.7);
    expect(forShare(0, 0.3)).toBeCloseTo(0.3);
  });

  it('counts the founder and executives as insiders', () => {
    const s = execGame();
    expect(insiderShare(s)).toBe(1);
    const n = s.company.sharesOutstanding;
    issueShares(s, { id: 'fund', name: 'Fund', kind: 'fund' }, n);
    expect(insiderShare(s)).toBeCloseTo(0.5);
    issueShares(s, { id: 'exec_1', name: 'Exec', kind: 'executive' }, n);
    expect(insiderShare(s)).toBeCloseTo(2 / 3);
  });

  it('dividend approval follows the payout curve', () => {
    const s = execGame();
    withIncome(s, -100_000);
    expect(dividendApproval(s, 0)).toBe(BOARD_VOTE.lossZero);
    expect(dividendApproval(s, 0.01)).toBe(BOARD_VOTE.lossPaid);
    withIncome(s, 1_000_000);
    expect(dividendApproval(s, 0)).toBe(BOARD_VOTE.zero);
    expect(dividendApproval(s, dpsFor(s, 0.5))).toBe(BOARD_VOTE.comfortable);
    expect(dividendApproval(s, dpsFor(s, 0.9))).toBeCloseTo(0.5);
    expect(dividendApproval(s, dpsFor(s, 1.2))).toBeCloseTo(BOARD_VOTE.atMax);
    expect(dividendApproval(s, dpsFor(s, 3))).toBeCloseTo(BOARD_VOTE.atMax);
  });

  it('CEO pay approval: market, above market, big raise, weak ROE', () => {
    const s = execGame();
    withIncome(s, 10_000_000); // ROE well above COE
    const market = ceoMarketSalary(s);
    s.governance.ceoSalary = market;
    expect(salaryApproval(s, market)).toBeCloseTo(BOARD_VOTE.atMarket);
    // 20% above market (within the 25% raise allowance): 0.9 − 0.8 × 0.2 = 0.74.
    expect(salaryApproval(s, market * 1.2)).toBeCloseTo(0.74);
    // 50% above market and a raise over 25%: 0.9 − 0.4 − 0.2.
    expect(salaryApproval(s, market * 1.5)).toBeCloseTo(0.3);
    withIncome(s, 0);
    expect(salaryApproval(s, market)).toBeCloseTo(BOARD_VOTE.atMarket - BOARD_VOTE.weakRoePenalty);
  });

  it('outside holders can vote the founder down', () => {
    const s = execGame();
    withIncome(s, 1_000_000);
    issueShares(s, { id: 'fund', name: 'Fund', kind: 'fund' }, s.company.sharesOutstanding * 3);
    const r = cmd.holdBoardMeeting(s, dpsFor(s, 3), s.governance.ceoSalary);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.meeting.dividend.passed).toBe(false);
    expect(s.governance.pendingDividend).toBeUndefined();
    expect(s.events.log.some((e) => e.type === 'BOARD_MEETING')).toBe(true);
  });
});

describe('regulator caps (§15)', () => {
  it('caps by tier', () => {
    const s = execGame();
    withIncome(s, 1_000_000);
    s.company.tier = 'strong';
    expect(dividendCapPerShare(s)).toBeNull();
    s.company.tier = 'adequate';
    expect(dividendCapPerShare(s)).toBeNull();
    s.company.tier = 'watch';
    expect(dividendCapPerShare(s)).toBeCloseTo(
      (GOVERNANCE.watchCap * 4_000_000) / 4 / s.company.sharesOutstanding,
    );
    s.company.tier = 'restricted';
    expect(dividendCapPerShare(s)).toBe(0);
    s.company.tier = 'critical';
    expect(dividendCapPerShare(s)).toBe(0);
  });

  it('refuses a dividend above the cap', () => {
    const s = execGame();
    withIncome(s, 1_000_000);
    s.company.tier = 'restricted';
    const r = cmd.holdBoardMeeting(s, 0.01, s.governance.ceoSalary);
    expect(r.ok).toBe(false);
    expect(cmd.holdBoardMeeting(s, 0, s.governance.ceoSalary).ok).toBe(true);
  });
});

describe('dividend declaration and payment', () => {
  it('moves retained earnings to a liability, then pays cash and personal cash', () => {
    const s = execGame();
    advanceWeeks(s, 1);
    withIncome(s, 2_000_000);
    s.company.tier = 'strong';
    const dps = 0.05;
    const total = dps * s.company.sharesOutstanding;
    const re = s.company.retainedEarnings;
    const r = cmd.holdBoardMeeting(s, dps, s.governance.ceoSalary);
    expect(r.ok && r.meeting.dividend.passed).toBe(true);
    expect(s.company.retainedEarnings).toBeCloseTo(re - total);
    expect(balanceSheet(s).dividendsPayable).toBeCloseTo(total);
    expect(identityGap(s)).toBeLessThan(1);
    expect(s.incidents.active.some((i) => i.type === 'DIVIDEND_DUE')).toBe(true);
    const declared = s.events.log.find((e) => e.type === 'DIVIDEND_DECLARED')!;
    expect(declared.payload.prevDps).toBe(0);
    expect(declared.payload.total).toBeCloseTo(total);

    const payWeek = s.governance.pendingDividend!.payWeek;
    const founder = sharesHeld(s, FOUNDER_ID);
    while (s.clock.week < payWeek - 1) {
      advanceWeeks(s, 1);
      expect(identityGap(s)).toBeLessThan(1);
      expect(s.governance.pendingDividend).toBeDefined();
    }
    const personal = s.personal.cash;
    advanceWeeks(s, 1);
    expect(s.governance.pendingDividend).toBeUndefined();
    expect(balanceSheet(s).dividendsPayable).toBe(0);
    const paid = s.history.weekly.at(-1)!.cashFlow.financing;
    expect(paid).toBeCloseTo(-total);
    // Founder dividend plus one week of CEO salary.
    expect(s.personal.cash - personal).toBeCloseTo(
      founder * dps + s.governance.ceoSalary / WEEKS_PER_YEAR,
    );
    expect(identityGap(s)).toBeLessThan(1);
    expect(s.events.log.some((e) => e.type === 'DIVIDEND_PAID')).toBe(true);
  });

  it('meets once per quarter and needs an Executive floor', () => {
    const s = execGame();
    expect(boardBlocker(s)).toBeUndefined();
    expect(cmd.holdBoardMeeting(s, 0, s.governance.ceoSalary).ok).toBe(true);
    expect(cmd.holdBoardMeeting(s, 0, s.governance.ceoSalary).ok).toBe(false);
    advanceWeeks(s, 14);
    expect(boardBlocker(s)).toBeUndefined();
    delete s.departments.executive;
    expect(cmd.holdBoardMeeting(s, 0, s.governance.ceoSalary).ok).toBe(false);
  });

  it('keeps the last meetingsKept meetings', () => {
    const s = execGame();
    for (let i = 0; i < GOVERNANCE.meetingsKept + 2; i++) {
      cmd.holdBoardMeeting(s, 0, s.governance.ceoSalary);
      advanceWeeks(s, 13);
    }
    expect(s.governance.meetings.length).toBe(GOVERNANCE.meetingsKept);
  });
});

describe('CEO salary (§22)', () => {
  it('pays salary/52 into personal cash each week and an approved raise sticks', () => {
    const s = execGame();
    const cash = s.personal.cash;
    advanceWeeks(s, 1);
    expect(s.personal.cash - cash).toBeCloseTo(s.governance.ceoSalary / WEEKS_PER_YEAR);
    const raise = s.governance.ceoSalary + BOARD_VOTE.ceoStep;
    const r = cmd.holdBoardMeeting(s, 0, raise);
    expect(r.ok && r.meeting.salary.passed).toBe(true);
    expect(s.governance.ceoSalary).toBe(raise);
    expect(identityGap(s)).toBeLessThan(1);
  });
});
