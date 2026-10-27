// Lobbying campaigns, tick step 8 (DESIGN §5.8.10, SCREENS §15). A campaign
// paid for at a lobbying firm resolves 4–8 weeks later: it succeeds with the
// campaign's chance (LOBBY_CAMPAIGNS) and, win or lose, may be exposed by the
// Ledger (a fine of LOBBYING.exposeFine × cost and a brand awareness hit in your
// cities in that country). Wins: "Ease the capital buffer" lowers your home
// tier thresholds (capital.ts reads lobbying.bufferRelief), "Fast-track a merger
// review" relaxes the next deal's city share limit (acquisitionPlan.ts) and
// "Stall the capital buffer bill" makes the pending bill fail (newsPolitics.ts).
// Draws come from the `lobbying` stream.
import { LOBBYING } from '../config/balance';
import { CITIES } from '../data/cities';
import { LOBBY_CAMPAIGNS, LOBBY_FIRMS, type LobbyCampaignSpec } from '../data/lobbying';
import { CAPITAL_BUFFER_POLICY } from '../data/newsWorld';
import type { CountryId } from '../data/types';
import { pushEvent } from './events';
import { spend } from './ledger';
import { clamp } from './math';
import { listPrice } from './nominal';
import { stream } from './rng';
import type { GameState, LobbyCampaign } from './state';

export const campaignSpec = (id: string): LobbyCampaignSpec | undefined =>
  LOBBY_CAMPAIGNS.find((c) => c.id === id);

/** A campaign's fee at today's price list in the firm's country (§4.6). */
export function lobbyingPrice(state: GameState, spec: LobbyCampaignSpec, cityId: string): number {
  return listPrice(state, spec.cost, cityId);
}

/** The capital buffer bill waiting for a vote in a country, if any (newsPolitics.ts proposals). */
export function pendingBufferBill(state: GameState, country: CountryId) {
  return state.news.desk?.proposals.find(
    (p) => p.country === country && p.policyId === CAPITAL_BUFFER_POLICY,
  );
}

/** Tick step 8: resolves campaigns whose outcome week has come. */
export function runLobbying(state: GameState): void {
  const lob = state.lobbying;
  const week = state.clock.week;
  if (lob.bufferRelief && lob.bufferRelief.untilWeek <= week) delete lob.bufferRelief;
  if (lob.blockBill && lob.blockBill.untilWeek < week) delete lob.blockBill;
  for (const c of lob.campaigns) {
    if (c.status === 'pending' && week >= c.resolveWeek) resolve(state, c);
  }
}

function resolve(state: GameState, c: LobbyCampaign): void {
  const spec = campaignSpec(c.campaignId);
  if (!spec) {
    c.status = 'lost';
    return;
  }
  const rng = stream(state, 'lobbying');
  const won = rng.chance(spec.success);
  const exposed = rng.chance(spec.exposure);
  c.status = won ? 'won' : 'lost';
  const payload = {
    campaignId: c.campaignId,
    title: spec.title,
    firm: LOBBY_FIRMS[c.firmId]?.name ?? 'A lobbying firm',
    country: c.country,
  };
  if (won) applyWin(state, c);
  pushEvent(state, won ? 'LOBBY_WON' : 'LOBBY_LOST', payload, 3, c.id);
  if (exposed) expose(state, c, payload);
}

function applyWin(state: GameState, c: LobbyCampaign): void {
  const lob = state.lobbying;
  const week = state.clock.week;
  // SIMULATION §21.6: the newer campaigns pay a one-off grant, booked as a refund
  // on the lobbying line so the year's lobbying cost nets down.
  const grant = campaignSpec(c.campaignId)?.grant;
  if (grant) spend(state, 'lobbying', -grant);
  if (c.campaignId === 'easeBuffer') {
    lob.bufferRelief = {
      country: c.country,
      pp: LOBBYING.bufferReliefPp,
      untilWeek: week + LOBBYING.bufferReliefWeeks,
    };
  } else if (c.campaignId === 'fastTrack') {
    lob.fastTrack = true;
  } else if (c.campaignId === 'stallBuffer') {
    // Holds until the bill's vote; a bill already voted on leaves nothing to stall.
    const bill = pendingBufferBill(state, c.country);
    lob.blockBill = { country: c.country, untilWeek: bill?.voteWeek ?? week };
  }
}

/** The Ledger exposé: a fine and a brand awareness hit in your cities in that country. */
function expose(
  state: GameState,
  c: LobbyCampaign,
  payload: { campaignId: string; title: string; firm: string; country: string },
): void {
  c.exposed = true;
  const fine = c.cost * LOBBYING.exposeFine;
  spend(state, 'fines', fine);
  for (const city of Object.values(state.world.cities)) {
    if (CITIES[city.id]?.country !== c.country) continue;
    city.brandAwareness = clamp(city.brandAwareness - LOBBYING.exposeAwareness, 0, 1);
  }
  pushEvent(state, 'LOBBY_EXPOSED', { ...payload, bank: state.meta.bankName, fine }, 9, c.id);
}
