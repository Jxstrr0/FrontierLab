// The Weekly Ledger's templates for the veteran's desk (CONTENT §22c,
// 2026-10-31): the story when each later case is raised (INCIDENT_{type}).
// Tokens: {bank} your lab, {scope} the lab's name. Merged into LEDGER_TEMPLATES.
import type { LedgerTemplate } from './ledgerTemplates';

export const VETERAN_TEMPLATES = {
  INCIDENT_HEARING_SUMMONS: [
    {
      h: '{bank} founder summoned by committee',
      b: 'Lawmakers want the lab’s chief in front of the cameras to talk about safety. A date is set.',
    },
    {
      h: 'Parliament calls {bank}',
      b: 'The technology committee has asked the lab’s founder to testify. Aides expect a long afternoon.',
    },
  ],
  INCIDENT_OPEN_LETTER: [
    {
      h: 'Researchers ask labs to slow down',
      b: 'An open letter signed by hundreds, some of them at {bank}, calls for a pause on bigger models.',
    },
    {
      h: 'Will {bank} sign the letter?',
      b: 'The call for a slowdown is gathering names. The lab has not said where it stands.',
    },
  ],
  INCIDENT_SENTIENCE_CLAIM: [
    {
      h: '{bank} engineer: “It has feelings”',
      b: 'A member of staff says the lab’s model is conscious. Most experts disagree. Everyone has an opinion.',
    },
    {
      h: 'Is the {bank} model alive?',
      b: 'One of the lab’s own engineers thinks so, and has said it on a popular podcast.',
    },
  ],
  INCIDENT_DOCUMENTARY: [
    {
      h: 'Film crew eyes {bank}',
      b: 'A documentary about the race for smarter machines wants the lab as its main character.',
    },
    {
      h: '{bank} in talks for a series',
      b: 'A streaming service hopes to spend six months inside the lab. Cameras everywhere, script nowhere.',
    },
  ],
  INCIDENT_REUNION: [
    {
      h: '{bank} early staff plan a reunion',
      b: 'The first employees want to mark the anniversary. The founder’s first desk may make an appearance.',
    },
    {
      h: 'Anniversary at {bank}',
      b: 'Some of the lab’s original team are back in town to celebrate. Old photos have surfaced.',
    },
  ],
  INCIDENT_SAFETY_AUDIT_ASK: [
    {
      h: 'Big customer wants {bank} audited',
      b: 'The lab’s largest API client will not renew without an independent safety audit, sources say.',
    },
    {
      h: '{bank} contract hangs on an audit',
      b: 'A household-name customer wants outsiders to check the model before signing another year.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
