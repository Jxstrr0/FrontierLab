// Review cards for a rival branch (CONTENT §24, SCREENS §6). Rivals keep no
// cards in state: the panel derives a few from the branch's quality profile and
// id with a private hash-seeded generator, so they are the same every time you
// look and never touch the game's RNG streams.
import { REVIEW_CARD_SIGMA, RIVAL_REVIEW_CARDS } from '../config/balance';
import { REVIEW_LINES } from '../data/reviews';
import type { RatingCategory } from '../data/types';
import { clamp } from './math';
import { hashSeed, rngFromState } from './rng';
import type { ReviewCard, RivalBranch } from './state';

const CATEGORIES: RatingCategory[] = ['rates', 'products', 'service', 'branch'];
/** Stars at or above this read as a positive review. */
const POSITIVE_FROM = 3;

/**
 * Cards for a rival branch: alternating its best and worst categories (like
 * yours, §8), dated in the weeks before `week`, newest first.
 */
export function rivalReviewCards(
  branch: Pick<RivalBranch, 'id' | 'quality'>,
  week: number,
): ReviewCard[] {
  const rng = rngFromState(hashSeed(0, `reviews:${branch.id}`));
  const ranked = CATEGORIES.map((c, i) => ({ c, q: branch.quality[i] ?? 3 })).sort(
    (a, b) => b.q - a.q,
  );
  const best = ranked[0]!;
  const worst = ranked[ranked.length - 1]!;
  const cards: ReviewCard[] = [];
  for (let i = 0; i < RIVAL_REVIEW_CARDS; i++) {
    const pick = i % 2 === 0 ? best : worst;
    const stars = Math.round(clamp(pick.q + rng.normal(0, REVIEW_CARD_SIGMA), 1, 5));
    const lines = REVIEW_LINES[pick.c];
    const text = rng.pick(stars >= POSITIVE_FROM ? lines.pos : lines.neg);
    cards.push({
      week: Math.max(0, week - i * 2 - rng.int(0, 1)),
      category: pick.c,
      stars,
      text,
      portraitSeed: rng.int(0, 1e9),
    });
  }
  return cards;
}
