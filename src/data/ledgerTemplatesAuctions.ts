// The Weekly Ledger's templates for auction stories (Stage 9, CONTENT §23):
// sale previews, record prices, the founder's wins and sales, and a collector
// stung by a fake. Merged into LEDGER_TEMPLATES via ledgerTemplatesEmpire.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const AUCTIONS_TEMPLATES = {
  AUCTION_PREVIEW: [
    { h: 'Coming to {house}: {item}', b: 'Estimate {estimate}. Bidding opens {date}.' },
    {
      h: '{house} unveils {lots} lots for its next sale',
      b: 'The star is {item}, estimated at {estimate}. The hammer falls on {date}.',
    },
    {
      h: 'Collectors circle {item}',
      b: '{house} expects {estimate} when it goes under the hammer on {date}.',
    },
  ],
  AUCTION_RECORD: [
    {
      h: 'Record night at {house}: {item} fetches {price}',
      b: 'The pre-sale estimate was {estimate}. The room applauded the final bid.',
    },
    {
      h: '{item} smashes its estimate',
      b: 'Expected to make {estimate}, it sold at {house} for {price}.',
    },
  ],
  AUCTION_RECORD_YOURS: [
    {
      h: '{founder} pays {price} for {item}',
      b: 'The {bank} founder outlasted the room at {house}; the estimate was {estimate}.',
    },
    {
      h: 'Bidding war at {house} ends with {founder}',
      b: '{item} went for {price}, far above its {estimate} estimate.',
    },
  ],
  AUCTION_WON: [
    {
      h: '{founder} adds {item} to private collection',
      b: 'The {bank} founder bought it at {house} for {price}, premium included.',
    },
    {
      h: 'AI founder {founder} wins {item} at {house}',
      b: 'The winning bid, with the buyer’s premium, came to {price}.',
    },
  ],
  AUCTION_SOLD: [
    {
      h: '{item} sells for {price} at {house}',
      b: 'The consignor, {bank} founder {founder}, parts with a prized piece.',
    },
    {
      h: '{founder} cashes in {item}',
      b: 'The hammer fell at {price} at {house}.',
    },
  ],
  AUCTION_FAKE: [
    {
      h: 'Collector stung by fake {item}',
      b: 'Appraisers found the piece, bought at {house}, to be a skilled copy. Dealers urge buyers to authenticate before they celebrate.',
    },
    {
      h: 'Counterfeit {item} surfaces after sale',
      b: 'A buyer at {house} learned the hard way that provenance matters. The piece is now worth nothing.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
