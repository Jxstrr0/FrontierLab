// AI-native incidents (CONTENT §22, 2026-10-27): the cases an AI lab gets that
// a bank never did: a viral jailbreak, a hallucination lawsuit, a training-data
// copyright suit, leaked model weights, deepfake misuse of the Creative Suite,
// a data-centre fire and a grid failure at an energy site. Same shape as the
// bank-era catalog in incidents.ts; numbers in incidentParams.ts; rules in
// src/sim/incident/aiRules.ts and computeRules.ts.
import type { IncidentSpec } from './incidents';

export const AI_SPECS: Record<string, IncidentSpec> = {
  JAILBREAK: {
    id: 'JAILBREAK',
    title: 'Jailbreak goes viral',
    scope: 'company',
    trigger: 'rolled',
    baseP: 0.002,
    text: 'A prompt that talks our model into saying things it never should is going round online, with screenshots. Every hour it stays up, more people try it.',
    texts: [
      'Someone found a few sentences that switch off the model’s manners, and the thread showing it is everywhere this morning. Customers are asking what we are doing about it.',
    ],
    money: ['patch', 'postMortem'],
    options: [
      {
        id: 'patch',
        label: 'Patch it fast',
        effect: 'A rushed fix: {patch}. Products rating −0.2 for 4 weeks while it beds in.',
        penaltyWeeks: 0.5,
      },
      {
        id: 'ignore',
        label: 'Let it blow over',
        effect:
          'Safety coverage −0.15 for 12 weeks, Overall −0.2 for 8 weeks. The press may run it.',
        penaltyWeeks: 3,
      },
      {
        id: 'postmortem',
        label: 'Fix it and publish a post-mortem',
        effect: '{postMortem}. Safety coverage +0.1 for 26 weeks.',
      },
    ],
    worst: 'ignore',
  },
  HALLUCINATION_SUIT: {
    id: 'HALLUCINATION_SUIT',
    title: 'Hallucination lawsuit',
    scope: 'company',
    trigger: 'rolled',
    baseP: 0.001,
    text: 'A customer acted on a confident, wrong answer from our model and lost money. Their lawyers want {settle}.',
    texts: [
      'Our model invented a regulation, a customer built a product on it, and now their lawyers are asking for {settle} in damages.',
    ],
    money: ['settle', 'lose'],
    options: [
      { id: 'settle', label: 'Settle', effect: 'Pay {settle} and move on.' },
      {
        id: 'fight',
        label: 'Fight it in court',
        effect: 'Even odds: nothing, or {lose} in damages and Overall −0.3 for 12 weeks.',
      },
      {
        id: 'disclaimers',
        label: 'Add disclaimers everywhere',
        effect: 'No payout. Products rating −0.1 for good.',
        penaltyWeeks: 2,
      },
    ],
    worst: 'settle',
  },
  COPYRIGHT_SUIT: {
    id: 'COPYRIGHT_SUIT',
    title: 'Training-data copyright suit',
    scope: 'company',
    trigger: 'rolled',
    baseP: 0.0015,
    text: 'A publisher says {models} of our trained model generations learned from its archive without a licence, and has filed suit.',
    texts: [
      'A group of writers has traced their work in our training data. They are suing over all {models} generations we have trained.',
    ],
    money: ['licence', 'lose'],
    pct: ['odds'],
    options: [
      {
        id: 'licence',
        label: 'Licence the data',
        effect: 'Pay {licence} for a licence covering every generation.',
      },
      {
        id: 'fight',
        label: 'Fight it',
        effect: '{odds} chance of winning (our Safety team and CSO). Lose: {lose} in damages.',
      },
      {
        id: 'retrain',
        label: 'Retrain without it',
        effect: 'No payout. Every trained model loses 0.3 Breadth.',
        penaltyWeeks: 4,
      },
    ],
    worst: 'retrain',
  },
  WEIGHTS_LEAK: {
    id: 'WEIGHTS_LEAK',
    title: 'Model weights leak',
    scope: 'company',
    trigger: 'rolled',
    baseP: 0.001,
    text: 'A copy of our model’s weights has turned up on a file-sharing site. Whoever took it had a key that should have been rotated months ago.',
    texts: [
      'Security found our latest checkpoint being passed around a hobbyist forum. The keys that signed it out are still live.',
    ],
    money: ['rotate'],
    options: [
      {
        id: 'rotate',
        label: 'Rotate every key and notify',
        effect: '{rotate} to re-key every system and tell customers.',
      },
      {
        id: 'quiet',
        label: 'Stay quiet',
        effect: '35% chance it surfaces later: Overall −0.4 for 12 weeks and a story in the press.',
        penaltyWeeks: 2,
      },
    ],
    worst: 'quiet',
  },
  DEEPFAKE: {
    id: 'DEEPFAKE',
    title: 'Deepfake misuse',
    scope: 'branch',
    trigger: 'rolled',
    baseP: 0.002,
    text: 'A local paper has traced a fake video of a {city} councillor to our Creative Suite, and {branch} is getting the calls.',
    texts: [
      'Someone used the Creative Suite to put words in a {city} newsreader’s mouth, and the clip names us. {branch} has reporters outside.',
    ],
    money: ['watermark'],
    options: [
      {
        id: 'watermark',
        label: 'Add watermarking',
        effect: '{watermark}. Service rating +0.1 for 8 weeks.',
      },
      {
        id: 'pull',
        label: 'Pull the Creative Suite here',
        effect: 'Off sale in {city} for 8 weeks: nothing billed and no new sign-ups.',
        penaltyWeeks: 1.5,
      },
      {
        id: 'statement',
        label: 'Issue a statement',
        effect: 'Office awareness −5 points. The press may keep going.',
        penaltyWeeks: 1,
      },
    ],
    worst: 'statement',
  },
  DC_FIRE: {
    id: 'DC_FIRE',
    title: 'Data-centre fire',
    scope: 'company',
    trigger: 'rolled',
    baseP: 0.0008,
    text: 'A fire in a power room at {name} tripped the whole hall before the suppression system caught it. Scorched racks need replacing.',
    texts: [
      'Smoke in the cooling plant at {name} overnight. The fire crew saved the building, but a third of the racks are water-damaged.',
    ],
    money: ['repair'],
    options: [
      {
        id: 'repair',
        label: 'Emergency repair',
        effect: '{repair}: crews and replacement racks this week.',
      },
      {
        id: 'derate',
        label: 'Run on what is left',
        effect: '30% of {name}’s GPUs out of action for 12 weeks.',
        penaltyWeeks: 2,
      },
    ],
    worst: 'derate',
  },
  GRID_FAILURE: {
    id: 'GRID_FAILURE',
    title: 'Grid failure',
    scope: 'company',
    trigger: 'rolled',
    baseP: 0.002,
    text: 'The regional grid feeding {name} has gone down and the utility says a week at least. The hall has no power.',
    texts: [
      'A storm took out the transmission line to {name}. Repairs will take the utility most of a week; our GPUs there are dark.',
    ],
    money: ['diesel'],
    options: [
      {
        id: 'diesel',
        label: 'Diesel backup',
        effect: '{diesel} in fuel and generators. The hall stays up.',
      },
      {
        id: 'outage',
        label: 'Wait for the grid',
        effect: 'A week of outage: customers churn faster and contracts may walk.',
        penaltyWeeks: 2,
      },
    ],
    worst: 'outage',
  },
};
