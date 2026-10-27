// Executive seats (SIMULATION §17.2, SCREENS §10): titles, the HQ departments
// each executive lifts with execMult, and the delegation toggles on their
// profile (some with a dial under them: DelegationDials.tsx). The CEO seat is
// you and isn't listed. The CIO (seat id 'creo', Vault Street's CREO) lifts no department: its expertise is pricing
// power on the buildings it manages (§21.2). The Chief Scientist (C6c) lifts no
// department either: its expertise lifts training-run odds (§16.13). Numbers live in balance.ts.
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
        label: 'Sales office operations',
        description: 'Hires a manager for every new sales office and turns on default delegation.',
      },
      {
        id: 'expansion',
        label: 'Expansion',
        description:
          'Opens a sales office every 4 weeks in a growth city with room to grow: the busiest free storefront, your usual fit-out, while 8 weeks of costs stay in cash.',
      },
      {
        id: 'troubles',
        label: 'Company troubles',
        description:
          'Settles company and city cases the way a trusted manager would. Outage rumours, safety pauses and your executives still come to you.',
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
          'Sets every executive and office manager to market pay plus your pay premium, as often as you choose, so pay keeps rising with the market and rivals struggle to poach them.',
      },
      {
        id: 'guidance',
        label: 'Sales office guidance: staffing',
        description:
          'Steers managers who run staffing: every 4 weeks raises their wages and headcount while staff morale is low and trims them when it is high.',
      },
    ],
  },
  cfo: {
    seat: 'cfo',
    title: 'Chief Financial Officer',
    short: 'CFO',
    depts: ['finance'],
    delegations: [
      {
        id: 'treasury',
        label: 'Funding',
        description: 'Runs auto-funding and funding offers to hold liquidity near target.',
      },
      {
        id: 'capital',
        label: 'Capital',
        description:
          'Keeps the credit ratio safe without selling shares: below 10.5% sells company stocks and trims the launch posture, alongside a CSO if you have one.',
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
          "Every 4 weeks buys a stock, spread across the market by company size, and backs the best-scoring startup on the Investment floor's list. Sells stocks 25% under cost. Stocks stay under 5% of assets, startups under 3%, the credit ratio at 12% or more.",
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
        label: 'Sales office guidance: funding',
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
        description: 'Prices the company lineup like an office manager while Apply to all is on.',
      },
      {
        id: 'developments',
        label: 'Developments',
        description: 'Starts a new product when none is running, within 1% of revenue.',
      },
      {
        id: 'models',
        label: 'Models',
        description:
          'Switches to the local data-vendor model that gives the most quality for its licence cost.',
      },
      {
        id: 'guidance',
        label: 'Sales office guidance: lineup',
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
          'Runs brand campaigns to hold awareness in every sales office city near your target, within 3% of revenue.',
      },
      {
        id: 'guidance',
        label: 'Sales office guidance: marketing',
        description:
          'Steers managers who run marketing: every 4 weeks pushes them to spend more on campaigns while brand awareness in their cities is 10 points under your target, and less when 10 points over.',
      },
    ],
  },
  cto: {
    seat: 'cto',
    title: 'Chief Technology Officer',
    short: 'CTO',
    depts: ['it', 'treasury'],
    delegations: [
      {
        id: 'digital',
        label: 'Digital projects',
        description: 'Starts the next digital project when the Products team is free.',
      },
      {
        id: 'compute',
        label: 'Compute',
        description:
          'Reserves GPUs on the Compute floor until your own and reserved GPUs cover the share of demand you set; long terms in a chip glut, short in a shortage, never above spot.',
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
        label: 'Launch posture',
        description:
          'Steps the launch posture down while the safety tier is Watch or worse, and back up while it is Strong.',
      },
      {
        id: 'loanPolicy',
        label: 'Deal Desk policy',
        description:
          'Bids on proposal requests at sales offices without a delegated manager, within each office’s discount limit.',
      },
      {
        id: 'guidance',
        label: 'Sales office guidance: lending',
        description:
          'With the CFO, steers delegated managers: every 4 weeks makes loans dearer and approvals stricter while capital or losses miss target, and looser when both are healthy.',
      },
    ],
  },
  creo: {
    seat: 'creo',
    title: 'Chief Infrastructure Officer',
    short: 'CIO',
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
          'Every 4 weeks buys the listed building with the best rent yield, in any city, at its asking price. Keeps the lab’s buildings under 5% of its assets, the credit ratio at 12% or more and 8 weeks of costs in cash.',
      },
      {
        id: 'privateBuys',
        label: 'Buying: your own buildings',
        description:
          'The same with your own money: keeps a year of your salary aside and spends at most half of the rest on one building.',
      },
    ],
  },
  csci: {
    seat: 'csci',
    title: 'Chief Scientist',
    short: 'CSci',
    depts: [],
    delegations: [
      {
        id: 'training',
        label: 'Routine training runs',
        description:
          'Starts a 12-week training run on the weakest of the model’s five scores whenever none is under way, spending about 1% of cash a week (up to $150k) while 40 weeks of that stays in cash. Switches to a newly trained model when it beats the one in use.',
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
  'csci',
];
