// Generated names and descriptions (CONTENT §15, §18): place-style stems and
// coined brands for chartered banks, sector-fitting startup names, and startup
// descriptions from "{offer} for {customer}" templates. Pure functions of an
// Rng, so the same seed gives the same names.
import { NAME_GEN } from '../config/balance';
import {
  BRAND_CODAS,
  BRAND_ENDINGS,
  BRAND_ONSETS,
  BRAND_REJECT,
  BRAND_VOWELS,
  GENERIC_SUFFIXES,
  PLACE_HEADS,
  PLACE_TAILS,
  SECTOR_SUFFIXES,
  STARTUP_WORDS,
} from '../data/nameParts';
import { STARTUP_BLURBS } from '../data/startupBlurbs';
import type { Rng } from './rng';

/** "Ash" + "combe" → "Ashcombe". */
export function placeStem(rng: Rng): string {
  return `${rng.pick(PLACE_HEADS)}${rng.pick(PLACE_TAILS)}`;
}

/** A pronounceable invented brand, e.g. "Quinly", within NAME_GEN.brandLength letters. */
export function coinedBrand(rng: Rng): string {
  const [lo, hi] = NAME_GEN.brandLength;
  let name = '';
  for (let i = 0; i < NAME_GEN.tries; i++) {
    name =
      rng.pick(BRAND_ONSETS) +
      rng.pick(BRAND_VOWELS) +
      rng.pick(BRAND_CODAS) +
      rng.pick(BRAND_ENDINGS);
    const clean = !BRAND_REJECT.some((re) => re.test(name));
    if (clean && name.length >= lo && name.length <= hi) return name;
  }
  return name;
}

/** A startup name: "{word} {sector suffix}", a coined brand, or a coined brand with a suffix. */
export function startupName(rng: Rng, sectorId: string): string {
  const suffixes = SECTOR_SUFFIXES[sectorId] ?? GENERIC_SUFFIXES;
  const w = NAME_GEN.startupPatterns;
  const pattern = rng.pickWeighted([
    { item: 'word' as const, weight: w.word },
    { item: 'coined' as const, weight: w.coined },
    { item: 'coinedSuffix' as const, weight: w.coinedSuffix },
  ]);
  if (pattern === 'coined') return coinedBrand(rng);
  if (pattern === 'coinedSuffix') return `${coinedBrand(rng)} ${rng.pick(suffixes)}`;
  return `${rng.pick(STARTUP_WORDS)} ${rng.pick(suffixes)}`;
}

/** "{offer} for {customer}", or one of the sector's handwritten lines. */
export function startupBlurb(rng: Rng, sectorId: string, handwritten: readonly string[]): string {
  const parts = STARTUP_BLURBS[sectorId];
  if (!parts || (handwritten.length > 0 && rng.chance(NAME_GEN.handwrittenBlurb))) {
    return rng.pick(handwritten);
  }
  return `${rng.pick(parts.offers)} for ${rng.pick(parts.customers)}`;
}
