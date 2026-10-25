// Executive seats (SIMULATION §17.2, SCREENS §10): titles, the HQ departments
// each executive lifts with execMult, and the delegation toggles on their
// profile. The CEO seat is you and isn't listed. Numbers live in balance.ts.
import type { ExecSeat } from '../sim/marketsTypes';
import type { HqDeptId } from './types';

export interface DelegationSpec {
  id: string;
  label: string;
  description: string;
}

export interface ExecSeatSpec {
  seat: ExecSeat;
  title: string;
  short: string;
  /** Departments whose effects scale by execMult (§17.2). */
  depts: HqDeptId[];
  delegations: DelegationSpec[];
}

export const EXEC_SEATS: Record<ExecSeat, ExecSeatSpec> = {
  coo: {
    seat: 'coo',
    title: 'Chief Operating Officer',
    short: 'COO',
    depts: ['hr'],
    delegations: [
      {
        id: 'branchOps',
        label: 'Branch operations',
        description: 'Hires a manager for every new branch and turns on default delegation.',
      },
      {
        id: 'hrBenefits',
        label: 'HR benefits',
        description: 'Keeps average morale at 70 or better at the least cost.',
      },
      {
        id: 'hrDivision',
        label: 'HR division',
        description: 'Staffs every HQ floor to full coverage.',
      },
    ],
  },
  cfo: {
    seat: 'cfo',
    title: 'Chief Financial Officer',
    short: 'CFO',
    depts: ['finance', 'treasury'],
    delegations: [
      {
        id: 'treasury',
        label: 'Treasury',
        description:
          'Runs auto-funding, the bond share and funding offers to hold liquidity near target.',
      },
      {
        id: 'capital',
        label: 'Capital',
        description:
          'Keeps the capital ratio safe: below 10.5% sells company stocks and trims risk appetite; below 8% sells new shares to get back to 12%.',
      },
      {
        id: 'dividends',
        label: 'Dividends',
        description: 'Proposes a dividend at each board meeting.',
      },
    ],
  },
  cpo: {
    seat: 'cpo',
    title: 'Chief Product Officer',
    short: 'CPO',
    depts: ['products'],
    delegations: [
      {
        id: 'pricing',
        label: 'Pricing',
        description: 'Prices the company lineup like a branch manager while Apply to all is on.',
      },
      {
        id: 'developments',
        label: 'Developments',
        description: 'Starts a new product when none is running, within 1% of revenue.',
      },
      {
        id: 'models',
        label: 'Models',
        description: 'Switches to the bureau package that saves the most defaults per dollar.',
      },
    ],
  },
  cmo: {
    seat: 'cmo',
    title: 'Chief Marketing Officer',
    short: 'CMO',
    depts: ['marketing'],
    delegations: [
      {
        id: 'brand',
        label: 'Brand campaigns',
        description: 'Runs brand campaigns to hold awareness near 50% within 3% of revenue.',
      },
    ],
  },
  cto: {
    seat: 'cto',
    title: 'Chief Technology Officer',
    short: 'CTO',
    depts: ['it'],
    delegations: [
      {
        id: 'digital',
        label: 'Digital projects',
        description: 'Starts the next digital project when the Products team is free.',
      },
    ],
  },
  cro: {
    seat: 'cro',
    title: 'Chief Risk Officer',
    short: 'CRO',
    depts: ['risk'],
    delegations: [
      {
        id: 'appetite',
        label: 'Risk appetite',
        description:
          'Tunes risk appetite to hold capital at 12% and losses at 1.2% a year or less.',
      },
      {
        id: 'loanPolicy',
        label: 'Loan Desk policy',
        description: 'Decides Loan Desk applications at branches without a delegated manager.',
      },
    ],
  },
};

/** Seat order on the Executive floor grid (after the CEO). */
export const EXEC_SEAT_ORDER: readonly ExecSeat[] = ['coo', 'cfo', 'cpo', 'cmo', 'cto', 'cro'];
