// Lobbying firms and their campaigns (docs/CONTENT.md §16, SCREENS §15,
// DESIGN §5.8.10). One firm per country; Switzerland and Japan borrow the
// nearest house. Effects are applied by src/sim/lobbying.ts; tuning that isn't
// per campaign lives in LOBBYING (balance.ts).
import type { CountryId } from './types';

export interface LobbyFirmSpec {
  id: string;
  name: string;
  countries: CountryId[];
}

export const LOBBY_FIRMS: Record<string, LobbyFirmSpec> = {
  capitolBridge: { id: 'capitolBridge', name: 'Capitol Bridge Advisors', countries: ['US'] },
  parliamentRow: { id: 'parliamentRow', name: 'Parliament Row Partners', countries: ['CA', 'UK'] },
  rueRoyale: { id: 'rueRoyale', name: 'Rue Royale Affairs', countries: ['EA', 'CH'] },
  harbourline: {
    id: 'harbourline',
    name: 'Harbourline Policy Group',
    countries: ['AU', 'SG', 'HK', 'JP'],
  },
};

export const lobbyFirmFor = (country: CountryId): LobbyFirmSpec | undefined =>
  Object.values(LOBBY_FIRMS).find((f) => f.countries.includes(country));

export type LobbyCampaignId = 'easeBuffer' | 'fastTrack' | 'stallBuffer';

export interface LobbyCampaignSpec {
  id: LobbyCampaignId;
  title: string;
  description: string;
  cost: number;
  /** Chance the campaign succeeds. */
  success: number;
  /** Chance the Ledger exposes it, win or lose. */
  exposure: number;
}

export const LOBBY_CAMPAIGNS: LobbyCampaignSpec[] = [
  {
    id: 'easeBuffer',
    title: 'Ease the capital buffer by 1pp for 4 quarters',
    description: 'Every capital tier threshold drops by one point for a year in this country.',
    cost: 2_500_000,
    success: 0.55,
    exposure: 0.12,
  },
  {
    id: 'fastTrack',
    title: 'Fast-track a merger review',
    description: 'Your next acquisition may take you to 45% of a city’s deposits instead of 35%.',
    cost: 1_500_000,
    success: 0.6,
    exposure: 0.1,
  },
  {
    id: 'stallBuffer',
    title: 'Stall the capital buffer bill',
    description:
      'A capital buffer bill before lawmakers here fails its vote. Only while one is pending.',
    cost: 1_200_000,
    success: 0.5,
    exposure: 0.15,
  },
];
