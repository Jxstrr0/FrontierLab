// Slider maths for the AI model mix editor (SCREENS §10 Manage models,
// §13 My model). The sliders work in whole percents that always add up to
// 100: moving one slider rescales the others in proportion (or shares the
// rest equally when they are all at zero), so a one-handed player never has
// to balance the total by hand. Pure functions, no state.

/** Whole percents per data input id. */
export type PercentMix = Record<string, number>;

const TOTAL = 100;

/**
 * Splits `total` whole units over `weights` in proportion, by largest
 * remainder (ties go to the earlier entry), so the parts add up exactly.
 */
export function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (weights.length === 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) =>
    sum > 0 ? (Math.max(0, w) / sum) * total : total / weights.length,
  );
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i]! += 1;
    left -= 1;
  }
  return out;
}

/** A stored mix (fractions summing to 1) as whole percents over `ids`. */
export function toPercents(mix: Record<string, number>, ids: readonly string[]): PercentMix {
  const parts = apportion(
    ids.map((id) => mix[id] ?? 0),
    TOTAL,
  );
  const sum = ids.reduce((a, id) => a + (mix[id] ?? 0), 0);
  const out: PercentMix = {};
  ids.forEach((id, i) => (out[id] = sum > 0 ? parts[i]! : 0));
  return out;
}

/** Whole percents back to the fractions the commands take (zeros dropped). */
export function fromPercents(pcts: PercentMix): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(pcts)) if (v > 0) out[id] = v / TOTAL;
  return out;
}

export const percentTotal = (pcts: PercentMix) => Object.values(pcts).reduce((a, b) => a + b, 0);

/**
 * Sets one input to `value` (0–100) and rescales the other `open` inputs so
 * the total stays 100. Inputs not in `open` (locked ones) go to zero. When the
 * changed input is the only open one it takes the whole 100.
 */
export function rebalance(
  pcts: PercentMix,
  id: string,
  value: number,
  open: readonly string[],
): PercentMix {
  const others = open.filter((o) => o !== id);
  const out: PercentMix = {};
  for (const key of Object.keys(pcts)) out[key] = 0;
  const v = others.length === 0 ? TOTAL : Math.round(Math.min(TOTAL, Math.max(0, value)));
  out[id] = v;
  const parts = apportion(
    others.map((o) => pcts[o] ?? 0),
    TOTAL - v,
  );
  others.forEach((o, i) => (out[o] = parts[i]!));
  return out;
}
