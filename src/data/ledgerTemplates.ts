// The Weekly Ledger's headline and body templates for your bank
// (CONTENT §23). Tokens are in {braces} and are filled by src/sim/news*.ts;
// each story type has 2–4 variants so the same subject never reads the same
// two weeks running. Fictional names only. Rival templates live in
// ledgerTemplatesRivals.ts and macro, markets, sports and politics in
// ledgerTemplatesWorld.ts, the World desk in ledgerTemplatesGlobe.ts and the
// company desk, Money Column and elections in ledgerTemplatesDesk.ts; all are
// merged into LEDGER_TEMPLATES.
import { CAPITAL_TEMPLATES } from './ledgerTemplatesCapital';
import { INVESTMENTS_TEMPLATES } from './ledgerTemplatesInvestments';
import { EMPIRE_TEMPLATES } from './ledgerTemplatesEmpire';
import { DESK_TEMPLATES } from './ledgerTemplatesDesk';
import { CALENDAR_TEMPLATES } from './ledgerTemplatesCalendar';
import { GLOBE_TEMPLATES } from './ledgerTemplatesGlobe';
import { GLOBE_MORE_TEMPLATES } from './ledgerTemplatesGlobeMore';
import { RIVAL_TEMPLATES } from './ledgerTemplatesRivals';
import { WORLD_TEMPLATES } from './ledgerTemplatesWorld';

export interface LedgerTemplate {
  /** Headline. */
  h: string;
  /** Body: one or two sentences. */
  b: string;
}

const BANK_TEMPLATES = {
  // ─── Your bank ──────────────────────────────────────────────────────────────
  NEW_BRANCH: [
    {
      h: 'New branch: {bank} opens in {district}, {city}',
      b: '{bank} signed for {address} this week. Fitters are in and the doors open within days.',
    },
    {
      h: '{bank} breaks ground in {city}',
      b: 'Builders are fitting out {address} in {district}. Opening day is about a week away.',
    },
    {
      h: '{bank} plants its flag in {district}',
      b: 'Scaffolding went up at {address} as {bank} readies a branch in {city}.',
    },
  ],
  BRANCH_OPENED: [
    {
      h: '{bank} opens {name}',
      b: '{address} has a new bank on the block. Tellers are at their stations and the savings board is up.',
    },
    {
      h: 'Doors open at {name}',
      b: 'The first customers queued at {address} as {bank} opened for business. Deposits are welcome from day one.',
    },
    {
      h: '{name} welcomes its first customers',
      b: '{bank} cut the ribbon at {address} this week. The manager promises short queues and long hours.',
    },
  ],
  BRANCH_CLOSED: [
    {
      h: '{bank} closes {name}',
      b: 'The shutters came down for the last time this week.{moved}',
    },
    {
      h: 'Last day at {name}',
      b: '{bank} has closed the branch after a review of its network.{moved}',
    },
  ],
  LOAN_ONE: [
    {
      h: '{lead} secures {leadAmount} loan',
      b: '{bank} priced the facility at {rate}. The owners plan to put the money to work straight away.',
    },
    {
      h: '{bank} backs {lead} with {leadAmount}',
      b: 'The loan, at {rate}, was signed this week. Local trade groups welcomed the vote of confidence.',
    },
  ],
  LOAN_MANY: [
    {
      h: '{bank} writes {n} business loans',
      b: '{total} went out the door this week, the largest to {lead} at {rate}. Main Street is borrowing.',
    },
    {
      h: 'Local firms line up for {bank} credit',
      b: '{n} businesses signed loans worth {total} in all. {lead} took the biggest, {leadAmount} at {rate}.',
    },
    {
      h: '{bank} lends {total} to local business',
      b: 'Loan officers closed {n} deals this week, led by {leadAmount} for {lead}.',
    },
  ],
  BIG_DEFAULT: [
    {
      h: '{business} defaults on {amount} loan',
      b: 'The {sector} business owed {bank} {amount}. Recoveries are expected to cover only part of it.',
    },
    {
      h: '{bank} hit by {amount} default',
      b: '{business}, a {sector} firm, has stopped paying. Analysts call it a reminder to read the small print on collateral.',
    },
    {
      h: 'Collapse of {business} leaves {bank} out of pocket',
      b: 'The {sector} borrower missed its payments on a {amount} loan. The bank is working with receivers.',
    },
  ],
  WINDOW_USE: [
    {
      h: '{bank} taps emergency central bank funding',
      b: "The bank borrowed {amount} from the {cb}'s standing facility this week.",
    },
    {
      h: '{bank} turns to the lender of last resort',
      b: "Treasury drew {amount} from the {cb}'s window. Use of the window is noticed, and rivals will not forget it soon.",
    },
    {
      h: 'Questions over {bank} liquidity',
      b: "A {amount} draw on the {cb}'s facility has set tongues wagging in the funding market.",
    },
  ],
  REGULATOR_AUDIT: [
    {
      h: 'Regulator fines {bank} {fine} after audit',
      b: 'Examiners found gaps in risk controls during their quarterly review.',
    },
    {
      h: '{bank} fails regulator review',
      b: 'The quarterly audit ends with a {fine} penalty and a list of fixes to make.',
    },
  ],
  REG_FINE: [
    { h: 'Regulator fines {bank} {amount}', b: 'The penalty follows {reason}.' },
    {
      h: '{bank} pays {amount} penalty',
      b: 'Supervisors acted after {reason}. The bank says it has tightened its controls.',
    },
  ],
  BREACH: [
    { h: '{bank} discloses data breach', b: 'About {n} customers may be affected.' },
    {
      h: 'Hackers reach {bank} customer files',
      b: 'The bank is writing to roughly {n} customers and says no money has moved.',
    },
  ],
  BANK_RUN: [
    {
      h: 'Queues form outside {bank}',
      b: 'Depositors are pulling savings after a week of worrying headlines. The bank says it has ample cash.',
    },
    {
      h: 'Run on {bank} as savers take fright',
      b: 'Withdrawals surged at branches across the network. Regulators are watching closely.',
    },
  ],
  BANK_RUN_ENDED: [
    {
      h: 'Calm returns at {bank}',
      b: 'Withdrawals have slowed to normal levels and the queues have gone.',
    },
    {
      h: '{bank} weathers the storm',
      b: 'The rush for the exits is over. Deposits are flowing back in.',
    },
  ],
  RECAP: [
    {
      h: '{bank} raises {amount} in rescue deal',
      b: 'Regulators arranged the recapitalisation; {shares} new shares were issued.',
    },
    {
      h: 'Lifeline for {bank}',
      b: 'A {amount} capital injection shores up the balance sheet at the cost of {shares} new shares.',
    },
  ],
  PRODUCT_DEVELOPED: [
    {
      h: '{bank} launches {name}',
      b: 'The new product reached the shelves this week. Early testers rate it {stars} stars.',
    },
    {
      h: 'New from {bank}: {name}',
      b: 'Product designers say {name} has been months in the making. Reviewers give it {stars} stars.',
    },
  ],
  DIGITAL_PROJECT_DONE: [
    {
      h: '{bank} ships {name}',
      b: 'The digital team finished the project this week. Customers will see it in the app.',
    },
    {
      h: '{name} goes live at {bank}',
      b: 'Engineers flipped the switch this week after months of work.',
    },
  ],
  PARTNERSHIP_SIGNED: [
    {
      h: '{employer} picks {bank} for {kind}',
      b: 'The deal, worth a {fee} signing fee, is run from {branch}.',
    },
    {
      h: '{bank} wins {employer} {kind}',
      b: 'Staff at {employer} will be offered accounts through {branch}. The bank paid {fee} to sign.',
    },
  ],
  PARTNERSHIP_RENEWED: [
    {
      h: '{employer} renews with {bank}',
      b: 'The partnership rolls on for another term; the fee is {fee}.',
    },
    { h: '{bank} keeps {employer}', b: 'Both sides signed a renewal worth {fee} this week.' },
  ],
  PARTNERSHIP_ENDED: [
    {
      h: '{employer} and {bank} part ways',
      b: 'The partnership has {reason}. Balances will run off over the coming weeks.',
    },
    { h: '{bank} loses {employer} deal', b: 'The arrangement has {reason}.' },
  ],
  GRAD_PROGRAM: [
    {
      h: '{bank} opens graduate program at {university}',
      b: 'The bank will pay {cost} a year to recruit the brightest leavers.',
    },
    {
      h: '{university} graduates head for {bank}',
      b: 'A new {cost}-a-year program brings fresh talent into the bank.',
    },
  ],
  CORPORATE_LOAN: [
    {
      h: '{bank} borrows {amount} from {lender}',
      b: 'The corporate loan carries a rate of {rate}. Rivals by day, lenders by night.',
    },
    {
      h: '{lender} lends {amount} to {bank}',
      b: "The facility, at {rate}, funds the bank's growth plans.",
    },
  ],
  BANK_WEEK_PROFIT: [
    {
      h: '{bank} turns a profit',
      b: 'Revenue of {revenue} left {net} after costs and tax this week.',
    },
    {
      h: '{bank} in the black',
      b: 'The bank booked {revenue} of revenue and kept {net} as profit.',
    },
    {
      h: 'Steady week for {bank}',
      b: 'Revenue came to {revenue}; net income was {net}.',
    },
  ],
  BANK_WEEK_LOSS: [
    {
      h: '{bank} slips into the red',
      b: 'Revenue of {revenue} fell short of costs, leaving a loss of {loss}.',
    },
    {
      h: '{bank} posts a weekly loss',
      b: 'Costs outran revenue of {revenue}; the bank lost {loss}. Directors are said to be studying the numbers.',
    },
    {
      h: 'Growing pains at {bank}',
      b: 'A loss of {loss} on revenue of {revenue} this week. Young branches take time to pay their way.',
    },
  ],
  BANK_QUARTER: [
    {
      h: '{bank} reports {quarter} results',
      b: 'Revenue for the quarter was {revenue} with net income of {net}.',
    },
    {
      h: '{bank} closes the books on {quarter}',
      b: 'The bank made {net} on revenue of {revenue} over the quarter.',
    },
    {
      h: 'Profitable {quarter} for {bank}',
      b: 'Net income of {net} on {revenue} of revenue keeps shareholders smiling.',
    },
  ],
  BANK_QUARTER_LOSS: [
    {
      h: '{bank} reports a {quarter} loss',
      b: 'Revenue for the quarter was {revenue}, but costs left a loss of {loss}.',
    },
    {
      h: '{bank} in the red for {quarter}',
      b: 'The bank lost {loss} on revenue of {revenue} over the quarter as it builds its network.',
    },
  ],
  CAPITAL_WEAK: [
    {
      h: 'Regulator puts {bank} on watch',
      b: 'With a capital ratio of {cr}, the bank shows {tier}. To recover, it can {fix}.',
    },
    {
      h: 'Thin cushion at {bank}',
      b: 'A capital ratio of {cr} leaves {tier}. Analysts say the bank should {fix}.',
    },
  ],
  INCIDENT_ROBBERY: [
    {
      h: 'Robbery at {scope}',
      b: 'Thieves struck at the {bank} branch this week. No one was hurt.',
    },
    {
      h: 'Raiders hit {scope}',
      b: 'Police are appealing for witnesses after the {bank} branch was robbed.',
    },
  ],
  MILESTONE: [
    { h: '{bank} reaches a milestone: {title}', b: '{line}' },
    {
      h: 'Milestone for {bank}: {title}',
      b: '{line} Staff marked the moment with cake in the break room.',
    },
  ],
  INCIDENT_BRANCH_FLOOD: [
    {
      h: 'Floodwater closes {scope}',
      b: 'Staff waded in to save the files after water reached the {bank} branch.',
    },
    {
      h: '{scope} under water',
      b: 'A burst of high water left the {bank} branch counting the cost.',
    },
  ],
  INCIDENT_STAFF_WALKOUT: [
    {
      h: 'Staff walk out at {scope}',
      b: 'Tellers at the {bank} branch downed pens over pay and conditions.',
    },
    {
      h: 'Pickets outside {scope}',
      b: 'Unhappy staff at the {bank} branch say they will not return until things change.',
    },
  ],
  // Press angles from incident choices (INCIDENT_NEWS): a denied skimming claim, an ignored complaint.
  INCIDENT_NEWS_ATM_SKIM: [
    {
      h: '{bank} denies liability for ATM skimming at {scope}',
      b: 'Customers who lost money at the cash machine say the bank is refusing refunds.',
    },
    {
      h: 'Skimming victims left out of pocket by {bank}',
      b: 'A device fitted to the ATM at {scope} emptied accounts. The bank says it is not to blame.',
    },
  ],
  INCIDENT_NEWS_VIRAL_COMPLAINT: [
    {
      h: 'Complaint about {scope} goes viral',
      b: 'A customer video about long waits at the {bank} branch has been shared thousands of times. The bank has not responded.',
    },
    {
      h: '{bank} stays silent as {scope} complaint spreads',
      b: 'Online, customers are swapping stories of slow service at the branch.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;

export const LEDGER_TEMPLATES = {
  ...BANK_TEMPLATES,
  ...RIVAL_TEMPLATES,
  ...WORLD_TEMPLATES,
  ...CAPITAL_TEMPLATES,
  ...INVESTMENTS_TEMPLATES,
  ...EMPIRE_TEMPLATES,
  ...GLOBE_TEMPLATES,
  ...GLOBE_MORE_TEMPLATES,
  ...CALENDAR_TEMPLATES,
  ...DESK_TEMPLATES,
};

export type TemplateKey = keyof typeof LEDGER_TEMPLATES;
