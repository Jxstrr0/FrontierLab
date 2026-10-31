// Front-page text for the annual report (owner's review A5, CONTENT §26b).
// Each headline kind has three or four versions; a hash of the year and kind
// picks one, so a report reads the same every time it is opened but the
// versions don't simply alternate. Placeholders: {bank}, {founder}, {year},
// {pct} (ARR growth), {n} (year of play), {decade}, {deals} (acquisitions in
// the year), {project} (the frontier project finished). The later kinds
// (IPO, frontier, leader, spree, record) are in annualReportMore.ts.
import { ANNUAL_TEXT_MORE, type AnnualKindMore } from './annualReportMore';

export type AnnualKind =
  | 'first'
  | 'topRich'
  | 'firstProfit'
  | 'doubled'
  | 'safety'
  | 'hardYear'
  | 'grew'
  | 'decade'
  | AnnualKindMore;

export interface AnnualText {
  headline: string;
  standfirst: string;
}

const CORE: Record<Exclude<AnnualKind, AnnualKindMore>, readonly AnnualText[]> = {
  first: [
    {
      headline: '{bank} closes its first year',
      standfirst: 'From a rented desk to a working lab: the first twelve months in figures.',
    },
    {
      headline: 'Year one in the books for {bank}',
      standfirst: '{founder} looks back on the lab’s first year of business.',
    },
    {
      headline: '{bank}: one year old',
      standfirst: 'A model, some customers and a lot of late nights. The first year, counted.',
    },
  ],
  topRich: [
    {
      headline: '{founder} tops the rich list',
      standfirst: 'The {bank} founder is now the wealthiest person on our list.',
    },
    {
      headline: 'Number one: {founder} takes the top spot',
      standfirst: 'A lab fortune passes every other name on the rich list.',
    },
    {
      headline: 'Richest of all: {founder}',
      standfirst: 'The {bank} stake is now worth more than any fortune we track.',
    },
  ],
  firstProfit: [
    {
      headline: '{bank} turns a profit for the year',
      standfirst: 'After years of spending to grow, the lab earned more than it spent.',
    },
    {
      headline: 'In the black: {bank} posts a yearly profit',
      standfirst: 'Investors who backed the early losses get the year they waited for.',
    },
    {
      headline: 'Profit at last for {bank}',
      standfirst: '{year} is the year the lab paid its own way. {founder} allowed a smile.',
    },
  ],
  doubled: [
    {
      headline: '{bank} grows {pct} in {year}',
      standfirst: 'Recurring revenue more than doubled as customers piled in.',
    },
    {
      headline: 'A breakout year: {bank} up {pct}',
      standfirst: 'Few labs have grown this fast. The question now is whether it lasts.',
    },
    {
      headline: 'Double and then some: {bank} up {pct}',
      standfirst: 'Sales offices could barely keep up with sign-ups in {year}.',
    },
    {
      headline: '{bank}’s {pct} year',
      standfirst: 'Revenue more than doubled. Rivals spent {year} asking how.',
    },
  ],
  safety: [
    {
      headline: 'Regulators shadow {bank} through {year}',
      standfirst: 'Growth came with a safety record the watchdog is not happy with.',
    },
    {
      headline: 'A year under the regulator’s eye for {bank}',
      standfirst: 'The lab ends {year} on a restricted footing and must rebuild trust.',
    },
    {
      headline: '{bank} closes {year} on probation',
      standfirst: 'The safety tier slipped, and with it the lab’s freedom to grow.',
    },
  ],
  hardYear: [
    {
      headline: 'A hard year for {bank}',
      standfirst: 'Recurring revenue shrank in {year}. {founder} promises a reset.',
    },
    {
      headline: '{bank} goes backwards in {year}',
      standfirst: 'Customers left faster than they arrived. The board wants answers.',
    },
    {
      headline: 'Smaller than it was: {bank} in {year}',
      standfirst: 'A year to forget, and a long list of things to fix.',
    },
  ],
  grew: [
    {
      headline: '{bank} grows {pct} in {year}',
      standfirst: 'Another year of steady progress for the lab.',
    },
    {
      headline: 'Steady going: {bank} up {pct}',
      standfirst: '{founder} keeps the lab on course through {year}.',
    },
    {
      headline: '{bank} adds {pct} in year {n}',
      standfirst: 'No fireworks, no scandals. Just more customers than last year.',
    },
    {
      headline: 'Up {pct}: another year at {bank}',
      standfirst: 'Quiet progress. The kind boards like and headlines ignore.',
    },
  ],
  decade: [
    {
      headline: '{bank}: the decade in review',
      standfirst: '{decade} years of the lab, from the first desk to today.',
    },
    {
      headline: '{decade} years on: the {bank} story',
      standfirst: 'Looking back on {decade} years of growth, setbacks and big bets.',
    },
    {
      headline: '{decade} years of {bank}',
      standfirst: 'The models, the offices, the deals: a lab’s life in figures.',
    },
  ],
};

export const ANNUAL_TEXT: Record<AnnualKind, readonly AnnualText[]> = {
  ...CORE,
  ...ANNUAL_TEXT_MORE,
};
