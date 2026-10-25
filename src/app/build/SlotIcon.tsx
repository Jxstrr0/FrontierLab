// Small engraved line icons for the five build slots (no fills, brass strokes),
// from the shared icon set (src/art/icons.ts) except the lobby's armchair.
import { ICON_PATHS } from '../../art/icons';
import type { BuildSlot } from '../../data/equipment';

const PATHS: Record<BuildSlot, string> = {
  exterior: ICON_PATHS.branch,
  // Armchair and a lamp.
  lobby: 'M5 11V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3M3 11h14v6H3zM5 17v3M15 17v3M19 6v14',
  teller: ICON_PATHS.teller,
  vault: ICON_PATHS.vault,
  atm: ICON_PATHS.atm,
};

export function SlotIcon(p: { slot: BuildSlot }) {
  return (
    <svg class="slot-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[p.slot]} />
    </svg>
  );
}
