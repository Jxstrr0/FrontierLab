// The Quant Noir house style (CONTENT §7a, ART_DIRECTION §3): the modern,
// understated dressing of a quantitative firm. A graphite sign with a
// lower-case, widely spaced name and a light strip in the brand ink, recessed
// light bars, cube planters with clipped spheres, a frameless glass door with
// a glowing seam, and a slim light blade on the roof instead of a cloth flag.
// houseStyleArt.tsx dispatches here for style 'quant'.
import { poly, type Pt } from '../../art/engrave';
import { arch, type Brand } from './facadeParts';
import type { FacadeAnchors } from './houseStyleArt';
import { attrs, fit } from './signFit';

/** The graphite sign: lower-case name, a brand-ink pixel before it and a light strip under it. */
export function QuantSign(p: { a: FacadeAnchors['sign']; name: string; brand: Brand }) {
  const { x, y, w, h } = p.a;
  const text = p.name.toLowerCase();
  const px = h * 0.34;
  const t = fit(text, w - px - 10, h, 0.72);
  const strip = y + h - 1.2;
  return (
    <g>
      <path d={`M${x} ${y}h${w}v${h}h${-w}z`} class="hs-noir" />
      <rect
        x={x + 3}
        y={y + (h - px) / 2 - 0.6}
        width={px}
        height={px}
        style={{ fill: p.brand.ink }}
      />
      <text x={x + px + 6} y={y + h * 0.7} class="hs-mono" {...attrs(t, w - px - 10)}>
        {text}
      </text>
      <path
        d={`M${x + 1} ${strip}h${w - 2}`}
        style={{ stroke: p.brand.ink, strokeWidth: 2.4, opacity: 0.3 }}
      />
      <path d={`M${x + 1} ${strip}h${w - 2}`} style={{ stroke: p.brand.ink, strokeWidth: 0.8 }} />
    </g>
  );
}

/** A recessed light bar in the brand ink with a cone of light below it. */
export function QuantLamp(p: { at: Pt; ground?: number; ink: string }) {
  const [x, y] = p.at;
  const top = y - 6;
  return (
    <g>
      {p.ground !== undefined && (
        <path d={`M${x} ${p.ground}V${top}M${x - 2.5} ${p.ground}h5`} class="art-line" />
      )}
      <path
        d={poly([
          [x - 3.5, top + 1.2],
          [x + 3.5, top + 1.2],
          [x + 5, top + 7],
          [x - 5, top + 7],
        ])}
        style={{ fill: p.ink, opacity: 0.16 }}
      />
      <rect x={x - 3.5} y={top} width="7" height="1.3" style={{ fill: p.ink }} class="hs-pulse" />
      <path d={`M${x - 3.5} ${top}h7`} class="art-line art-fine" />
    </g>
  );
}

/** A graphite cube with a clipped sphere on it; every other one carries a smaller pair. */
export function QuantPlanter(p: { x: number; ground: number; n: number }) {
  const { x, n } = p;
  const g = p.ground;
  const spheres: [number, number][] =
    n % 2
      ? [[x, 4.2]]
      : [
          [x - 2.2, 3],
          [x + 2.6, 2.2],
        ];
  return (
    <g>
      <path d={`M${x - 5} ${g}v-6h10v6z`} class="hs-noir" />
      <path
        d={`M${x - 5} ${g - 6}h10`}
        class="art-line art-fine"
        style={{ stroke: 'var(--ivory)' }}
      />
      {spheres.map(([cx, r]) => (
        <g>
          <circle cx={cx} cy={g - 6 - r} r={r} class="hs-leaf" />
          <circle cx={cx} cy={g - 6 - r} r={r} class="art-line art-fine" />
        </g>
      ))}
    </g>
  );
}

/** A slim light blade on a mast, pulsing softly, in place of a flag. */
export function QuantFlag(p: { x: number; y: number; ink: string }) {
  const { x, y } = p;
  return (
    <g>
      <path d={`M${x} ${y}v-22`} class="art-line" />
      <rect
        x={x + 0.6}
        y={y - 21}
        width="5.6"
        height="16"
        class="art-wash"
        style={{ fill: p.ink }}
      />
      <rect
        x={x + 1.6}
        y={y - 20}
        width="3.4"
        height="14"
        style={{ fill: p.ink }}
        class="hs-pulse"
      />
      <circle cx={x} cy={y - 23} r="0.9" class="art-solid" />
    </g>
  );
}

/** A frameless glass slab with a glowing seam in the brand ink and a keypad. */
export function QuantDoor(p: { a: FacadeAnchors['door']; ink: string }) {
  const { x, y, w, h } = p.a;
  const outline = p.a.arch ? poly(arch(x, y + h, w, h)) : `M${x} ${y}h${w}v${h}h${-w}z`;
  const mid = x + w / 2;
  const top = p.a.arch ? y + w / 2 : y;
  return (
    <g>
      <path d={outline} class="art-paper" />
      <path d={outline} class="art-glass" />
      <path d={outline} class="art-tint" />
      <path d={outline} class="art-tint" />
      <path d={outline} class="art-line art-fine" />
      <path
        d={`M${mid} ${top + 1}V${y + h}`}
        style={{ stroke: p.ink, strokeWidth: 2.6, opacity: 0.3 }}
      />
      <path d={`M${mid} ${top + 1}V${y + h}`} style={{ stroke: p.ink, strokeWidth: 0.9 }} />
      <rect x={x + w - 4.2} y={y + h * 0.42} width="2" height="2.8" style={{ fill: p.ink }} />
      <path
        d={`M${x + 2} ${y + h - 3}l${w * 0.32} ${-h * 0.5}`}
        class="art-line art-fine art-faint"
      />
    </g>
  );
}
