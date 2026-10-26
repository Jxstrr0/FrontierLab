// Politics (SIMULATION §24) and the central bank panel's views (SCREENS §8):
// a passed capital buffer raises the home tier thresholds for a year, other
// policies change nothing, and the yield curve inverts with a negative premium.
import { describe, expect, it } from 'vitest';
import { CAPITAL_BUFFER_PP, CAPITAL_BUFFER_WEEKS } from '../../src/config/balance';
import { CAPITAL_BUFFER_POLICY } from '../../src/data/newsWorld';
import { capitalBufferPp } from '../../src/sim/capital';
import { isInverted, nextMeetingDay, yieldCurve } from '../../src/sim/centralBank';
import { dateOf, weekOfYear } from '../../src/sim/calendar';
import { COUNTRIES } from '../../src/data/countries';
import { newGame } from '../../src/sim/newGame';
import { runPolitics } from '../../src/sim/newsPolitics';
import type { Rng } from '../../src/sim/rng';
import type { NewsDesk } from '../../src/sim/state';

/** An Rng whose every chance succeeds and every pick takes the first item. */
function yesRng(): Rng {
  return {
    next: () => 0,
    range: (a) => a,
    int: (a) => a,
    chance: () => true,
    normal: (mu) => mu,
    lognormal: (m) => m,
    poisson: () => 0,
    pick: (items) => items[0]!,
    pickWeighted: (items) => items[0]!.item,
  };
}

const emptyDesk = (): NewsDesk => ({
  proposals: [],
  seasons: {},
  polls: {},
  assetMarks: {},
  worldRecent: {},
  elections: {},
  scheduled: [],
  commodities: {},
  archive: [],
});

describe('politics', () => {
  it('a passed capital buffer raises the home tier thresholds for a year', () => {
    const s = newGame({ seed: 3, cityId: 'cal', bankName: 'Test Bank' });
    const desk = emptyDesk();
    desk.proposals.push({
      country: 'CA',
      policyId: CAPITAL_BUFFER_POLICY,
      party: 'Unity Party',
      voteWeek: 0,
    });
    runPolitics(s, desk, yesRng());
    expect(s.world.countries.CA!.capitalBuffer).toEqual({
      pp: CAPITAL_BUFFER_PP,
      untilWeek: CAPITAL_BUFFER_WEEKS,
    });
    expect(capitalBufferPp(s)).toBe(CAPITAL_BUFFER_PP);
    const passed = s.events.log.filter((e) => e.type === 'POLICY_PASSED');
    expect(passed).toHaveLength(1);
    expect(passed[0]!.payload.policyId).toBe(CAPITAL_BUFFER_POLICY);
  });

  it('flavour policies pass without touching the capital rules', () => {
    const s = newGame({ seed: 3, cityId: 'cal', bankName: 'Test Bank' });
    const desk = emptyDesk();
    desk.proposals.push({ country: 'CA', policyId: 'parks', party: 'Unity Party', voteWeek: 0 });
    runPolitics(s, desk, yesRng());
    expect(s.world.countries.CA!.capitalBuffer).toBeUndefined();
    expect(s.events.log.some((e) => e.type === 'POLICY_PASSED')).toBe(true);
    // Every country without a bill tabled one this week (the stub rng always says yes).
    expect(desk.proposals.length).toBe(Object.keys(s.world.countries).length);
  });
});

describe('central bank views', () => {
  it('the yield curve slopes up normally and inverts with a negative term premium', () => {
    const s = newGame({ seed: 3, cityId: 'cal', bankName: 'Test Bank' });
    const c = s.world.countries.CA!;
    c.termPremium = 0.006;
    expect(isInverted(yieldCurve(c))).toBe(false);
    c.termPremium = -0.003;
    const curve = yieldCurve(c);
    expect(isInverted(curve)).toBe(true);
    expect(curve[0]!.rate).toBe(c.policyRate);
  });

  it('finds the next meeting on a listed week of the year', () => {
    const s = newGame({ seed: 3, cityId: 'cal', bankName: 'Test Bank' });
    const day = nextMeetingDay(s, 'CA')!;
    expect(day).toBeGreaterThan(s.clock.day);
    expect(COUNTRIES.CA.meetingWeeks).toContain(weekOfYear(dateOf(s.meta.startDate, day)));
    // Hong Kong follows the Federal Reserve's calendar.
    expect(nextMeetingDay(s, 'HK')).toBe(nextMeetingDay(s, 'US'));
  });
});
