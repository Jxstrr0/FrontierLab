// Read-only views of GameState for a lobbying firm's panel (SCREENS §15): each
// campaign with its cost, odds and whether it can start here now (and why
// not), campaigns under way with weeks left, past outcomes, and the wins in
// force (buffer relief, a fast-tracked merger review, a stalled bill).
import { LOBBY_CAMPAIGNS, LOBBY_FIRMS, type LobbyCampaignSpec } from '../../data/lobbying';
import { lobbyBlock } from '../../sim/commands';
import type { GameState, LobbyCampaign } from '../../sim/state';

export interface CampaignCardView {
  spec: LobbyCampaignSpec;
  /** Why it can't start right now, or undefined. */
  blocked?: string;
}

export function campaignCards(s: GameState, siteId: string): CampaignCardView[] {
  return LOBBY_CAMPAIGNS.map((spec) => {
    const blocked = lobbyBlock(s, siteId, spec.id);
    return blocked ? { spec, blocked } : { spec };
  });
}

export interface CampaignRow {
  campaign: LobbyCampaign;
  title: string;
  firm: string;
  weeksLeft: number;
}

const rowOf = (s: GameState, c: LobbyCampaign): CampaignRow => ({
  campaign: c,
  title: LOBBY_CAMPAIGNS.find((x) => x.id === c.campaignId)?.title ?? c.campaignId,
  firm: LOBBY_FIRMS[c.firmId]?.name ?? c.firmId,
  weeksLeft: Math.max(0, c.resolveWeek - s.clock.week),
});

/** Campaigns still waiting for an outcome, soonest first. */
export function pendingCampaigns(s: GameState): CampaignRow[] {
  return s.lobbying.campaigns
    .filter((c) => c.status === 'pending')
    .map((c) => rowOf(s, c))
    .sort((a, b) => a.weeksLeft - b.weeksLeft);
}

/** Resolved campaigns, newest first. */
export function pastCampaigns(s: GameState, limit = 8): CampaignRow[] {
  return s.lobbying.campaigns
    .filter((c) => c.status !== 'pending')
    .map((c) => rowOf(s, c))
    .reverse()
    .slice(0, limit);
}

/** One line per lobbying win still in force. */
export function winsInForce(s: GameState): string[] {
  const out: string[] = [];
  const week = s.clock.week;
  const lob = s.lobbying;
  if (lob.bufferRelief && lob.bufferRelief.untilWeek > week) {
    const weeks = lob.bufferRelief.untilWeek - week;
    out.push(
      `Safety tier lines ${lob.bufferRelief.pp}pp lower for ${weeks} more week${weeks === 1 ? '' : 's'}.`,
    );
  }
  if (lob.fastTrack) out.push('Your next merger review is fast-tracked.');
  if (lob.blockBill && lob.blockBill.untilWeek >= week) {
    out.push('The capital buffer bill before lawmakers will fail its vote.');
  }
  return out;
}
