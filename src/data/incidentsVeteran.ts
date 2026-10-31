// The veteran's desk (CONTENT §22c, 2026-10-31): six company cases for a lab
// that has lasted three years or more. Each fires once a game: a summons to
// testify, an open letter from researchers, an engineer who says the model is
// alive, a documentary crew, the early staff's anniversary and a big customer
// asking for a safety audit. Same shape as incidents.ts; numbers in
// incidentParamsVeteran.ts; rules in src/sim/incident/veteranRules.ts.
import { INCIDENTS, VETERAN_DESK } from '../config/balance';
import type { IncidentSpec } from './incidents';

const veteran = (spec: Omit<IncidentSpec, 'scope' | 'trigger' | 'baseP' | 'cooldownWeeks'>) =>
  ({
    scope: 'company',
    trigger: 'rolled',
    baseP: VETERAN_DESK.baseP,
    cooldownWeeks: INCIDENTS.onceWeeks,
    ...spec,
  }) satisfies IncidentSpec;

export const VETERAN_SPECS: Record<string, IncidentSpec> = {
  HEARING_SUMMONS: veteran({
    id: 'HEARING_SUMMONS',
    title: 'Called to testify',
    text: 'A parliamentary committee wants you in the chair next month to explain what our models can do and who checks them.',
    texts: [
      'The committee on technology has sent a summons with your name on it. Cameras, microphones, a long table. They want answers on safety.',
    ],
    money: ['prep'],
    options: [
      {
        id: 'testify',
        label: 'Testify, well prepared',
        effect: '{prep} on coaching. Awareness +5 points everywhere; one bad answer could sting.',
      },
      {
        id: 'decline',
        label: 'Send a written statement',
        effect: 'Overall rating −0.2 for 12 weeks. The press will notice the empty chair.',
        penaltyWeeks: 2,
      },
    ],
    worst: 'decline',
  }),
  OPEN_LETTER: veteran({
    id: 'OPEN_LETTER',
    title: 'An open letter',
    text: 'Two hundred researchers have signed a letter asking every lab to slow down and publish its safety tests. Several of them are ours.',
    texts: [
      'A letter calling for a pause on bigger models is doing the rounds. Reporters want to know if we will sign it.',
    ],
    options: [
      {
        id: 'sign',
        label: 'Sign it',
        effect:
          'Safety coverage +0.1 for 26 weeks. Products rating −0.1 for 12 weeks as launches slow.',
      },
      {
        id: 'ignore',
        label: 'Say nothing',
        effect: 'Overall rating −0.1 for 12 weeks.',
        penaltyWeeks: 1,
      },
    ],
    worst: 'ignore',
  }),
  SENTIENCE_CLAIM: veteran({
    id: 'SENTIENCE_CLAIM',
    title: 'An engineer says it is alive',
    text: 'One of our engineers has told a podcast that our model has feelings. Their transcripts are everywhere and the phones will not stop.',
    texts: [
      'A senior engineer posted a long essay saying our model is conscious and asked us to give it a lawyer. It has a million readers.',
    ],
    money: ['study'],
    options: [
      {
        id: 'study',
        label: 'Fund an outside study',
        effect: '{study} for independent researchers to look. The story calms down.',
      },
      {
        id: 'leave',
        label: 'Put them on leave',
        effect: 'Morale −8 at every sales office. The story fades.',
      },
      {
        id: 'talk',
        label: 'Let them keep talking',
        effect: 'Awareness +6 points everywhere. Overall rating −0.1 for 8 weeks.',
        penaltyWeeks: 1,
      },
    ],
    worst: 'talk',
  }),
  DOCUMENTARY: veteran({
    id: 'DOCUMENTARY',
    title: 'A documentary crew',
    text: 'A film crew wants six months inside the lab for a documentary about the race to build smarter machines.',
    texts: [
      'A streaming service is making a series about the AI boom and wants us as the main story. Full access, no script approval.',
    ],
    pct: ['risk'],
    options: [
      {
        id: 'open',
        label: 'Open the doors',
        effect: 'Awareness +10 points everywhere. {risk} chance the edit is unkind.',
      },
      { id: 'decline', label: 'Politely decline', effect: 'Nothing changes.' },
    ],
    worst: 'decline',
  }),
  REUNION: veteran({
    id: 'REUNION',
    title: 'The old crew',
    text: 'The first dozen people who joined us want to mark the lab’s anniversary. They are asking if the company will host.',
    texts: [
      'Someone found the photo of our first office. The early staff want a party, and the newer ones want to come too.',
    ],
    money: ['party'],
    options: [
      {
        id: 'party',
        label: 'Throw a proper party',
        effect: '{party}. Morale +10 at every sales office.',
      },
      { id: 'card', label: 'Send a card', effect: 'Nothing changes.' },
    ],
    worst: 'card',
  }),
  SAFETY_AUDIT_ASK: veteran({
    id: 'SAFETY_AUDIT_ASK',
    title: 'A big customer wants an audit',
    text: 'Our largest API customer will only renew if an outside firm audits our model’s safety first.',
    texts: [
      'A household-name customer’s lawyers want an independent safety audit before they sign another year. Their peers are watching.',
    ],
    money: ['audit'],
    options: [
      {
        id: 'audit',
        label: 'Pay for the audit',
        effect: '{audit}. API sign-ups ×1.15 for 26 weeks as the report gets around.',
      },
      {
        id: 'refuse',
        label: 'Refuse',
        effect: 'API sign-ups ×0.85 for 12 weeks.',
        penaltyWeeks: 2,
      },
    ],
    worst: 'refuse',
  }),
};
