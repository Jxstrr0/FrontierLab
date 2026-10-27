// The Weekly Ledger's templates for M&A stories (Stage 6, CONTENT §23): your
// offers and their answers, closings, finished conversions and distressed
// sales. Merged into LEDGER_TEMPLATES via ledgerTemplatesCapital.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const MERGERS_TEMPLATES = {
  MERGER_OFFER: [
    {
      h: '{bank} bids {total} for {target}',
      b: 'The all-cash offer is {premium} over the reference price. {target} answers next week.',
    },
    {
      h: 'Takeover tilt: {bank} courts {target}',
      b: 'A {total} cash bid, {premium} above the market, lands on the board table.',
    },
  ],
  MERGER_REJECTED: [
    {
      h: '{target} spurns {bank}',
      b: "{target}'s directors say the offer undervalues the lab. {bank} may come back with more.",
    },
    {
      h: 'No deal: {target} rebuffs {bank}',
      b: 'The board voted the bid down. Analysts expect a sweetened offer, if any.',
    },
  ],
  MERGER_BLOCKED: [
    {
      h: 'Regulator blocks {bank} bid for {target}',
      b: 'Regulators refused the deal. {reason}',
    },
    {
      h: 'Watchdog halts {bank}–{target} merger',
      b: 'The regulator would not sign off. {reason}',
    },
  ],
  MERGER_LAPSED: [
    {
      h: '{bank} deal for {target} falls through',
      b: '{reason} The agreement lapsed before closing.',
    },
    {
      h: 'Collapse at the closing table: {bank} and {target}',
      b: '{reason} Both sides walk away.',
    },
  ],
  ACQUISITION_CLOSED: [
    {
      h: '{bank} buys {target} for {price}',
      b: "{target}'s {n} sales offices join {bank}. Signs come down over the next eight weeks.",
    },
    {
      h: 'Deal done: {target} is now part of {bank}',
      b: 'The {price} takeover closed this week, bringing {n} sales offices under the {bank} name.',
    },
    {
      h: '{bank} swallows {target}',
      b: 'Shareholders take the cash, {price} in all. {n} sales offices start rebranding on Monday.',
    },
  ],
  ACQUISITION_CLOSED_STOCK: [
    {
      h: '{bank} buys {target} in a {price} share deal',
      b: "{target}'s shareholders take {bank} stock for part of the price. Its {n} sales offices rebrand over eight weeks.",
    },
    {
      h: '{target} holders swap into {bank}',
      b: 'The {price} takeover was paid partly in new {bank} shares, bringing {n} sales offices under one name.',
    },
  ],
  ACQUISITION_CLOSED_DISTRESSED: [
    {
      h: '{bank} rescues {target} network',
      b: 'Paying {price} for the failed lab, {bank} keeps its {n} sales offices open and its customers served.',
    },
    {
      h: 'Failed {target} finds a buyer in {bank}',
      b: 'Administrators accepted {price} for the failed lab. Its {n} sales offices reopen under new management.',
    },
  ],
  CONVERSION_DONE: [
    {
      h: 'The last {target} sign comes down',
      b: '{n} former {target} sales offices now open as {bank}.',
    },
    {
      h: '{bank} completes {target} rebrand',
      b: 'Fresh paint and new signs: {n} sales offices have finished the switch to {bank}.',
    },
  ],
  DISTRESSED_SALE: [
    {
      h: 'Fire sale: {target} on the block at {ask} a share',
      b: 'Administrators want about {pb}× book for the failed lab. Bids close in {weeks} weeks.',
    },
    {
      h: 'Bargain hunters circle {target}',
      b: 'The failed lab is priced at {ask} a share, roughly {pb}× book, with {weeks} weeks to find a buyer.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
