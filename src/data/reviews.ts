// Review card templates (docs/CONTENT.md §24). Picked by category and sentiment,
// with campaign-specific lines when that campaign is active.
import type { RatingCategory } from './types';

export const REVIEW_LINES: Record<RatingCategory, { pos: string[]; neg: string[] }> = {
  rates: {
    pos: [
      'Best savings rate in town. Moved everything over.',
      "Got a better mortgage rate here than my parents' bank.",
    ],
    neg: [
      'Their mortgage rate is way above the bank across the street.',
      'Twelve bucks a month for chequing? Pass.',
    ],
  },
  service: {
    pos: [
      'In and out in five minutes. Teller remembered my name.',
      'My advisor actually explained everything.',
    ],
    neg: ['Forty minutes in line for a deposit.', 'Nobody at the desk for ages.'],
  },
  branch: {
    pos: [
      'Feels like a proper bank. Marble floors and all.',
      'Bright, clean, quiet. Nice place to sign a mortgage.',
    ],
    neg: ["Looks like it hasn't been redone since the 90s.", 'The ATM ate my card. Again.'],
  },
  products: {
    pos: [
      'Finally a card with decent cashback.',
      'They had exactly the account my business needed.',
    ],
    neg: ['No student account? Come on.', "Couldn't get a line of credit here."],
  },
};

export const CAMPAIGN_REVIEW_LINES: Record<string, { category: RatingCategory; text: string }> = {
  lobby_coffee: {
    category: 'branch',
    text: 'Free espresso while I signed my mortgage papers? Fine, you win.',
  },
  charging: {
    category: 'branch',
    text: 'Charged my phone while I waited. Small thing, big difference.',
  },
  saturday: { category: 'service', text: 'Open Saturday mornings. Thank you!' },
  signup_bonus: { category: 'rates', text: 'Came for the $300 bonus. Might stay.' },
  workshops: { category: 'service', text: 'The money workshop helped me finally make a budget.' },
};
