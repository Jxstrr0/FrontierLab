import { describe, expect, it } from 'vitest';
import { advanceWeeks } from '../../src/sim/engine';
import { MILESTONES } from '../../src/data/milestones';
import { checkMilestones } from '../../src/sim/milestones';
import { newGame } from '../../src/sim/newGame';
import { openScriptedBranch } from '../helpers/scenario';

describe('milestones', () => {
  it('records the first branch and first loan once, with a news event', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    expect(s.milestones).toEqual({});
    openScriptedBranch(s, 'midtown');
    // The first contract comes from a weekly RFP, so give it a few quarters.
    for (let w = 0; w < 40 && s.milestones.first_loan === undefined; w++) advanceWeeks(s, 1);
    expect(s.milestones.first_branch).toBeTypeOf('number');
    expect(s.milestones.first_loan).toBeTypeOf('number');
    const first = s.milestones.first_branch;
    advanceWeeks(s, 2);
    expect(s.milestones.first_branch).toBe(first);
    expect(s.events.log.filter((e) => e.type === 'MILESTONE').length).toBeLessThanOrEqual(2);
  });

  it('counts five countries only from open branches', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    checkMilestones(s);
    expect(s.milestones.five_countries).toBeUndefined();
  });
});

describe('late-game milestones', () => {
  it('gives every listed milestone a check, with unique ids', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    checkMilestones(s);
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length);
    expect(MILESTONES.length).toBe(25);
    expect(Object.keys(s.milestones)).toEqual([]);
  });

  it('marks the rich list entry apart from its top, and a club bought personally', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    s.personal.empire.richList.rank = 7;
    const club = Object.values(s.clubs)[0]!;
    club.owner = 'personal';
    checkMilestones(s);
    expect(s.milestones.rich_list).toBe(s.clock.week);
    expect(s.milestones.rich_list_1).toBeUndefined();
    expect(s.milestones.club_owner).toBe(s.clock.week);
    s.personal.empire.richList.rank = 1;
    checkMilestones(s);
    expect(s.milestones.rich_list_1).toBe(s.clock.week);
  });

  it('reaches the trillion-range goals from assets, net worth, deals, cities and countries', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const deal = {} as (typeof s.mergers.deals)[number];
    s.mergers.deals = Array.from({ length: 10 }, () => deal);
    // Treasury reserves are an asset with no liability, so they lift total assets alone.
    s.treasury.reserves += 100e9;
    s.personal.cash += 10e9;
    checkMilestones(s);
    expect(s.milestones.ten_acquisitions).toBe(s.clock.week);
    expect(s.milestones.assets_100b).toBe(s.clock.week);
    expect(s.milestones.assets_1t).toBeUndefined();
    expect(s.milestones.worth_10b).toBe(s.clock.week);
    expect(s.milestones.twenty_cities).toBeUndefined();
    expect(s.milestones.ten_countries).toBeUndefined();
    s.treasury.reserves += 900e9;
    checkMilestones(s);
    expect(s.milestones.assets_1t).toBe(s.clock.week);
  });

  it('counts five closed deals for the fifth acquisition', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const deal = {} as (typeof s.mergers.deals)[number];
    s.mergers.deals = [deal, deal, deal, deal];
    checkMilestones(s);
    expect(s.milestones.first_acquisition).toBe(s.clock.week);
    expect(s.milestones.five_acquisitions).toBeUndefined();
    s.mergers.deals.push(deal);
    checkMilestones(s);
    expect(s.milestones.five_acquisitions).toBe(s.clock.week);
  });
});
