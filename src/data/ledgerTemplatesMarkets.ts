// The Weekly Ledger's templates for markets stories (Stage 6, CONTENT §23):
// your placements, IPO and secondary offerings, big moves in your share price,
// and listed companies' notable results. The weekly market wrap reuses
// MARKET_UP / MARKET_DOWN from ledgerTemplatesWorld.ts. Merged into
// LEDGER_TEMPLATES via ledgerTemplatesCapital.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const MARKETS_TEMPLATES = {
  PLACEMENT: [
    {
      h: '{investor} takes a stake in {bank}',
      b: 'The fund paid {price} a share for {shares} new shares, putting {raised} of fresh capital into the lab.',
    },
    {
      h: '{bank} raises {raised} from {investor}',
      b: 'The private round sold {shares} new shares at {price}. The money goes straight onto the balance sheet.',
    },
    {
      h: 'Private money backs {bank}',
      b: '{investor} bought {shares} shares at {price} in a {raised} round arranged this week.',
    },
  ],
  IPO_LAUNCHED: [
    {
      h: '{bank} files to go public',
      b: '{adviser} will offer {shares} shares at {price}, {float} of the lab. Trading starts at the end of the quarter.',
    },
    {
      h: 'IPO watch: {bank} sets its price at {price}',
      b: 'The lab plans to float {float} of its shares with {adviser} running the books. Listing is due at quarter-end.',
    },
  ],
  IPO_LISTED: [
    {
      h: '{bank} opens at {open} on its first day',
      b: 'Shares priced at {price} {pop} as {ticker} began trading on the {exchange}. The listing raised {raised}.',
    },
    {
      h: 'Bell rings for {bank}',
      b: '{ticker} made its debut on the {exchange} at {open} after an offer price of {price}. The lab netted {raised}.',
    },
    {
      h: '{ticker} debuts on the {exchange}',
      b: '{bank} is now a public company. The stock {pop} on day one, from {price} to {open}.',
    },
  ],
  IPO_WITHDRAWN: [
    {
      h: '{bank} pulls its IPO',
      b: 'The listing was shelved at the last minute. Advisers cited one sticking point: {reason}',
    },
    {
      h: 'No listing for {bank} this quarter',
      b: 'The share sale was withdrawn because the lab no longer met the rules. {reason}',
    },
  ],
  SECONDARY_OFFERING: [
    {
      h: '{bank} sells {shares} new shares',
      b: 'The offering priced at {price} and raised {raised} of new capital.',
    },
    {
      h: '{bank} taps the market for {raised}',
      b: 'Investors took up {shares} shares at {price}, a small discount to the last close.',
    },
  ],
  SHARE_BUYBACK: [
    {
      h: '{bank} buys back {shares} shares',
      b: 'The lab spent {cost} on its own stock at {price} a share and retired it.',
    },
    {
      h: '{bank} returns {cost} to shareholders',
      b: 'A buyback of {shares} shares at {price} leaves fewer shares to share the profits.',
    },
  ],
  SHARE_PRICE_UP: [
    {
      h: '{bank} shares jump {pct}',
      b: '{ticker} closed the week at {price} as buyers piled in.',
    },
    {
      h: 'A big week for {ticker}',
      b: '{bank} stock rose {pct} to {price}. Traders pointed to stronger sentiment around the lab.',
    },
  ],
  SHARE_PRICE_DOWN: [
    {
      h: '{bank} shares slide {pct}',
      b: '{ticker} ended the week at {price} after a wave of selling.',
    },
    {
      h: 'Rough week for {ticker}',
      b: '{bank} stock fell {pct} to {price}. Investors are waiting for the lab to steady the ship.',
    },
  ],
  COMPANY_EARNINGS_BEAT: [
    {
      h: '{company} beats forecasts',
      b: '{quarter} results came in {pct} ahead of expectations. Earnings run at {eps} a share.',
    },
    {
      h: 'Strong quarter lifts {ticker}',
      b: '{company} topped estimates by {pct} in {quarter}, with earnings of {eps} a share over the year.',
    },
  ],
  COMPANY_EARNINGS_MISS: [
    {
      h: '{company} misses estimates',
      b: '{quarter} results fell {pct} short of forecasts. Earnings run at {eps} a share.',
    },
    {
      h: '{ticker} slips on a soft quarter',
      b: '{company} came in {pct} below expectations in {quarter}, with earnings of {eps} a share over the year.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
