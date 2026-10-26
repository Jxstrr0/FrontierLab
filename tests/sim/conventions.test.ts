// Conventions (CONTENT §19, SIMULATION §20.3): the calendar, the Foothills
// Founders Fair acceptance run in Calgary (announced four weeks out, open for
// four weeks, then closed) and the rule that its ventures can only be bought there,
// while it is open.
import { describe, expect, it } from 'vitest';
import { conventionPinInfo } from '../../src/app/convention/conventionPin';
import * as cmd from '../../src/sim/commands';
import { absoluteWeek, conventionsYear, runsForYear } from '../../src/sim/conventions';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import type { GameState, Site } from '../../src/sim/state';
import { addCapital } from '../helpers/markets';
import { bankWithFloors } from '../helpers/scenario';

const FAIR = 'foothillsFounders';

const fairRun = (s: GameState) =>
  s.conventions.runs.find((r) => r.conventionId === FAIR && r.year === 2027)!;
const venue = (s: GameState): Site =>
  Object.values(s.world.sites).find((x) => x.kind === 'conventionCenter' && x.refId === FAIR)!;

describe('conventions calendar', () => {
  it('maps a week of the year to the game week whose tick falls in it', () => {
    // Start Monday 4 Jan 2027; week 28 of 2027 begins 9 July, the first tick after is week 27 (12 July).
    expect(absoluteWeek('2027-01-04', 2027, 28)).toBe(27);
    expect(absoluteWeek('2027-01-04', 2027, 1)).toBe(0);
    expect(absoluteWeek('2027-01-04', 2028, 3)).toBe(54);
  });

  it('seeds this year and next year at a new game, then rolls forward at year end', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
    const years = new Set(s.conventions.runs.map((r) => r.year));
    expect([...years].sort()).toEqual([2027, 2028]);
    expect(s.conventions.runs).toHaveLength(2 * runsForYear(s, 2027).length);
    advanceWeeks(s, 52); // the first tick of 2028 runs conventionsYear
    expect([...new Set(s.conventions.runs.map((r) => r.year))].sort()).toEqual([2028, 2029]);
    conventionsYear(s); // idempotent within a year
    expect(s.conventions.runs.filter((r) => r.year === 2029)).toHaveLength(
      runsForYear(s, 2029).length,
    );
  });
});

describe('Foothills Founders Fair (acceptance)', () => {
  it('is announced, opens and closes on schedule; its ventures sell only there, while open', () => {
    const s = bankWithFloors(['investment'], { weeks: 1, capital: 50_000_000 });
    addCapital(s, 50_000_000);
    const run = fairRun(s);
    expect(run.startWeek).toBe(27);
    const pipelineSeen = new Set<string>();
    const track = () => s.ventures.pipeline.forEach((id) => pipelineSeen.add(id));

    // Before the announcement: hidden pin, no startups yet.
    advanceWeeks(s, 22 - s.clock.week);
    track();
    expect(run.announced).toBe(false);
    expect(conventionPinInfo(s, venue(s)).visible).toBe(false);

    // Four weeks before (week 23): announced, 3–6 exclusive startups raising.
    advanceWeeks(s, 1);
    track();
    expect(s.clock.week).toBe(23);
    expect(run.announced).toBe(true);
    expect(
      s.events.log.some(
        (e) => e.type === 'CONVENTION_ANNOUNCED' && e.payload.conventionId === FAIR,
      ),
    ).toBe(true);
    expect(run.startupIds.length).toBeGreaterThanOrEqual(3);
    expect(run.startupIds.length).toBeLessThanOrEqual(6);
    const pin = conventionPinInfo(s, venue(s));
    expect(pin.visible).toBe(true);
    expect(pin.tag).toBe('Opens in 4 weeks');
    const ids = run.startupIds;
    for (const id of ids) {
      const st = s.ventures.startups[id]!;
      expect(st.seenAt).toBe('convention');
      expect(st.round?.closesWeek).toBe(run.endWeek);
    }
    const [first, second] = ids as [string, string];
    const before = cmd.buyStartupLot(s, first, 0, 'company');
    expect(before.ok).toBe(false);

    advanceWeeks(s, 3);
    track();
    expect(conventionPinInfo(s, venue(s)).tag).toBe('Opens in 1 week');
    expect(cmd.buyStartupLot(s, first, 0, 'company').ok).toBe(false);

    // Week 27: open, for four weeks.
    advanceWeeks(s, 1);
    track();
    expect(
      s.events.log.some((e) => e.type === 'CONVENTION_OPEN' && e.payload.conventionId === FAIR),
    ).toBe(true);
    expect(conventionPinInfo(s, venue(s))).toMatchObject({ visible: true, tag: 'Open now' });
    s.world.currentCityId = 'tor';
    const away = cmd.buyStartupLot(s, first, 0, 'company');
    expect(away).toEqual({ ok: false, reason: 'You need to be at the convention.' });
    s.world.currentCityId = 'cal';
    const cash = s.company.cash;
    const price = s.ventures.startups[first]!.round!.lots[0]!.price;
    expect(cmd.buyStartupLot(s, first, 0, 'company').ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(cash - price, 4);

    // Week 30: still open; week 31: closed, pin hidden, rounds closed with unsold lots taken by funds.
    advanceWeeks(s, 3);
    track();
    expect(conventionPinInfo(s, venue(s))).toMatchObject({ visible: true, tag: 'Open now' });
    advanceWeeks(s, 1);
    track();
    expect(s.clock.week).toBe(31);
    expect(conventionPinInfo(s, venue(s)).visible).toBe(false);
    const after = cmd.buyStartupLot(s, second, 0, 'company');
    expect(after).toEqual({ ok: false, reason: 'The convention is over.' });
    for (const id of ids) {
      const st = s.ventures.startups[id]!;
      expect(st.round).toBeUndefined();
      expect(st.holders.reduce((t, h) => t + h.shares, 0)).toBe(st.shares);
    }

    // Convention startups never show in the Investment floor pipeline.
    advanceWeeks(s, 12);
    track();
    expect(pipelineSeen.size).toBeGreaterThan(0);
    for (const id of ids) expect(pipelineSeen.has(id)).toBe(false);
  });
});
