// Frontier projects (post-C8, CONTENT §7d): the late game's big builds, each
// a multi-year commitment paid weekly with a lasting reward. Breakthroughs
// raise the model's ceiling one step at a time (in order); the others add a
// giant compute campus, a safety institute or a global edge network; four late
// projects build on those. Costs
// are in start-of-game money (the price list scales them). Fictional names only.

export type ProjectReward =
  /** Raises the radar ceiling (MODEL_RADAR_MAX) by `lift`. */
  | { kind: 'ceiling'; lift: number }
  /** Adds `gpus` to the compute pool, paying their power each week. */
  | { kind: 'gpus'; gpus: number }
  /** Cuts safety exposure and company incident chances (FRONTIER_PROJECTS). */
  | { kind: 'safety' }
  /** Adds `lift` stars to every sales office's Service target. */
  | { kind: 'service'; lift: number };

export interface FrontierProject {
  id: string;
  name: string;
  blurb: string;
  /** What it gives, in a line. */
  rewardText: string;
  cost: number;
  weeks: number;
  /** Company ARR needed to start. */
  minArr: number;
  /** A project that must be finished first. */
  requires?: string;
  reward: ProjectReward;
}

const list: FrontierProject[] = [
  {
    id: 'lodestar',
    name: 'Project Lodestar',
    blurb: 'A year-long research push on a new architecture.',
    rewardText: 'Raises the model ceiling from 10 to 11.',
    cost: 300_000_000,
    weeks: 52,
    minArr: 300_000_000,
    reward: { kind: 'ceiling', lift: 1 },
  },
  {
    id: 'meridian',
    name: 'Project Meridian',
    blurb: 'Scaling the Lodestar architecture across a new training stack.',
    rewardText: 'Raises the model ceiling by another step, to 12.',
    cost: 1_200_000_000,
    weeks: 78,
    minArr: 1_000_000_000,
    requires: 'lodestar',
    reward: { kind: 'ceiling', lift: 1 },
  },
  {
    id: 'zenith',
    name: 'Project Zenith',
    blurb: 'The lab’s moonshot: a model no one else knows how to build.',
    rewardText: 'Raises the model ceiling to 13.',
    cost: 4_000_000_000,
    weeks: 104,
    minArr: 2_500_000_000,
    requires: 'meridian',
    reward: { kind: 'ceiling', lift: 1 },
  },
  {
    id: 'campus',
    name: 'Gigawatt Campus',
    blurb: 'A city of data halls on its own grid, two years in the building.',
    rewardText: 'Adds 200,000 GPUs to your compute, at energy-site power prices.',
    cost: 2_000_000_000,
    weeks: 104,
    minArr: 1_000_000_000,
    reward: { kind: 'gpus', gpus: 200_000 },
  },
  {
    id: 'institute',
    name: 'Safety Institute',
    blurb: 'An endowed institute that red-teams every model before it ships.',
    rewardText: 'Lowers safety exposure for good and makes company incidents rarer.',
    cost: 600_000_000,
    weeks: 52,
    minArr: 500_000_000,
    reward: { kind: 'safety' },
  },
  {
    id: 'edge',
    name: 'Global Edge Network',
    blurb: 'Inference points of presence in every market you serve.',
    rewardText: 'Adds +0.15 Service stars to every sales office.',
    cost: 1_000_000_000,
    weeks: 78,
    minArr: 750_000_000,
    reward: { kind: 'service', lift: 0.15 },
  },
  // The late projects (2026-10-31): each needs an earlier one finished and a
  // much bigger lab, so the list keeps giving after year ten.
  {
    id: 'apex',
    name: 'Project Apex',
    blurb: 'Past Zenith: a training run so large it needs its own treaty.',
    rewardText: 'Raises the model ceiling to 14.',
    cost: 12_000_000_000,
    weeks: 130,
    minArr: 6_000_000_000,
    requires: 'zenith',
    reward: { kind: 'ceiling', lift: 1 },
  },
  {
    id: 'array',
    name: 'Terawatt Array',
    blurb: 'A second campus, five times the first, strung along a new power line.',
    rewardText: 'Adds 400,000 GPUs to your compute, at energy-site power prices.',
    cost: 5_000_000_000,
    weeks: 130,
    minArr: 3_000_000_000,
    requires: 'campus',
    reward: { kind: 'gpus', gpus: 400_000 },
  },
  {
    id: 'relay',
    name: 'Stratos Relay',
    blurb: 'High-altitude relays that put fast inference over every city you serve.',
    rewardText: 'Adds another +0.15 Service stars to every sales office.',
    cost: 3_000_000_000,
    weeks: 104,
    minArr: 2_000_000_000,
    requires: 'edge',
    reward: { kind: 'service', lift: 0.15 },
  },
  {
    id: 'fellowship',
    name: 'Long Table Fellowship',
    blurb: 'A worldwide school that trains every engineer who touches a customer.',
    rewardText: 'Adds +0.1 Service stars to every sales office.',
    cost: 1_500_000_000,
    weeks: 78,
    minArr: 1_500_000_000,
    requires: 'institute',
    reward: { kind: 'service', lift: 0.1 },
  },
];

export const FRONTIER_PROJECT_LIST: readonly FrontierProject[] = list;
export const FRONTIER_PROJECTS_BY_ID: Record<string, FrontierProject> = Object.fromEntries(
  list.map((p) => [p.id, p]),
);
