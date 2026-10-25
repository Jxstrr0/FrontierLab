// Line icons for the 14 map layers (SCREENS §2), drawn from the shared icon
// set (src/art/icons.ts, ART_DIRECTION §7) in the current text colour. Also
// the type marker that map pins, the Layers legend and panel headers use for
// non-bank buildings: a medallion, price tag or landmark seal in the type's own
// ink with an ivory glyph (markers.ts), so "teal dial = credit bureau" reads
// the same everywhere.
import { ICON_PATHS, type IconName } from '../../art/icons';
import type { MapLayerId } from '../../data/mapLayers';
import { glyphInk, MARKERS, type MarkerId } from './markers';
import { Glyph, LandmarkSeal } from './PinMarks';

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
 * A type's marker at a fixed square size (ART_DIRECTION §2, Pins): a round
 * medallion in the type's ink with a brass rim, an engraved inner ring and an
 * ivory glyph; a price tag for buildings you rent or buy; a scalloped seal for
 * landmarks. For map pins, the Layers legend and panel headers.
 */
export function LayerMedallion(p: { id: MarkerId; size?: number }) {
  const size = p.size ?? 30;
  const m = MARKERS[p.id];
  if (m.shape === 'landmark') return <LandmarkSeal marker={p.id} size={size} />;
  if (m.shape === 'tag') {
    return (
      <svg class="medallion" width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
        <path
          d="M1.8 15 8.6 6.5H28.2v17H8.6z"
          fill={m.ink}
          stroke="var(--brass)"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
        <circle cx="8.4" cy="15" r="1.7" fill={glyphInk(p.id)} />
        <Glyph icon={m.icon} cx={18.6} cy={15} px={14} stroke={1.7} color={glyphInk(p.id)} />
      </svg>
    );
  }
  return (
    <svg class="medallion" width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r="14" fill={m.ink} stroke="var(--brass)" stroke-width="1.5" />
      <circle
        cx="15"
        cy="15"
        r="11.6"
        fill="none"
        stroke="var(--ivory)"
        stroke-width="0.6"
        stroke-dasharray="1 1.2"
        opacity="0.55"
      />
      <Glyph icon={m.icon} cx={15} cy={15} px={18.5} stroke={1.75} color={glyphInk(p.id)} />
    </svg>
  );
}
