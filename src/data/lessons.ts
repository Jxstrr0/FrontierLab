// Tutorial Part 2, "Growing the bank" (SCREENS §27.2, DESIGN §5.20): the
// guides that start when a later mechanic opens up, and the one-time tips the
// first time you open each HQ floor, map place and decision popup. Same guide,
// same bar and brass ring as Part 1 (tutorial.ts). Lines are keyed by the
// target the ring is on; `here` is said once you are on the screen a step is
// about. When each guide starts is decided in src/app/tutorial/lessons.ts.
import type { DeptId } from './types';

/** Every data-tutorial target the guides point at. */
export type LessonTarget =
  | 'hud-bank'
  | 'hud-menu'
  | 'hud-travel'
  | 'menu-hq'
  | 'menu-personal-wealth'
  | 'panel-close'
  | 'pin-office'
  | 'office-dept'
  | 'office-rent'
  | 'hq-coverage'
  | 'tab-executive'
  | 'exec-seat'
  | 'exec-open'
  | 'exec-pick'
  | 'capital-fixes'
  | 'pin-investmentBank'
  | 'tab-equity'
  | 'ipo-card'
  | 'travel-airport';

export interface LessonStepText {
  /** Shown when none of the step's targets is on screen. */
  idle: string;
  /** Shown once you are on the screen the step is about. */
  here?: string;
  /** Per target, in the order the ring prefers them (closest to done first). */
  lines: Partial<Record<LessonTarget, string>>;
  /** Ends on "Got it" rather than on something you do. */
  ack?: boolean;
}

export interface ChapterText {
  title: string;
  steps: LessonStepText[];
}

export type ChapterId = 'capital' | 'hq' | 'exec' | 'ipo' | 'travel' | 'wealth';

const CLOSE_FIRST = 'Close this panel first.';
const OPEN_MENU = 'Open the menu, top right.';

export const CHAPTERS: Record<ChapterId, ChapterText> = {
  capital: {
    title: 'Capital is slipping',
    steps: [
      {
        idle: 'Our capital ratio is slipping. Tap your bank’s cash, top left, to see it.',
        here: 'Capital is our own money set against risky loans. Under 10.5% the regulator starts to hold us back. These are the ways back up. Close this when you’ve read them.',
        lines: {
          'capital-fixes':
            'Capital is our own money set against risky loans. Under 10.5% the regulator starts to hold us back. These are the ways back up. Close this when you’ve read them.',
          'hud-bank': 'Our capital ratio is slipping. Tap your bank’s cash, top left, to see it.',
          'panel-close': CLOSE_FIRST,
        },
      },
    ],
  },
  hq: {
    title: 'Headquarters',
    steps: [
      {
        idle: 'From the third branch we need a head office. Offices for lease are tags on the map: open Layers and switch on Offices if you can’t see them.',
        lines: {
          'pin-office':
            'From the third branch the bank needs a head office: Finance, HR and the teams behind the branches. Tap an office for lease.',
          'panel-close': CLOSE_FIRST,
        },
      },
      {
        idle: 'Tap an office for lease on the map.',
        lines: {
          'office-rent':
            'Each floor holds one team. Finance and HR are the ones to start with. Tap Rent office when you’re happy.',
          'office-dept':
            'Switch on a team for each floor you want. Finance and HR are the ones to start with.',
          'pin-office': 'Tap an office for lease on the map.',
        },
      },
      {
        idle: 'Open HQ from the menu to see your teams.',
        here: 'Each floor hires towards the staff the bank needs. Coverage shows how close a team is: under 100%, things start to slip. Add floors from the last tab as we grow. Close HQ when you’re ready.',
        lines: {
          'hq-coverage':
            'Each floor hires towards the staff the bank needs. Coverage shows how close a team is: under 100%, things start to slip. Add floors from the last tab as we grow. Close HQ when you’re ready.',
          'menu-hq': 'Tap HQ.',
          'hud-menu': OPEN_MENU,
        },
      },
    ],
  },
  exec: {
    title: 'The executive suite',
    steps: [
      {
        idle: 'Open HQ from the menu, then the Executive suite.',
        lines: {
          'exec-pick':
            'Expertise lifts their part of the bank; Loyalty keeps them from being poached. Tap Hire on whoever you like.',
          'exec-seat':
            'Each seat runs part of the bank and can take whole jobs off your hands. A COO is a good first hire: tap an empty seat.',
          'tab-executive': 'Open the Executive suite tab.',
          'menu-hq': 'Tap HQ.',
          'hud-menu': OPEN_MENU,
        },
      },
      {
        idle: 'That’s our first executive. Tap their seat in the Executive suite to choose the jobs they run for you.',
        ack: true,
        lines: {
          'exec-open':
            'That’s our first executive. Tap their seat to choose the jobs they run for you: each is on from the day you hire, and you can switch any off. Tap Got it when you’re done.',
        },
      },
    ],
  },
  ipo: {
    title: 'Going public',
    steps: [
      {
        idle: 'We qualify to go public. Find an investment bank on the map: open Layers and switch on Investment Banks.',
        lines: {
          'pin-investmentBank':
            'We qualify to go public. Investment banks handle it: tap one on the map.',
          'panel-close': CLOSE_FIRST,
        },
      },
      {
        idle: 'Tap an investment bank on the map.',
        here: 'An IPO sells part of the bank on the stock market for fresh capital. After it, the board votes on your pay and dividends, and the share price follows our results. There’s no rush. Close this when you’ve had a look.',
        lines: {
          'ipo-card':
            'An IPO sells part of the bank on the stock market for fresh capital. After it, the board votes on your pay and dividends, and the share price follows our results. There’s no rush. Close this when you’ve had a look.',
          'tab-equity': 'Open the Equity tab.',
          'pin-investmentBank': 'Tap an investment bank on the map.',
        },
      },
    ],
  },
  travel: {
    title: 'A second city',
    steps: [
      {
        idle: 'This city is well covered. Tap the city name at the top to travel.',
        lines: {
          'travel-airport': 'Go to the airport to see where we can fly.',
          'hud-travel':
            'This city is well covered: more branches here would mostly split our own customers. Tap the city name to travel.',
          'panel-close': CLOSE_FIRST,
        },
      },
      {
        idle: 'Tap the city name at the top, then Go to the airport.',
        here: 'Each week’s flights are free up to a mileage allowance; the board shows what’s left. We open branches only where you are, but the ones we have keep running, and the Branches list reaches them from anywhere. Fly somewhere new, or close this to stay.',
        lines: {},
      },
    ],
  },
  wealth: {
    title: 'Your own fortune',
    steps: [
      {
        idle: 'Your salary and dividends have built up. Open the menu, top right.',
        here: 'This is your money, kept apart from the bank’s. Spend it on homes, cars and collectibles, invest it, or buy more of the bank. Close this when you’re done.',
        lines: {
          'menu-personal-wealth': 'Tap Personal wealth.',
          'hud-menu': 'Your salary and dividends have built up. Open the menu, top right.',
        },
      },
    ],
  },
};

/** First-look tips a finished guide has already said, so they don't repeat it. */
export const CHAPTER_COVERS: Partial<Record<ChapterId, readonly string[]>> = {
  exec: ['floor-executive'],
  travel: ['place-airport'],
  wealth: ['place-wealth'],
};

/** Guides start in this order when more than one is due. */
export const CHAPTER_ORDER: readonly ChapterId[] = [
  'capital',
  'hq',
  'exec',
  'ipo',
  'travel',
  'wealth',
];

export interface TipText {
  title: string;
  line: string;
}

/** First look at each HQ floor. */
export const FLOOR_TIPS: Record<DeptId, TipText> = {
  finance: {
    title: 'Finance floor',
    line: 'Finance keeps the books: full statements and the capital summary. Short-staffed, the statements run late, and once we’re public that costs fines and share price.',
  },
  hr: {
    title: 'HR floor',
    line: 'Benefits here apply to everyone and lift morale and hiring. Each card shows its weekly cost. Short-staffed, hiring slows and morale drifts.',
  },
  products: {
    title: 'Products floor',
    line: 'Set rates for every branch at once, pick our risk appetite, tune the house underwriting model, and develop new products. A better model lifts every branch’s Products rating.',
  },
  treasury: {
    title: 'Treasury floor',
    line: 'Treasury keeps enough cash on hand for withdrawals. Watch the liquidity gauge, keep auto-funding on, and look at the funding market and payroll partnerships for cheaper money.',
  },
  marketing: {
    title: 'Marketing floor',
    line: 'Brand campaigns lift awareness across a whole city or country, not just one branch. More awareness means more people walk in.',
  },
  it: {
    title: 'IT & Security floor',
    line: 'Our app rating lifts the Products rating and takes pressure off the branches. A short-staffed IT team makes breaches and outages more likely.',
  },
  risk: {
    title: 'Risk & Compliance floor',
    line: 'Loss rates, late payers and how the regulator sees us. Short-staffed, defaults and fines go up.',
  },
  executive: {
    title: 'Executive suite',
    line: 'Hire executives to run whole parts of the bank, and prepare the quarterly board meeting. Seats switch their jobs on from the day you hire.',
  },
  investment: {
    title: 'Investment floor',
    line: 'The bank’s own portfolio: stocks, startups, property and venture debt. More staff finds more startups looking for money.',
  },
};

/** First look at each map place or menu screen, by panel type. */
export const PLACE_TIPS: Record<string, TipText> = {
  rivalBranch: {
    title: 'Rival branch',
    line: 'Rivals publish their rates and reviews. Beat their rates or their service and customers drift our way.',
  },
  rivalHq: {
    title: 'Rival bank HQ',
    line: 'Rival banks lend to our company: business loans and a credit line. That’s corporate cash for building, never our customers’ deposits.',
  },
  centralBank: {
    title: 'Central bank',
    line: 'The central bank sets the base rate. When it moves, loan demand, defaults and what savers expect all follow. Its meetings make the Ledger.',
  },
  bureau: {
    title: 'Credit bureau',
    line: 'Bureaus sell underwriting models and can build us a custom one. A better model approves good borrowers and turns away bad ones.',
  },
  agency: {
    title: 'Marketing agency',
    line: 'Agencies sell city-wide campaign packages: awareness for every branch in the city at once.',
  },
  employer: {
    title: 'Employer',
    line: 'A payroll partnership pays this firm’s staff through one of our branches: a steady stream of deposits for years. Renew it before it lapses.',
  },
  university: {
    title: 'University',
    line: 'Student accounts bring young customers, and the graduate program improves who applies when we hire.',
  },
  investmentBank: {
    title: 'Investment bank',
    line: 'Trade shares and currencies here, raise capital by selling shares, and buy rival banks on the M&A tab.',
  },
  startup: {
    title: 'Startup',
    line: 'Invest in a round as the company or with your own money, or lend venture debt instead. Startups can grow, list, sell, or fail.',
  },
  property: {
    title: 'Property',
    line: 'Buy a building, set the rent per m², and occupancy follows. Rent less upkeep gives the return.',
  },
  convention: {
    title: 'Convention',
    line: 'Conventions run for one week and show startups you can’t find anywhere else. You have to be in the city to attend.',
  },
  lobbyingFirm: {
    title: 'Lobbying firm',
    line: 'Pay to push a rule change. It can fail, and the Ledger may find out.',
  },
  airport: {
    title: 'Airport',
    line: 'Fly to any city. Flights are free up to a weekly mileage allowance; past it you buy a ticket.',
  },
  wealth: {
    title: 'Personal wealth',
    line: 'Your own money, kept apart from the bank’s: salary, dividends and anything you buy. Trading your own bank’s shares just before earnings risks an investigation.',
  },
  vacationHome: {
    title: 'Vacation home',
    line: 'Bought with your own money. Rebuild it to raise its value.',
  },
  carDealer: {
    title: 'Car dealer',
    line: 'Buy cars with your own money. On Dealer financing the bank can pay the dealer to send its car-loan customers to our branches here.',
  },
  auctionHouse: {
    title: 'Auction house',
    line: 'Bid on collectibles, or sell yours. Have a piece appraised: some are fakes.',
  },
  franchise: {
    title: 'Sports club',
    line: 'Own a club with your own money. A strong kit sponsorship lifts the bank’s brand.',
  },
  ledger: {
    title: 'The Weekly Ledger',
    line: 'Every story comes from what happened in the game: rate decisions, rivals, earnings. Back issues are here.',
  },
};

/** Other first looks: a branch tab, an investment bank tab, the decision popups. */
export const OTHER_TIPS = {
  'branch-finance': {
    title: 'Branch finance',
    line: 'Each branch’s own income statement. Deposits earn the branch a funding credit and loans pay a funding charge, so you can see which branches gather cheap money and lend it well.',
  },
  'ib-mna': {
    title: 'Mergers & acquisitions',
    line: 'Make an offer for a rival bank. A higher premium is likelier to be accepted, and the regulator checks our capital afterwards. Their branches take our name over eight weeks.',
  },
  'modal-board': {
    title: 'Board meeting',
    line: 'Every quarter the board votes on the dividend and your pay. Ask for too much and they vote it down. Dividends are paid three weeks later, so keep the cash.',
  },
  'modal-incident': {
    title: 'Incidents',
    line: 'Something has gone wrong. Each choice has a cost and a consequence; pick one. A branch manager can handle branch troubles for you.',
  },
} satisfies Record<string, TipText>;

/** Every tip id: floor-{dept}, place-{panel type}, and the others above. */
export const TIP_IDS: readonly string[] = [
  ...Object.keys(FLOOR_TIPS).map((d) => `floor-${d}`),
  ...Object.keys(PLACE_TIPS).map((t) => `place-${t}`),
  ...Object.keys(OTHER_TIPS),
];

export function tipText(id: string): TipText | undefined {
  if (id.startsWith('floor-')) return FLOOR_TIPS[id.slice(6) as DeptId];
  if (id.startsWith('place-')) return PLACE_TIPS[id.slice(6)];
  return (OTHER_TIPS as Record<string, TipText>)[id];
}

export const isChapterId = (id: string): id is ChapterId => id in CHAPTERS;
export const isLessonId = (id: string): boolean => isChapterId(id) || TIP_IDS.includes(id);

export const LESSON_TEXT = {
  meta: 'Guide',
  tipMeta: 'First look',
  gotIt: 'Got it',
  skip: 'Skip guide',
  skipped: 'Guide skipped. Switch the guides off, or see them again, in Settings.',
} as const;
