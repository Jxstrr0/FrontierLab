// Extra wording for The Weekly Ledger's most frequent stories (CONTENT §23,
// 2026-10-31): a headless eight-year run counted which templates print most;
// these lines are appended to those keys' own versions (ledgerTemplates.ts
// merges them), so the commonest stories have four or more ways to read.
// Tokens are the same as each key's own templates.
import type { LedgerTemplate } from './ledgerTemplates';

export const EXTRA_VARIANTS: Record<string, readonly LedgerTemplate[]> = {
  SPORTS_RESULT: [
    { h: '{winner} too strong for {loser}', b: 'It finished {score} in the {league}{extra}.' },
  ],
  HOUSING_UP: [
    { h: 'Homes cost {pct} more in {city}', b: 'Twelve months of gains, driven by {reason}.' },
  ],
  AUCTION_PREVIEW: [
    {
      h: '{item} heads to {house}',
      b: 'The {lots}-lot sale on {date} is led by it, at {estimate}.',
    },
  ],
  AUCTION_RECORD: [
    {
      h: '{price} for {item} at {house}',
      b: 'The estimate had been {estimate}. Two bidders would not give up.',
    },
    {
      h: 'Hammer falls at {price}',
      b: '{item} sold at {house}, far past its {estimate} estimate.',
    },
  ],
  CONTRACT_ONE: [
    {
      h: '{lead} picks {bank}',
      b: 'The {sector} firm will pay {leadAmount} a year for the lab’s models.',
    },
    { h: 'New client for {bank}: {lead}', b: 'A {sector} business, worth {leadAmount} a year.' },
  ],
  CONTRACT_MANY: [
    {
      h: '{n} new deals for {bank}',
      b: 'Together worth {total} a year. The biggest: {lead}, at {leadAmount}.',
    },
    {
      h: 'Busy week on {bank}’s deal desk',
      b: '{n} contracts signed, {total} a year in all. {lead} leads at {leadAmount}.',
    },
  ],
  OFFICE_GROWN: [
    {
      h: '{bank} needs more desks in {city}',
      b: '{name} grows into a {size} office as the sales team expands.',
    },
    { h: 'Bigger {bank} office for {city}', b: 'More floors at {name}, now a {size} office.' },
  ],
  RIVAL_OFFICE_SHRUNK: [
    {
      h: '{bank} retreats in {city}',
      b: 'The lab’s office there shrinks to {size}. Staff were told this week.',
    },
    {
      h: 'Fewer desks for {bank} in {city}',
      b: 'A {size} office now, after a run of thin quarters.',
    },
  ],
  COMMODITY_WRAP: [
    { h: 'Four weeks in the markets for raw goods', b: '{list}.' },
    { h: 'Commodity round-up', b: 'Where prices moved this month: {list}.' },
  ],
  RIVAL_CAMPAIGN: [
    {
      h: '{bank} goes big on ads in {city}',
      b: 'A {weeks}-week campaign aims to pull customers its way.',
    },
    {
      h: '{city} sees {bank} everywhere',
      b: 'Posters, screens and podcasts: the lab’s {weeks}-week push has begun.',
    },
  ],
  VENTURE_ROUND: [
    { h: '{name} closes a {amount} {round}', b: 'Valued at {post}, it is one to watch.' },
    { h: 'Fresh money for {name}', b: 'A {round} of {amount} puts the startup at {post}.' },
  ],
  WORLD_CHESS: [
    {
      h: 'Chess title for {city}’s {name}',
      b: 'A {n}-move final decided it. The hall stood to applaud.',
    },
    {
      h: '{name} wins the {theCountry} chess crown',
      b: 'Aged {n}, from {city}. Their coach was not surprised.',
    },
  ],
  WORLD_LOTTERY: [
    {
      h: '{money} jackpot for a {city} {job}',
      b: 'They checked the ticket four times before calling anyone.',
    },
    {
      h: '{city} winner claims {money}',
      b: 'The {job} says the first purchase will be “a very long holiday.”',
    },
  ],
};

/** Each key's own templates followed by its extras. */
export function withExtras<T extends Record<string, readonly LedgerTemplate[]>>(t: T): T {
  const out: Record<string, readonly LedgerTemplate[]> = { ...t };
  for (const [key, extra] of Object.entries(EXTRA_VARIANTS)) {
    if (out[key]) out[key] = [...out[key]!, ...extra];
  }
  return out as T;
}
