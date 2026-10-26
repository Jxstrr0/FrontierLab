// Politics for The Weekly Ledger (SIMULATION §24): fictional, neutral parties
// table policies now and then and lawmakers vote a few weeks later. A passed
// capital buffer raises that country's capital tier thresholds by
// CAPITAL_BUFFER_PP for CAPITAL_BUFFER_WEEKS (capital.ts applies it at home);
// every other policy is flavour and its copy promises nothing in the game. A
// won lobbying stall (lobbying.ts) makes the pending buffer bill fail its vote.
// Also every country's opinion polls (drifting every few weeks; elections in
// newsElections.ts read them) and the home poll story. Runs inside tick step 16.
import {
  CAPITAL_BUFFER_PP,
  CAPITAL_BUFFER_WEEKS,
  NEWS_CAPITAL_BUFFER_SHARE,
  NEWS_POLICY_PASS_P,
  NEWS_POLICY_PROPOSE_P,
  NEWS_POLICY_VOTE_WEEKS,
  NEWS_POLL_DRIFT,
  NEWS_POLL_EVERY_WEEKS,
  NEWS_POLL_FLOOR,
  NEWS_PRIORITY as P,
} from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { CAPITAL_BUFFER_POLICY, PARTIES, POLICIES, type PolicySpec } from '../data/newsWorld';
import type { CountryId } from '../data/types';
import { pushEvent } from './events';
import { newsPct } from './newsFormat';
import { countryName, str, theCountryName, type NewsContext, type Story } from './newsStory';
import type { Rng } from './rng';
import type { GameState, NewsDesk } from './state';

const COUNTRY_ORDER = Object.keys(COUNTRIES) as CountryId[];
const FLAVOUR = POLICIES.filter((p) => p.id !== CAPITAL_BUFFER_POLICY);
const policyById = (id: string): PolicySpec | undefined => POLICIES.find((p) => p.id === id);

/** Votes on due proposals, then new proposals; both push POLICY_* events for this issue. */
export function runPolitics(state: GameState, desk: NewsDesk, rng: Rng): void {
  const week = state.clock.week;
  const due = desk.proposals.filter((p) => p.voteWeek <= week);
  desk.proposals = desk.proposals.filter((p) => p.voteWeek > week);
  for (const bill of due) {
    const spec = policyById(bill.policyId);
    if (!spec) continue;
    const payload = {
      country: bill.country,
      policy: spec.name,
      effect: spec.effect,
      policyId: spec.id,
      party: bill.party,
    };
    // The vote is always drawn so a won lobbying stall doesn't shift later draws.
    const roll = rng.chance(NEWS_POLICY_PASS_P);
    const passed = !stalled(state, bill.country, spec.id) && roll;
    if (passed) {
      if (spec.id === CAPITAL_BUFFER_POLICY) {
        const c = state.world.countries[bill.country];
        if (c) c.capitalBuffer = { pp: CAPITAL_BUFFER_PP, untilWeek: week + CAPITAL_BUFFER_WEEKS };
      }
      pushEvent(state, 'POLICY_PASSED', payload, 3);
    } else {
      pushEvent(state, 'POLICY_REJECTED', payload, 5);
    }
  }
  for (const country of COUNTRY_ORDER) {
    if (!state.world.countries[country]) continue;
    const pending = desk.proposals.some((p) => p.country === country);
    if (!rng.chance(NEWS_POLICY_PROPOSE_P) || pending) continue;
    const c = state.world.countries[country]!;
    const bufferActive = !!c.capitalBuffer && c.capitalBuffer.untilWeek > week;
    const spec =
      !bufferActive && rng.chance(NEWS_CAPITAL_BUFFER_SHARE)
        ? policyById(CAPITAL_BUFFER_POLICY)!
        : rng.pick(FLAVOUR);
    const party = rng.pick(PARTIES[country]);
    const [lo, hi] = NEWS_POLICY_VOTE_WEEKS;
    desk.proposals.push({ country, policyId: spec.id, party, voteWeek: week + rng.int(lo, hi) });
    pushEvent(
      state,
      'POLICY_PROPOSED',
      { country, policy: spec.name, effect: spec.effect, policyId: spec.id, party },
      5,
    );
  }
}

/** A won lobbying campaign ("Stall the capital buffer bill") makes that country's buffer bill fail; used once. */
function stalled(state: GameState, country: CountryId, policyId: string): boolean {
  const block = state.lobbying?.blockBill;
  if (policyId !== CAPITAL_BUFFER_POLICY || !block || block.country !== country) return false;
  if (block.untilWeek < state.clock.week) return false;
  delete state.lobbying.blockBill;
  return true;
}

const POLICY_KEYS = {
  POLICY_PROPOSED: 'POLICY_PROPOSED',
  POLICY_PASSED: 'POLICY_PASSED',
  POLICY_REJECTED: 'POLICY_REJECTED',
} as const;

/** Stories for this issue's POLICY_* events; countries you operate in rank higher. */
export function politicsStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const key = POLICY_KEYS[e.type as keyof typeof POLICY_KEYS];
    if (!key) continue;
    const p = e.payload;
    const country = str(p.country) as CountryId;
    const spec = policyById(str(p.policyId));
    const binding = spec?.id === CAPITAL_BUFFER_POLICY;
    const local = ctx.operated.has(country);
    out.push({
      key,
      subject: `${country}:${str(p.policyId)}`,
      tab: 'politics',
      icon: binding ? 'gavel' : 'ballot',
      priority: (local ? P.politicsLocal : P.politicsAbroad) + (binding && local ? 30 : 0),
      tokens: {
        country: countryName(country),
        theCountry: theCountryName(country),
        policy: str(p.policy),
        effect: str(p.effect),
        party: str(p.party, 'government'),
        impact: key === 'POLICY_PASSED' ? (spec?.impact ?? '') : '',
      },
    });
  }
  return out;
}

/** A country's poll shares (percent by party index), even until the first poll. */
export function pollShares(desk: NewsDesk, country: CountryId): number[] {
  const parties = PARTIES[country];
  return (desk.polls[country] ??= parties.map(() => 100 / parties.length));
}

/** Party indexes by poll share, leader first (ties to the earlier party). */
export function pollOrder(shares: number[]): { v: number; i: number }[] {
  return shares.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v || a.i - b.i);
}

/** Every NEWS_POLL_EVERY_WEEKS weeks, every country's poll shares drift and renormalise. */
export function driftPolls(state: GameState, desk: NewsDesk, rng: Rng): void {
  if (state.clock.week % NEWS_POLL_EVERY_WEEKS !== 0) return;
  for (const country of COUNTRY_ORDER) {
    if (!state.world.countries[country]) continue;
    const shares = pollShares(desk, country);
    for (let i = 0; i < shares.length; i++) {
      shares[i] = Math.max(NEWS_POLL_FLOOR, shares[i]! + rng.normal(0, NEWS_POLL_DRIFT));
    }
    const total = shares.reduce((a, b) => a + b, 0);
    for (let i = 0; i < shares.length; i++)
      shares[i] = Math.round((shares[i]! / total) * 1000) / 10;
  }
}

/** The home country's poll every NEWS_POLL_EVERY_WEEKS weeks (after driftPolls). */
export function pollStory(ctx: NewsContext, desk: NewsDesk): Story | undefined {
  if (ctx.week % NEWS_POLL_EVERY_WEEKS !== 0) return undefined;
  const parties = PARTIES[ctx.home];
  const [first, second] = pollOrder(pollShares(desk, ctx.home));
  if (!first || !second) return undefined;
  return {
    key: 'POLL',
    subject: ctx.home,
    tab: 'politics',
    icon: 'ballot',
    priority: P.poll,
    tokens: {
      country: countryName(ctx.home),
      theCountry: theCountryName(ctx.home),
      leader: parties[first.i]!,
      leaderShare: newsPct(first.v),
      second: parties[second.i]!,
      secondShare: newsPct(second.v),
    },
  };
}
