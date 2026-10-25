// "Where to look" (SCREENS §24): the ranked attention list reads state only and
// flags the things a hands-off owner should see first.
import { describe, expect, it } from 'vitest';
import { ATTENTION, GRAND_OPENING_WEEKS } from '../../src/config/balance';
import { attentionItems } from '../../src/sim/attention';
import * as cmd from '../../src/sim/commands';
import { raiseIncident } from '../../src/sim/incidents';
import { execGame, hire } from '../helpers/executives';
import { openBank } from '../helpers/incidents';

describe('attention items', () => {
  it('orders urgent before watch before note and names the branch to open', () => {
    const { s, b } = openBank();
    const ids = () => attentionItems(s).map((i) => i.id);
    expect(ids()).not.toContain('cases');
    s.company.tier = 'restricted';
    raiseIncident(s, 'CARD_FRAUD', 'company', 'company', { loss: 5_000 });
    for (let w = 0; w < GRAND_OPENING_WEEKS + ATTENTION.lossWeeks; w++)
      b.pnl.push({ week: w, revenue: 100, income: -50, lines: {} as never });
    b.grandOpeningWeeksLeft = 0;
    const items = attentionItems(s);
    const tones = items.map((i) => i.tone);
    const rank = { bad: 2, warn: 1, info: 0 };
    for (let i = 1; i < tones.length; i++)
      expect(rank[tones[i - 1]!]).toBeGreaterThanOrEqual(rank[tones[i]!]);
    expect(ids().slice(0, 2)).toEqual(['capital', 'cases']);
    const losses = items.find((i) => i.id === 'losses')!;
    expect(losses.route).toEqual({ kind: 'branch', branchId: b.id });
    expect(items.find((i) => i.id === 'managers')).toBeDefined();
  });

  it('flags thin cash against running costs, and cash below zero as urgent', () => {
    const { s } = openBank();
    const ids = () => attentionItems(s).map((i) => i.id);
    s.history.weekly.length = 0;
    expect(ids()).not.toContain('cash');
    s.history.weekly.push({ revenue: 10_000, netIncome: -5_000 } as never);
    s.company.cash = 30_000;
    const thin = attentionItems(s).find((i) => i.id === 'cash')!;
    expect(thin.tone).toBe('warn');
    expect(thin.title).toBe('Cash covers 2 weeks of costs');
    expect(thin.route).toEqual({ kind: 'company' });
    s.company.cash = 30_000 * ATTENTION.cashCoverWeeks;
    expect(ids()).not.toContain('cash');
    s.company.cash = -1;
    expect(attentionItems(s)[0]).toMatchObject({ id: 'cash', tone: 'bad' });
  });

  it('points at empty seats and switched-off delegations once there is an Executive floor', () => {
    const s = execGame();
    expect(attentionItems(s).find((i) => i.id === 'seats')?.route).toEqual({
      kind: 'hq',
      dept: 'executive',
    });
    hire(s, 'coo');
    expect(attentionItems(s).find((i) => i.id === 'delegations')).toBeUndefined();
    cmd.setExecDelegation(s, 'coo', 'expansion', false);
    expect(attentionItems(s).find((i) => i.id === 'delegations')?.title).toBe(
      '1 delegation switched off',
    );
  });
});
