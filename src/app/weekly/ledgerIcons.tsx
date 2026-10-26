// Single-ink vignette icons for Ledger articles (ART_DIRECTION §6, §7), drawn
// from the shared icon set (src/art/icons.ts) in ink on ivory. Ids come from
// the sim's stories (LedgerIconId in src/sim/newsStory.ts).
import { ICON_PATHS, type IconName } from '../../art/icons';
import type { LedgerIconId } from '../../sim/newsStory';

/** Each story icon in the shared set (src/art/icons.ts). */
const LEDGER_ICON: Record<LedgerIconId, IconName> = {
  facade: 'branch',
  dome: 'dome',
  chart: 'chart',
  coin: 'coin',
  alert: 'warning',
  shield: 'shield',
  gavel: 'gavel',
  trophy: 'trophy',
  handshake: 'handshake',
  house: 'realEstate',
  ballot: 'ballot',
  person: 'person',
  spark: 'spark',
  globe: 'globe',
  leaf: 'leaf',
  plane: 'plane',
};

/** The article's icon in a small single-ink roundel (a double engraved ring). */
export function LedgerGlyph(p: { icon: string; size?: number }) {
  const size = p.size ?? 34;
  return (
    <svg
      class="ledger-glyph"
      viewBox="0 0 34 34"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="17" cy="17" r="16" stroke-width="1" />
      <circle cx="17" cy="17" r="13.6" stroke-width="0.5" stroke-dasharray="1 1.4" />
      <path
        d={ICON_PATHS[LEDGER_ICON[p.icon as LedgerIconId] ?? 'branch']}
        transform="translate(7 7) scale(0.8333)"
        stroke-width="1.8"
      />
    </svg>
  );
}
