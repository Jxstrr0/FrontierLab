// Front-page text for the annual report (owner's review A5, CONTENT §26b).
// Each headline kind has two versions; the year picks one (year mod 2), so a
// report reads the same every time it is opened. Placeholders: {bank},
// {founder}, {year}, {pct} (ARR growth), {n} (year of play), {decade}.

export type AnnualKind =
  'first' | 'topRich' | 'firstProfit' | 'doubled' | 'safety' | 'hardYear' | 'grew' | 'decade';

export interface AnnualText {
  headline: string;
  standfirst: string;
}

export const ANNUAL_TEXT: Record<AnnualKind, readonly AnnualText[]> = {
  first: [
    {
      headline: '{bank} closes its first year',
      standfirst: 'From a rented desk to a working lab: the first twelve months in figures.',
    },
    {
      headline: 'Year one in the books for {bank}',
      standfirst: '{founder} looks back on the lab’s first year of business.',
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
  ],
};
