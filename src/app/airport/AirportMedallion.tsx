// The airport's mark and the plane glyph (ART_DIRECTION §2 Pins, §7 icons): a
// landmark seal in the airport's sky-blue ink with a brass rim and an ivory
// plane, so it reads apart from the central bank's navy dome and the round
// place medallions (the seal itself is drawn in map/PinMarks.tsx). The plane
// glyph (24 px grid, 1.5 px stroke) also flies in the flight overlay and marks
// the Travel sheet; it lives in the shared icon set.
import { ICON_PATHS } from '../../art/icons';
import { LandmarkSeal } from '../map/PinMarks';

/** Plane seen from above, nose to the right (rotate it to its heading). */
export const PLANE_PATH = ICON_PATHS.plane;

export function PlaneIcon(p: { size?: number; filled?: boolean }) {
  const size = p.size ?? 24;
  return (
    <svg
      class="plane-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={p.filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PLANE_PATH} />
    </svg>
  );
}

export function AirportMedallion(p: { size?: number }) {
  return <LandmarkSeal marker="airport" size={p.size ?? 30} class="ap-medallion" />;
}
