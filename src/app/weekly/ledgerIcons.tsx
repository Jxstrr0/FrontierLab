// Single-ink vignette icons for Ledger articles (ART_DIRECTION §6, §7): 24 px
// grid, 1.5 px stroke, rounded caps and joins, drawn in ink on ivory. Ids come
// from the sim's stories (LedgerIconId in src/sim/newsStory.ts).
import type { LedgerIconId } from '../../sim/newsStory';

const PATHS: Record<LedgerIconId, string> = {
  // Bank façade with columns.
  facade: 'M3 9l9-5 9 5zM5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18M4 18h16',
  // Central bank dome over a columned hall.
  dome: 'M5 12a7 6 0 0 1 14 0M12 4v2M4 12h16M6 12v7M10 12v7M14 12v7M18 12v7M3 20h18',
  chart: 'M4 4v16h16M7 15l4-5 3 3 5-7',
  coin: 'M12 4a8 8 0 1 0 .01 0zM12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.3-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5',
  alert: 'M12 4l9 16H3zM12 10v4.5M12 17.5h.01',
  shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4',
  gavel: 'M5 9l5-5 3 3-5 5zM11.5 10.5 19 18M4 21h9M5.5 21v-2h6v2',
  trophy:
    'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3',
  handshake: 'M3 11l4-4 3 2 3-2 4 0 4 4M3 11l5 5 2-1 2 2 2-1 2 1 5-6M10 9l3 3M13 12l2 2',
  house: 'M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  ballot: 'M5 10h14v10H5zM8 10V4h8v6M10 7l1.5 1.5L14 6M9 15h6',
  person: 'M12 4a3.5 3.5 0 1 0 .01 0zM5 20c1-4 4-6 7-6s6 2 7 6',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
};

export function LedgerGlyph(p: { icon: string; size?: number }) {
  const size = p.size ?? 28;
  return (
    <svg
      class="ledger-glyph"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[p.icon as LedgerIconId] ?? PATHS.facade} />
    </svg>
  );
}
