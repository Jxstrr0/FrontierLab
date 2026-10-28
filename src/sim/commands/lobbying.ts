// Lobbying commands (DESIGN §5.8.10, SCREENS §15): hire the firm in the city
// you're in for a campaign. The fee is paid now; the outcome arrives in 4–8
// weeks (lobbying.ts). One pending campaign per type, a grant can be won once
// per country, and the buffer-bill stall only while such a bill is waiting for
// its vote in that country.
import { LOBBYING } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { LOBBY_FIRMS } from '../../data/lobbying';
import { pushEvent } from '../events';
import { spend } from '../ledger';
import { campaignSpec, lobbyingPrice, pendingBufferBill } from '../lobbying';
import { stream } from '../rng';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

/** Why a campaign can't start at this firm right now, or undefined if it can. */
export function lobbyBlock(
  state: GameState,
  siteId: string,
  campaignId: string,
): string | undefined {
  const site = state.world.sites[siteId];
  const firm = site?.kind === 'lobbyingFirm' ? LOBBY_FIRMS[site.refId] : undefined;
  const spec = campaignSpec(campaignId);
  const country = site ? CITIES[site.cityId]?.country : undefined;
  if (!site || !firm || !spec || !country) return 'That campaign is not on offer.';
  if (site.cityId !== state.world.currentCityId)
    return 'You need to be in this city to hire the firm.';
  if (state.lobbying.campaigns.some((c) => c.campaignId === campaignId && c.status === 'pending'))
    return 'This campaign is already under way.';
  // The safety buffer binds only at home (§15 follows the home regulator, DESIGN §5.2).
  const home = CITIES[state.meta.homeCityId]?.country;
  if ((campaignId === 'easeBuffer' || campaignId === 'stallBuffer') && country !== home)
    return `Your safety rules are set at home in ${COUNTRIES[home ?? country].name}, so this campaign only helps there.`;
  if (campaignId === 'stallBuffer' && !pendingBufferBill(state, country))
    return 'There is no AI safety bill before lawmakers here right now.';
  // A grant pays once per country: a won grant can't be lobbied for again there.
  if (
    spec.grant &&
    state.lobbying.campaigns.some(
      (c) => c.campaignId === campaignId && c.country === country && c.status === 'won',
    )
  )
    return `You have already won this grant in ${COUNTRIES[country].name}.`;
  if (campaignId === 'fastTrack' && state.lobbying.fastTrack)
    return 'Your next merger review is already fast-tracked.';
  const price = lobbyingPrice(state, spec, site.cityId);
  if (price > state.company.cash) return `You need ${money(state, price)} in corporate cash.`;
  return undefined;
}

/** Pays the firm and starts a campaign; returns the week the outcome arrives. */
export function startLobbying(
  state: GameState,
  siteId: string,
  campaignId: string,
): CommandResult<{ resolveWeek: number }> {
  const blocked = lobbyBlock(state, siteId, campaignId);
  if (blocked) return fail(blocked);
  const site = state.world.sites[siteId]!;
  const firm = LOBBY_FIRMS[site.refId]!;
  const spec = campaignSpec(campaignId)!;
  const country = CITIES[site.cityId]!.country;
  const week = state.clock.week;
  const [lo, hi] = LOBBYING.resolveWeeks;
  let resolveWeek = week + stream(state, 'lobbying').int(lo, hi);
  // A stall has to land before the vote it is meant to sway.
  if (campaignId === 'stallBuffer') {
    const bill = pendingBufferBill(state, country)!;
    resolveWeek = Math.max(week + 1, Math.min(resolveWeek, bill.voteWeek));
  }
  const price = lobbyingPrice(state, spec, site.cityId);
  spend(state, 'lobbying', price);
  const id = `lobby_${state.lobbying.campaigns.length + 1}`;
  state.lobbying.campaigns.push({
    id,
    firmId: firm.id,
    campaignId,
    country,
    cost: price,
    startWeek: week,
    resolveWeek,
    status: 'pending',
  });
  pushEvent(
    state,
    'LOBBY_STARTED',
    { campaignId, title: spec.title, firm: firm.name, cost: price },
    6,
    id,
  );
  return ok({ resolveWeek });
}
