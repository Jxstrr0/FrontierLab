// The airport's medallion and the plane glyph (ART_DIRECTION §2 Pins, §7 icons):
// a navy coin with a brass rim, a dotted flight arc and an engraved plane, so
// the landmark reads apart from the central bank's dome and the ivory type
// medallions. The plane glyph (24 px grid, 1.5 px stroke) also flies in the
// flight overlay and marks the Travel sheet; it lives in the shared icon set.
import { ICON_PATHS } from '../../art/icons';

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
  const size = p.size ?? 30;
  return (
    <svg
      class="medallion ap-medallion"
      width={size}
      height={size}
      viewBox="0 0 30 30"
      aria-hidden="true"
    >
      <circle cx="15" cy="15" r="14" fill="var(--vault)" stroke="var(--brass)" stroke-width="1.5" />
      <circle cx="15" cy="15" r="11.6" fill="none" stroke="var(--brass-light)" stroke-width="0.7" />
      {/* Dotted flight arc under the plane. */}
      <path
        d="M7.5 20.5Q11 13.5 21 11"
        fill="none"
        stroke="var(--brass-light)"
        stroke-width="1"
        stroke-linecap="round"
        stroke-dasharray="0.1 2.2"
      />
      <g transform="translate(9.2 6.6) scale(0.56) rotate(-28 12 12)">
        <path
          d={PLANE_PATH}
          fill="var(--brass-light)"
          stroke="var(--brass-light)"
          stroke-width="0.8"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  );
}
