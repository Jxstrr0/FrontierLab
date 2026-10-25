// One icon from the shared set (src/art/icons.ts, ART_DIRECTION §7): a 24 px
// grid, 1.5 px rounded stroke, in the current text colour (brass on navy,
// ink on ivory). Decorative unless given a label.
import { ICON_PATHS, type IconName } from '../../art/icons';

export function Icon(p: { name: IconName; size?: number; label?: string; class?: string }) {
  const size = p.size ?? 24;
  return (
    <svg
      class={`icon${p.class ? ` ${p.class}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      role={p.label ? 'img' : undefined}
      aria-label={p.label}
      aria-hidden={p.label ? undefined : 'true'}
    >
      <path d={ICON_PATHS[p.name]} />
    </svg>
  );
}
