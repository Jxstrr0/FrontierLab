// Tutorial content (SCREENS §27, DESIGN §5.20): the step numbers stored in
// state.flags.tutorialStep, each step's title, and the guide's lines. The guide
// is the first branch manager (a candidate until you hire one). Lines are keyed
// by the target the brass ring is on, so the words always match what is lit up.
// `{guide}` is replaced with the guide's first name.

/** Values of state.flags.tutorialStep (undefined = never offered, e.g. older saves). */
export const TUTORIAL = {
  /** Returning players are asked first. */
  offer: 0,
  first: 1,
  last: 7,
  /** The closing card, shown until dismissed. */
  finale: 8,
  /** Finished or skipped. */
  done: 9,
} as const;

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
  | 'price-savings'
  | 'offer-personal_loan'
  | 'hire-manager'
  | 'hire-pick'
  | 'play'
  | 'panel-close'
  | 'weekly-continue'
  | 'loan-approve';

export interface TutorialStepText {
  title: string;
  /** Shown when none of the step's targets is on screen. */
  idle: string;
  /** Per target, in the order the ring prefers them (closest to done first). */
  lines: Partial<Record<TutorialTarget, string>>;
}

const OPEN_BRANCH = 'Tap your branch on the map to open it.';

export const TUTORIAL_STEPS: Record<number, TutorialStepText> = {
  1: {
    title: 'Find a storefront',
    idle: 'Drag or pinch the map to find a $ storefront, or open Layers and choose List view.',
    lines: {
      'open-lot':
        "Hi, I'm {guide}. I'd love to run your first branch. We need a storefront first: tap any $ on the map.",
    },
  },
  2: {
    title: 'Build a branch',
    idle: 'Pick a storefront to build on: tap a $ on the map.',
    lines: {
      'build-confirm':
        'These five parts set our quality, capacity and security. The starter kit is fine for now: tap Build.',
      'build-branch':
        'Rent, foot traffic and who lives nearby all matter. This spot will do: tap Build branch.',
      'open-lot': 'Pick a storefront to build on: tap a $ on the map.',
    },
  },
  3: {
    title: 'Set the savings rate',
    idle: OPEN_BRANCH,
    lines: {
      'price-savings':
        'Savings accounts bring in the deposits we lend out. A higher rate wins customers but costs more. Nudge it with + or −.',
      'product-category': 'Savings is under Deposits. Tap Deposits.',
      'tab-products': 'Prices live on the Products tab. Tap it.',
      'my-branch': OPEN_BRANCH,
    },
  },
  4: {
    title: 'Hire a manager',
    idle: OPEN_BRANCH,
    lines: {
      'hire-pick':
        'People and Product skills matter most. I’m on the list too, but no pressure: tap Hire on whoever you like.',
      'hire-manager': 'A branch runs better with a manager, and they can take jobs off your hands.',
      'tab-service': 'Staff and the manager are on the Service tab. Tap it.',
      'my-branch': OPEN_BRANCH,
    },
  },
  5: {
    title: 'Open the doors',
    idle: 'The clock is running: one day a second. The week’s results arrive on day seven.',
    lines: {
      'weekly-continue':
        'Every week ends with results and The Daily Ledger: revenue, income and cash flow up top. Tap Continue when you’ve read it.',
      play: 'We’re ready to open. Tap play to start the clock.',
      'panel-close': 'Close this panel so we can start the clock.',
    },
  },
  6: {
    title: 'Turn on Personal Loans',
    idle: OPEN_BRANCH,
    lines: {
      'offer-personal_loan':
        'Deposits cost us interest; loans earn it back. Switch on Personal Loans.',
      'product-category': 'Personal Loans are under Lending. Tap Lending.',
      'tab-products': 'Lending products are on the Products tab. Tap it.',
      'my-branch': OPEN_BRANCH,
    },
  },
  7: {
    title: 'Approve a business loan',
    idle: 'A local business has applied for a loan. Tap your branch on the map.',
    lines: {
      'loan-approve':
        'The rosette scores the business. Offer a rate at or below what they’ll pay, then tap Approve.',
      'tab-loandesk': 'A local business has applied. Open the Loan Desk tab.',
      'my-branch': 'A local business has applied for a loan. Tap your branch to see it.',
    },
  },
};

export const TUTORIAL_TEXT = {
  offer: 'Welcome back, boss. Want me to walk you through opening week again?',
  offerYes: 'Show me',
  offerNo: 'No thanks',
  finale:
    'That’s opening week done. Grow carefully: deposits fund loans, and capital limits growth. Tap the advisor line in any panel for tips.',
  finaleDone: 'Let’s go',
  /** A modal the step doesn't need (an incident, the board) is open. */
  waitModal: 'Deal with this first. I’ll wait.',
  /** The weekly results opened during another step. */
  weeklyAside: 'Have a read, then tap Continue.',
  skip: 'Skip tutorial',
  skipped: 'Tutorial skipped. You can replay it from Settings.',
  fallbackGuide: 'Your branch manager',
} as const;
