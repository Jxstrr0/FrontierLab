// Tutorial Part 2, "Growing the lab" (SCREENS §27.2, DESIGN §5.20): the
// guides that start when a later mechanic opens up, and the one-time tips the
// first time you open each HQ floor, map place and decision popup. Same guide,
// same bar and brass ring as Part 1 (tutorial.ts). Lines are keyed by the
// target the ring is on; `here` is said once you are on the screen a step is
// about, and `alt` replaces the whole step when lessons.ts says so (e.g. the
// compute guide without a Compute floor). When each guide starts is decided in
// src/app/tutorial/lessons.ts. Guide ids keep their saved names ('capital' is
// the safety guide).
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
  | 'tab-treasury'
  | 'tab-products'
  | 'tab-risk'
  | 'tab-add'
  | 'add-floor-risk'
  | 'training-start'
  | 'compute-card'
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
  /** Said instead of this step when lessons.ts picks the other route. */
  alt?: Omit<LessonStepText, 'alt'>;
}

export interface ChapterText {
  title: string;
  steps: LessonStepText[];
}

export type ChapterId =
  'capital' | 'hq' | 'safetyFloor' | 'compute' | 'exec' | 'training' | 'ipo' | 'travel' | 'wealth';

const CLOSE_FIRST = 'Close this panel first.';
const OPEN_MENU = 'Open the menu, top right.';
const SAFETY_FIXES =
  'The regulator weighs our Safety & Alignment team against the risk our model carries. Below Adequate it slows our sign-ups, and long in Critical it orders a pause. These are the ways back up. Close this when you’ve read them.';
const COMPUTE_FLOOR =
  'Demand has outgrown our compute. Clouds only sell so much at spot: past that we pay an emergency premium, then new customers wait and outages follow. Reserve GPUs in the GPU market below, or build a data center. Close HQ when you’re ready.';
const COMPUTE_NO_FLOOR =
  'Demand has outgrown our compute. Clouds only sell so much at spot: past that we pay an emergency premium, then new customers wait and outages follow. For a lasting fix, add a Compute floor at HQ to reserve GPUs, or build a data center on a storefront. Close this when you’ve read it.';
const TRAINING_HERE =
  'Training starts from the model we use now and lifts every measure, most of all the focus you pick. A longer run, a bigger budget and a skilled research team make a great result likelier. Start a run, or close HQ to wait.';
const IPO_HERE =
  'An IPO sells part of the lab on the stock market for fresh money. Investors price us on ARR and how fast it grows. After it, the board votes on your pay and dividends. There’s no rush. Close this when you’ve had a look.';
const SAFETY_FLOOR_HERE =
  'This is the regulator’s view of us: the safety ratio, our tier and the next safety audit. Raise the staff target as we grow; a model far ahead of the pack needs a bigger team. Close HQ when you’re ready.';

export const CHAPTERS: Record<ChapterId, ChapterText> = {
  capital: {
    title: 'Safety is slipping',
    steps: [
      {
        idle: 'Our safety ratio is slipping. Tap your lab’s cash, top left, to see it.',
        here: SAFETY_FIXES,
        lines: {
          'capital-fixes': SAFETY_FIXES,
          'hud-bank': 'Our safety ratio is slipping. Tap your lab’s cash, top left, to see it.',
          'panel-close': CLOSE_FIRST,
        },
      },
    ],
  },
  hq: {
    title: 'Headquarters',
    steps: [
      {
        idle: 'Our sales offices have outgrown a founder’s spare room: we need a head office. Offices for lease are tags on the map: open Layers and switch on Offices if you can’t see them.',
        lines: {
          'pin-office':
            'Our sales offices have outgrown a founder’s spare room: the lab needs a head office for Finance, HR and the teams behind the offices. Tap an office for lease.',
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
        here: 'Each floor hires towards the staff the lab needs. Coverage shows how close a team is: under 100%, things start to slip. Add floors from the last tab as we grow. Close HQ when you’re ready.',
        lines: {
          'hq-coverage':
            'Each floor hires towards the staff the lab needs. Coverage shows how close a team is: under 100%, things start to slip. Add floors from the last tab as we grow. Close HQ when you’re ready.',
          'menu-hq': 'Tap HQ.',
          'hud-menu': OPEN_MENU,
        },
      },
    ],
  },
  safetyFloor: {
    title: 'Safety & Alignment',
    steps: [
      {
        idle: 'The regulator expects a safety team now. Open HQ from the menu and add a Safety & Alignment floor.',
        lines: {
          'add-floor-risk':
            'The safety ratio weighs this team against the risk our model carries, and the regulator watches it. Tap Add.',
          'tab-add':
            'Now we’re growing, the regulator expects a Safety & Alignment team. Tap Add floor.',
          'menu-hq': 'Tap HQ.',
          'hud-menu':
            'Now we’re growing, the regulator expects a Safety & Alignment team. Open the menu, top right.',
          'panel-close': CLOSE_FIRST,
        },
      },
      {
        idle: 'Open HQ from the menu, then the Safety & Alignment floor.',
        here: SAFETY_FLOOR_HERE,
        lines: {
          'tab-risk': 'Open the Safety & Alignment floor.',
          'menu-hq': 'Tap HQ.',
          'hud-menu': OPEN_MENU,
          'hq-coverage': SAFETY_FLOOR_HERE,
        },
      },
    ],
  },
  compute: {
    title: 'Short of compute',
    steps: [
      {
        idle: 'We’re short of GPUs. Open HQ from the menu, then the Compute floor.',
        here: COMPUTE_FLOOR,
        lines: {
          'compute-card': COMPUTE_FLOOR,
          'tab-treasury': 'Open the Compute floor.',
          'menu-hq': 'Tap HQ.',
          'hud-menu': 'We’re short of GPUs. Open the menu, top right.',
        },
        alt: {
          idle: 'We’re short of GPUs. Tap your lab’s cash, top left, to see the compute pool.',
          here: COMPUTE_NO_FLOOR,
          lines: {
            'compute-card': COMPUTE_NO_FLOOR,
            'hud-bank':
              'We’re short of GPUs. Tap your lab’s cash, top left, to see the compute pool.',
            'panel-close': CLOSE_FIRST,
          },
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
            'Expertise lifts their part of the lab; Loyalty keeps them from being poached. Tap Hire on whoever you like.',
          'exec-seat':
            'Each seat runs part of the lab and can take whole jobs off your hands. A COO is a good first hire: tap an empty seat.',
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
  training: {
    title: 'Train our own model',
    steps: [
      {
        idle: 'Our Products team can train a model of our own. Open HQ from the menu, then the Products floor.',
        here: TRAINING_HERE,
        lines: {
          'training-start': TRAINING_HERE,
          'tab-products': 'Open the Products floor.',
          'menu-hq': 'Tap HQ.',
          'hud-menu': 'Our Products team can train a model of our own. Open the menu, top right.',
        },
      },
    ],
  },
  ipo: {
    title: 'Going public',
    steps: [
      {
        idle: 'Our ARR is big enough to go public. Find an investment bank on the map: open Layers and switch on Investment Banks.',
        lines: {
          'pin-investmentBank':
            'Our ARR is big enough to go public. Investment banks handle it: tap one on the map.',
          'panel-close': CLOSE_FIRST,
        },
      },
      {
        idle: 'Tap an investment bank on the map.',
        here: IPO_HERE,
        lines: {
          'ipo-card': IPO_HERE,
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
        idle: 'Our sales office covers this city. Tap the city name at the top to travel.',
        lines: {
          'travel-airport': 'Go to the airport to see where we can fly.',
          'hud-travel':
            'One sales office covers a city, and we have ours here: grow it from its Finance tab. Tap the city name to travel.',
          'panel-close': CLOSE_FIRST,
        },
      },
      {
        idle: 'Tap the city name at the top, then Go to the airport.',
        here: 'Each week’s flights are free up to a mileage allowance; the board shows what’s left. We open sales offices only where you are, but the ones we have keep running, and the Sales offices list reaches them from anywhere. Fly somewhere new, or close this to stay.',
        lines: {},
      },
    ],
  },
  wealth: {
    title: 'Your own fortune',
    steps: [
      {
        idle: 'Your salary and dividends have built up. Open the menu, top right.',
        here: 'This is your money, kept apart from the lab’s. Spend it on homes, cars and collectibles, invest it, or buy more of the lab. Close this when you’re done.',
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
  safetyFloor: ['floor-risk'],
  exec: ['floor-executive'],
  training: ['floor-products'],
  travel: ['place-airport'],
  wealth: ['place-wealth'],
};

/** Guides start in this order when more than one is due. */
export const CHAPTER_ORDER: readonly ChapterId[] = [
  'capital',
  'hq',
  'safetyFloor',
  'compute',
  'exec',
  'training',
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
    line: 'Finance keeps the books: full statements, the credit ratio our lenders watch, and our launch posture. Short-staffed, the statements run late, and once we’re public that costs fines and share price.',
  },
  hr: {
    title: 'HR floor',
    line: 'Benefits here apply to everyone and lift morale and hiring. Each card shows its weekly cost. Short-staffed, hiring slows and morale drifts.',
  },
  products: {
    title: 'Products floor',
    line: 'Set prices for every sales office at once, with a city’s own prices where you need them. Manage and train the lab’s AI model, hire researchers and develop new products. A better model lets prices sit higher and wins contracts.',
  },
  treasury: {
    title: 'Compute floor',
    line: 'Every customer runs on GPUs. Watch the chip market, reserve GPUs below spot before a shortage hits, and remember reserved GPUs are billed whether you use them or not. Clouds only sell so much at spot.',
  },
  marketing: {
    title: 'Marketing floor',
    line: 'Brand campaigns lift awareness across a whole city or country, not just one sales office. More awareness means more people walk in.',
  },
  it: {
    title: 'Platform & Security floor',
    line: 'Our app rating lifts the Products rating and takes pressure off the sales offices. A short-staffed platform team makes breaches and outages more likely.',
  },
  risk: {
    title: 'Safety & Alignment floor',
    line: 'How the regulator sees us: the safety ratio, our tier and the next safety audit. Short-staffed, the ratio falls, sign-ups slow and audits find more.',
  },
  executive: {
    title: 'Executive suite',
    line: 'Hire executives to run whole parts of the lab, and prepare the quarterly board meeting. Seats switch their jobs on from the day you hire.',
  },
  investment: {
    title: 'Investment floor',
    line: 'The lab’s own portfolio: stocks, startups, property and compute credits. More staff finds more startups looking for money.',
  },
};

/** First look at each map place or menu screen, by panel type. */
export const PLACE_TIPS: Record<string, TipText> = {
  rivalBranch: {
    title: 'Rival sales office',
    line: 'Rivals publish their prices and reviews. Beat their prices, their model or their service and customers drift our way.',
  },
  rivalHq: {
    title: 'Rival lab HQ',
    line: 'A rival lab’s model, researchers, cities and results. Know who we are up against before we pick a fight.',
  },
  centralBank: {
    title: 'Central bank',
    line: 'The central bank sets the base rate. When it moves, borrowing costs and the economy follow, and so do businesses’ AI budgets. Its meetings make the Inference.',
  },
  bureau: {
    title: 'Data vendor',
    line: 'Data vendors license training data as ready-made models and can train a custom mix for us. More efficient models need less compute; safer ones win businesses with sensitive data.',
  },
  agency: {
    title: 'Marketing agency',
    line: 'Agencies sell city-wide campaign packages: awareness for every sales office in the city at once.',
  },
  employer: {
    title: 'Employer',
    line: 'A big employer is an anchor account: its AI contract comes through the Deal Desk. A company partnership also puts its staff on one of our plans: steady seats for years. Renew it before it lapses.',
  },
  business: {
    title: 'Business',
    line: 'A local business and its AI budget. Ones without a vendor ask our sales office for proposals on the Deal Desk; ones with a rival come up at the quarter’s renewal season.',
  },
  dataCenter: {
    title: 'Data center',
    line: 'Our own GPUs: they serve customers before anything bought at spot, and cost less. Cheap power at an energy site keeps the bill down.',
  },
  university: {
    title: 'University',
    line: 'Student plans bring young customers, and the graduate program improves who applies when we hire.',
  },
  investmentBank: {
    title: 'Investment bank',
    line: 'Trade shares and currencies here, raise capital by selling shares, borrow venture debt or draw a credit line on the Debt tab, and buy rival labs on the M&A tab.',
  },
  startup: {
    title: 'Startup',
    line: 'Invest in a round as the company or with your own money, or grant compute credits instead. Startups can grow, list, sell, or fail.',
  },
  property: {
    title: 'Property',
    line: 'Buy a building, set the rent per m², and occupancy follows. Rent less upkeep gives the return.',
  },
  convention: {
    title: 'Conference',
    line: 'Conferences run for four weeks and show AI startups you can’t find anywhere else. You have to be in the city to attend.',
  },
  lobbyingFirm: {
    title: 'Lobbying firm',
    line: 'Pay to push a rule change. It can fail, and the Inference may find out.',
  },
  airport: {
    title: 'Airport',
    line: 'Fly to any city. Flights are free up to a weekly mileage allowance; past it you buy a ticket.',
  },
  wealth: {
    title: 'Personal wealth',
    line: 'Your own money, kept apart from the lab’s: salary, dividends and anything you buy. Trading your own lab’s shares just before earnings risks an investigation.',
  },
  vacationHome: {
    title: 'Vacation home',
    line: 'Bought with your own money. Rebuild it to raise its value.',
  },
  carDealer: {
    title: 'Car dealer',
    line: 'Buy cars with your own money. It’s personal spending: the lab’s books don’t see it.',
  },
  auctionHouse: {
    title: 'Auction house',
    line: 'Bid on collectibles, or sell yours. Have a piece appraised: some are fakes.',
  },
  franchise: {
    title: 'Sports club',
    line: 'Own a club with your own money. A strong kit sponsorship lifts the lab’s brand.',
  },
  ledger: {
    title: 'The Weekly Inference',
    line: 'Every story comes from what happened in the game: rate decisions, rivals, earnings. Back issues are here.',
  },
};

/** Other first looks: a branch tab, an investment bank tab, the decision popups. */
export const OTHER_TIPS = {
  'branch-finance': {
    title: 'Sales office finance',
    line: 'Each sales office’s own income statement: what its plans, API, apps and enterprise contracts bring in, less the compute behind them and its running costs, so you can see which sales offices pay their way.',
  },
  'ib-mna': {
    title: 'Mergers & acquisitions',
    line: 'Make an offer for a rival lab. A higher premium is likelier to be accepted, and the regulator checks our safety afterwards. Their sales offices take our name over eight weeks.',
  },
  'modal-board': {
    title: 'Board meeting',
    line: 'Every quarter the board votes on the dividend and your pay. Ask for too much and they vote it down. Dividends are paid three weeks later, so keep the cash.',
  },
  'modal-incident': {
    title: 'Incidents',
    line: 'Something has gone wrong. Each choice has a cost and a consequence; pick one. An office manager can handle sales office troubles for you.',
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
