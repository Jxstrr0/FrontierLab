// Tutorial content, Part 1 "Seed to first contract" (SCREENS §27.1, DESIGN
// §5.20): the step numbers stored in state.flags.tutorialStep, the order of
// the steps, each step's title, and the guide's lines. Part 2, the guides for
// later mechanics, is in lessons.ts. The guide is the first office manager (a
// candidate until you hire one). Lines are keyed by the target the brass ring
// is on, so the words always match what is lit up. `{guide}` is replaced with
// the guide's first name.

/** Values of state.flags.tutorialStep (undefined = never offered, e.g. older saves). */
export const TUTORIAL = {
  /** Returning players are asked first. */
  offer: 0,
  first: 1,
  /**
   * "Win your first contract", the last step: the one that asks a business for
   * a proposal request. The bank-era name is kept (the sim command reads it).
   */
  loan: 9,
  last: 9,
  /** The closing card, shown until dismissed. */
  finale: 10,
  /** Finished or skipped (Part 2's guides run from here). */
  done: 11,
} as const;

/** What each step asks for; step n is TUTORIAL_ORDER[n − 1]. */
export type TutorialStepId =
  | 'storefront'
  | 'build'
  | 'price'
  | 'api'
  | 'manager'
  | 'campaign'
  | 'week'
  | 'company'
  | 'contract';

export const TUTORIAL_ORDER: readonly TutorialStepId[] = [
  'storefront',
  'build',
  'price',
  'api',
  'manager',
  'campaign',
  'week',
  'company',
  'contract',
];

/** Every data-tutorial target the steps point at. */
export type TutorialTarget =
  | 'open-lot'
  | 'build-branch'
  | 'build-confirm'
  | 'my-branch'
  | 'tab-service'
  | 'tab-products'
  | 'tab-loandesk'
  | 'product-category'
  | 'price-plus'
  | 'offer-api'
  | 'hire-manager'
  | 'hire-pick'
  | 'play'
  | 'panel-close'
  | 'weekly-continue'
  | 'loan-approve'
  | 'tab-marketing'
  | 'campaign-level'
  | 'hud-bank'
  | 'capital-meter';

export interface TutorialStepText {
  title: string;
  /** Shown when none of the step's targets is on screen. */
  idle: string;
  /** Per target, in the order the ring prefers them (closest to done first). */
  lines: Partial<Record<TutorialTarget, string>>;
}

const OPEN_OFFICE = 'Tap your sales office on the map to open it.';

export const TUTORIAL_STEPS: Record<TutorialStepId, TutorialStepText> = {
  storefront: {
    title: 'Find a storefront',
    idle: 'Drag or pinch the map to find a $ storefront, or open Layers and choose List view.',
    lines: {
      'open-lot':
        "Hi, I'm {guide}. Our seed round just closed: that’s our cash, top left. Let’s put it to work: customers find us through a sales office, so tap any $ storefront on the map.",
    },
  },
  build: {
    title: 'Build a sales office',
    idle: 'Pick a storefront to build on: tap a $ on the map.',
    lines: {
      'build-confirm':
        'These five parts set the office’s quality, capacity and security. The starter kit is fine for now: tap Build.',
      'build-branch':
        'We get one sales office per city, so the spot matters: rent, foot traffic and who lives nearby. This one will do: tap Build sales office.',
      'open-lot': 'Pick a storefront to build on: tap a $ on the map.',
    },
  },
  price: {
    title: 'Set the Plus price',
    idle: OPEN_OFFICE,
    lines: {
      'price-plus':
        'Plus is our main subscription, billed every month: that’s recurring revenue, ARR. A lower price wins more subscribers but earns less from each. Nudge it with + or −.',
      'product-category': 'Plus is under Plans. Tap Plans.',
      'tab-products': 'Prices live on the Products tab. Tap it.',
      'my-branch': OPEN_OFFICE,
    },
  },
  api: {
    title: 'Turn on the API',
    idle: OPEN_OFFICE,
    lines: {
      'offer-api':
        'Developers pay for every million tokens they use, and the bill grows as they build. Switch on the Standard API.',
      'product-category': 'The Standard API is under API. Tap API.',
      'tab-products': 'API products are on the Products tab. Tap it.',
      'my-branch': OPEN_OFFICE,
    },
  },
  manager: {
    title: 'Hire a manager',
    idle: OPEN_OFFICE,
    lines: {
      'hire-pick':
        'People and Product skills matter most. I’m on the list too, but no pressure: tap Hire on whoever you like.',
      'hire-manager':
        'A sales office runs better with a manager, and they can take jobs off your hands later. Tap Hire a manager.',
      'tab-service': 'Staff and the manager are on the Service tab. Tap it.',
      'my-branch': OPEN_OFFICE,
    },
  },
  campaign: {
    title: 'Run a campaign',
    idle: OPEN_OFFICE,
    lines: {
      'campaign-level':
        'Nobody knows our name yet. Campaigns bring people through the door, and each costs a little every week: pick a level on any card.',
      'tab-marketing': 'Campaigns are on the Marketing tab. Tap it.',
      'my-branch': OPEN_OFFICE,
    },
  },
  week: {
    title: 'Open the doors',
    idle: 'The clock is running: one day a second. The week’s results arrive on day seven.',
    lines: {
      'weekly-continue':
        'Every week ends with results and The Weekly Inference: revenue, income and cash flow up top. Tap Continue when you’ve read it.',
      play: 'We’re ready to open. Tap play to start the clock.',
      'panel-close': 'Close this panel so we can start the clock.',
    },
  },
  company: {
    title: 'Meet the lab',
    idle: 'Tap your lab’s cash, top left, to open the Company summary.',
    lines: {
      'capital-meter':
        'This is the lab behind the office. Our safety ratio weighs our Safety & Alignment team against the risk our model carries: keep it out of the red, or sign-ups slow. Below: cash, ARR and the compute bill. Close this when you’re done.',
      'hud-bank': 'Tap your lab’s cash, top left, to open the Company summary.',
      'panel-close': 'Close this panel first.',
    },
  },
  contract: {
    title: 'Win your first contract',
    idle: 'A local business wants a proposal for its AI work. Tap your sales office on the map.',
    lines: {
      'loan-approve':
        'Businesses sign yearly contracts. A bigger discount off their AI budget wins more often but earns less. Pick one, then tap Bid. If they go elsewhere, another will ask.',
      'tab-loandesk': 'A local business has asked for a proposal. Open the Deal Desk tab.',
      'my-branch': 'A local business has asked for a proposal. Tap your sales office to see it.',
    },
  },
};

/** The step id for a stored step number, if it is one of Part 1's steps. */
export const tutorialStepId = (step: number): TutorialStepId | undefined =>
  TUTORIAL_ORDER[step - TUTORIAL.first];

/** A step number for a step id (1-based). */
export const tutorialStepNumber = (id: TutorialStepId): number =>
  TUTORIAL_ORDER.indexOf(id) + TUTORIAL.first;

export const TUTORIAL_TEXT = {
  offer: 'Welcome back, boss. Want me to walk you through the first weeks again?',
  offerYes: 'Show me',
  offerNo: 'No thanks',
  finale:
    'That’s our first contract signed, and the lab is open for business. As we grow I’ll show you each new part when it opens up: headquarters, compute, safety, training our own model, going public, new cities. Tap the advisor line in any panel for tips.',
  finaleDone: 'Let’s go',
  /** A modal the step doesn't need (an incident, the board) is open. */
  waitModal: 'Deal with this first. I’ll wait.',
  /** The weekly results opened during another step. */
  weeklyAside: 'Have a read, then tap Continue.',
  skip: 'Skip tutorial',
  skipped: 'Tutorial skipped. Replay it, or switch off the guides, in Settings.',
  fallbackGuide: 'Your office manager',
} as const;
