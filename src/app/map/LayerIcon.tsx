// Line icons for the 14 map layers (SCREENS §2), drawn from the shared icon
// set (src/art/icons.ts, ART_DIRECTION §7) in the current text colour. Also
// the type medallion that map pins and panel headers use for non-bank buildings.
import { ICON_PATHS, type IconName } from '../../art/icons';
import type { MapLayerId } from '../../data/mapLayers';

/** Each layer's icon in the shared set (src/art/icons.ts). */
const LAYER_ICON: Record<MapLayerId, IconName> = {
  branches: 'branch',
  offices: 'office',
  realEstate: 'realEstate',
  creditBureaus: 'bureau',
  banks: 'bank',
  investmentBanks: 'investmentBank',
  marketingAgencies: 'agency',
  conventions: 'convention',
  lobbyingFirms: 'lobby',
  sportsTeams: 'trophy',
  autoDealers: 'car',
  auctionHouses: 'gavel',
  universities: 'university',
  employers: 'employer',
};
const PATHS = Object.fromEntries(
  Object.entries(LAYER_ICON).map(([id, icon]) => [id, ICON_PATHS[icon]]),
) as Record<MapLayerId, string>;

export function LayerIcon(p: { id: MapLayerId; size?: number }) {
  const size = p.size ?? 24;
  return (
    <svg
      class="layer-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[p.id]} />
    </svg>
  );
}

/**
 * A round type medallion (ART_DIRECTION §2, Pins): brass rim, ivory fill, an
 * engraved inner ring and the layer's icon in ink. For offices for lease,
 * credit bureaus, agencies and other special buildings.
 */
export function LayerMedallion(p: { id: MapLayerId; size?: number }) {
  const size = p.size ?? 30;
  return (
    <svg class="medallion" width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r="14" fill="var(--ivory)" stroke="var(--brass)" stroke-width="1.5" />
      <circle
        cx="15"
        cy="15"
        r="11.5"
        fill="none"
        stroke="var(--brass)"
        stroke-width="0.6"
        stroke-dasharray="1 1.2"
      />
      <g
        transform="translate(6 6) scale(0.75)"
        fill="none"
        stroke="var(--ledger-ink)"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d={PATHS[p.id]} />
      </g>
    </svg>
  );
}
