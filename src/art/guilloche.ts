// Guilloche geometry: the looping engraved curves printed on banknotes
// (docs/ART_DIRECTION.md §2, §5). Pure functions that return SVG path data,
// so they can be unit-tested and reused by the map, rosettes and title art.

export interface RosetteRing {
  /** Outer radius of the ring in SVG units. */
  radius: number;
  /** Number of petals (lobes) around the ring. */
  petals: number;
  /** How far each petal swings in and out, as a fraction of radius (0–1). */
  depth: number;
  /** Rotation of the whole ring in radians. */
  phase?: number;
}

/**
 * A closed petal curve: r(θ) = R × (1 − depth × (1 + cos(petals × θ)) / 2).
 * Returns an SVG path "d" string centred on (cx, cy), drawn with `steps` segments.
 */
export function rosetteRingPath(cx: number, cy: number, ring: RosetteRing, steps = 360): string {
  const { radius, petals, depth, phase = 0 } = ring;
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = radius * (1 - (depth * (1 + Math.cos(petals * t))) / 2);
    const x = cx + r * Math.cos(t + phase);
    const y = cy + r * Math.sin(t + phase);
    parts.push(`${i === 0 ? 'M' : 'L'}${round2(x)} ${round2(y)}`);
  }
  return parts.join('') + 'Z';
}

/**
 * A full rosette: `count` copies of a petal ring, each rotated a little further,
 * which produces the interlaced mesh typical of banknote engraving.
 */
export function rosettePaths(
  cx: number,
  cy: number,
  ring: RosetteRing,
  count: number,
  steps = 360,
): string[] {
  const out: string[] = [];
  const step = (Math.PI * 2) / ring.petals / count;
  for (let k = 0; k < count; k++) {
    out.push(rosetteRingPath(cx, cy, { ...ring, phase: (ring.phase ?? 0) + k * step }, steps));
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
