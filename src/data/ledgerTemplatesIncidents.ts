// The Weekly Ledger's templates for the AI-native incidents (CONTENT §22 and
// §23, 2026-10-27): the story when each case is raised (INCIDENT_{type}), the
// press angles a choice can leave behind (INCIDENT_NEWS_{type}) and the three
// outcome events (a lawsuit lost, a weights leak that surfaced, a grid outage).
// Tokens: {bank} your lab, {scope} the office or the lab, {name} a data
// center, {amount} money. Merged into LEDGER_TEMPLATES in ledgerTemplates.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const INCIDENT_TEMPLATES = {
  INCIDENT_JAILBREAK: [
    {
      h: 'Viral prompt makes {bank} model misbehave',
      b: 'Screenshots of the lab’s assistant saying things it should not are spreading faster than the lab can take them down.',
    },
    {
      h: '{bank} assistant jailbroken in public',
      b: 'A few sentences are enough to switch off the model’s guardrails, users say. The lab has not yet commented.',
    },
  ],
  INCIDENT_NEWS_JAILBREAK: [
    {
      h: '{bank} shrugs off jailbreak',
      b: 'A week after a prompt that strips its model of its manners went round, the lab has said nothing and shipped nothing.',
    },
    {
      h: 'Safety groups criticise {bank} silence',
      b: 'The jailbreak still works, researchers say, and the lab seems happy to wait for the fuss to pass.',
    },
  ],
  INCIDENT_HALLUCINATION_SUIT: [
    {
      h: 'Customer sues {bank} over made-up answer',
      b: 'The suit says the lab’s model stated a falsehood with complete confidence, and the customer paid for believing it.',
    },
    {
      h: '{bank} faces hallucination lawsuit',
      b: 'Lawyers argue a wrong answer from the model is a defective product. The lab says its terms are clear.',
    },
  ],
  INCIDENT_COPYRIGHT_SUIT: [
    {
      h: 'Publisher sues {bank} over training data',
      b: 'The claim says the lab’s models learned from a licensed archive it never paid for.',
    },
    {
      h: 'Writers take {bank} to court',
      b: 'Authors say they found their own sentences in the lab’s model, and they want a licence fee for every generation it trained.',
    },
  ],
  INCIDENT_WEIGHTS_LEAK: [
    {
      h: '{bank} model weights appear online',
      b: 'A copy of the lab’s checkpoint is circulating on file-sharing sites. How it got out is unclear.',
    },
    {
      h: 'Leaked checkpoint puts {bank} on the spot',
      b: 'Hobbyists are running the lab’s model on their own machines this week. The lab is investigating.',
    },
  ],
  INCIDENT_DEEPFAKE: [
    {
      h: 'Fake video traced to {bank} tools',
      b: 'A local story says the clip was made with the lab’s Creative Suite, and the {scope} sales office is fielding the calls.',
    },
    {
      h: 'Deepfake row reaches {scope}',
      b: 'Reporters want to know what {bank} does to stop its Creative Suite being used to put words in people’s mouths.',
    },
  ],
  INCIDENT_NEWS_DEEPFAKE: [
    {
      h: '{bank} statement fails to calm deepfake row',
      b: 'The lab says it bans misuse. Critics at {scope} ask why the clip was so easy to make.',
    },
    {
      h: 'Deepfake story lingers for {bank}',
      b: 'A written statement from the lab has not ended the questions around its Creative Suite in {scope}.',
    },
  ],
  INCIDENT_DC_FIRE: [
    {
      h: 'Fire at {bank} data centre',
      b: 'Crews put out a blaze in a power room overnight. The lab says customers were served from elsewhere.',
    },
    {
      h: 'Racks scorched at {bank} hall',
      b: 'A fire in the cooling plant has taken part of the lab’s data centre offline. No one was hurt.',
    },
  ],
  INCIDENT_GRID_FAILURE: [
    {
      h: 'Grid failure darkens {bank} data centre',
      b: 'A regional outage has cut power to the lab’s hall at an energy site. The utility says repairs will take days.',
    },
    {
      h: 'Storm cuts power to {bank} GPUs',
      b: 'The transmission line to the lab’s energy-site data centre is down. The lab is weighing diesel backup.',
    },
  ],
  LAWSUIT_LOST: [
    {
      h: '{bank} loses in court, pays {amount}',
      b: 'The lab fought the claim against its model and lost. Damages and costs come to {amount}.',
    },
    {
      h: 'Court rules against {bank}',
      b: 'The judgment is for {amount}. The lab says it is reviewing the decision.',
    },
  ],
  WEIGHTS_LEAKED: [
    {
      h: '{bank} knew its weights had leaked',
      b: 'Internal messages show the lab spotted the leaked checkpoint weeks ago and said nothing to customers.',
    },
    {
      h: 'Quiet leak comes back to bite {bank}',
      b: 'The lab chose not to rotate its keys or warn anyone when its model weights got out. Now everyone knows.',
    },
  ],
  GRID_OUTAGE: [
    {
      h: '{bank} customers hit by {name} blackout',
      b: 'With the grid down and no backup power, the lab’s GPUs at {name} sat idle for a week. Errors and timeouts followed.',
    },
    {
      h: 'A dark week at {name}',
      b: '{bank} chose to wait for the utility rather than pay for diesel. Customers noticed.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
