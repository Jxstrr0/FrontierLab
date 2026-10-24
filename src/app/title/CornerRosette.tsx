// Small corner ornament for certificate-style frames (ART_DIRECTION §1.3).
interface Props {
  corner: 'tl' | 'tr' | 'bl' | 'br';
}

export function CornerRosette({ corner }: Props) {
  return (
    <svg class={`corner corner-${corner}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="1">
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      </g>
    </svg>
  );
}
