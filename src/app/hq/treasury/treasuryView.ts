// Pure view helpers for the Compute floor and credit lines (SCREENS §10):
// friendly term text and a "nice" step for amount sliders. No state access,
// so they are easy to test.
import { WEEKS_PER_YEAR } from '../../../config/balance';

/** 26 → "26 weeks", 52 → "1 year", 260 → "5 years", 78 → "78 weeks". */
export function termText(weeks: number): string {
  if (weeks === 1) return '1 week';
  if (weeks >= WEEKS_PER_YEAR && weeks % WEEKS_PER_YEAR === 0) {
    const years = weeks / WEEKS_PER_YEAR;
    return years === 1 ? '1 year' : `${years} years`;
  }
  return `${weeks} weeks`;
}

/** Steps a slider can take: 1, 2 or 5 times a power of ten. */
const NICE = [1, 2, 5] as const;

/**
 * A round step that gives an amount slider about `stops` positions up to
 * `max`, never below `floor`: niceStep(48_000_000) → 500,000.
 */
export function niceStep(max: number, floor = 1_000, stops = 100): number {
  const raw = Math.max(floor, max / stops);
  const pow = 10 ** Math.floor(Math.log10(raw));
  for (const n of NICE) if (n * pow >= raw) return n * pow;
  return 10 * pow;
}

/** Clamps a slider amount to 0…max and rounds it to the step (max itself stays reachable). */
export function snapAmount(value: number, max: number, step: number): number {
  if (max <= 0) return 0;
  if (value >= max) return max;
  return Math.max(0, Math.min(max, Math.round(value / step) * step));
}

/** Tone for a gain or loss figure. */
export function gainTone(x: number): 'good' | 'bad' | 'flat' {
  return x > 0.5 ? 'good' : x < -0.5 ? 'bad' : 'flat';
}
