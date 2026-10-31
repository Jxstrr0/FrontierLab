// Campaign review lines (docs/CONTENT.md §24). While a campaign runs, some review
// cards quote it instead of a category line. Each campaign has lines split by tone
// so the text matches the card's star roll: good (4–5), neutral (3), bad (1–2).
import type { RatingCategory } from './types';

export interface CampaignReviewSet {
  category: RatingCategory;
  good: string[];
  neutral: string[];
  bad: string[];
}

export const CAMPAIGN_REVIEW_LINES: Record<string, CampaignReviewSet> = {
  lobby_coffee: {
    category: 'branch',
    good: [
      'Free espresso while they set up my account? Fine, you win.',
      'The coffee bar alone is worth the trip. The demo was good too.',
      'Oat milk, real cups and a model that answered everything.',
    ],
    neutral: [
      'Coffee was nice. The demo was fine. That is the review.',
      'Free coffee, long wait. It evens out.',
    ],
    bad: [
      'Free coffee does not fix a demo that crashed twice.',
      'Queued twenty minutes for a latte and a sales pitch.',
    ],
  },
  charging: {
    category: 'branch',
    good: [
      'Charged my laptop while I waited. Small thing, big difference.',
      'Plugs at every seat. I ran my whole eval suite in the lobby.',
      'Dead phone in, full phone out, new API key on top.',
    ],
    neutral: [
      'The charging bar works. Most of the plugs, anyway.',
      'Handy chargers. Not sure I needed to visit in person.',
    ],
    bad: [
      'Every charger was taken by people not even using the product.',
      'Half the charging points were dead. Like the demo.',
    ],
  },
  saturday: {
    category: 'service',
    good: [
      'Open Saturday mornings. Thank you!',
      'Got our team onboarded on a Saturday. Monday was a breeze.',
      'Weekend hours and a real engineer on duty. Impressive.',
    ],
    neutral: [
      'Open Saturdays, but only the junior staff are in.',
      'Weekend hours are handy. Quiet, a bit slow.',
    ],
    bad: [
      'Came in Saturday as advertised. Door locked at eleven.',
      'Weekend opening, weekday attitude.',
    ],
  },
  signup_bonus: {
    category: 'rates',
    good: [
      'Came for the free credits. Might stay.',
      'The sign-up credits covered our whole pilot. Signed the contract.',
      'Free credits that actually last a month. Rare.',
    ],
    neutral: [
      'Credits were nice. Now I see the real price.',
      'Took the bonus. Still comparing labs.',
    ],
    bad: [
      'The free credits ran out in a day. Then the bill arrived.',
      'Bonus credits expire in a week. Read the small print.',
    ],
  },
  workshops: {
    category: 'service',
    good: [
      'The prompting workshop finally made it click for me.',
      'Two-hour agent workshop. Built one that sorts my inbox.',
      'Their trainer answered every awkward question. Patient people.',
    ],
    neutral: [
      'The workshop covered the basics. I wanted the hard parts.',
      'Decent workshop. Too many slides, not enough keyboard.',
    ],
    bad: [
      'The workshop was a sales pitch with a whiteboard.',
      'Signed up for a workshop. Got a forty-minute product tour.',
    ],
  },
  paperless: {
    category: 'branch',
    good: [
      'Green compute pledge on the door, solar on the roof. I felt less guilty about the batch job.',
      'They publish what their compute runs on. More labs should.',
      'Clean power pledge, and the office feels it. Bright and calm.',
    ],
    neutral: [
      'The green pledge is nice. The prices are not greener.',
      'Solar panels look good. No idea if they power anything.',
    ],
    bad: [
      'Green pledge on the door, diesel generator out the back.',
      'Lots of talk about clean power. The aircon was arctic.',
    ],
  },
  direct_mail: {
    category: 'products',
    good: [
      'Signed up after the research newsletter. The eval results were worth the read.',
      'Their newsletter explained the new model better than the launch did.',
      'Read the newsletter, tried the feature, kept the plan.',
    ],
    neutral: [
      'The newsletter is fine. A bit long for a Tuesday.',
      'Newsletter got me in the door. The product is average.',
    ],
    bad: [
      'Three newsletters a week and the model still forgets my name.',
      'The newsletter promised a feature that is not there yet.',
    ],
  },
  sponsors: {
    category: 'branch',
    good: [
      'Saw their name on the school robotics team shirts. Nice to see a lab put money in.',
      'They sponsor the local coding club. My kid came home inspired.',
      'Community money that shows up where you can see it.',
    ],
    neutral: [
      'Nice that they sponsor things. I just want the API to work.',
      'Their logo is on the football kits now. Fine.',
    ],
    bad: [
      'Sponsoring the marathon while my ticket sits for a week.',
      'Logo on every shirt in town and nobody at the front desk.',
    ],
  },
  social: {
    category: 'products',
    good: [
      'Tried it because of a demo clip online. The agent really does file the expenses.',
      'The viral clip was real. It wrote my spreadsheet in one go.',
      'Saw the video, did not believe it, now I use it daily.',
    ],
    neutral: [
      'The demo clip was edited. The real thing is decent.',
      'Works about as well as the clip, on a good day.',
    ],
    bad: [
      'The clip showed things the app cannot do. Classic.',
      'Followed the viral video step by step. Nothing happened.',
    ],
  },
  search: {
    category: 'rates',
    good: [
      'Searched for a cheaper API and their ad was right. It was cheaper.',
      'Clicked the ad, compared the prices, switched by lunch.',
      'The ad said half price per token. It really was.',
    ],
    neutral: [
      'The ad was accurate, give or take the rate limits.',
      'Cheaper than the ad suggested. Slower too.',
    ],
    bad: [
      'The ad price was for the tiny model. Of course.',
      'Clicked a cheap ad, landed on a pricey plan. Annoying.',
    ],
  },
};

/** Picks the tone bucket for a card's star roll. */
export function campaignToneLines(set: CampaignReviewSet, stars: number): string[] {
  if (stars >= 4) return set.good;
  if (stars <= 2) return set.bad;
  return set.neutral;
}
