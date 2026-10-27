// Review card templates (docs/CONTENT.md §24). Picked by category and sentiment,
// with campaign-specific lines when that campaign is active.
import type { RatingCategory } from './types';

export const REVIEW_LINES: Record<RatingCategory, { pos: string[]; neg: string[] }> = {
  rates: {
    pos: [
      'Pro costs less here than anywhere else I tried. Switched the whole team.',
      'The free tier actually does real work. No nagging to upgrade.',
      'API pricing is cheap enough to leave a batch job running all night.',
      'Annual plan paid for itself in a month.',
    ],
    neg: [
      'Forty a month for Plus? The lab across the street charges half.',
      'Ran one big job and the API bill made me sit down.',
      'The free tier is so capped it is basically a demo.',
      'Team seats priced like they think we are a bank.',
    ],
  },
  service: {
    pos: [
      'Support answered in five minutes and fixed it in ten.',
      'Someone at the office walked me through the whole setup.',
      'Got my billing mix-up sorted in one email. No fuss.',
      'The office manager joined our onboarding call.',
    ],
    neg: [
      'Three days waiting on a support ticket.',
      'Nobody at the front desk for ages.',
      'Asked to change my plan three times. Three.',
      'Support read me the help page word for word.',
    ],
  },
  branch: {
    pos: [
      'Beautiful office. Felt like visiting the future.',
      'Bright, quiet demo room. Nice place to try the new model.',
      'Fast wifi, good coffee and a proper desk to work at.',
      'Comfy chairs and a private room for our workshop.',
    ],
    neg: [
      "Office looks like it hasn't been redone since the 90s.",
      'The demo kiosk froze. Again.',
      'Cramped lobby. You can hear every sales pitch.',
      'Door handle came off in my hand. Says it all.',
    ],
  },
  products: {
    pos: [
      'The code assistant writes half my pull requests now.',
      'They had exactly the plan my startup needed.',
      'Set up the campus plan for my class in ten minutes flat.',
      'Chat, API and agents all on one bill. Simple.',
    ],
    neg: [
      'No campus plan? Come on.',
      "Couldn't get a business loan out of them.",
      'The model got my simple question confidently wrong.',
      'The apps have no extras at all. Not even image tools.',
    ],
  },
};

export const CAMPAIGN_REVIEW_LINES: Record<string, { category: RatingCategory; text: string }> = {
  lobby_coffee: {
    category: 'branch',
    text: 'Free espresso while they set up my account? Fine, you win.',
  },
  charging: {
    category: 'branch',
    text: 'Charged my laptop while I waited. Small thing, big difference.',
  },
  saturday: { category: 'service', text: 'Open Saturday mornings. Thank you!' },
  signup_bonus: { category: 'rates', text: 'Came for the free credits. Might stay.' },
  workshops: { category: 'service', text: 'The prompting workshop finally made it click for me.' },
};
