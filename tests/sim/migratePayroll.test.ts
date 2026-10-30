// Save migration 32 → 33 (src/sim/save/migrations.ts, owner's review B1: one
// deal per employer): an active staff-plan (payroll) partnership starts its
// 12-week run-off as if released, with the rest of its fee written off, so the
// books stay balanced; one already running off and every student partnership
// are left alone.
import { describe, expect, it } from 'vitest';
import {
  PARTNER_CONTRACT_WEEKS,
  PARTNER_HEALTH,
  PARTNER_RUNOFF_WEEKS,
} from '../../src/config/balance';
import { intangibleAssets } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { postCash } from '../../src/sim/ledger';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import { exportCode, importCode } from '../../src/sim/save/serialize';
import type { GameState, Partnership, Site } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';
import { openScriptedBranch } from '../helpers/scenario';

function game() {
  const s = newGame({ seed: 31, cityId: 'cal', bankName: 'Old Lab' });
  const branchId = openScriptedBranch(s, 'midtown');
  s.company.paidInCapital += 5_000_000;
  s.company.cash += 5_000_000;
  advanceWeeks(s, 2);
  const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'cal');
  const employer = sites.find((x) => x.kind === 'employer')!;
  const university = sites.find((x) => x.kind === 'university')!;
  return { s, branchId, employer, university };
}

/** A staff-plan deal the way a pre-33 save holds it: the fee paid and sitting as an intangible. */
function oldPayrollDeal(s: GameState, site: Site, branchId: string, fee: number): Partnership {
  const p: Partnership = {
    id: `pship_old_${site.id}`,
    siteId: site.id,
    kind: 'payroll',
    hostBranchId: branchId,
    productId: 'team',
    startWeek: s.clock.week,
    termWeeks: PARTNER_CONTRACT_WEEKS,
    fee,
    unamortized: fee,
    balance: 0,
    accounts: 0,
    health: PARTNER_HEALTH.start,
    lowHealthWeeks: 0,
    status: 'active',
  };
  s.partnerships[p.id] = p;
  postCash(s, -fee, 'investing');
  return p;
}

const migrate = (s: GameState) => migrations[32]!(s as never);

describe('save migration 32 → 33', () => {
  it('runs an active staff-plan deal off as released, writing off its fee', () => {
    const { s, branchId, employer } = game();
    const p = oldPayrollDeal(s, employer, branchId, 400_000);
    advanceWeeks(s, 20);
    expect(p.balance).toBeGreaterThan(0);
    expect(p.unamortized).toBeGreaterThan(0);
    expect(intangibleAssets(s)).toBeGreaterThan(0);
    migrate(s);
    expect(p.status).toBe('runoff');
    expect(p.runoffWeeksLeft).toBe(PARTNER_RUNOFF_WEEKS);
    expect(p.unamortized).toBe(0);
    // The written-off fee was the only intangible.
    expect(intangibleAssets(s)).toBe(0);
    const ended = s.events.log.find(
      (e) => e.type === 'PARTNERSHIP_ENDED' && e.payload.partnershipId === p.id,
    );
    expect(ended?.payload.reason).toBe('released');
    expect(identityGap(s)).toBeLessThan(1);
    // The seats fade over the run-off weeks and the deal leaves the book, books balanced.
    for (let w = 0; w < PARTNER_RUNOFF_WEEKS + 1; w++) {
      advanceWeeks(s, 1);
      expect(identityGap(s)).toBeLessThan(1);
    }
    expect(s.partnerships[p.id]).toBeUndefined();
  });

  it('leaves a deal already running off and every student partnership alone', () => {
    const { s, branchId, employer, university } = game();
    // Its fee was written off when it started running off.
    const old = oldPayrollDeal(s, employer, branchId, 0);
    old.status = 'runoff';
    old.runoffWeeksLeft = 5;
    old.balance = 9_000;
    const r = cmd.signPartnership(s, university.id, branchId, 'team', 'student');
    if (!r.ok) throw new Error(r.reason);
    const student = s.partnerships[r.partnershipId]!;
    const events = s.events.log.length;
    migrate(s);
    expect(old.runoffWeeksLeft).toBe(5);
    expect(old.balance).toBe(9_000);
    expect(student.status).toBe('active');
    expect(student.unamortized).toBe(student.fee);
    expect(s.events.log).toHaveLength(events);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('round-trips after the migration', () => {
    const { s, branchId, employer } = game();
    oldPayrollDeal(s, employer, branchId, 200_000);
    migrate(s);
    expect(importCode(exportCode(s))).toEqual(s);
  });
});
