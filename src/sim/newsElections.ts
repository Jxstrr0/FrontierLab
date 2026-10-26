// Elections in The Weekly Ledger (SIMULATION §24 Politics): every country votes
// every NEWS_ELECTIONS.termWeeks, staggered so one comes round every few
// months somewhere in the world. The paper announces the campaign
// NEWS_ELECTIONS.campaignWeeks ahead with the latest poll, then reports the
// result: the poll leader wins with leaderWinP, otherwise the runner-up. The
// fictional, neutral parties come from data/newsWorld.ts. Flavour only: who
// governs changes nothing in the simulation.
import { NEWS_ELECTIONS, NEWS_PRIORITY as P } from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { PARTIES } from '../data/newsWorld';
import type { CountryId } from '../data/types';
import { newsPct } from './newsFormat';
import { pollOrder, pollShares } from './newsPolitics';
import { countryName, theCountryName, type NewsContext, type Story } from './newsStory';
import type { Rng } from './rng';
import type { NewsDesk } from './state';

const COUNTRY_ORDER = Object.keys(COUNTRIES) as CountryId[];

/** Campaign launches and results due this week (draws from the `news` stream). */
export function electionStories(ctx: NewsContext, desk: NewsDesk, rng: Rng): Story[] {
  const out: Story[] = [];
  const { termWeeks, staggerWeeks, campaignWeeks, leaderWinP, winnerBounce } = NEWS_ELECTIONS;
  COUNTRY_ORDER.forEach((id, i) => {
    if (!ctx.state.world.countries[id]) return;
    const parties = PARTIES[id];
    const shares = pollShares(desk, id);
    const order = pollOrder(shares);
    // First sight of a country: the poll leader governs and the first vote is
    // staggered by country, so the first campaign starts on this issue.
    const e = (desk.elections[id] ??= {
      governing: order[0]!.i,
      nextWeek: ctx.week + campaignWeeks + i * staggerWeeks,
    });
    const weeksLeft = e.nextWeek - ctx.week;
    const base = {
      subject: id,
      tab: 'politics' as const,
      icon: 'ballot' as const,
      priority: ctx.operated.has(id) ? P.electionLocal : P.electionAbroad,
      group: 'elections',
    };
    const names = { country: countryName(id), theCountry: theCountryName(id) };
    if (weeksLeft === campaignWeeks) {
      out.push({
        ...base,
        key: 'ELECTION_CALLED',
        tokens: {
          ...names,
          weeks: String(campaignWeeks),
          leader: parties[order[0]!.i]!,
          leaderShare: newsPct(order[0]!.v),
          second: parties[order[1]!.i]!,
          secondShare: newsPct(order[1]!.v),
          governing: parties[e.governing]!,
        },
      });
    }
    if (weeksLeft > 0) return;
    const winner = rng.chance(leaderWinP) ? order[0]! : order[1]!;
    const old = e.governing;
    e.governing = winner.i;
    e.nextWeek = ctx.week + termWeeks;
    shares[winner.i] = shares[winner.i]! + winnerBounce;
    const total = shares.reduce((a, b) => a + b, 0);
    for (let k = 0; k < shares.length; k++)
      shares[k] = Math.round((shares[k]! / total) * 1000) / 10;
    out.push({
      ...base,
      key: winner.i === old ? 'ELECTION_HELD' : 'ELECTION_WON',
      tokens: {
        ...names,
        party: parties[winner.i]!,
        old: parties[old]!,
        share: newsPct(winner.v),
      },
    });
  });
  return out;
}
