// The Weekly Ledger's templates for ventures stories (Stage 7, CONTENT §23):
// convention announcements, funding rounds, IPOs, acquisitions and failures,
// with louder variants when your bank or you back the startup. Merged into
// LEDGER_TEMPLATES via ledgerTemplatesInvestments.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const VENTURES_TEMPLATES = {
  CONVENTION_ANNOUNCED: [
    {
      h: '{event} opens in {city} {weeks}',
      b: 'Founders are booking stands. Exclusive startups will pitch only to investors who attend; find the conference on the map.',
    },
    {
      h: 'Startups head to {city} for {event}',
      b: 'Doors open {weeks}. The deals on the exhibition floor are for those in the room.',
    },
    {
      h: '{city} readies the {event}',
      b: 'Organisers promise a hall full of young companies raising money. Investors must attend in person.',
    },
  ],
  VENTURE_ROUND: [
    {
      h: '{name} raises {amount} in its {round}',
      b: 'The round values the company at {post}. Investors are queueing for a slice.',
    },
    {
      h: '{round} for {name}: {amount}',
      b: 'Backers put the startup at {post} after the money.',
    },
  ],
  VENTURE_ROUND_DOWN: [
    {
      h: '{name} takes a down round',
      b: 'A {round} of {amount} prices the company at {post}, below its last valuation.',
    },
    {
      h: 'Cut-price {round} for {name}',
      b: 'Cash was running short; new money of {amount} came at a lower price, valuing it at {post}.',
    },
  ],
  VENTURE_IPO: [
    {
      h: '{name} lists as {ticker}',
      b: 'The startup floated at {price} a share and starts trading this week.',
    },
    {
      h: 'Debut for {ticker}',
      b: '{name} is now a public company, priced at {price} a share.',
    },
  ],
  VENTURE_IPO_HELD: [
    {
      h: '{name} goes public; {investor} among the backers',
      b: 'Shares in {ticker} open at {price}. Early investors are sitting on a listed stake.',
    },
    {
      h: 'Payday for backers as {name} floats',
      b: '{ticker} lists at {price} a share. {investor} keeps the stake as listed shares.',
    },
  ],
  VENTURE_ACQUIRED: [
    {
      h: '{name} sold for {price}',
      b: 'A larger rival bought the startup outright. Its investors are paid in cash.',
    },
    {
      h: 'Buyer swoops on {name}',
      b: 'The {price} deal ends the startup’s independent run.',
    },
  ],
  VENTURE_ACQUIRED_HELD: [
    {
      h: '{name} bought for {price}, a win for {investor}',
      b: 'Every shareholder is cashed out at the deal price, {investor} included.',
    },
    {
      h: '{investor} cashes out as {name} is sold',
      b: 'The {price} takeover turns the venture stake into cash.',
    },
  ],
  VENTURE_FAILED: [
    {
      h: '{name} shuts its doors',
      b: 'The startup ran out of road. Its shares are worthless.',
    },
    {
      h: 'Lights out at {name}',
      b: 'Investors lose their stakes as the young company winds down.',
    },
  ],
  VENTURE_FAILED_HELD: [
    {
      h: '{name} collapses, hitting {investor}',
      b: 'The startup has failed. {investor} writes the stake off and recovers only part of any credits.',
    },
    {
      h: '{investor} loses a bet on {name}',
      b: 'The venture folded this week; its backers are left with little or nothing.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
