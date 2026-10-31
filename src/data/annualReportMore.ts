// Front-page text for the annual report's later kinds (CONTENT §26b,
// 2026-10-31): the year the lab listed, finished a frontier project, first
// topped the benchmark leaderboard, went on an acquisition spree, or beat its
// best profit by a wide margin. Same placeholders as annualReport.ts.
import type { AnnualText } from './annualReport';

export type AnnualKindMore = 'ipo' | 'frontier' | 'leader' | 'spree' | 'record';

export const ANNUAL_TEXT_MORE: Record<AnnualKindMore, readonly AnnualText[]> = {
  ipo: [
    {
      headline: '{bank} goes public',
      standfirst: 'The lab rang the bell in {year}. Its shares now trade every day.',
    },
    {
      headline: 'Listed: {bank}’s year on the market',
      standfirst: 'New shareholders, new rules and a share price to watch.',
    },
    {
      headline: '{year}: the year {bank} listed',
      standfirst: '{founder} swapped private backers for the public market.',
    },
  ],
  frontier: [
    {
      headline: '{bank} completes {project}',
      standfirst: 'Years of weekly payments end in something no rival has.',
    },
    {
      headline: 'The big build is done',
      standfirst: '{project} came in during {year}. {founder} calls it the lab’s proudest work.',
    },
    {
      headline: '{project}: finished',
      standfirst: 'The frontier project that ate the budget is now the lab’s edge.',
    },
  ],
  leader: [
    {
      headline: '{bank} tops the leaderboard',
      standfirst: 'For the first time, no rival model scores higher.',
    },
    {
      headline: 'Best model in the world: {bank}',
      standfirst: 'The benchmark board has a new name at the top, and it is ours.',
    },
    {
      headline: 'Number one on the benchmarks',
      standfirst: 'In {year} the {bank} model passed every rival. Holding it is the hard part.',
    },
  ],
  spree: [
    {
      headline: '{bank} buys {deals} labs in {year}',
      standfirst: 'A year of deals. Integration teams are still unpacking.',
    },
    {
      headline: 'Shopping season: {deals} deals for {bank}',
      standfirst: 'The lab grew by buying as much as by building.',
    },
    {
      headline: '{deals} acquisitions and counting',
      standfirst: '{founder} spent {year} at the deal table. Rivals noticed.',
    },
  ],
  record: [
    {
      headline: 'Record profit for {bank}',
      standfirst: 'The lab beat its best year by a wide margin.',
    },
    {
      headline: '{bank}’s best year yet',
      standfirst: 'Profit in {year} left every earlier year behind.',
    },
    {
      headline: 'A bumper {year} for {bank}',
      standfirst: 'More earned than ever before. Shareholders are in a good mood.',
    },
  ],
};
