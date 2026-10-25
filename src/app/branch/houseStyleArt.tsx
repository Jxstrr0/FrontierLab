// House style dressing for the branch fronts (ART_DIRECTION §3, CONTENT §7a):
// the name sign with the bank's name, the lamps by the door, the planters at
// the foot of the building and the roof flag, each drawn in the bank's chosen
// style. Every exterior composition says where these go (FacadeAnchors), so
// one style reads the same on a plain storefront and a deco tower.
import { poly, type Pt } from '../../art/engrave';
import type { HouseStyle } from '../../data/types';
import { arch, type Brand } from './facadeParts';

export interface FacadeAnchors {
  /** The name sign's box. */
  sign: { x: number; y: number; w: number; h: number };
  /** Lamp mounting points; `post` stands them on lamp posts from the ground. */
  lamps: { pts: Pt[]; post?: boolean };
  /** Planter centres and the ground they stand on. */
  planters: { xs: number[]; y: number };
  /** The front door: its box, round-topped when `arch`. */
  door: { x: number; y: number; w: number; h: number; arch?: boolean };
}

/** Lamps and planters are drawn small and scaled up about their foot. */
export const PROP_SCALE = 1.35;
export const grow = (x: number, y: number) =>
  `translate(${x} ${y}) scale(${PROP_SCALE}) translate(${-x} ${-y})`;

/** Font size that fits `text` in `w`, and a squeeze for names that won't fit. */
function fit(text: string, w: number, h: number, widthPerEm: number) {
  const size = Math.min(h * 0.72, w / Math.max(1, text.length * widthPerEm));
  const min = 4.2;
  return size >= min
    ? { fontSize: `${size.toFixed(2)}px` }
    : { fontSize: `${min}px`, textLength: w, lengthAdjust: 'spacingAndGlyphs' as const };
}

/** The bank's name sign in the house style. */
export function NameSign(p: {
  style: HouseStyle;
  a: FacadeAnchors['sign'];
  name: string;
  brand: Brand;
}) {
  const { x, y, w, h } = p.a;
  const cx = x + w / 2;
  const base = y + h * 0.7;
  const box = `M${x} ${y}h${w}v${h}h${-w}z`;
  switch (p.style) {
    case 'heritage': {
      const t = fit(p.name, w - 8, h, 0.55);
      return (
        <g>
          <path d={box} class="art-solid" />
          <path d={`M${x + 1.5} ${y + 1.5}h${w - 3}v${h - 3}h${-(w - 3)}z`} class="hs-gilt-line" />
          <text x={cx} y={base} text-anchor="middle" class="hs-gilt hs-serif" {...attrs(t, w - 8)}>
            {p.name}
          </text>
        </g>
      );
    }
    case 'deco': {
      const s = Math.min(3, h / 3);
      const shape = `M${x} ${y + h}V${y + s}h${s}v${-s}H${x + w - s}v${s}h${s}V${y + h}z`;
      const chev = (cx0: number, dir: number) =>
        `M${cx0} ${y + h * 0.3}l${dir * 2.4} ${h * 0.2}l${-dir * 2.4} ${h * 0.2}M${cx0 + dir * 2} ${y + h * 0.3}l${dir * 2.4} ${h * 0.2}l${-dir * 2.4} ${h * 0.2}`;
      const text = p.name.toUpperCase();
      const t = fit(text, w - 16, h, 0.86);
      return (
        <g>
          <path d={shape} class="art-paper" />
          <path d={shape} class="art-line art-fine" />
          <path d={`${chev(x + 2.5, 1)}${chev(x + w - 2.5, -1)}`} class="art-line art-fine" />
          <text
            x={cx}
            y={base}
            text-anchor="middle"
            class="art-text hs-spaced"
            {...attrs(t, w - 16)}
          >
            {text}
          </text>
        </g>
      );
    }
    case 'modern': {
      const text = p.name.toLowerCase();
      const tile = h * 0.86;
      const t = fit(text, w - tile - 6, h, 0.56);
      return (
        <g>
          <path d={box} class="art-paper" />
          <path d={`M${x} ${y}h${w}M${x} ${y + h}h${w}`} class="art-line art-fine" />
          <rect
            x={x + 1}
            y={y + (h - tile) / 2}
            width={tile}
            height={tile}
            style={{ fill: p.brand.ink }}
          />
          <text x={x + tile + 3} y={base} class="hs-sans" {...attrs(t, w - tile - 6, p.brand.ink)}>
            {text}
          </text>
        </g>
      );
    }
    case 'garden': {
      const t = fit(p.name, w - 12, h, 0.52);
      const r = h / 2;
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={r} class="art-paper art-line art-fine" />
          <rect
            x={x + 1.4}
            y={y + 1.4}
            width={w - 2.8}
            height={h - 2.8}
            rx={r - 1.4}
            class="art-line art-fine"
          />
          <circle cx={x + r} cy={y + r} r={1.2} style={{ fill: p.brand.ink }} />
          <circle cx={x + w - r} cy={y + r} r={1.2} style={{ fill: p.brand.ink }} />
          <text
            x={cx}
            y={base}
            text-anchor="middle"
            class="art-text hs-italic"
            {...attrs(t, w - 12)}
          >
            {p.name}
          </text>
        </g>
      );
    }
    default: {
      const text = p.name.toUpperCase();
      const t = fit(text, w - 12, h, 1.02);
      return (
        <g>
          <path d={box} class="art-paper" />
          <path d={`M${x} ${y + 0.8}h${w}M${x} ${y + h - 0.8}h${w}`} class="art-line art-fine" />
          <circle cx={x + 2.6} cy={y + h / 2} r="1.3" class="art-line art-fine" />
          <circle cx={x + w - 2.6} cy={y + h / 2} r="1.3" class="art-line art-fine" />
          <text x={cx} y={base} text-anchor="middle" class="art-small hs-cut" {...attrs(t, w - 12)}>
            {text}
          </text>
        </g>
      );
    }
  }
}

const attrs = (t: ReturnType<typeof fit>, w: number, fill?: string) => {
  const style = fill ? { fontSize: t.fontSize, fill } : { fontSize: t.fontSize };
  return 'textLength' in t ? { style, textLength: w, lengthAdjust: t.lengthAdjust } : { style };
};

/** One lamp in the house style at (x, y); on a post from `ground` when given. */
export function Lamp(p: { style: HouseStyle; at: Pt; ground?: number; n: number }) {
  const [x, y] = p.at;
  const post =
    p.ground !== undefined ? (
      <path d={`M${x} ${p.ground}V${y + 3}M${x - 2.5} ${p.ground}h5`} class="art-line" />
    ) : null;
  switch (p.style) {
    case 'heritage':
      return (
        <g>
          {post ?? <path d={`M${x} ${y + 4}v-3h${p.n % 2 ? 3 : -3}`} class="art-line art-fine" />}
          <path d={`M${x - 2.2} ${y - 4}h4.4l-0.6 6h-3.2z`} class="hs-glow" />
          <path
            d={`M${x - 2.2} ${y - 4}h4.4l-0.6 6h-3.2zM${x - 2.8} ${y - 4}l2.8-2.4 2.8 2.4M${x} ${y - 6.4}v-1`}
            class="art-line art-fine"
          />
        </g>
      );
    case 'deco':
      return (
        <g>
          {post ?? <path d={`M${x} ${y + 4}v-2`} class="art-line" />}
          <circle cx={x} cy={y - 1.5} r="3.2" class="hs-glow" />
          <circle cx={x} cy={y - 1.5} r="3.2" class="art-line art-fine" />
          <path d={`M${x - 2} ${y + 2}h4`} class="art-line art-fine" />
        </g>
      );
    case 'modern':
      return (
        <g>
          {post}
          <rect x={x - 0.9} y={y - 6} width="1.8" height="9" class="hs-glow" />
          <rect x={x - 0.9} y={y - 6} width="1.8" height="9" class="art-line art-fine" />
        </g>
      );
    case 'garden':
      return (
        <g>
          {post ?? <path d={`M${x} ${y - 6}h${p.n % 2 ? 4 : -4}`} class="art-line art-fine" />}
          <g class="in-sway" style={{ animationDelay: `${p.n * 0.9}s` }}>
            <path
              d={`M${x + (post ? 0 : p.n % 2 ? 4 : -4)} ${y - 6}v2.5`}
              class="art-line art-fine"
            />
            <g transform={`translate(${post ? 0 : p.n % 2 ? 4 : -4} 0)`}>
              <path d={`M${x - 1.8} ${y - 3.5}h3.6v4.5h-3.6z`} class="hs-glow" />
              <path
                d={`M${x - 1.8} ${y - 3.5}h3.6v4.5h-3.6zM${x - 2.4} ${y - 3.5}h4.8`}
                class="art-line art-fine"
              />
            </g>
          </g>
        </g>
      );
    default:
      return (
        <g>
          {post ?? (
            <path d={`M${x} ${y + 5}v-3M${x - 1.6} ${y + 5}h3.2`} class="art-line art-fine" />
          )}
          <ellipse cx={x} cy={y - 2.2} rx="2.6" ry="1.8" class="hs-glow" />
          <path
            d={`M${x - 3.2} ${y - 1}h6.4q-0.6 3-3.2 3t-3.2-3z`}
            class="art-paper art-line art-fine"
          />
        </g>
      );
  }
}

/** One planter in the house style standing on the ground at (x, ground). */
export function Planter(p: {
  style: HouseStyle;
  x: number;
  ground: number;
  ink: string;
  n: number;
}) {
  const { x } = p;
  const g = p.ground;
  switch (p.style) {
    case 'heritage':
      return (
        <g>
          <path d={`M${x - 3.5} ${g}v-6h7v6z`} class="art-paper art-line art-fine" />
          <path d={`M${x} ${g - 6}v-2`} class="art-line art-fine" />
          <circle cx={x} cy={g - 11.5} r="4" class="art-tint" />
          <circle cx={x} cy={g - 11.5} r="4" class="art-line art-fine" />
          <path
            d={`M${x - 2.2} ${g - 12.6}q1-1 2 0M${x + 0.2} ${g - 10.4}q1-1 2 0`}
            class="art-line art-fine"
          />
        </g>
      );
    case 'deco':
      return (
        <g>
          <path d={`M${x - 2.5} ${g}h5l1.5-8h-8z`} class="art-paper art-line art-fine" />
          <path
            d={`M${x} ${g - 8}l-3.5-7M${x} ${g - 8}l-1-9M${x} ${g - 8}l1.5-8.5M${x} ${g - 8}l3.5-6.5`}
            class="art-line art-fine in-sway"
          />
        </g>
      );
    case 'modern': {
      const w = 18;
      return (
        <g>
          <path d={`M${x - w / 2} ${g}v-4h${w}v4z`} class="art-paper art-line art-fine" />
          <path
            d={Array.from(
              { length: 7 },
              (_, k) =>
                `M${x - w / 2 + 2 + k * 2.4} ${g - 4}q${k % 2 ? 1 : -1} -3 ${k % 2 ? 0.5 : -0.5} -6`,
            ).join('')}
            class="art-line art-fine in-sway"
          />
        </g>
      );
    }
    case 'garden':
      return (
        <g>
          <path d={`M${x - 3.5} ${g - 6}l1 6h5l1-6z`} class="art-paper art-line art-fine" />
          <path d={`M${x - 4} ${g - 6}q4-6 8 0`} class="art-tint art-line art-fine" />
          {[-2.4, 0, 2.4].map((dx, k) => (
            <circle
              cx={x + dx}
              cy={g - 8.4 - (k === 1 ? 1.2 : 0)}
              r="1.1"
              style={{ fill: p.ink }}
            />
          ))}
        </g>
      );
    default:
      return (
        <g>
          <path d={`M${x - 3.5} ${g}h7v-2.4h-7z`} class="art-paper art-line art-fine" />
          <path
            d={`M${x - 1.2} ${g - 2.4}l-0.5-1.4h3.4l-0.5 1.4zM${x - 1.6} ${g - 3.8}q-2.6-1-2.2-4.6h7.6q0.4 3.6-2.2 4.6z`}
            class="art-paper art-line art-fine"
          />
          <path d={`M${x - 4.2} ${g - 8.4}h8.4`} class="art-line art-fine" />
          <path
            d={`M${x - 2.4} ${g - 8.4}q-1-2.4 0.6-3.6M${x + 0.4} ${g - 8.4}q0.4-2.8 2.4-3.2`}
            class="art-line art-fine in-sway"
          />
        </g>
      );
  }
}

/** The roof flag in the house style: rectangle, swallowtail, banner, pennant or bordered. */
export function StyleFlag(p: { style: HouseStyle; x: number; y: number; ink: string }) {
  const { x, y } = p;
  const top = y - 17;
  let cloth: string;
  switch (p.style) {
    case 'heritage':
      cloth = `M${x} ${top}h15v9h-15z`;
      break;
    case 'deco':
      cloth = `M${x} ${top}h16l-4 4.5 4 4.5h-16z`;
      break;
    case 'modern':
      return (
        <g>
          <path d={`M${x} ${y}v-20M${x} ${y - 19}h9`} class="art-line" />
          <path
            d={`M${x + 1} ${y - 19}h7v14l-3.5-2.5-3.5 2.5z`}
            style={{ fill: p.ink }}
            class="art-brand hs-flag"
          />
        </g>
      );
    case 'garden':
      cloth = `M${x} ${top}l15 3.5-15 3.5z`;
      break;
    default:
      cloth = `M${x} ${top}h15v10h-15z`;
  }
  return (
    <g>
      <path d={`M${x} ${y}v-17`} class="art-line" />
      <path d={cloth} style={{ fill: p.ink }} class="art-brand hs-flag" />
      {p.style === 'civic' && (
        <path
          d={`M${x + 1.5} ${top + 1.5}h12v7h-12z`}
          class="art-line art-fine"
          style={{ stroke: 'var(--ivory)' }}
        />
      )}
      <circle cx={x} cy={top - 1} r="1" class="art-solid" />
    </g>
  );
}

/** The front door in the house style: the panel colour, its details and the handle. */
export function StyleDoor(p: { style: HouseStyle; a: FacadeAnchors['door']; ink: string }) {
  const { x, y, w, h } = p.a;
  const outline = p.a.arch ? poly(arch(x, y + h, w, h)) : `M${x} ${y}h${w}v${h}h${-w}z`;
  const mid = x + w / 2;
  const top = p.a.arch ? y + w / 2 : y;
  const inset = (dx: number, y0: number, y1: number) =>
    `M${x + dx} ${y0}h${w / 2 - dx - 1.5}v${y1 - y0}h${-(w / 2 - dx - 1.5)}zM${mid + 1.5} ${y0}h${w / 2 - dx - 1.5}v${y1 - y0}h${-(w / 2 - dx - 1.5)}z`;
  const ivory = { stroke: 'var(--ivory)' };
  switch (p.style) {
    case 'heritage':
      return (
        <g>
          <path d={outline} style={{ fill: p.ink }} class="art-brand" />
          <path
            d={
              inset(2.5, top + 3, top + (y + h - top) * 0.45) +
              inset(2.5, top + (y + h - top) * 0.55, y + h - 3)
            }
            class="art-line art-fine"
            style={ivory}
          />
          <path d={`M${mid} ${top}V${y + h}`} class="art-line art-fine" style={ivory} />
          <circle cx={mid - 2.6} cy={y + h * 0.58} r="1" class="hs-gilt" />
          <circle cx={mid + 2.6} cy={y + h * 0.58} r="1" class="hs-gilt" />
        </g>
      );
    case 'deco': {
      const rays = Array.from({ length: 7 }, (_, k) => {
        const t = Math.PI + ((k + 0.5) / 7) * Math.PI;
        return `M${mid} ${top + 6}l${(Math.cos(t) * 5).toFixed(1)} ${(Math.sin(t) * 5).toFixed(1)}`;
      }).join('');
      return (
        <g>
          <path d={outline} class="art-paper" />
          <path d={outline} class="art-tint" />
          <path d={outline} class="art-line art-fine" />
          <path
            d={`M${x} ${y + h * 0.5}h${w}M${x} ${y + h * 0.56}h${w}M${x} ${y + h * 0.84}h${w}`}
            class="hs-gilt-line"
            style={{ strokeWidth: 1.1 }}
          />
          <path d={`M${mid} ${top + 6}V${y + h}`} class="art-line art-fine" />
          <path d={rays} class="hs-gilt-line" />
        </g>
      );
    }
    case 'modern':
      return (
        <g>
          <path d={outline} class="art-paper" />
          <path d={outline} class="art-tint" />
          <path d={outline} class="art-line art-fine" />
          <path
            d={`M${x + 2} ${y + h - 3}l${w * 0.4} ${-h * 0.6}`}
            class="art-line art-fine art-faint"
          />
          <rect x={mid + 2} y={y + h * 0.3} width="1.4" height={h * 0.45} style={{ fill: p.ink }} />
        </g>
      );
    case 'garden': {
      const cy = top + (y + h - top) * 0.3;
      const leaves = Array.from({ length: 10 }, (_, k) => {
        const t = (k / 10) * Math.PI * 2;
        return `M${(mid + Math.cos(t) * 3.4).toFixed(1)} ${(cy + Math.sin(t) * 3.4).toFixed(1)}l${(Math.cos(t + 1.2) * 1.6).toFixed(1)} ${(Math.sin(t + 1.2) * 1.6).toFixed(1)}`;
      }).join('');
      return (
        <g>
          <path d={outline} style={{ fill: p.ink }} class="art-brand" />
          <circle cx={mid} cy={cy} r="3.4" class="art-paper" />
          <circle cx={mid} cy={cy} r="3.4" class="art-tint" />
          <path d={leaves} class="art-line art-fine" />
          <circle cx={mid} cy={cy + 3.6} r="0.9" style={{ fill: 'var(--oxblood)' }} />
          <path d={inset(2.5, cy + 6, y + h - 3)} class="art-line art-fine" style={ivory} />
          <circle cx={x + w - 3} cy={y + h * 0.6} r="1" class="hs-gilt" />
        </g>
      );
    }
    default: {
      const panels =
        inset(2.2, top + 2.5, top + (y + h - top) * 0.48) +
        inset(2.2, top + (y + h - top) * 0.52, y + h - 2.5);
      return (
        <g>
          <path d={outline} class="art-solid" />
          <path d={panels} class="art-line art-fine" style={ivory} />
          <path
            d={`M${mid - 1.6} ${y + h * 0.5}v4M${mid + 1.6} ${y + h * 0.5}v4`}
            class="hs-gilt-line"
            style={{ strokeWidth: 1 }}
          />
        </g>
      );
    }
  }
}
