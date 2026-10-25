// The map's pin marks as small SVG components (ART_DIRECTION §2 Pins; the shape
// language is in markers.ts): the bank crest, the landmark seal, the "$" coin
// and the price tag. Map pins and clusters (pinElements.ts), the Layers legend
// and panel headers all draw from here, so a type looks the same everywhere.
import { ICON_PATHS, type IconName } from '../../art/icons';
import {
  PIN_COIN_PX,
  PIN_CREST_CROWN_PX,
  PIN_CREST_PX,
  PIN_LANDMARK_PX,
} from '../../config/mapView';
import { glyphInk, MARKERS, type MarkerId } from './markers';

/** One icon from the shared set, scaled into a mark: `px` wide, centred on (cx, cy). */
export function Glyph(p: {
  icon: IconName;
  cx: number;
  cy: number;
  px: number;
  /** Stroke width in final pixels. */
  stroke: number;
  color: string;
}) {
  const s = p.px / 24;
  return (
    <g
      transform={`translate(${p.cx - p.px / 2} ${p.cy - p.px / 2}) scale(${s})`}
      fill="none"
      stroke={p.color}
      stroke-width={p.stroke / s}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d={ICON_PATHS[p.icon]} />
    </g>
  );
}

// Shield outline and its engraved inner line, on a 30 × 34 box.
const SHIELD = 'M3 4.6Q15 1.2 27 4.6V15.4c0 8-5.5 13.3-12 16.4C8.5 28.7 3 23.4 3 15.4z';
const SHIELD_INNER =
  'M5.8 7Q15 4.4 24.2 7V15.4c0 6.5-4.3 10.9-9.2 13.4C10.1 26.3 5.8 21.9 5.8 15.4z';
// A three-point crown above the shield (head offices), in the box's negative y.
const CROWN = 'M8.2 5 6.6-1.4l4 2.8L15-3.6l4.4 5 4-2.8L21.8 5z';

/**
 * A bank crest: yours filled with your brand ink, a rival's ivory ringed in
 * its ink, both with the bank's monogram. `crowned` marks a head office.
 */
export function Crest(p: {
  ink: string;
  monogram: string;
  rival?: boolean;
  crowned?: boolean;
  /** Width in px (height follows the 30 × 34 box). */
  width?: number;
}) {
  const w = p.width ?? PIN_CREST_PX.w;
  const crown = p.crowned ? PIN_CREST_CROWN_PX : 0;
  const boxH = PIN_CREST_PX.h + crown;
  const k = w / PIN_CREST_PX.w;
  return (
    <svg
      class="medallion crest"
      width={w}
      height={boxH * k}
      viewBox={`0 ${-crown} ${PIN_CREST_PX.w} ${boxH}`}
      aria-hidden="true"
    >
      {p.crowned && (
        <path d={CROWN} fill="var(--brass-light)" stroke="var(--brass)" stroke-width="1" />
      )}
      <path
        d={SHIELD}
        fill={p.rival ? 'var(--ivory)' : p.ink}
        stroke="var(--brass)"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path
        d={SHIELD_INNER}
        fill="none"
        stroke={p.rival ? p.ink : 'var(--brass-light)'}
        stroke-width={p.rival ? 2 : 0.7}
        stroke-dasharray={p.rival ? undefined : '1 1.2'}
        stroke-linejoin="round"
      />
      <text
        x="15"
        y="16.2"
        text-anchor="middle"
        dominant-baseline="central"
        class="medallion-text"
        fill={p.rival ? p.ink : 'var(--ivory)'}
      >
        {p.monogram}
      </text>
    </svg>
  );
}

/**
 * Scalloped seal edge on a 40-unit box, like the rosette of a banknote's seal:
 * SEAL_SCALLOPS shallow arcs between points on a circle (each arc's radius is
 * 1.5 × half its chord, so it bulges about 0.4 × half-chord outward).
 */
const SEAL_SCALLOPS = 20;
const SEAL_PATH = (() => {
  const c = 20;
  const r = 17.4;
  const pts = Array.from({ length: SEAL_SCALLOPS }, (_, i) => {
    const a = (i / SEAL_SCALLOPS) * Math.PI * 2 - Math.PI / 2;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  });
  const bump = 1.5 * r * Math.sin(Math.PI / SEAL_SCALLOPS);
  const f = (n: number) => n.toFixed(2);
  return (
    `M${f(pts[0]![0])} ${f(pts[0]![1])}` +
    pts
      .map((_, i) => {
        const [x, y] = pts[(i + 1) % SEAL_SCALLOPS]!;
        return `A${f(bump)} ${f(bump)} 0 0 1 ${f(x)} ${f(y)}`;
      })
      .join('') +
    'z'
  );
})();

/** A landmark's scalloped seal in its ink with the glyph engraved in the middle. */
export function LandmarkSeal(p: { marker: MarkerId; size?: number; class?: string }) {
  const size = p.size ?? PIN_LANDMARK_PX;
  const m = MARKERS[p.marker];
  // The central bank keeps its navy-and-brass look; other seals take ivory glyphs.
  const glyph = p.marker === 'centralBank' ? 'var(--brass-light)' : 'var(--ivory)';
  return (
    <svg
      class={`medallion seal${p.class ? ` ${p.class}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <path d={SEAL_PATH} fill={m.ink} stroke="var(--brass)" stroke-width="1.4" />
      <circle cx="20" cy="20" r="13.6" fill="none" stroke="var(--brass-light)" stroke-width="0.8" />
      <circle
        cx="20"
        cy="20"
        r="11.9"
        fill="none"
        stroke="var(--brass-light)"
        stroke-width="0.5"
        stroke-dasharray="0.8 1.3"
        opacity="0.8"
      />
      {p.marker === 'airport' ? (
        // The plane is a filled silhouette, banking up along its route.
        <g transform="translate(9.6 9.6) scale(0.87) rotate(-28 12 12)">
          <path d={ICON_PATHS.plane} fill={glyph} stroke={glyph} stroke-width="0.7" />
        </g>
      ) : (
        <Glyph icon={m.icon} cx={20} cy={20} px={20} stroke={1.8} color={glyph} />
      )}
    </svg>
  );
}

/** An open branch location: a small ivory coin with a milled edge and a plain "$". */
export function LotCoin(p: { size?: number }) {
  const size = p.size ?? PIN_COIN_PX;
  return (
    <svg class="medallion coin" width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="10" fill="var(--ivory)" stroke="var(--brass)" stroke-width="1.4" />
      <circle
        class="coin-ring"
        cx="11"
        cy="11"
        r="8.2"
        fill="none"
        stroke="var(--brass)"
        stroke-width="0.8"
        stroke-dasharray="0.7 1.1"
      />
      <text
        x="11"
        y="11.6"
        text-anchor="middle"
        dominant-baseline="central"
        class="coin-text"
        fill="var(--ledger-ink)"
      >
        $
      </text>
    </svg>
  );
}

/** A price tag in the type's ink: punched hole, glyph and (unless compact) a word. */
export function TagMark(p: { marker: MarkerId; text?: string }) {
  const m = MARKERS[p.marker];
  return (
    <span
      class="tag-mark"
      style={{ '--tag-ink': m.ink, '--tag-text': glyphInk(p.marker) }}
      aria-hidden="true"
    >
      <span class="tag-face">
        <svg
          class="tag-glyph"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--tag-text)"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d={ICON_PATHS[m.icon]} />
        </svg>
        {p.text && <span class="tag-text">{p.text}</span>}
      </span>
    </span>
  );
}
