// The club shirt (SCREENS §20 Kit): a flat engraved-style jersey in the kit's
// primary colour with secondary trim, and the shirt sponsor across the chest —
// your bank's monogram on a brand-ink panel, or a plain outside sponsor bar.
import { KIT_COLOURS } from '../../data/franchises';

export function KitShirt(p: {
  primary: string;
  secondary: string;
  sponsor: 'outside' | 'bank';
  monogram: string;
  ink: string;
  size?: number;
}) {
  const size = p.size ?? 120;
  const main = KIT_COLOURS[p.primary]?.hex ?? '#555';
  const trim = KIT_COLOURS[p.secondary]?.hex ?? '#ddd';
  return (
    <svg class="kit-shirt" width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M40 12 L28 16 L8 34 L20 52 L30 44 L30 108 L90 108 L90 44 L100 52 L112 34 L92 16 L80 12 Q60 26 40 12 Z"
        fill={main}
        stroke="var(--brass)"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path d="M40 12 Q60 26 80 12" fill="none" stroke={trim} stroke-width="5" />
      <path d="M8 34 L20 52" stroke={trim} stroke-width="5" />
      <path d="M112 34 L100 52" stroke={trim} stroke-width="5" />
      <rect x="30" y="98" width="60" height="5" fill={trim} />
      {p.sponsor === 'bank' ? (
        <g>
          <rect x="38" y="50" width="44" height="22" rx="3" fill={p.ink} stroke={trim} />
          <text
            x="60"
            y="61.5"
            text-anchor="middle"
            dominant-baseline="central"
            class="kit-monogram"
            fill="var(--ivory)"
          >
            {p.monogram}
          </text>
        </g>
      ) : (
        <rect x="38" y="56" width="44" height="10" rx="2" fill={trim} opacity="0.85" />
      )}
    </svg>
  );
}
