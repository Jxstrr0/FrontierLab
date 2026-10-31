// The Weekly Ledger's templates for Stage 9 personal stories (CONTENT §23): the
// rich list (entry and rank), insider-trading probes and fines, big home
// purchases and sales, and jets and costly cars bought or sold. Merged into
// LEDGER_TEMPLATES in ledgerTemplates.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const PERSONAL_TEMPLATES = {
  RICH_LIST: [
    {
      h: '{name} enters the rich list at #{rank}',
      b: "The {bank} founder's fortune is estimated at {worth}.",
    },
    {
      h: 'New name on the rich list: {name}, #{rank}',
      b: 'Built on {bank}, the fortune is put at {worth}.',
    },
    {
      h: 'AI founder {name} joins the rich list',
      b: 'The founder of {bank} debuts at #{rank} with an estimated {worth}.',
    },
  ],
  RICH_LIST_RANK: [
    {
      h: '{name} {moves} to #{rank} on the rich list',
      b: "The {bank} founder's fortune is now estimated at {worth}.",
    },
    {
      h: 'Rich list: {name} at #{rank}',
      b: 'A year at the helm of {bank} leaves the founder worth an estimated {worth}.',
    },
  ],
  INSIDER_PROBE: [
    {
      h: 'Regulators probe {founder} over {bank} share trades',
      b: 'Investigators are looking at trades made weeks before the lab reported. A settlement of {fine} is said to be on the table.',
    },
    {
      h: 'Insider questions for {bank} founder',
      b: "{founder}'s personal dealings in the lab's stock before earnings have drawn the securities regulator's attention.",
    },
  ],
  INSIDER_FINED: [
    {
      h: '{founder} pays {fine} over insider trades',
      b: 'The {bank} founder {how}. Customers took note.',
    },
    {
      h: 'Insider case costs {bank} founder {fine}',
      b: 'Regulators said {founder} traded the stock with knowledge of results not yet public.',
    },
  ],
  HOME_BOUGHT: [
    {
      h: '{bank} founder snaps up {home}',
      b: '{founder} paid a reported {price} for the property.',
    },
    {
      h: '{home} sells for {price}',
      b: 'The buyer, property records show, is {bank} founder {founder}.',
    },
  ],
  HOME_SOLD: [
    {
      h: '{bank} founder sells {home}',
      b: '{founder} let the property go for a reported {price}.',
    },
    {
      h: '{home} changes hands at {price}',
      b: 'The seller is said to be {founder}, of {bank}.',
    },
  ],
  JET_BOUGHT: [
    {
      h: '{founder} takes delivery of a {model}',
      b: 'The {bank} founder’s new jet cost a reported {price}. Flight crews are being hired.',
    },
    {
      h: '{bank} founder buys a private jet',
      b: 'A {model}, at about {price}. Air-miles, it seems, are no longer a concern.',
    },
  ],
  JET_SOLD: [
    {
      h: '{founder} sells the jet',
      b: 'The {bank} founder’s {model} went for about {price}. Friends say they will fly commercial. Briefly.',
    },
    {
      h: '{bank} founder parts with a {model}',
      b: 'The aircraft fetched a reported {price}.',
    },
  ],
  CAR_BOUGHT: [
    {
      h: '{founder} adds a {car} to the garage',
      b: 'The {bank} founder paid a reported {price}. Neighbours have noticed.',
    },
    {
      h: '{price} for a {car}',
      b: 'The buyer at the dealership, staff confirm, was {bank} founder {founder}.',
    },
  ],
  CAR_SOLD: [
    {
      h: '{founder} sells a {car}',
      b: 'The {bank} founder let it go for about {price}. The garage has room again.',
    },
    {
      h: '{bank} founder’s {car} finds a new home',
      b: 'The car sold for a reported {price}.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
