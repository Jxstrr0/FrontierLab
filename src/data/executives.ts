// Executive seats (SIMULATION §17.2, SCREENS §10): titles, the HQ departments
// each executive lifts with execMult, and the delegation toggles on their
// profile (some with a dial under them: DelegationDials.tsx; some under a
// `group` heading on the profile). The CEO seat is you and isn't listed. Since
// schema 22 the CFO also manages and buys buildings (the old Chief
// Infrastructure Officer's job, §21.2) and the CPO also runs routine training
// runs and lifts training odds (the old Chief Scientist's, §16.13). Numbers
// live in balance.ts.
import type { ExecSeat } from '../sim/marketsTypes';
import type { HqDeptId } from './types';

export interface DelegationSpec {
  id: string;
  label: string;
  description: string;
  /** Heading the toggle sits under on the profile; toggles without one come first. */
  group?: string;
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
        description:
          'Hires the strongest candidate for every sales office without a manager and turns on default delegation.',
      },
      {
        id: 'expansion',
        label: 'Expansion',
        description:
          'Every 4 weeks opens a sales office in a growth city with room, or grows a busy one a size: the busiest free storefront, your usual fit-out, while the cash reserve you dial stays in hand.',
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
        id: 'capital',
        label: 'Capital',
        description:
          'Keeps cash from running out without selling shares: with under 12 months of runway, sells the lab’s stocks for cash.',
      },
      {
        id: 'shares',
        label: 'Share sales',
        description:
          'With under 12 months of runway, sells new shares to get back to 18 months: a private placement while private, a secondary offering once listed. Never launches your IPO.',
      },
      {
        id: 'dividends',
        label: 'Dividends',
        description: 'Proposes a dividend at each board meeting.',
      },
      {
        id: 'bankInvests',
        label: "The lab's money",
        group: 'Investing',
        description:
          "Every 4 weeks buys a stock, spread across the market by company size, and backs the best-scoring startup on the Investment floor's list. Sells stocks 25% under cost. Stocks stay under 5% of assets, startups under 3%, and 12 months of runway stay in hand.",
      },
      {
        id: 'privateInvests',
        label: 'Your money',
        group: 'Investing',
        description:
          'The same for your own account. Keeps a year of your salary and spends at most a quarter of the rest at a time.',
      },
      {
        id: 'bankRents',
        label: "Rents: the lab's buildings",
        group: 'Buildings',
        description:
          'Every 4 weeks sets the rent on every building the lab owns to hold the occupancy you dial, as market rents drift: at 100% the highest rent that still fills it. Their tenants pay a little over market, by the CFO’s expertise.',
      },
      {
        id: 'privateRents',
        label: 'Rents: your own buildings',
        group: 'Buildings',
        description:
          'The same for the buildings you own privately. The lab pays the CFO either way.',
      },
      {
        id: 'bankBuys',
        label: "Buying: the lab's buildings",
        group: 'Buildings',
        description:
          'Every 4 weeks buys the listed building with the best rent yield, in any city, at its asking price. Keeps the lab’s buildings under 5% of its assets, 12 months of runway and 8 weeks of costs in cash.',
      },
      {
        id: 'privateBuys',
        label: 'Buying: your own buildings',
        group: 'Buildings',
        description:
          'The same with your own money: keeps a year of your salary aside and spends at most half of the rest on one building.',
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
        description:
          'Develops the next product when none is under way, within 1% of revenue, starting with the category you dial.',
      },
      {
        id: 'models',
        label: 'Models',
        description:
          'Switches to the model that gives the most quality for its licence cost: a data-vendor package in any city with one of your offices, or a model you have trained.',
      },
      {
        id: 'training',
        label: 'Routine training runs',
        description:
          'Trains the weakest of the model’s five scores whenever no run is under way, as long and as well funded as the style you dial, while 40 weeks of the budget stays in cash. Models decides when to switch to the result.',
      },
      {
        id: 'talent',
        label: 'Research talent',
        description:
          'Every 4 weeks hires the best researcher on the open market while researcher pay stays within 3% of revenue. Never poaches from a rival: those bids, and counter-offers for your own people, stay with you.',
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
          'Steps the launch posture down while the safety tier is Watch or worse, and back up while it is Strong, never above the ceiling you dial.',
      },
      {
        id: 'loanPolicy',
        label: 'Deal Desk policy',
        description:
          'Bids on proposal requests at sales offices without a delegated manager, within each office’s discount limit.',
      },
    ],
  },
};

/** Seat order on the Executive floor grid (after the CEO). */
export const EXEC_SEAT_ORDER: readonly ExecSeat[] = ['coo', 'cfo', 'cpo', 'cmo', 'cto', 'cro'];
