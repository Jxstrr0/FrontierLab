// Small engraved line icons for the five build slots (no fills, brass strokes).
import type { BuildSlot } from '../../data/equipment';

const PATHS: Record<BuildSlot, string> = {
  // Facade with a pediment and a door.
  exterior: 'M3 10 12 4l9 6M5 10v10M19 10v10M3 20h18M10 20v-6h4v6',
  // Armchair and a lamp.
  lobby: 'M5 11V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3M3 11h14v6H3zM5 17v3M15 17v3M19 6v14',
  // Counter with two windows.
  teller: 'M3 20h18M4 20V9h16v11M8 9V5h8v4M8 13h3v3H8zM13 13h3v3h-3z',
  // Round vault door.
  vault: 'M4 4h16v16H4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 10v4M10 12h4',
  // Cash machine with a screen and a slot.
  atm: 'M6 3h12v18H6zM8 6h8v5H8zM9 15h6M9 18h6',
};

export function SlotIcon(p: { slot: BuildSlot }) {
  return (
    <svg class="slot-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[p.slot]} />
    </svg>
  );
}
