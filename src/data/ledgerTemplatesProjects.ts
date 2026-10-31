// The Weekly Ledger's templates for frontier projects, lost and finished public
// tenders and the board's special dividend (CONTENT §23, 2026-10-31). A finished
// project uses PROJECT_DONE_{id} when it has its own story, else PROJECT_DONE.
// Tokens: {bank} your lab, {name} the project, {cost} its price, {weeks} its
// length, {body} a public body, {city}, {rival}, {amount}, {total}.
// Merged into LEDGER_TEMPLATES.
import type { LedgerTemplate } from './ledgerTemplates';

export const PROJECT_TEMPLATES = {
  PROJECT_STARTED: [
    {
      h: '{bank} breaks ground on {name}',
      b: 'The lab has committed {cost} over {weeks} weeks. It calls the project the most ambitious in its history.',
    },
    {
      h: '{name}: {bank} goes big',
      b: 'A {cost} bet, paid week by week for {weeks} weeks. Investors are split on the timing.',
    },
    {
      h: '{bank} announces {name}',
      b: 'The lab says the work starts today and runs {weeks} weeks. The bill: {cost}.',
    },
    {
      h: 'Inside {bank}’s {cost} plan',
      b: '{name} will tie up money and talent for {weeks} weeks. Rivals are watching closely.',
    },
  ],
  PROJECT_DONE: [
    {
      h: '{bank} completes {name}',
      b: 'Years of spending pay off as the lab’s biggest project yet comes in. Rivals are taking notes.',
    },
    {
      h: '{name} is finished',
      b: '{bank} calls it the most ambitious thing the lab has built. Analysts are already asking what comes next.',
    },
    {
      h: 'Done: {bank} delivers {name}',
      b: 'The lab’s long project is over, on its own timetable if not its first one.',
    },
    {
      h: '{name} comes home for {bank}',
      b: 'The last invoice is paid. The lab held a small party and a large press conference.',
    },
  ],
  PROJECT_DONE_lodestar: [
    {
      h: '{bank} cracks a new architecture',
      b: 'Project Lodestar is done. The lab says its next models can climb higher than any before.',
    },
    {
      h: 'Lodestar lands at {bank}',
      b: 'A year of research pays off: the lab’s model ceiling has gone up a notch.',
    },
  ],
  PROJECT_DONE_meridian: [
    {
      h: 'Meridian scales up {bank}',
      b: 'The new training stack is live. Rivals now face a lab with a higher ceiling than theirs.',
    },
    {
      h: '{bank} finishes Project Meridian',
      b: 'Eighteen months of work and a billion-plus spent. The lab’s models have more room to grow.',
    },
  ],
  PROJECT_DONE_zenith: [
    {
      h: '{bank} reaches Zenith',
      b: 'The moonshot is done. Nobody else knows how to build what the lab can now train.',
    },
    {
      h: 'Zenith: the lab nobody can catch',
      b: '{bank} has finished its two-year moonshot. Analysts ran out of adjectives.',
    },
  ],
  PROJECT_DONE_apex: [
    {
      h: 'Apex complete: {bank} stands alone',
      b: 'The largest training run ever attempted is over. The model ceiling moves again.',
    },
    {
      h: '{bank} finishes Project Apex',
      b: 'Treaty lawyers, power engineers and a lot of GPUs. The lab says it was worth it.',
    },
  ],
  PROJECT_DONE_campus: [
    {
      h: 'Gigawatt Campus switches on',
      b: '{bank}’s city of data halls is live, on its own grid. The lab’s compute bill just changed shape.',
    },
    {
      h: '{bank} lights up its campus',
      b: 'Two hundred thousand GPUs came online this week. Locals report a faint hum.',
    },
  ],
  PROJECT_DONE_array: [
    {
      h: 'Terawatt Array online',
      b: '{bank} has finished a compute site five times the size of its first campus.',
    },
    {
      h: 'The array is live',
      b: 'Four hundred thousand more GPUs for {bank}. The new power line is already busy.',
    },
  ],
  PROJECT_DONE_institute: [
    {
      h: '{bank} opens its Safety Institute',
      b: 'Every model now goes past a red team before it ships. Regulators sounded pleased.',
    },
    {
      h: 'Safety Institute doors open',
      b: 'An endowed home for testing {bank}’s models. Critics call it a start.',
    },
  ],
  PROJECT_DONE_edge: [
    {
      h: '{bank} edge network goes global',
      b: 'Inference now runs close to every customer. Support queues shortened overnight.',
    },
    {
      h: 'Faster everywhere: {bank} edge done',
      b: 'Points of presence in every market. Customers mostly noticed that it got quicker.',
    },
  ],
  PROJECT_DONE_relay: [
    {
      h: 'Stratos Relay is up',
      b: '{bank}’s high-altitude relays now cover every city it serves. Astronomers have questions.',
    },
    {
      h: '{bank} takes inference skyward',
      b: 'The relay network is finished. Service scores are expected to climb.',
    },
  ],
  PROJECT_DONE_fellowship: [
    {
      h: 'First Long Table fellows graduate',
      b: '{bank}’s worldwide school has trained its customer engineers. The lab says service will show it.',
    },
    {
      h: '{bank} completes its fellowship',
      b: 'A school for every engineer who meets a customer. The first class is already at work.',
    },
  ],
  PROJECT_STALLED: [
    {
      h: '{name} stalls at {bank}',
      b: 'The lab missed a weekly payment on its flagship project. Work has paused until the cash returns.',
    },
    {
      h: 'Cash crunch hits {name}',
      b: '{bank} has quietly stopped work on its big project. Contractors are waiting by the phone.',
    },
    {
      h: '{bank} hits pause on {name}',
      b: 'Not enough money for this week’s bill, sources say. The lab insists the plan stands.',
    },
  ],
  TENDER_LOST: [
    {
      h: '{rival} beats {bank} to the {body} contract',
      b: 'The {city} body chose a rival bid. {bank} says it will try again.',
    },
    {
      h: '{body} picks {rival} over {bank}',
      b: 'A sealed-bid tender in {city} went the other way this week.',
    },
  ],
  TENDER_LOST_TIER: [
    {
      h: '{bank} ruled out of {body} tender',
      b: 'The {city} body dropped the lab’s bid after its safety rating slipped below the bar.',
    },
    {
      h: 'Safety rating costs {bank} a contract',
      b: '{body} in {city} will not sign a lab under review. The bid is void.',
    },
  ],
  TENDER_ENDED: [
    {
      h: '{bank}’s {body} contract runs out',
      b: 'The public deal worth {amount} a year has reached the end of its term. A new tender may follow.',
    },
    {
      h: 'End of term at {body}',
      b: '{bank}’s contract in {city} closes on schedule. Officials thanked the lab.',
    },
  ],
  SPECIAL_DIVIDEND: [
    {
      h: '{bank} pays a {total} special dividend',
      b: 'The board had more cash than the lab needed and handed it back. Shareholders were not complaining.',
    },
    {
      h: 'Windfall for {bank} shareholders',
      b: 'A one-off payout of {total} lands this week. The founder’s share goes into personal cash.',
    },
    {
      h: '{bank} returns {total} to investors',
      b: 'A special dividend, not a habit, the lab stresses. The share register approves anyway.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
