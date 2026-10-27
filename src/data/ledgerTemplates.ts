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
      h: 'New sales office: {bank} opens in {district}, {city}',
      b: '{bank} signed for {address} this week. Fitters are in and the doors open within days.',
    },
    {
      h: '{bank} breaks ground in {city}',
      b: 'Builders are fitting out {address} in {district}. Opening day is about a week away.',
    },
    {
      h: '{bank} plants its flag in {district}',
      b: 'Scaffolding went up at {address} as {bank} readies a sales office in {city}.',
    },
  ],
  OFFICE_GROWN: [
    {
      h: '{bank} grows its {city} office',
      b: '{name} takes more floor space and becomes a {size} office. Desks for a bigger sales team are on order.',
    },
    {
      h: 'More room at {name}',
      b: '{bank} signed for extra space in {city}, turning {name} into a {size} office.',
    },
  ],
  BRANCH_OPENED: [
    {
      h: '{bank} opens {name}',
      b: '{address} has a new lab on the block. Tellers are at their stations and the savings board is up.',
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
      b: '{bank} has closed the sales office after a review of its network.{moved}',
    },
  ],
  DATA_CENTER_STARTED: [
    {
      h: '{bank} breaks ground on {name}',
      b: 'Crews are fitting out a GPU hall at {site}, {city}. {bank} expects it running in {weeks} weeks.',
    },
    {
      h: 'Compute coming to {city}',
      b: '{bank} has started building {name} at {site}. Power and cooling go in first.',
    },
  ],
  DATA_CENTER_OPENED: [
    {
      h: '{name} switches on',
      b: '{bank} brought {gpus} GPUs online in {city} this week. Customers nearby should notice faster answers.',
    },
    {
      h: 'The lights are on at {name}',
      b: 'The halls in {city} are humming: {gpus} GPUs now run for {bank}.',
    },
  ],
  DATA_CENTER_CLOSED: [
    {
      h: '{bank} shuts {name}',
      b: 'The racks in {city} are being sold off and the power feed disconnected.',
    },
    {
      h: 'Power down at {name}',
      b: '{bank} is closing its {city} data center and selling the equipment.',
    },
  ],
  CONTRACT_ONE: [
    {
      h: '{lead} signs with {bank}',
      b: 'The {sector} business agreed a {leadAmount}-a-year contract for {bank}’s models this week.',
    },
    {
      h: '{bank} lands {lead}',
      b: 'A {leadAmount} yearly deal brings the {sector} firm onto {bank}’s platform.',
    },
  ],
  CONTRACT_MANY: [
    {
      h: '{bank} signs {n} business contracts',
      b: 'Deals worth {total} a year closed this week, the largest with {lead} at {leadAmount}.',
    },
    {
      h: 'Local firms sign up with {bank}',
      b: '{n} businesses agreed contracts worth {total} a year in all. {lead} took the biggest, {leadAmount}.',
    },
  ],
  CONTRACT_WON_BIG: [
    {
      h: '{bank} wins {business} from {rival}',
      b: 'The {sector} account, worth {amount} a year, switched at its renewal, leaving {rival}.',
    },
    {
      h: '{business} picks {bank} in {amount} deal',
      b: 'The {sector} business chose {bank}’s models over {rival} for its next contract.',
    },
  ],
  CONTRACT_LOST_BIG: [
    {
      h: '{business} drops {bank}',
      b: 'The {sector} account, worth {amount} a year, {why}.',
    },
    {
      h: '{bank} loses {amount} account',
      b: '{business}, a {sector} firm, {why}.',
    },
  ],
  WINDOW_USE: [
    {
      h: '{bank} taps emergency central bank funding',
      b: "The lab borrowed {amount} from the {cb}'s standing facility this week.",
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
      b: 'Supervisors acted after {reason}. The lab says it has tightened its controls.',
    },
  ],
  BREACH: [
    { h: '{bank} discloses data breach', b: 'About {n} customers may be affected.' },
    {
      h: 'Hackers reach {bank} customer files',
      b: 'The lab is writing to roughly {n} customers and says no money has moved.',
    },
  ],
  BANK_RUN: [
    {
      h: 'Queues form outside {bank}',
      b: 'Depositors are pulling savings after a week of worrying headlines. The lab says it has ample cash.',
    },
    {
      h: 'Run on {bank} as savers take fright',
      b: 'Withdrawals surged at sales offices across the network. Regulators are watching closely.',
    },
  ],
  COMPUTE_BURST: [
    {
      h: '{bank} pays up for emergency GPUs',
      b: 'The lab bought {gpus} GPUs of burst capacity at a premium this week after running past its spot allowance.',
    },
    {
      h: '{bank} scrambles for compute',
      b: 'Cloud brokers say the lab took {gpus} emergency GPUs at a steep markup. Rivals are watching its bills.',
    },
  ],
  COMPUTE_CRUNCH: [
    {
      h: '{bank} puts new customers on a waitlist',
      b: 'The lab has run out of GPUs to serve demand. Sign-ups are paused until capacity catches up.',
    },
    {
      h: 'Capacity crunch at {bank}',
      b: 'Would-be customers face a waitlist as the lab struggles to find enough compute.',
    },
  ],
  COMPUTE_CRUNCH_ENDED: [
    {
      h: '{bank} reopens sign-ups',
      b: 'Fresh capacity is online and the waitlist has cleared.',
    },
    {
      h: 'Waitlist over at {bank}',
      b: 'The lab says it now has the GPUs to serve everyone who wants in.',
    },
  ],
  COMPUTE_OUTAGE: [
    {
      h: '{bank} goes down under the load',
      b: 'Customers report errors and timeouts as demand outruns the lab’s GPUs. Some are already shopping around.',
    },
    {
      h: 'Outage hits {bank}',
      b: 'Weeks of too little compute have caught up with the lab. Its status page has been red since Monday.',
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
  SAFETY_PAUSE: [
    {
      h: '{bank} agrees to a {weeks}-week safety pause',
      b: 'Regulators will sit alongside the lab’s safety team. No new customers or training runs until they leave, and the lab pays their {fee} bill.',
    },
    {
      h: 'Regulator puts {bank} on hold',
      b: 'After weeks of thin safety cover the lab has accepted a {weeks}-week pause and {fee} in monitoring fees.',
    },
  ],
  LICENCE_REVOKED: [
    {
      h: 'Regulator revokes {bank}’s licence',
      b: 'The lab may not sign new customers or train models for {weeks} weeks, then faces a year of strict watch.',
    },
    {
      h: '{bank} loses its licence',
      b: 'Safety cover fell too far for too long. Existing customers stay, but nothing new for {weeks} weeks.',
    },
  ],
  LICENCE_RESTORED: [
    {
      h: '{bank} gets its licence back',
      b: 'The pause is over. The regulator will keep a close eye on the lab for the next year.',
    },
    {
      h: 'Back in business: {bank}',
      b: 'Its licence restored, the lab can sign customers again, under strict watch for a year.',
    },
  ],
  MODEL_TRAINED: [
    {
      h: '{bank} finishes training {name}',
      b: 'The new model scores {score} on the benchmark board and is ready to switch on in Manage Models.',
    },
    {
      h: 'Meet {name}, from {bank}',
      b: 'After weeks on the cluster, {bank}’s latest model posts a {score} benchmark score.',
    },
  ],
  MODEL_TRAINED_LEADS: [
    {
      h: '{name} tops the leaderboard',
      b: '{bank}’s new model scores {score}, ahead of every rival lab’s release.',
    },
    {
      h: '{bank} takes the top spot with {name}',
      b: 'A {score} benchmark score puts the new model first on the board. Rival labs are expected to answer.',
    },
  ],
  RESEARCHER_HIRED: [
    {
      h: '{bank} hires researcher {name}',
      b: '{name} joins the lab’s training team.',
    },
    {
      h: '{name} signs with {bank}',
      b: 'The researcher starts work on the lab’s next model.',
    },
  ],
  RESEARCHER_POACHED_FROM: [
    {
      h: '{bank} lures {name} from {rival}',
      b: 'A signing bonus and a bigger salary win the talent war this time. {rival} loses a key researcher.',
    },
    {
      h: '{name} leaves {rival} for {bank}',
      b: 'One of {rival}’s researchers changes sides, and {bank}’s next model should show it.',
    },
  ],
  RESEARCHER_LEFT: [
    {
      h: '{rival} hires {name} away from {bank}',
      b: 'The researcher takes their know-how to a rival lab.',
    },
    {
      h: '{bank} loses {name} to {rival}',
      b: '{bank} chose not to match the offer. {rival}’s next model should be the better for it.',
    },
  ],
  RIVAL_MODEL_RELEASED: [
    {
      h: '{bank} ships {model}',
      b: 'The new release scores {score} on the benchmark board.',
    },
    {
      h: 'New model from {bank}: {model}',
      b: 'Early users report gains across the board; it scores {score}.',
    },
  ],
  RIVAL_MODEL_LEADS: [
    {
      h: '{model} raises the bar',
      b: '{bank}’s release scores {score}, the best rival model yet. Older models look tired next to it.',
    },
    {
      h: '{bank} leads the board with {model}',
      b: 'At {score}, the new release beats every model on the market. Customers will expect more for their money.',
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
      b: 'The deal, worth a {fee} signing fee, is run from {sales office}.',
    },
    {
      h: '{bank} wins {employer} {kind}',
      b: 'Staff at {employer} will be offered accounts through {sales office}. The lab paid {fee} to sign.',
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
      b: 'The lab will pay {cost} a year to recruit the brightest leavers.',
    },
    {
      h: '{university} graduates head for {bank}',
      b: 'A new {cost}-a-year program brings fresh talent into the lab.',
    },
  ],
  CORPORATE_LOAN: [
    {
      h: '{bank} borrows {amount} from {lender}',
      b: 'The corporate loan carries a rate of {rate}. Rivals by day, lenders by night.',
    },
    {
      h: '{lender} lends {amount} to {bank}',
      b: "The facility, at {rate}, funds the lab's growth plans.",
    },
  ],
  BANK_WEEK_PROFIT: [
    {
      h: '{bank} turns a profit',
      b: 'Revenue of {revenue} left {net} after costs and tax this week.',
    },
    {
      h: '{bank} in the black',
      b: 'The lab booked {revenue} of revenue and kept {net} as profit.',
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
      b: 'Costs outran revenue of {revenue}; the lab lost {loss}. Directors are said to be studying the numbers.',
    },
    {
      h: 'Growing pains at {bank}',
      b: 'A loss of {loss} on revenue of {revenue} this week. Young sales offices take time to pay their way.',
    },
  ],
  BANK_QUARTER: [
    {
      h: '{bank} reports {quarter} results',
      b: 'Revenue for the quarter was {revenue} with net income of {net}.',
    },
    {
      h: '{bank} closes the books on {quarter}',
      b: 'The lab made {net} on revenue of {revenue} over the quarter.',
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
      b: 'The lab lost {loss} on revenue of {revenue} over the quarter as it builds its network.',
    },
  ],
  CAPITAL_WEAK: [
    {
      h: 'Regulator puts {bank} on watch',
      b: 'With a safety ratio of {cr}, the lab shows {tier}. To recover, it can {fix}.',
    },
    {
      h: 'Thin safety cover at {bank}',
      b: 'A safety ratio of {cr} leaves {tier}. Analysts say the lab should {fix}.',
    },
  ],
  INCIDENT_ROBBERY: [
    {
      h: 'Server-room break-in at {scope}',
      b: 'Thieves made off with hardware from the {bank} sales office this week. No one was hurt.',
    },
    {
      h: 'Raiders hit {scope}',
      b: 'Police are appealing for witnesses after servers were taken from the {bank} sales office.',
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
      h: 'Heatwave shuts {scope}',
      b: 'Fans and ice buckets could not save the servers when the cooling failed at the {bank} sales office.',
    },
    {
      h: '{scope} overheats',
      b: 'A scorching week left the {bank} sales office dark and counting the cost.',
    },
  ],
  INCIDENT_STAFF_WALKOUT: [
    {
      h: 'Staff walk out at {scope}',
      b: 'Staff at the {bank} sales office downed laptops over pay and conditions.',
    },
    {
      h: 'Pickets outside {scope}',
      b: 'Unhappy staff at the {bank} sales office say they will not return until things change.',
    },
  ],
  // Press angles from incident choices (INCIDENT_NEWS): a denied key-leak claim, an ignored complaint.
  INCIDENT_NEWS_ATM_SKIM: [
    {
      h: '{bank} denies liability for API key leak at {scope}',
      b: 'Customers billed for strangers’ usage say the lab is refusing refunds.',
    },
    {
      h: 'Key-leak victims left out of pocket by {bank}',
      b: 'Keys issued at {scope} were posted online and run up overnight. The lab says it is not to blame.',
    },
  ],
  INCIDENT_NEWS_VIRAL_COMPLAINT: [
    {
      h: 'Complaint about {scope} goes viral',
      b: 'A customer video about long waits at the {bank} sales office has been shared thousands of times. The lab has not responded.',
    },
    {
      h: '{bank} stays silent as {scope} complaint spreads',
      b: 'Online, customers are swapping stories of slow service at the sales office.',
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
