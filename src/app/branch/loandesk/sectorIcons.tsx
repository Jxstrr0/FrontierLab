// Small line glyphs for the ten Loan Desk sectors (ART_DIRECTION §7: 24 px grid,
// 1.5 px stroke, rounded caps, brass on navy).
const PATHS: Record<string, string> = {
  cafe: 'M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 4h-2M8 4v2M12 4v2',
  retail: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  construction: 'M3 17h18M5 17a7 7 0 0 1 14 0M12 6v5',
  logistics: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 18.5h.01M17 18.5h.01',
  clinic: 'M12 4v16M4 12h16',
  tech: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  manufacturing: 'M3 20V10l6 4v-4l6 4V6h3v14z',
  farm: 'M12 20V10M12 14c-4 0-5-3-5-5 4 0 5 2 5 5zM12 12c4 0 5-3 5-5-4 0-5 2-5 5z',
  professional: 'M4 8h16v11H4zM9 8V6h6v2M4 13h16',
  hotel: 'M5 20V5h14v15M9 9h2M13 9h2M9 13h2M13 13h2M10 20v-3h4v3',
};

export function SectorIcon(p: { sector: string }) {
  return (
    <svg
      class="sector-icon"
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[p.sector] ?? PATHS.retail} />
    </svg>
  );
}
