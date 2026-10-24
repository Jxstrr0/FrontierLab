// Line icons for the 14 map layers (SCREENS §2), on a 24 px grid in the
// current text colour, engraved-style: thin even strokes, no fills.
import type { MapLayerId } from '../../data/mapLayers';

const PATHS: Record<MapLayerId, string> = {
  // Columned bank front with a pediment.
  branches: 'M3 9.5 12 4l9 5.5M4 20h16M5 18h14M6.5 11v6M10 11v6M14 11v6M17.5 11v6M4 9.5h16',
  // Office tower with a window grid.
  offices: 'M6 21V4h12v17M4 21h16M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M11 21v-3h2v3',
  // House with a key-shaped door.
  realEstate: 'M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  // Ledger page and a magnifier.
  creditBureaus:
    'M5 3.5h9l3 3V12M5 3.5V20h6M8 8h6M8 11h4M15.5 18.5a3 3 0 1 0 0-.01M17.6 20.6 20 23',
  // Head-office block with a flag.
  banks: 'M5 21V8h14v13M3 21h18M12 8V3l4 1.5L12 6M8 11v7M12 11v7M16 11v7',
  // A climbing price line.
  investmentBanks: 'M3 20h18M4 16l5-5 4 3 7-8M16 6h4v4',
  // Megaphone.
  marketingAgencies: 'M4 10v4h3l8 4V6l-8 4H4M7 14l1.5 5h2L9.5 15M18 9.5a3 3 0 0 1 0 5',
  // Pavilion with bunting.
  conventions: 'M3 10 12 4l9 6M5 10v10M19 10v10M3 20h18M5 10l2.3 2 2.3-2 2.4 2 2.3-2 2.4 2 2.3-2',
  // Domed assembly hall.
  lobbyingFirms: 'M5 12a7 5 0 0 1 14 0M12 4v3M4 12h16M6 12v7M10 12v7M14 12v7M18 12v7M3 20h18',
  // Trophy cup.
  sportsTeams:
    'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3',
  // Motor car in profile.
  autoDealers:
    'M3 16v-3l2-4h10l3 4h2v3zM6.5 18.5a1.5 1.5 0 1 0 0-.01M16.5 18.5a1.5 1.5 0 1 0 0-.01M7 9l1 4M3 13h17',
  // Gavel and block.
  auctionHouses: 'M5 9l5-5 3 3-5 5zM11.5 10.5 19 18M4 21h9M5.5 21v-2h6v2',
  // Mortarboard.
  universities: 'M2.5 9 12 5l9.5 4L12 13zM6.5 11v4.5c3 2 8 2 11 0V11M21.5 9v5',
  // Briefcase.
  employers: 'M4 8h16v11H4zM9 8V5.5h6V8M4 12.5h16M11 12v2h2v-2',
};

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
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[p.id]} />
    </svg>
  );
}
