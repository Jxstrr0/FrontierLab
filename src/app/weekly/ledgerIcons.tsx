// Single-ink vignette icons for Ledger articles (ART_DIRECTION §6, §7): 24 px
// grid, 1.5 px stroke, rounded caps and joins, drawn in ink on ivory.
import type { LedgerIcon } from './ledgerArticles';

const PATHS: Record<LedgerIcon, string> = {
  facade: 'M3 9l9-5 9 5zM5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18M4 18h16',
  dome: 'M5 20v-7a7 7 0 0 1 14 0v7M3 20h18M12 6V3M9 20v-5h6v5',
  chart: 'M4 4v16h16M7 15l4-5 3 3 5-7',
  coin: 'M12 4a8 8 0 1 0 .01 0zM12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.3-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5',
  alert: 'M12 4l9 16H3zM12 10v4.5M12 17.5h.01',
  shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4',
};

export function LedgerGlyph(p: { icon: LedgerIcon }) {
  return (
    <svg
      class="ledger-glyph"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[p.icon]} />
    </svg>
  );
}
