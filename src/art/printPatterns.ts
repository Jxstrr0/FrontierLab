// Seamless repeating "print" patterns for the map ground (ART_DIRECTION §2):
// the paper's faint guilloche wave mesh and the water's wavy lines over a pale
// ink tint. Each is drawn once per zoom stop into a small tile whose size is a
// whole number of device pixels, then filled with a world-anchored pattern, so
// a chunk pays for one pattern fill instead of thousands of curve segments.
import { context2d, createCanvas, mix, rgba, type Ctx2D } from './canvasKit';

/** Visual tuning (CSS px at the zoom stop). */
const PRINT = {
  /** Guilloche: line spacing, lines per vertical repeat, wave length, look. */
  meshCss: [7, 9, 11],
  meshLines: 12,
  meshWaveWorld: 140,
  meshAmp: 0.9,
  meshAlpha: 0.1,
  meshWeightCss: 0.4,
  /** Water: line spacing, lines per repeat, wave length, look. */
  waveCss: [3.2, 4.2, 5.2],
  waveLines: 7,
  waveWorld: 46,
  waveAmp: 0.3,
  waveAlpha: 0.5,
  waveWeightCss: 0.42,
  tint: 0.13,
} as const;

interface WaveSpec {
  /** Tile size in device px. */
  w: number;
  h: number;
  lines: number;
  amp: number;
  /** Phase step between lines, in turns of the wave, per direction. */
  dirs: readonly (1 | -1)[];
  phaseTurns: number;
  stroke: string;
  weight: number;
  background: string | null;
}

function waveTile(spec: WaveSpec): ReturnType<typeof createCanvas> {
  const tile = createCanvas(spec.w, spec.h);
  const t = context2d(tile);
  if (spec.background) {
    t.fillStyle = spec.background;
    t.fillRect(0, 0, spec.w, spec.h);
  }
  const spacing = spec.h / spec.lines;
  const steps = Math.max(12, Math.round(spec.w / 4));
  t.beginPath();
  for (const dir of spec.dirs) {
    // One extra line above and below so waves crossing the tile edge wrap.
    for (let k = -1; k <= spec.lines; k++) {
      const ph = (k * spec.phaseTurns * dir) % 1;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * spec.w;
        const y = k * spacing + spec.amp * Math.sin(Math.PI * 2 * ((x / spec.w) * dir + ph));
        if (i === 0) t.moveTo(x, y);
        else t.lineTo(x, y);
      }
    }
  }
  t.strokeStyle = spec.stroke;
  t.lineWidth = spec.weight;
  t.stroke();
  return tile;
}

function toPattern(ctx: Ctx2D, tile: ReturnType<typeof createCanvas>, scale: number) {
  const p = ctx.createPattern(tile as CanvasImageSource, 'repeat');
  if (!p) throw new Error('pattern unavailable');
  p.setTransform(new DOMMatrix([1 / scale, 0, 0, 1 / scale, 0, 0]));
  return p;
}

/** Paper plus the guilloche mesh: an opaque pattern for the whole ground. */
export function paperPattern(
  ctx: Ctx2D,
  ink: string,
  paper: string,
  lod: number,
  stop: number,
  dpr: number,
): CanvasPattern {
  const scale = stop * dpr;
  const spacing = PRINT.meshCss[lod]! * dpr;
  const h = Math.max(4, Math.round(spacing * PRINT.meshLines));
  const tile = waveTile({
    w: Math.max(4, Math.round(PRINT.meshWaveWorld * scale)),
    h,
    lines: PRINT.meshLines,
    amp: (h / PRINT.meshLines) * PRINT.meshAmp,
    dirs: [1, -1],
    phaseTurns: 1 / PRINT.meshLines,
    stroke: rgba(ink, PRINT.meshAlpha),
    weight: Math.max(0.5, PRINT.meshWeightCss * dpr),
    background: paper,
  });
  return toPattern(ctx, tile, scale);
}

/** Pale ink tint with wavy horizontal lines: an opaque pattern for water. */
export function waterPattern(
  ctx: Ctx2D,
  ink: string,
  paper: string,
  lod: number,
  stop: number,
  dpr: number,
): CanvasPattern {
  const scale = stop * dpr;
  const spacing = PRINT.waveCss[lod]! * dpr;
  const h = Math.max(4, Math.round(spacing * PRINT.waveLines));
  const tile = waveTile({
    w: Math.max(4, Math.round(PRINT.waveWorld * scale)),
    h,
    lines: PRINT.waveLines,
    amp: (h / PRINT.waveLines) * PRINT.waveAmp,
    dirs: [1],
    phaseTurns: 2 / PRINT.waveLines,
    stroke: rgba(ink, PRINT.waveAlpha),
    weight: Math.max(0.5, PRINT.waveWeightCss * dpr),
    background: mix(paper, ink, PRINT.tint),
  });
  return toPattern(ctx, tile, scale);
}
