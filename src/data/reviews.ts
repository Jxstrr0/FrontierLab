// Review card templates (docs/CONTENT.md §24). Picked by category and sentiment,
// with campaign-specific lines when that campaign is active.
import type { RatingCategory } from './types';

export const REVIEW_LINES: Record<RatingCategory, { pos: string[]; neg: string[] }> = {
  rates: {
    pos: [
      'Best savings rate in town. Moved everything over.',
      "Got a better mortgage rate here than my parents' bank.",
      'No monthly fee on chequing. About time someone did that.',
      'My GIC pays more here than anywhere I checked.',
    ],
    neg: [
      'Their mortgage rate is way above the bank across the street.',
      'Twelve bucks a month for chequing? Pass.',
      'Savings rate rounds down to nothing. Might as well use a jar.',
      'Card interest that high should come with a warning label.',
    ],
  },
  service: {
    pos: [
      'In and out in five minutes. Teller remembered my name.',
      'My advisor actually explained everything.',
      'Sorted out a lost card in one visit. No fuss.',
      'The manager came out to help when the line got long.',
    ],
    neg: [
      'Forty minutes in line for a deposit.',
      'Nobody at the desk for ages.',
      'Three visits to change my address. Three.',
      'The teller looked at me like I was interrupting.',
    ],
  },
  branch: {
    pos: [
      'Feels like a proper bank. Marble floors and all.',
      'Bright, clean, quiet. Nice place to sign a mortgage.',
      'Easy parking and the ATM always has cash.',
      'Comfy chairs and a proper private office for the advisor.',
    ],
    neg: [
      "Looks like it hasn't been redone since the 90s.",
      'The ATM ate my card. Again.',
      'Cramped lobby. You can hear every conversation.',
      'Door handle came off in my hand. Says it all.',
    ],
  },
  products: {
    pos: [
      'Finally a card with decent cashback.',
      'They had exactly the account my business needed.',
      'Opened a student account in ten minutes flat.',
      'Mortgage, car loan and savings all in one place. Simple.',
    ],
    neg: [
      'No student account? Come on.',
      "Couldn't get a line of credit here.",
      'Wanted a mortgage. They looked at me like I asked for a kidney.',
      'Their card has no perks at all. Not even points.',
    ],
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
