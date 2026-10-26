// Customer segments and the product affinity matrix (docs/CONTENT.md §4).
import type { CategoryId, SegmentId } from './types';

export interface SegmentSpec {
  id: SegmentId;
  name: string;
  sensDep: number;
  sensLoan: number;
  sensFee: number;
  ticketMult: Record<CategoryId, number>;
}

export const SEGMENT_SPECS: Record<SegmentId, SegmentSpec> = {
  STU: {
    id: 'STU',
    name: 'Students',
    sensDep: 0.3,
    sensLoan: 0.6,
    sensFee: 1.2,
    ticketMult: { deposits: 0.25, lending: 0.4, cards: 0.5 },
  },
  YP: {
    id: 'YP',
    name: 'Developers',
    sensDep: 0.6,
    sensLoan: 0.7,
    sensFee: 0.8,
    ticketMult: { deposits: 0.8, lending: 0.9, cards: 0.9 },
  },
  FAM: {
    id: 'FAM',
    name: 'Consumers',
    sensDep: 0.5,
    sensLoan: 0.9,
    sensFee: 0.7,
    ticketMult: { deposits: 1.0, lending: 1.1, cards: 1.0 },
  },
  RET: {
    id: 'RET',
    name: 'Researchers',
    sensDep: 1.0,
    sensLoan: 0.4,
    sensFee: 0.5,
    ticketMult: { deposits: 1.8, lending: 0.7, cards: 1.1 },
  },
  BIZ: {
    id: 'BIZ',
    name: 'Small shops',
    sensDep: 0.4,
    sensLoan: 0.7,
    sensFee: 0.5,
    ticketMult: { deposits: 1.5, lending: 1.0, cards: 1.4 },
  },
};

/** Base probability that a new customer in a segment opens the product (CONTENT §4). */
export const AFFINITY: Record<string, Record<SegmentId, number>> = {
  chequing: { STU: 0.55, YP: 0.85, FAM: 0.85, RET: 0.7, BIZ: 0.1 },
  savings: { STU: 0.2, YP: 0.5, FAM: 0.45, RET: 0.55, BIZ: 0.1 },
  gic1y: { STU: 0.02, YP: 0.1, FAM: 0.18, RET: 0.45, BIZ: 0.05 },
  student: { STU: 0.8, YP: 0.05, FAM: 0, RET: 0, BIZ: 0 },
  business_acct: { STU: 0.02, YP: 0.05, FAM: 0.03, RET: 0.02, BIZ: 0.9 },
  personal_loan: { STU: 0.06, YP: 0.12, FAM: 0.1, RET: 0.04, BIZ: 0 },
  auto_loan: { STU: 0.03, YP: 0.1, FAM: 0.12, RET: 0.05, BIZ: 0 },
  mortgage: { STU: 0, YP: 0.05, FAM: 0.09, RET: 0.02, BIZ: 0 },
  loc: { STU: 0.04, YP: 0.12, FAM: 0.12, RET: 0.06, BIZ: 0.2 },
  credit_card: { STU: 0.35, YP: 0.45, FAM: 0.4, RET: 0.25, BIZ: 0.3 },
  wealth: { STU: 0, YP: 0.04, FAM: 0.08, RET: 0.2, BIZ: 0.05 },
  safe_box: { STU: 0, YP: 0.02, FAM: 0.05, RET: 0.12, BIZ: 0.06 },
  fx: { STU: 0.1, YP: 0.12, FAM: 0.08, RET: 0.06, BIZ: 0.35 },
};

/** The business account's base ticket is already business-sized (CONTENT §4 note). */
export const BUSINESS_ACCT_BIZ_TICKET_MULT = 1.0;
