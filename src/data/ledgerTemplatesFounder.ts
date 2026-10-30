// The Weekly Ledger's templates for the founder's desk (CONTENT §22b,
// 2026-10-30): the story when each early case is raised (INCIDENT_{type}) and
// the one press angle a choice leaves behind (a week offline). Tokens: {bank}
// your lab, {scope} the lab's name. Merged into LEDGER_TEMPLATES.
import type { LedgerTemplate } from './ledgerTemplates';

export const FOUNDER_TEMPLATES = {
  INCIDENT_VIRAL_DEMO: [
    {
      h: '{bank} demo clip takes off',
      b: 'A short video of the young lab’s assistant at work has been watched a million times this week. Sign-ups followed.',
    },
    {
      h: 'Everyone is sharing a {bank} clip',
      b: 'Thirty seconds of the lab’s model fixing a spreadsheet is the most shared thing in the city this week.',
    },
  ],
  INCIDENT_FEATURE_REQUEST: [
    {
      h: '{bank} customers want more from the assistant',
      b: 'Users of the lab’s paid plans have been asking loudly for the model to read their own files. The lab is weighing it.',
    },
    {
      h: 'Wish list grows at {bank}',
      b: 'Early customers of the lab have strong opinions about what it should build next, and they are not shy about them.',
    },
  ],
  INCIDENT_ANGEL_OFFER: [
    {
      h: 'Angel money circles {bank}',
      b: 'An early-stage investor is said to have offered the young lab a cheque for a small stake.',
    },
    {
      h: '{bank} courted by angel investor',
      b: 'The lab has an offer on the table from a backer of other AI start-ups, people familiar with it say.',
    },
  ],
  INCIDENT_PRESS_INTERVIEW: [
    {
      h: 'The Inference sits down with {bank}',
      b: 'Our technology desk has asked the lab’s founder for an interview about where the city’s newest AI company is heading.',
    },
    {
      h: '{bank} founder invited to talk',
      b: 'The lab is one of several young AI companies the paper is profiling this season.',
    },
  ],
  INCIDENT_MANAGER_POACHED: [
    {
      h: 'Rival makes a play for {bank} talent',
      b: 'A competing lab has offered one of the young lab’s office managers a bigger job, we understand.',
    },
    {
      h: 'Hiring war reaches {bank}',
      b: 'Experienced office managers are scarce, and a rival has come calling for one of the lab’s.',
    },
  ],
  INCIDENT_CLOUD_OUTAGE: [
    {
      h: 'Cloud outage takes {bank} offline',
      b: 'The lab’s GPU provider went down this week and took every customer with it. Other labs on the same cloud were hit too.',
    },
    {
      h: '{bank} customers see error pages',
      b: 'A provider outage left the young lab, which rents all of its compute, with nothing to serve customers from.',
    },
  ],
  INCIDENT_NEWS_CLOUD_OUTAGE: [
    {
      h: '{bank} rode out the outage dark',
      b: 'The lab chose not to pay for emergency capacity and spent the week offline. Some customers did not wait.',
    },
    {
      h: 'A week offline at {bank}',
      b: 'With its cloud provider down and no backup bought, the lab’s customers went without for days.',
    },
  ],
  INCIDENT_HACKATHON: [
    {
      h: 'Hackathon organisers court {bank}',
      b: 'The city’s developer weekend is looking for a headline sponsor, and the young lab is top of its list.',
    },
    {
      h: '{bank} asked to back the hackathon',
      b: 'Three hundred developers, one weekend, and a lab deciding whether its API should be in every starter kit.',
    },
  ],
  INCIDENT_CAMPUS_CREDITS: [
    {
      h: 'University wants to teach on {bank}',
      b: 'A computer science course built around the lab’s model is on the cards, if the lab covers the students’ usage.',
    },
    {
      h: '{bank} asked to sponsor a course',
      b: 'A professor wants a semester of students building on the lab’s API, for free.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
