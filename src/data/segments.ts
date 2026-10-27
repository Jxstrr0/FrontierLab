// Customer segments and the product affinity matrix (docs/CONTENT.md §4).
import type { CategoryId, SegmentId } from './types';

export interface SegmentSpec {
  id: SegmentId;
  name: string;
  sensDep: number;
  sensLoan: number;
  sensFee: number;
  /** × usage per account for API products (lending); plans count seats as is (C3a). */
  ticketMult: Record<CategoryId, number>;
}

export const SEGMENT_SPECS: Record<SegmentId, SegmentSpec> = {
  STU: {
    id: 'STU',
    name: 'Students',
    sensDep: 0.3,
    sensLoan: 0.6,
    sensFee: 1.2,
    ticketMult: { deposits: 1, lending: 0.3, cards: 1 },
  },
  YP: {
    id: 'YP',
    name: 'Developers',
    sensDep: 0.6,
    sensLoan: 0.7,
    sensFee: 0.8,
    ticketMult: { deposits: 1, lending: 1.0, cards: 1 },
  },
  FAM: {
    id: 'FAM',
    name: 'Consumers',
    sensDep: 0.5,
    sensLoan: 0.9,
    sensFee: 0.7,
    ticketMult: { deposits: 1, lending: 0.3, cards: 1 },
  },
  RET: {
    id: 'RET',
    name: 'Researchers',
    sensDep: 1.0,
    sensLoan: 0.4,
    sensFee: 0.5,
    ticketMult: { deposits: 1, lending: 1.5, cards: 1 },
  },
  BIZ: {
    id: 'BIZ',
    name: 'Small shops',
    sensDep: 0.4,
    sensLoan: 0.7,
    sensFee: 0.5,
    ticketMult: { deposits: 1, lending: 2.0, cards: 1 },
  },
};

/** Base probability that a new customer in a segment opens the product (CONTENT §4, C3a). */
export const AFFINITY: Record<string, Record<SegmentId, number>> = {
  free_tier: { STU: 0.75, YP: 0.6, FAM: 0.65, RET: 0.5, BIZ: 0.2 },
  plus: { STU: 0.18, YP: 0.42, FAM: 0.35, RET: 0.4, BIZ: 0.15 },
  pro: { STU: 0.03, YP: 0.16, FAM: 0.05, RET: 0.2, BIZ: 0.08 },
  team: { STU: 0, YP: 0.08, FAM: 0, RET: 0.07, BIZ: 0.6 },
  campus_plan: { STU: 0.55, YP: 0, FAM: 0, RET: 0.12, BIZ: 0 },
  api: { STU: 0.08, YP: 0.45, FAM: 0.03, RET: 0.28, BIZ: 0.3 },
  batch_api: { STU: 0.02, YP: 0.14, FAM: 0, RET: 0.2, BIZ: 0.15 },
  fine_tuning: { STU: 0, YP: 0.08, FAM: 0, RET: 0.1, BIZ: 0.12 },
  code_assistant: { STU: 0.15, YP: 0.55, FAM: 0.03, RET: 0.14, BIZ: 0.15 },
  agent_studio: { STU: 0, YP: 0.08, FAM: 0, RET: 0.05, BIZ: 0.3 },
  creative_suite: { STU: 0.15, YP: 0.1, FAM: 0.25, RET: 0.04, BIZ: 0.08 },
  priority_support: { STU: 0, YP: 0.04, FAM: 0, RET: 0.07, BIZ: 0.22 },
};
