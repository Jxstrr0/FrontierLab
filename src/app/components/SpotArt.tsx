// Spot illustration plate (ART_DIRECTION §3): an 80 × 80 single-ink line
// drawing on an ivory roundel with a brass double ring, in the current city's
// ink. Products, campaigns, benefits and startup sectors all use it; pass a
// group and id (src/art/spots.ts) or a drawing directly.
import { spotPath, type SpotGroup } from '../../art/spots';
import { cityInk } from './Vignette';
import './vignette.css';

export function SpotArt(p: {
  group?: SpotGroup;
  id?: string;
  /** A drawing on the 80 × 80 grid, instead of group + id. */
  d?: string;
  size?: number;
  label?: string;
  class?: string;
}) {
  const size = p.size ?? 56;
  const d = p.d ?? spotPath(p.group ?? 'product', p.id ?? '');
  return (
    <svg
      class={`spot-art${p.class ? ` ${p.class}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role={p.label ? 'img' : undefined}
      aria-label={p.label}
      aria-hidden={p.label ? undefined : 'true'}
      style={{ '--art-ink': cityInk() }}
    >
      <circle cx="40" cy="40" r="38.5" class="spot-ring" />
      <circle cx="40" cy="40" r="34.5" class="spot-ring spot-ring-fine" />
      <path d={d} class="spot-line" />
    </svg>
  );
}
