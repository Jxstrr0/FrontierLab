// The founder's desk (CONTENT §22b, 2026-10-30): the small cases a young lab
// gets in its first three years, each with a real choice and each once a game:
// a demo clip going viral, a customer asking for a feature, an angel's cheque,
// a reporter's call, a rival after your office manager, your GPU cloud going
// down, a hackathon wanting a sponsor and a professor asking for course credits.
// Same shape as the catalog in incidents.ts; numbers in incidentParams.ts;
// rules in src/sim/incident/founderRules.ts.
import { FOUNDER_DESK, INCIDENTS } from '../config/balance';
import type { IncidentSpec } from './incidents';

const founder = (spec: Omit<IncidentSpec, 'scope' | 'trigger' | 'baseP' | 'cooldownWeeks'>) =>
  ({
    scope: 'company',
    trigger: 'rolled',
    baseP: FOUNDER_DESK.baseP,
    cooldownWeeks: INCIDENTS.onceWeeks,
    ...spec,
  }) satisfies IncidentSpec;

export const FOUNDER_SPECS: Record<string, IncidentSpec> = {
  VIRAL_DEMO: founder({
    id: 'VIRAL_DEMO',
    title: 'A demo clip goes viral',
    text: 'A thirty-second clip of our assistant fixing someone’s spreadsheet is everywhere this morning. Sign-ups are already ticking up. Do we pour fuel on it?',
    texts: [
      'A customer filmed our model talking them through a tax form and a million people have watched it. The office phones have not stopped.',
    ],
    money: ['push'],
    options: [
      {
        id: 'push',
        label: 'Push it everywhere',
        effect: 'Ads behind the clip for {push}. Awareness +15 points at every sales office.',
      },
      {
        id: 'enjoy',
        label: 'Enjoy the moment',
        effect: 'Awareness +6 points at every sales office.',
        penaltyWeeks: 0.5,
      },
    ],
    worst: 'enjoy',
  }),
  FEATURE_REQUEST: founder({
    id: 'FEATURE_REQUEST',
    title: 'A customer asks for a feature',
    text: 'One of our biggest Pro customers wants the assistant to read their files directly. Half the office agrees. Do we build it now?',
    texts: [
      'A team on our Team plan has written up exactly what they want next, with mock-ups. It would take a few engineers a month.',
    ],
    money: ['build'],
    options: [
      {
        id: 'build',
        label: 'Fund a quick build',
        effect: '{build} of engineering time. Products rating +0.15 everywhere for 26 weeks.',
      },
      {
        id: 'promise',
        label: 'Promise it for next quarter',
        effect: 'Products rating +0.05 for 8 weeks while they wait.',
        penaltyWeeks: 0.5,
      },
      {
        id: 'decline',
        label: 'Say no politely',
        effect: 'Nothing changes.',
        penaltyWeeks: 1,
      },
    ],
    worst: 'decline',
  }),
  ANGEL_OFFER: founder({
    id: 'ANGEL_OFFER',
    title: 'An angel offers a cheque',
    hideCosts: true,
    text: '{investor} has been following the lab and wants in: {raised} for {pct} of the company. It is below what a fund would pay, but the money is here today.',
    texts: [
      'An early backer of two other labs offers {raised} for a {pct} stake. Less than we think we are worth; more than we have in the bank.',
    ],
    money: ['raised'],
    pct: ['pct'],
    options: [
      {
        id: 'take',
        label: 'Take the cheque',
        effect: '{raised} in corporate cash. New shares worth {pct} of the lab go to {investor}.',
      },
      {
        id: 'decline',
        label: 'Decline',
        effect: 'Keep every share. Nothing else changes.',
        penaltyWeeks: 0.5,
      },
    ],
    worst: 'decline',
  }),
  PRESS_INTERVIEW: founder({
    id: 'PRESS_INTERVIEW',
    title: 'A reporter wants an interview',
    text: 'A technology reporter from The Weekly Inference wants an hour with the founder about where the lab is going. Good press, if nothing slips out.',
    texts: [
      'The paper is writing about the city’s young AI labs and wants us in it. The reporter has a reputation for awkward questions.',
    ],
    options: [
      {
        id: 'talk',
        label: 'Give the interview',
        effect:
          'Awareness +8 points at every sales office. One in four interviews leaves an awkward quote: Overall −0.1 for 4 weeks.',
      },
      {
        id: 'decline',
        label: 'Decline',
        effect: 'Nothing changes.',
        penaltyWeeks: 0.5,
      },
    ],
    worst: 'decline',
  }),
  MANAGER_POACHED: founder({
    id: 'MANAGER_POACHED',
    title: 'A rival wants your office manager',
    text: '{rival} has offered {manager}, who runs {branch}, a bigger job. They would stay for {raise} a year more.',
    texts: [
      '{manager} at {branch} came in with an offer letter from {rival}. They like it here, but the money is {raise} a year better.',
    ],
    money: ['raise'],
    options: [
      {
        id: 'counter',
        label: 'Counter-offer',
        effect: 'Their salary rises by {raise} a year. They stay.',
      },
      {
        id: 'release',
        label: 'Let them go',
        effect: '{branch} has no manager until you hire one.',
        penaltyWeeks: 3,
      },
    ],
    worst: 'release',
  }),
  CLOUD_OUTAGE: founder({
    id: 'CLOUD_OUTAGE',
    title: 'Your GPU cloud goes down',
    text: 'The cloud provider serving every customer we have is down, and so are we. Burst capacity elsewhere costs {burst} for the week.',
    texts: [
      'Our provider’s status page is a wall of red. Customers are refreshing an error page. Another provider can take us for {burst}, this week only.',
    ],
    money: ['burst'],
    options: [
      {
        id: 'burst',
        label: 'Pay for burst capacity',
        effect: '{burst}. Customers barely notice.',
      },
      {
        id: 'ride',
        label: 'Ride it out',
        effect: 'A week of outage: cancellations rise and contracts may walk.',
        penaltyWeeks: 2,
      },
    ],
    worst: 'ride',
  }),
  HACKATHON: founder({
    id: 'HACKATHON',
    title: 'A hackathon wants a sponsor',
    text: 'The city’s developer hackathon is next month and the organisers want us as headline sponsor: our API in every team’s hands for {sponsor}.',
    texts: [
      'Three hundred developers, one weekend, and the organisers want our logo on the banner and our API in the starter kit, for {sponsor}.',
    ],
    money: ['sponsor'],
    options: [
      {
        id: 'sponsor',
        label: 'Sponsor it',
        effect: '{sponsor}. API sign-ups ×1.25 for 12 weeks and awareness +5 points here.',
      },
      {
        id: 'pass',
        label: 'Pass',
        effect: 'Nothing changes.',
        penaltyWeeks: 0.5,
      },
    ],
    worst: 'pass',
  }),
  CAMPUS_CREDITS: founder({
    id: 'CAMPUS_CREDITS',
    title: 'A professor asks for course credits',
    text: 'A professor at the university wants to teach a course on our model and asks for {credits} of free credits for the class.',
    texts: [
      'The university’s computer science department wants to run its spring course on our API, if we cover {credits} of usage.',
    ],
    money: ['credits'],
    options: [
      {
        id: 'give',
        label: 'Give the credits',
        effect: '{credits} of compute. Plus sign-ups ×1.15 for 12 weeks and students take notice.',
      },
      {
        id: 'decline',
        label: 'Decline',
        effect: 'Nothing changes.',
        penaltyWeeks: 0.5,
      },
    ],
    worst: 'decline',
  }),
};
