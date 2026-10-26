// The title cover's skyline panel, "Living skyline" (docs/COVER_SCREEN.md):
// a paper panel with the map's frame rules and microprint, showing a faint
// guilloche until the city strip is printed (coverPrint.ts, its own chunk),
// then crossfading the city in. CSS pans the printed strip slowly left and
// right; reduced motion holds it still, and the pan pauses while the page is
// hidden. Any failure leaves the empty paper panel; the menu never waits on it.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  COVER_FADE_MS,
  COVER_PAN_SECONDS,
  COVER_RESIZE_SLACK,
  COVER_WAVES,
} from '../../config/cover';
import { CITIES } from '../../data/cities';
import { coverLabel, type CoverChoice, type Size } from './coverCity';

/** Placeholder guilloche in a 360 × 420 box (stretched to the panel): stacked sine waves. */
const WAVE_BOX = { width: 360, height: 420 };
const WAVES = Array.from({ length: COVER_WAVES.count }, (_, k) => {
  const { amplitude, period } = COVER_WAVES;
  const y0 = ((k + 1) * WAVE_BOX.height) / (COVER_WAVES.count + 1);
  const phase = (k * period) / 3;
  let d = '';
  for (let x = 0; x <= WAVE_BOX.width; x += 4) {
    const y = y0 + amplitude * Math.sin(((x + phase) / period) * 2 * Math.PI);
    d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
  }
  return d;
});

const measure = (el: HTMLElement): Size => {
  const r = el.getBoundingClientRect();
  return { width: Math.round(r.width), height: Math.round(r.height) };
};

export function CoverSkyline(p: { choice: CoverChoice }) {
  const city = CITIES[p.choice.cityId];
  const windowRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [printed, setPrinted] = useState<{ pan: number; flags: number } | null>(null);
  const [hidden, setHidden] = useState(false);

  // Measure the panel, and again after a resize big enough to need a new strip.
  useLayoutEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    setSize(measure(el));
    const onResize = () =>
      setSize((prev) => {
        const next = measure(el);
        const moved =
          !prev ||
          Math.abs(prev.width - next.width) > COVER_RESIZE_SLACK ||
          Math.abs(prev.height - next.height) > COVER_RESIZE_SLACK;
        return moved ? next : prev;
      });
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Print the strip for this city and size; free it when leaving or reprinting.
  useEffect(() => {
    const host = hostRef.current;
    if (!size || !host || size.width <= 0 || size.height <= 0) return;
    let cancelled = false;
    let canvas: HTMLCanvasElement | null = null;
    setPrinted(null);
    import('./coverPrint')
      .then(({ printCover }) => printCover(p.choice, size, devicePixelRatio || 1, () => cancelled))
      .then((out) => {
        if (!out || cancelled) return;
        canvas = out.canvas;
        canvas.className = 'cover-canvas';
        canvas.style.width = `${out.width}px`;
        canvas.style.height = `${out.height}px`;
        host.style.width = `${out.width}px`;
        host.style.left = `${-out.pan}px`;
        host.replaceChildren(canvas);
        setPrinted({ pan: out.pan, flags: out.flags });
      })
      .catch(() => {
        // Keep the empty paper panel: the cover is decoration, never an error.
      });
    return () => {
      cancelled = true;
      if (canvas) {
        canvas.remove();
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [p.choice, size]);

  const ink = city?.ink ?? 'var(--ledger-ink)';
  const micro = Array.from({ length: 12 }, () => city?.name ?? 'Frontier Lab').join(' · ');
  const style = {
    '--cover-ink': ink,
    '--cover-pan': `${printed?.pan ?? 0}px`,
    '--cover-pan-seconds': `${COVER_PAN_SECONDS}s`,
    '--cover-fade': `${COVER_FADE_MS}ms`,
  };
  return (
    <div
      class={`cover${printed ? ' cover-printed' : ''}${hidden ? ' cover-paused' : ''}`}
      role="img"
      aria-label={coverLabel(p.choice.cityId, printed?.flags ?? 0)}
      style={style}
    >
      <div class="cover-window" ref={windowRef}>
        <svg
          class="cover-waves"
          style={{ opacity: COVER_WAVES.opacity }}
          viewBox={`0 0 ${WAVE_BOX.width} ${WAVE_BOX.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <g fill="none" stroke="currentColor" stroke-width="0.8">
            {WAVES.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </svg>
        <div class="cover-strip" ref={hostRef} aria-hidden="true" />
      </div>
      <div class="cover-mat" aria-hidden="true">
        <span class="cover-micro cover-micro-top">{micro}</span>
        <span class="cover-micro cover-micro-bottom">{micro}</span>
      </div>
    </div>
  );
}
