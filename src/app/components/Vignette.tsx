// Panel hero vignette frame (ART_DIRECTION §3, SCREENS §0.1): a 16:9 engraved
// plate in the current city's ink on ivory paper with a 2% grain, faint
// guilloche lines in the sky, a ruled foreground and a double brass hairline.
// Scenes draw in a 320 × 150 box with the ground line at y = 132 (shifted down
// inside the 320 × 180 plate), using the shared art classes:
//   art-line / art-fine / art-faint   outlines in the ink
//   art-hatch                          45° hatching (see src/art/engrave.ts)
//   art-paper                          an ivory fill that hides what is behind
//   art-tint                           a pale wash of the ink (glass, water)
//   art-solid / art-text / art-sign    solid ink, lettering
import type { ComponentChildren } from 'preact';
import { CITIES } from '../../data/cities';
import { poly, shade, waveLine, type HatchDensity, type Pt } from '../../art/engrave';
import { peekGame } from '../store';
import './vignette.css';

export const VIGNETTE = { w: 320, h: 180, shift: 18, ground: 132 } as const;
/** Fallback ink when no game is loaded (Federal Green). */
const DEFAULT_INK = '#2E5E4E';

const SKY = [10, 19, 28]
  .map((y, i) => waveLine(0, VIGNETTE.w, y, 1.6, 40 + i * 6, i * 1.3))
  .join('');
const FOREGROUND = [154, 159, 165, 172].map((y) => `M0 ${y}H${VIGNETTE.w}`).join('');

/** The current city's ink, for vignettes and spot art. */
export function cityInk(): string {
  const s = peekGame();
  return (s && CITIES[s.world.currentCityId]?.ink) || DEFAULT_INK;
}

export function Vignette(p: {
  label: string;
  children: ComponentChildren;
  /** Override the city ink (e.g. a branch in another city). */
  ink?: string;
  /** Skip the ruled foreground when the scene draws its own (water, runway). */
  bare?: boolean;
  class?: string;
}) {
  return (
    <svg
      class={`vignette${p.class ? ` ${p.class}` : ''}`}
      viewBox={`0 0 ${VIGNETTE.w} ${VIGNETTE.h}`}
      role="img"
      aria-label={p.label}
      style={{ '--art-ink': p.ink ?? cityInk() }}
    >
      <path d={SKY} class="vg-sky" />
      {!p.bare && <path d={FOREGROUND} class="vg-fore" />}
      <g transform={`translate(0 ${VIGNETTE.shift})`}>{p.children}</g>
      <rect x="3.5" y="3.5" width={VIGNETTE.w - 7} height={VIGNETTE.h - 7} class="vg-frame" />
    </svg>
  );
}

/**
 * A solid face of a building: an ivory fill (hiding what is behind), optional
 * hatching at a density, and the ink outline.
 */
export function Face(p: {
  pts: readonly Pt[];
  density?: HatchDensity;
  angle?: number;
  outline?: 'line' | 'fine' | 'none';
}) {
  const d = poly(p.pts);
  const outline = p.outline ?? 'line';
  return (
    <g>
      <path d={d} class="art-paper" />
      {p.density && <path d={shade(p.pts, p.density, p.angle)} class="art-hatch" />}
      {outline !== 'none' && (
        <path d={d} class={outline === 'fine' ? 'art-line art-fine' : 'art-line'} />
      )}
    </g>
  );
}

/** Hatching only, over whatever is already drawn. */
export function Hatch(p: { pts: readonly Pt[]; density: HatchDensity; angle?: number }) {
  return <path d={shade(p.pts, p.density, p.angle)} class="art-hatch" />;
}
