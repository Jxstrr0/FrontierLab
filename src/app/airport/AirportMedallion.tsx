// The airport's medallion and the plane glyph (ART_DIRECTION §2 Pins, §7 icons):
// a navy coin with a brass rim, a dotted flight arc and an engraved plane, so
// the landmark reads apart from the central bank's dome and the ivory type
// medallions. The plane glyph (24 px grid, 1.5 px stroke) also flies in the
// flight overlay and marks the Travel sheet.

/** Plane seen from above, nose to the right (rotate it to its heading). */
export const PLANE_PATH =
  'M21 12c0-.8-.7-1.3-1.5-1.3H14.6L10.4 4H8.6l2.2 6.7H6.1L4.4 8.6H3l1 3.4-1 3.4h1.4l1.7-2.1h4.7L8.6 20h1.8l4.2-6.7h4.9c.8 0 1.5-.5 1.5-1.3z';

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
