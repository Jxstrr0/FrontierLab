// The incident catalog (CONTENT §22, SIMULATION §23): every incident's scope,
// how it fires, its cooldown, the case text, its options (with effect previews)
// and which option the deadline picks. Tokens in {braces} are filled from the
// incident's rolled data when it is raised; keys listed in `money` and `pct`
// are formatted as money and percentages. Per-incident numbers are in
// incidentParams.ts; the engine is src/sim/incidents.ts.
export { INCIDENT_PARAMS } from './incidentParams';
import { PRICE_WAR } from '../config/balance';
import { AI_SPECS } from './incidentsAi';
import { FOUNDER_SPECS } from './incidentsFounder';
import { VETERAN_SPECS } from './incidentsVeteran';

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
  /** The options move money outside the P&L (their effects say how much): no cost tag. */
  hideCosts?: boolean;
  /** Always lands on your desk: a COO trusted with Company troubles never settles it (§17.2). */
  yours?: boolean;
  baseP?: number;
  /** Weeks before the same type can fire again for the same scope. */
  cooldownWeeks?: number;
  /** ROADMAP stage whose systems this incident needs; not raised before then. */
  stage?: number;
  text: string;
  /** Alternative case texts; one of `text` and these is picked when the case is raised. */
  texts?: string[];
  money?: string[];
  pct?: string[];
  options: IncidentOptionSpec[];
  /** Picked when the case is still open at its deadline. */
  worst: string;
}

const OK: IncidentOptionSpec[] = [{ id: 'ok', label: 'OK', effect: 'Noted.' }];

const BANK_ERA_SPECS: Record<string, IncidentSpec> = {
  // Retired from the weekly roll (2026-10-30): a break-in and a heatwave are
  // bank-branch troubles, not an AI lab's. Kept so old saves with an open case
  // still resolve, and for the debug tools.
  ROBBERY: {
    id: 'ROBBERY',
    title: 'Server-room break-in',
    scope: 'branch',
    trigger: 'triggered',
    baseP: 0.0015,
    text: 'Thieves broke into the server room at {branch} this morning and got away with {loss} of hardware. Insurance covers {insured}, leaving {net} for us to absorb. The team is shaken.',
    texts: [
      'Someone walked out of {branch} overnight with {loss} of GPUs under their coat. Insurance pays {insured}; the other {net} is ours. Nobody slept well.',
    ],
    money: ['loss', 'net', 'leave'],
    pct: ['insured'],
    options: [
      {
        id: 'upgrade',
        label: 'Upgrade the secure room',
        effect: 'A {nextVault} at half price. Morale +5.',
        line: 'capex',
      },
      { id: 'leave', label: 'Paid leave', effect: 'A week off for the whole team. Morale +10.' },
      {
        id: 'usual',
        label: 'Business as usual',
        effect: 'Morale −15. Sales office rating −0.3 for 8 weeks.',
        penaltyWeeks: 3,
      },
    ],
    worst: 'usual',
  },
  ATM_SKIM: {
    id: 'ATM_SKIM',
    title: 'API key leak',
    scope: 'branch',
    trigger: 'rolled',
    baseP: 0.001,
    text: 'API keys issued at {branch} leaked online, and strangers ran up about {refund} on customers’ accounts before we spotted it.',
    texts: [
      'A batch of {branch} API keys turned up on a public code site. Before we noticed, strangers had burned about {refund} of customers’ credit.',
    ],
    money: ['refund'],
    options: [
      { id: 'refund', label: 'Refund customers', effect: 'Pay back every customer.' },
      {
        id: 'firmware',
        label: 'Rotate every key',
        effect: 'Leak risk halved for 26 weeks.',
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
    texts: [
      'A security researcher emailed at dawn: our customer database was open to the internet. About {affected} customers’ records may be out there.',
      'Intruders got into a support system overnight. Details for about {affected} customers may have left the building.',
    ],
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
    title: 'Capability over-claim',
    scope: 'branch',
    trigger: 'rolled',
    baseP: 0.001,
    text: 'Staff at {branch} promised customers things our model can’t do. Complaints are piling up; putting it right costs about {comp}.',
    texts: [
      'A sales lead at {branch} told customers the model could do their accounts unsupervised. It cannot. Making it right costs about {comp}.',
    ],
    money: ['comp', 'fine'],
    options: [
      {
        id: 'fire',
        label: 'Fire the manager and compensate',
        effect: 'Customers repaid; the sales office needs a new manager.',
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
    title: 'Safety audit',
    scope: 'company',
    trigger: 'triggered',
    text: 'The regulator’s quarterly safety review found gaps in our controls. They propose a fine of {fine}.',
    texts: [
      'The safety inspectors spent a week in our offices and left with a list. Their letter proposes a fine of {fine}.',
      'The quarterly review is back. The regulator calls our controls “aspirational” and proposes a fine of {fine}.',
    ],
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
    text: 'A video of a customer left on hold for an hour by {branch} support is going round online, and people are piling on.',
    texts: [
      'A clip of a customer waiting forever for help at {branch} is going round online, and people are piling on.',
      'A customer filmed our {branch} demo crashing three times in a row. The video has more views than our launch.',
      'A furious thread about a support ticket at {branch} is trending. Everyone has a story to add.',
    ],
    options: [
      { id: 'apology', label: 'Apologise and fix it', effect: 'Service rating +0.2 for 8 weeks.' },
      {
        id: 'ignore',
        label: 'Ignore it',
        effect: 'Sales office awareness −5 points. The press may pick it up.',
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
    texts: ['Word reaches us that {rival} has made {name}, our {title}, a very large offer.'],
    options: [
      { id: 'counter', label: 'Counter-offer', effect: 'Salary +25%. Loyalty +10.' },
      { id: 'release', label: 'Let them go', effect: 'The seat falls vacant.' },
    ],
    worst: 'release',
  },
  RESEARCHER_POACHED: {
    id: 'RESEARCHER_POACHED',
    title: 'Researcher poached',
    scope: 'company',
    trigger: 'triggered',
    yours: true,
    text: '{rival} is trying to hire away our researcher {name}.',
    texts: ['{rival} has been taking {name} to long lunches. An offer is on the table.'],
    options: [
      { id: 'counter', label: 'Counter-offer', effect: 'Their salary +25%.' },
      {
        id: 'release',
        label: 'Let them go',
        effect: 'They join the rival lab, and its next models get better.',
      },
    ],
    worst: 'release',
  },
  BRANCH_FLOOD: {
    id: 'BRANCH_FLOOD',
    title: 'Heatwave',
    scope: 'branch',
    trigger: 'triggered',
    baseP: 0.0005,
    text: 'A heatwave knocked out the cooling at {branch} and the servers shut down. We can’t open until it’s repaired.',
    texts: [
      'The cooling failed at {branch} in the heat and the racks shut themselves down. We stay closed until it is fixed.',
    ],
    options: [
      { id: 'fast', label: 'Fast repair', effect: 'Closed for 1 week.', penaltyWeeks: 1 },
      { id: 'slow', label: 'Slow repair', effect: 'Closed for 4 weeks.', penaltyWeeks: 4 },
    ],
    worst: 'slow',
  },
  BANK_RUN: {
    id: 'BANK_RUN',
    title: 'Outage rumour',
    scope: 'company',
    trigger: 'triggered',
    yours: true,
    text: 'Rumours that we are about to go dark are spreading, and customers are cancelling their plans before it happens.',
    texts: [
      'A post claiming we are weeks from shutting down has gone viral. Customers are cancelling plans to get out first.',
    ],
    money: ['credits'],
    pct: ['odds'],
    options: [
      {
        id: 'credits',
        label: 'Service credits',
        effect: 'Give every customer {credits} of credits in all. The rumour ends.',
      },
      {
        id: 'raise',
        label: 'Cut plan prices',
        effect: 'Plans −10% at every sales office for 8 weeks.',
      },
      {
        id: 'statement',
        label: 'Public statement',
        effect: '{odds} chance it calms customers and ends the rumour.',
      },
    ],
    worst: 'statement',
  },
  CARD_FRAUD: {
    id: 'CARD_FRAUD',
    title: 'Abuse ring',
    scope: 'company',
    trigger: 'rolled',
    baseP: 0.0015,
    text: 'An abuse ring is signing up for the API with stolen card numbers. Losses so far: about {loss}.',
    texts: [
      'Fraudsters are opening API accounts with stolen cards and reselling the access. We are down about {loss} so far.',
    ],
    money: ['loss'],
    options: [
      { id: 'absorb', label: 'Absorb the losses', effect: 'We eat the fraud.' },
      {
        id: 'freeze',
        label: 'Freeze API sign-ups for a week',
        effect: 'No losses, but API take-up −50% for 4 weeks.',
        penaltyWeeks: 1,
      },
      {
        id: 'bureau',
        label: 'Absorb and call a fraud firm',
        effect: 'We eat the fraud, then look at a model with stronger Safety.',
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
    texts: [
      'The {branch} team downed tools at nine this morning. They want better pay and fewer weekend launches.',
      'Nobody showed up at {branch} today. The team is out on the pavement with signs about pay.',
    ],
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
    texts: [
      'Shareholders expect {amount} in three weeks. Make sure the cash is there.',
      'The quarterly dividend, {amount}, goes out in three weeks. Finance asks you not to spend it first.',
    ],
    money: ['amount'],
    options: OK,
    worst: 'ok',
  },
  CAPITAL_REVIEW: {
    id: 'CAPITAL_REVIEW',
    title: 'Board capital review',
    scope: 'company',
    trigger: 'triggered',
    yours: true,
    hideCosts: true,
    cooldownWeeks: 0,
    text: 'The year is closed, and the board sees {surplus} of cash beyond what the lab needs. It wants a plan for {amount} of it.',
    texts: [
      'Year-end figures are in. The board counts {surplus} of spare cash and wants to know what happens to {amount} of it.',
      'The board has read the accounts: {surplus} more cash than the lab needs. They want a plan for {amount} before the next meeting.',
    ],
    money: ['surplus', 'amount'],
    options: [
      {
        id: 'project',
        label: 'Fund a frontier project',
        effect: 'Start {project} now. Investors like the ambition.',
      },
      {
        id: 'buyback',
        label: 'Buy back shares',
        effect: 'Up to {amount} of shares from the public. Your stake grows; the price lifts.',
      },
      {
        id: 'dividend',
        label: 'Special dividend',
        effect: '{amount} paid to shareholders now. Your share lands in personal cash.',
      },
      {
        id: 'bank',
        label: 'Bank it',
        effect: 'Keep the cash. Investors had hoped for more: share sentiment falls.',
      },
    ],
    worst: 'bank',
  },
  // One case a quarter (2026-10-30) naming every rival that cut and every city;
  // Match it answers in all of them. Older saves may hold a per-city case.
  PRICE_WAR: {
    id: 'PRICE_WAR',
    title: 'Price war',
    scope: 'company',
    trigger: 'triggered',
    cooldownWeeks: PRICE_WAR.caseWeeks,
    text: '{bank} cut plan prices by {bump} in {cities} this month to win subscribers back from us.',
    texts: [
      '{bank} slashed plan prices by {bump} in {cities}. Their ads name us.',
      'Price cuts of {bump} from {bank} hit {cities} this month. Our sales teams are getting calls.',
    ],
    pct: ['bump'],
    options: [
      {
        id: 'match',
        label: 'Match it',
        effect: 'Plans −10% at our sales offices in {cities} for 26 weeks.',
        penaltyWeeks: 1,
      },
      {
        id: 'hold',
        label: 'Hold our prices',
        effect: 'Keep our margin and risk some cancellations.',
        penaltyWeeks: 1.5,
      },
    ],
    worst: 'hold',
  },
  BIG_DEFAULT: {
    id: 'BIG_DEFAULT',
    title: 'Big customer failure',
    scope: 'branch',
    trigger: 'triggered',
    info: true,
    text: '{business} has gone under owing {amount} on its contract with {branch}. The loss is already on our books.',
    texts: [
      '{business} has collapsed, leaving {amount} unpaid on its {branch} contract. We have already written it off.',
    ],
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
    texts: [
      'A letter from the securities regulator asks about your trades in {company}. Settling would cost {fine}.',
    ],
    money: ['fine', 'doubled'],
    options: [
      {
        id: 'settle',
        label: 'Settle',
        effect:
          'Pay {fine} from your personal cash. The story dents the lab’s ratings for a while.',
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
    text: 'Our safety ratio has slipped into the Restricted band. Until it recovers we can’t open sales offices or pay dividends, and new sign-ups are halved. More, better-paid safety staff or a safer model will lift it.',
    texts: [
      'The regulator writes: our safety ratio is now Restricted. No new sales offices, no dividends and half the sign-ups until it climbs. Hire or pay more safety staff, or ship a safer model.',
    ],
    options: OK,
    worst: 'ok',
  },
  RECAP_OFFER: {
    id: 'RECAP_OFFER',
    title: 'Mandated pause',
    scope: 'company',
    trigger: 'triggered',
    yours: true,
    cooldownWeeks: 0,
    text: 'Our safety ratio has been under {floor} for {weeks} weeks. The regulator offers a {pauseWeeks}-week pause: no new customers, deals or training while its monitors work alongside our Safety team, for a fee of {amount}. Refusing means it revokes our licence.',
    texts: [
      '{weeks} weeks under {floor} and the regulator has run out of patience. It offers a {pauseWeeks}-week pause under its monitors for {amount}: no new customers, deals or training. Say no and the licence goes.',
    ],
    money: ['amount'],
    pct: ['floor'],
    options: [
      {
        id: 'accept',
        label: 'Accept the pause',
        line: 'fines',
        effect:
          'Pay {amount}; the monitors lift Safety coverage while it lasts. Still under {floor} at the end and the licence goes.',
      },
      {
        id: 'decline',
        label: 'Decline',
        effect:
          'The licence is revoked: {revokeWeeks} weeks with nothing new, then a year of strict watch.',
      },
    ],
    worst: 'decline',
  },
};

/** Every incident: the bank-era cases plus the AI-native ones (incidentsAi.ts). */
export const INCIDENT_SPECS: Record<string, IncidentSpec> = {
  ...BANK_ERA_SPECS,
  ...AI_SPECS,
  ...FOUNDER_SPECS,
  ...VETERAN_SPECS,
};
