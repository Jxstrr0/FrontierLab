// Lobbying (DESIGN §5.8.10, SCREENS §15): starting a campaign, its 4–8 week
// outcome and exposure roll, and each win's effect: buffer relief lowers your
// tier thresholds, a fast-track relaxes the M&A city share limit for one deal,
// and a stall makes the pending capital buffer bill fail its vote.
import { describe, expect, it } from 'vitest';
import { LOBBYING, MERGERS } from '../../src/config/balance';
import { LOBBY_CAMPAIGNS } from '../../src/data/lobbying';
import { CAPITAL_BUFFER_POLICY } from '../../src/data/newsWorld';
import { planDeal, regulatorChecks } from '../../src/sim/acquisitionPlan';
import { capitalBufferPp, tierFor } from '../../src/sim/capital';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { runLobbying } from '../../src/sim/lobbying';
import { referencePrice } from '../../src/sim/mergerPricing';
import { newGame } from '../../src/sim/newGame';
import { runPolitics } from '../../src/sim/newsPolitics';
import { hashSeed, rngFromState } from '../../src/sim/rng';
import type { GameState, LobbyCampaign } from '../../src/sim/state';
import { addCapital, capitalisedBank, identityGap, smallestRival } from '../helpers/mergers';

const FIRM = 'site_cal_lobbyingFirm_parliamentRow';

function game(): GameState {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Lobby Bank' });
  addCapital(s, 20_000_000);
  return s;
}

/** A pending buffer bill in Canada voting in `weeks`. */
function tableBufferBill(s: GameState, weeks: number) {
  s.news.desk ??= {
    proposals: [],
    seasons: {},
    polls: {},
    assetMarks: {},
    worldRecent: {},
    elections: {},
    scheduled: [],
    commodities: {},
    archive: [],
  };
  s.news.desk.proposals.push({
    country: 'CA',
    policyId: CAPITAL_BUFFER_POLICY,
    party: 'Test Party',
    voteWeek: s.clock.week + weeks,
  });
}

/** Runs a campaign to its outcome under a range of lobbying draws; returns the results. */
function outcomes(campaignId: string, tries = 40): { s: GameState; c: LobbyCampaign }[] {
  const out: { s: GameState; c: LobbyCampaign }[] = [];
  for (let i = 0; i < tries; i++) {
    const s = game();
    if (campaignId === 'stallBuffer') tableBufferBill(s, 8);
    expect(cmd.startLobbying(s, FIRM, campaignId).ok).toBe(true);
    s.rng.lobbying = hashSeed(1000 + i, 'lobbying');
    const c = s.lobbying.campaigns[0]!;
    s.clock.week = c.resolveWeek;
    runLobbying(s);
    out.push({ s, c });
  }
  return out;
}

describe('starting a campaign', () => {
  it('pays the fee now and resolves in 4–8 weeks', () => {
    const s = game();
    const cash = s.company.cash;
    const spec = LOBBY_CAMPAIGNS.find((c) => c.id === 'easeBuffer')!;
    const r = cmd.startLobbying(s, FIRM, 'easeBuffer');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(s.company.cash).toBeCloseTo(cash - spec.cost, 6);
    expect(s.ledger.pnl.lobbying).toBeCloseTo(spec.cost, 6);
    expect(r.resolveWeek - s.clock.week).toBeGreaterThanOrEqual(LOBBYING.resolveWeeks[0]);
    expect(r.resolveWeek - s.clock.week).toBeLessThanOrEqual(LOBBYING.resolveWeeks[1]);
    expect(identityGap(s)).toBeLessThan(1);
    // One pending campaign per type.
    expect(cmd.startLobbying(s, FIRM, 'easeBuffer').ok).toBe(false);
    expect(cmd.startLobbying(s, FIRM, 'fastTrack').ok).toBe(true);
  });

  it('needs you in the city, the cash, and a pending bill for a stall', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Lobby Bank' });
    expect(cmd.startLobbying(s, FIRM, 'fastTrack').ok).toBe(false); // $750k cash
    addCapital(s, 20_000_000);
    expect(cmd.startLobbying(s, FIRM, 'stallBuffer').ok).toBe(false);
    tableBufferBill(s, 3);
    const r = cmd.startLobbying(s, FIRM, 'stallBuffer');
    expect(r.ok).toBe(true);
    // A stall lands no later than the vote.
    if (r.ok) expect(r.resolveWeek).toBe(s.clock.week + 3);
    s.world.currentCityId = 'van';
    expect(cmd.startLobbying(s, FIRM, 'easeBuffer').ok).toBe(false);
  });
});

describe('outcomes', () => {
  it('wins about as often as the campaign says, and exposure fines and dents awareness', () => {
    const runs = outcomes('easeBuffer');
    const won = runs.filter((r) => r.c.status === 'won');
    expect(won.length).toBeGreaterThan(5);
    expect(won.length).toBeLessThan(runs.length - 5);
    const exposed = runs.find((r) => r.c.exposed)!;
    expect(exposed).toBeDefined();
    const spec = LOBBY_CAMPAIGNS.find((c) => c.id === 'easeBuffer')!;
    expect(exposed.s.ledger.pnl.fines).toBeCloseTo(spec.cost * LOBBYING.exposeFine, 6);
    expect(exposed.s.events.log.some((e) => e.type === 'LOBBY_EXPOSED')).toBe(true);
    const quiet = runs.find((r) => !r.c.exposed)!;
    expect(quiet.s.ledger.pnl.fines).toBe(0);
  });

  it('lowers your tier thresholds after a won buffer campaign', () => {
    const { s } = outcomes('easeBuffer').find((r) => r.c.status === 'won')!;
    expect(s.lobbying.bufferRelief).toEqual({
      country: 'CA',
      pp: LOBBYING.bufferReliefPp,
      untilWeek: s.clock.week + LOBBYING.bufferReliefWeeks,
    });
    expect(capitalBufferPp(s)).toBe(-LOBBYING.bufferReliefPp);
    // A ratio half a point under a threshold now makes that tier.
    expect(tierFor(0.1, capitalBufferPp(s))).not.toBe(tierFor(0.1, 0));
    s.clock.week += LOBBYING.bufferReliefWeeks;
    runLobbying(s);
    expect(capitalBufferPp(s)).toBe(0);
  });

  it('makes the pending buffer bill fail after a won stall', () => {
    const { s } = outcomes('stallBuffer').find((r) => r.c.status === 'won')!;
    expect(s.lobbying.blockBill?.country).toBe('CA');
    // Find vote draws that would pass the bill, then check the stall turns them into a rejection.
    let checked = 0;
    for (let i = 0; i < 30 && checked < 3; i++) {
      const seed = hashSeed(500 + i, 'news');
      const free = structuredClone(s);
      delete free.lobbying.blockBill;
      free.clock.week = free.news.desk!.proposals[0]!.voteWeek;
      runPolitics(free, free.news.desk!, rngFromState([...seed]));
      if (!free.events.log.some((e) => e.type === 'POLICY_PASSED')) continue;
      const held = structuredClone(s);
      held.clock.week = held.news.desk!.proposals[0]!.voteWeek;
      runPolitics(held, held.news.desk!, rngFromState([...seed]));
      expect(held.events.log.some((e) => e.type === 'POLICY_REJECTED')).toBe(true);
      expect(held.world.countries.CA!.capitalBuffer).toBeUndefined();
      expect(held.lobbying.blockBill).toBeUndefined();
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('relaxes the city share limit for one deal after a won fast-track', () => {
    const { s } = outcomes('fastTrack').find((r) => r.c.status === 'won')!;
    expect(s.lobbying.fastTrack).toBe(true);
    const plan = {
      proFormaCr: 0.2,
      cityShares: [{ cityId: 'cal', share: (MERGERS.maxCityShare + MERGERS.fastTrackShare) / 2 }],
      shareLimit: MERGERS.fastTrackShare,
      fastTrack: true,
    } as Parameters<typeof regulatorChecks>[0];
    expect(regulatorChecks(plan, () => 'Calgary')[1]!.ok).toBe(true);
    expect(regulatorChecks(plan, () => 'Calgary')[1]!.detail).toMatch(
      new RegExp(`limit ${(MERGERS.fastTrackShare * 100).toFixed(1)}%`),
    );
    const strict = { ...plan, shareLimit: MERGERS.maxCityShare, fastTrack: false };
    expect(regulatorChecks(strict, () => 'Calgary')[1]!.ok).toBe(false);

    // A real deal reads the flag and uses it up on closing.
    const bank = capitalisedBank();
    bank.lobbying.fastTrack = true;
    const target = smallestRival(bank);
    expect(planDeal(bank, target, referencePrice(target) * 1.6).shareLimit).toBe(
      MERGERS.fastTrackShare,
    );
    expect(cmd.offerMerger(bank, target.id, referencePrice(target) * 1.6).ok).toBe(true);
    advanceWeeks(bank, 2);
    expect(bank.mergers.deals).toHaveLength(1);
    expect(bank.lobbying.fastTrack).toBeUndefined();
    expect(planDeal(bank, smallestRival(bank), 1).shareLimit).toBe(MERGERS.maxCityShare);
  }, 60_000);
});
