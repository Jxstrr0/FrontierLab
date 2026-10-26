// Executive seats (SIMULATION §17.2, SCREENS §10): titles, the HQ departments
// each executive lifts with execMult, and the delegation toggles on their
// profile (some with a dial under them: DelegationDials.tsx). The CEO seat is
// you and isn't listed. The CREO lifts no department: its expertise is pricing
// power on the buildings it manages (§21.2). Numbers live in balance.ts.
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
        id: 'expansion',
        label: 'Expansion',
        description:
          'Opens a branch every 4 weeks in a growth city with room to grow: the busiest free storefront, your usual fit-out, while 8 weeks of costs stay in cash.',
      },
      {
        id: 'troubles',
        label: 'Company troubles',
        description:
          'Settles company and city cases the way a trusted manager would. Bank runs, rescues and your executives still come to you.',
      },
      {
        id: 'hrBenefits',
        label: 'HR benefits',
        description: 'Keeps average morale at your target or better at the least cost.',
      },
      {
        id: 'hrDivision',
        label: 'HR division',
        description: 'Staffs every HQ floor to full coverage.',
      },
      {
        id: 'payReviews',
        label: 'Pay reviews',
        description:
          'Sets every executive and branch manager to market pay plus your pay premium, as often as you choose, so pay keeps rising with the market and rivals struggle to poach them.',
      },
      {
        id: 'guidance',
        label: 'Branch guidance: staffing',
        description:
          'Steers managers who run staffing: every 4 weeks raises their wages and headcount while staff morale is low and trims them when it is high.',
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
          'Keeps the capital ratio safe without selling shares: below 10.5% sells company stocks and trims risk appetite, alongside a CSO if you have one.',
      },
      {
        id: 'shares',
        label: 'Share sales',
        description:
          'Below 8%, sells new shares to get back to 12%: a private placement while private, a secondary offering once listed. Never launches your IPO.',
      },
      {
        id: 'bankInvests',
        label: "Investing: the lab's money",
        description:
          "Every 4 weeks buys a stock, spread across the market by company size, and backs the best-scoring startup on the Investment floor's list. Sells stocks 25% under cost. Stocks stay under 5% of assets, startups under 3%, the capital ratio at 12% or more.",
      },
      {
        id: 'privateInvests',
        label: 'Investing: your money',
        description:
          'The same for your own account. Keeps a year of your salary and spends at most a quarter of the rest at a time.',
      },
      {
        id: 'dividends',
        label: 'Dividends',
        description: 'Proposes a dividend at each board meeting.',
      },
      {
        id: 'guidance',
        label: 'Branch guidance: funding',
        description:
          'With the CSO, steers delegated managers: every 4 weeks raises their deposit rates while liquidity is under target and trims them when it is well above.',
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
      {
        id: 'guidance',
        label: 'Branch guidance: lineup',
        description:
          'Steers managers who run products: every 4 weeks cuts their fees and widens their lineup while product ratings are weak, and charges a little more when they are strong.',
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
        description:
          'Runs brand campaigns to hold awareness in every branch city near your target, within 3% of revenue.',
      },
      {
        id: 'guidance',
        label: 'Branch guidance: marketing',
        description:
          'Steers managers who run marketing: every 4 weeks pushes them to spend more on campaigns while brand awareness in their cities is 10 points under your target, and less when 10 points over.',
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
    title: 'Chief Safety Officer',
    short: 'CSO',
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
      {
        id: 'guidance',
        label: 'Branch guidance: lending',
        description:
          'With the CFO, steers delegated managers: every 4 weeks makes loans dearer and approvals stricter while capital or losses miss target, and looser when both are healthy.',
      },
    ],
  },
  creo: {
    seat: 'creo',
    title: 'Chief Real Estate Officer',
    short: 'CREO',
    depts: [],
    delegations: [
      {
        id: 'bankRents',
        label: "Rents: the lab's buildings",
        description:
          'Every 4 weeks sets the rent on every building the lab owns to hold the occupancy you dial, as market rents drift: at 100% the highest rent that still fills it. Their tenants pay a little over market, by the chief’s expertise.',
      },
      {
        id: 'privateRents',
        label: 'Rents: your own buildings',
        description:
          'The same for the buildings you own privately. The lab pays the chief either way.',
      },
      {
        id: 'bankBuys',
        label: "Buying: the lab's buildings",
        description:
          'Every 4 weeks buys the listed building with the best rent yield, in any city, at its asking price. Keeps the lab’s buildings under 5% of its assets, capital at 12% or more and 8 weeks of costs in cash.',
      },
      {
        id: 'privateBuys',
        label: 'Buying: your own buildings',
        description:
          'The same with your own money: keeps a year of your salary aside and spends at most half of the rest on one building.',
      },
    ],
  },
};

/** Seat order on the Executive floor grid (after the CEO). */
export const EXEC_SEAT_ORDER: readonly ExecSeat[] = [
  'coo',
  'cfo',
  'cpo',
  'cmo',
  'cto',
  'cro',
  'creo',
];
