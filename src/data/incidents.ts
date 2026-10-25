// The incident catalog (CONTENT §22, SIMULATION §23): every incident's scope,
// how it fires, its cooldown, the case text, its options (with effect previews)
// and which option the deadline picks. Tokens in {braces} are filled from the
// incident's rolled data when it is raised; keys listed in `money` and `pct`
// are formatted as money and percentages. Per-incident numbers are in
// incidentParams.ts; the engine is src/sim/incidents.ts.
export { INCIDENT_PARAMS } from './incidentParams';

export interface IncidentOptionSpec {
  id: string;
  label: string;
  /** Effect preview template shown under the button. */
  effect: string;
  /** P&L line the up-front cost goes to; 'capex' buys a fixed asset instead. */
  line?: 'incidents' | 'fines' | 'capex';
  /**
   * A delegated manager values this option's non-cash effects at this many weeks
   * of the branch's revenue (§17.1, expected value); for company and city cases
   * the COO uses weeks of the company's revenue (§17.2).
   */
  penaltyWeeks?: number;
  /** A delegated manager never picks it (firing themselves, say). */
  managerSkips?: boolean;
}

export interface IncidentSpec {
  id: string;
  /** Short case title for the modal. */
  title: string;
  scope: 'branch' | 'city' | 'company' | 'personal';
  /** 'rolled' each week with `baseP`; 'triggered' by another system or rule. */
  trigger: 'rolled' | 'triggered';
  /** Information only: one OK option, nothing to decide. */
  info?: boolean;
  /** Always lands on your desk: a COO trusted with Company troubles never settles it (§17.2). */
  yours?: boolean;
  baseP?: number;
  /** Weeks before the same type can fire again for the same scope. */
  cooldownWeeks?: number;
  /** ROADMAP stage whose systems this incident needs; not raised before then. */
  stage?: number;
  text: string;
  money?: string[];
  pct?: string[];
  options: IncidentOptionSpec[];
  /** Picked when the case is still open at its deadline. */
  worst: string;
}

const OK: IncidentOptionSpec[] = [{ id: 'ok', label: 'OK', effect: 'Noted.' }];

export const INCIDENT_SPECS: Record<string, IncidentSpec> = {
  ROBBERY: {
    id: 'ROBBERY',
    title: 'Robbery',
    scope: 'branch',
    trigger: 'rolled',
    baseP: 0.0015,
    text: 'Robbers hit {branch} this morning and got away with {loss}. Insurance covers {insured}, leaving {net} for us to absorb. The team is shaken.',
    money: ['loss', 'net', 'leave'],
    pct: ['insured'],
    options: [
      {
        id: 'upgrade',
        label: 'Upgrade the vault',
        effect: 'A {nextVault} at half price. Morale +5.',
        line: 'capex',
      },
      { id: 'leave', label: 'Paid leave', effect: 'A week off for the whole team. Morale +10.' },
      {
        id: 'usual',
        label: 'Business as usual',
        effect: 'Morale −15. Branch rating −0.3 for 8 weeks.',
        penaltyWeeks: 3,
      },
    ],
    worst: 'usual',
  },
  ATM_SKIM: {
    id: 'ATM_SKIM',
    title: 'ATM skimming',
    scope: 'branch',
    trigger: 'rolled',
    baseP: 0.002,
    text: 'Someone fitted a card skimmer to the ATM at {branch}. Customers lost about {refund} before we spotted it.',
    money: ['refund'],
    options: [
      { id: 'refund', label: 'Refund customers', effect: 'Pay back every customer.' },
      {
        id: 'firmware',
        label: 'Replace the firmware',
        effect: 'Skimming risk halved for 26 weeks.',
        penaltyWeeks: 1,
      },
      {
        id: 'deny',
        label: 'Deny liability',
        effect: 'Service rating −0.4 for 8 weeks. The press may hear of it.',
        penaltyWeeks: 3,
      },
    ],
    worst: 'deny',
  },
  DATA_BREACH: {
    id: 'DATA_BREACH',
    title: 'Data breach',
    scope: 'company',
    trigger: 'rolled',
    baseP: 0.002,
    text: 'Our systems were breached overnight. Records for about {affected} customers may have been copied.',
    options: [
      {
        id: 'notify',
        label: 'Notify and monitor',
        effect: 'Credit monitoring for everyone affected. Overall rating −0.1 for 4 weeks.',
        penaltyWeeks: 0.5,
      },
      {
        id: 'quiet',
        label: 'Quiet fix',
        effect:
          '40% chance it comes out: a fine of 2% of yearly revenue and Overall −0.4 for 12 weeks.',
        penaltyWeeks: 2,
      },
      {
        id: 'forensic',
        label: 'Hire a forensic firm',
        effect: 'Breach risk halved for a year.',
      },
    ],
    worst: 'quiet',
  },
  MIS_SELLING: {
    id: 'MIS_SELLING',
    title: 'Mis-selling',
    scope: 'branch',
    trigger: 'rolled',
    baseP: 0.001,
    text: 'Staff at {branch} pushed sign-up bonus accounts on people who didn’t need them. Complaints are piling up; putting it right costs about {comp}.',
    money: ['comp', 'fine'],
    options: [
      {
        id: 'fire',
        label: 'Fire the manager and compensate',
        effect: 'Customers repaid; the branch needs a new manager.',
        managerSkips: true,
      },
      { id: 'compensate', label: 'Compensate only', effect: 'Customers repaid.' },
      {
        id: 'deny',
        label: 'Deny it',
        effect: '40% chance of a fine of {fine}, and the press.',
        line: 'fines',
      },
    ],
    worst: 'deny',
  },
  REGULATOR_AUDIT: {
    id: 'REGULATOR_AUDIT',
    title: 'Regulator audit',
    scope: 'company',
    trigger: 'triggered',
    text: 'The regulator’s quarterly review found gaps in our controls. They propose a fine of {fine}.',
    money: ['fine', 'appealFine', 'consultants'],
    options: [
      { id: 'pay', label: 'Pay the fine', effect: 'Settled.', line: 'fines' },
      {
        id: 'appeal',
        label: 'Appeal',
        effect: 'Even odds: no fine, or {appealFine}.',
        line: 'fines',
      },
      {
        id: 'consultants',
        label: 'Pay and hire consultants',
        effect: 'Fine plus {consultants} in fees. Risk coverage +0.2 for 26 weeks.',
        line: 'fines',
      },
    ],
    worst: 'pay',
  },
  VIRAL_COMPLAINT: {
    id: 'VIRAL_COMPLAINT',
    title: 'Viral complaint',
    scope: 'branch',
    trigger: 'rolled',
    baseP: 0.01,
    text: 'A video of a customer stuck in the queue at {branch} is going round online, and people are piling on.',
    options: [
      { id: 'apology', label: 'Apologise and fix it', effect: 'Service rating +0.2 for 8 weeks.' },
      {
        id: 'ignore',
        label: 'Ignore it',
        effect: 'Branch awareness −5 points. The press may pick it up.',
        penaltyWeeks: 2,
      },
    ],
    worst: 'ignore',
  },
  EXEC_POACHED: {
    id: 'EXEC_POACHED',
    title: 'Executive poached',
    scope: 'company',
    trigger: 'triggered',
    yours: true,
    stage: 6,
    text: '{rival} is trying to hire our {title}, {name}.',
    options: [
      { id: 'counter', label: 'Counter-offer', effect: 'Salary +25%. Loyalty +10.' },
      { id: 'release', label: 'Let them go', effect: 'The seat falls vacant.' },
    ],
    worst: 'release',
  },
  BRANCH_FLOOD: {
    id: 'BRANCH_FLOOD',
    title: 'Flood',
    scope: 'branch',
    trigger: 'rolled',
    baseP: 0.0005,
    text: 'A burst water main flooded the lobby at {branch}. We can’t open until it’s repaired.',
    options: [
      { id: 'fast', label: 'Fast repair', effect: 'Closed for 1 week.', penaltyWeeks: 1 },
      { id: 'slow', label: 'Slow repair', effect: 'Closed for 4 weeks.', penaltyWeeks: 4 },
    ],
    worst: 'slow',
  },
  BANK_RUN: {
    id: 'BANK_RUN',
    title: 'Bank run',
    scope: 'company',
    trigger: 'triggered',
    yours: true,
    text: 'Rumours about our health are spreading, and depositors are queueing to take their money out.',
    money: ['window'],
    pct: ['odds'],
    options: [
      {
        id: 'window',
        label: 'Central bank window',
        effect: 'Borrow {window} of liquidity. Ratings dip from the stigma.',
      },
      {
        id: 'raise',
        label: 'Raise savings rates',
        effect: 'Savings +1.00% at every branch for 8 weeks.',
      },
      {
        id: 'statement',
        label: 'Public statement',
        effect: '{odds} chance it calms depositors and ends the run.',
      },
    ],
    worst: 'statement',
  },
  CARD_FRAUD: {
    id: 'CARD_FRAUD',
    title: 'Card fraud ring',
    scope: 'company',
    trigger: 'rolled',
    baseP: 0.0015,
    text: 'A fraud ring is running stolen numbers through our credit cards. Losses so far: about {loss}.',
    money: ['loss'],
    options: [
      { id: 'absorb', label: 'Absorb the losses', effect: 'We eat the fraud.' },
      {
        id: 'freeze',
        label: 'Freeze cards for a week',
        effect: 'No losses, but card take-up −50% for 4 weeks.',
        penaltyWeeks: 1,
      },
      {
        id: 'bureau',
        label: 'Absorb and see a credit bureau',
        effect: 'We eat the fraud, then look at a model with a stronger fraud shield.',
      },
    ],
    worst: 'absorb',
  },
  STAFF_WALKOUT: {
    id: 'STAFF_WALKOUT',
    title: 'Staff walkout',
    scope: 'branch',
    trigger: 'rolled',
    baseP: 0.03,
    text: 'The team at {branch} has walked out over pay and conditions.',
    options: [
      { id: 'raise', label: 'Raise wages 10%', effect: 'Hourly wage {wage}.' },
      { id: 'bonus', label: 'Pay a bonus', effect: '$1,000 per person. Morale +20.' },
      {
        id: 'wait',
        label: 'Wait it out',
        effect: 'Closed for 1 week, then morale +10.',
        penaltyWeeks: 1,
      },
    ],
    worst: 'wait',
  },
  DIVIDEND_DUE: {
    id: 'DIVIDEND_DUE',
    title: 'Dividend due',
    scope: 'company',
    trigger: 'triggered',
    info: true,
    stage: 6,
    text: 'A quarterly dividend of {amount} is due in three weeks. Keep enough cash on hand.',
    money: ['amount'],
    options: OK,
    worst: 'ok',
  },
  PRICE_WAR: {
    id: 'PRICE_WAR',
    title: 'Price war',
    scope: 'city',
    trigger: 'triggered',
    text: '{bank} just raised its savings rate by {bump} in {city} to win depositors back from us.',
    pct: ['bump'],
    options: [
      {
        id: 'match',
        label: 'Match it',
        effect: 'Savings +0.15% at every branch in {city} for 26 weeks.',
        penaltyWeeks: 1,
      },
      {
        id: 'hold',
        label: 'Hold our rates',
        effect: 'Keep our margin and risk some outflows.',
        penaltyWeeks: 1.5,
      },
    ],
    worst: 'hold',
  },
  BIG_DEFAULT: {
    id: 'BIG_DEFAULT',
    title: 'Big default',
    scope: 'branch',
    trigger: 'triggered',
    info: true,
    text: '{business} has defaulted on its {amount} business loan at {branch}. The loss is already on our books.',
    money: ['amount'],
    options: OK,
    worst: 'ok',
  },
  INSIDER_PROBE: {
    id: 'INSIDER_PROBE',
    title: 'Insider trading probe',
    scope: 'personal',
    trigger: 'triggered',
    stage: 9,
    text: 'Securities regulators are asking about your personal trades in {company}. They suggest a settlement of {fine}.',
    money: ['fine', 'doubled'],
    options: [
      {
        id: 'settle',
        label: 'Settle',
        effect:
          'Pay {fine} from your personal cash. The story dents the bank’s ratings for a while.',
      },
      {
        id: 'fight',
        label: 'Fight it',
        effect: 'Even odds: cleared, or pay {doubled} and take the same hit in the press.',
      },
    ],
    worst: 'settle',
  },
  REGULATOR_LETTER: {
    id: 'REGULATOR_LETTER',
    title: 'Letter from the regulator',
    scope: 'company',
    trigger: 'triggered',
    info: true,
    text: 'Our capital ratio has slipped into the Restricted band. Until it recovers we can’t open branches or pay dividends, and lending is throttled. Retained profits, less risky lending or new shares will lift it.',
    options: OK,
    worst: 'ok',
  },
  RECAP_OFFER: {
    id: 'RECAP_OFFER',
    title: 'Emergency recapitalisation',
    scope: 'company',
    trigger: 'triggered',
    yours: true,
    cooldownWeeks: 0,
    text: 'Our capital ratio has been under {floor} for {weeks} weeks. The regulator will let us carry on if new shareholders put in {amount}, buying shares at {price} each, half our book value. Refusing means a takeover.',
    money: ['amount'],
    pct: ['floor'],
    options: [
      {
        id: 'accept',
        label: 'Accept the new shares',
        effect: '{shares} new shares; capital ratio back to 10.5%.',
      },
      { id: 'decline', label: 'Decline', effect: 'The regulator takes over the bank. Game over.' },
    ],
    worst: 'decline',
  },
};
