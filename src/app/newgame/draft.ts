// The New Game wizard's working state: everything the player has chosen so far,
// before it becomes NewGameOptions on the last step.
import { BRAND_INKS } from '../../data/brandInks';
import { CITIES } from '../../data/cities';
import type { Difficulty, HouseStyle } from '../../data/types';
import { HOUSE_STYLE_IDS } from '../../data/houseStyles';
import { COMPETITORS, START_CASH } from '../../config/balance';
import type { AvatarSpec, Settings } from '../../sim/state';
import { loadPrefs } from '../saves';

export interface Draft {
  bankName: string;
  monogram: string;
  /** Once the player types their own monogram we stop auto-filling it. */
  monogramEdited: boolean;
  brandInk: string;
  /** The look every branch front shares. */
  houseStyle: HouseStyle;
  founderName: string;
  avatar: AvatarSpec;
  cityId: string;
  difficulty: Difficulty;
  competitors: number;
  startCash: number;
  /** Currency symbol money is shown in (changeable later in Settings). */
  currency: Settings['currency'];
  seed: number;
}

export const NAME_MAX = 24;
export const MONOGRAM_LENGTH = 2;

/** The city's usual rival count, kept inside the allowed 1–5. */
export function usualCompetitors(cityId: string): number {
  const usual = CITIES[cityId]?.rivals ?? COMPETITORS.min;
  return Math.min(COMPETITORS.max, Math.max(COMPETITORS.min, usual));
}

export function randomSeed(): number {
  return (Math.random() * 2 ** 31) >>> 0;
}

export function initialDraft(): Draft {
  const cityId = 'cal';
  return {
    bankName: '',
    monogram: '',
    monogramEdited: false,
    brandInk: BRAND_INKS[0]!.hex,
    houseStyle: HOUSE_STYLE_IDS[0]!,
    founderName: '',
    avatar: { head: 0, hair: 0, facial: 0, glasses: 0, attire: 0, tone: 0, shade: 1 },
    cityId,
    difficulty: 'normal',
    competitors: usualCompetitors(cityId),
    startCash: START_CASH,
    currency: loadPrefs().currency ?? '$',
    seed: randomSeed(),
  };
}

/** Two letters for the medallion: the first letters of two words, or the first two of one. */
export function monogramFor(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean);
  const letters =
    words.length >= MONOGRAM_LENGTH
      ? words.slice(0, MONOGRAM_LENGTH).map((w) => w[0])
      : (words[0] ?? '').split('').slice(0, MONOGRAM_LENGTH);
  return letters.join('').toUpperCase();
}
