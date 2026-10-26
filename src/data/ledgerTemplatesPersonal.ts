// The Weekly Ledger's templates for Stage 9 personal stories (CONTENT §23): the
// rich list (entry and rank), insider-trading probes and fines, and big home
// purchases. Merged into LEDGER_TEMPLATES via ledgerTemplatesEmpire.ts.
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
      h: 'Banker {name} joins the rich list',
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
      b: 'Investigators are looking at trades made weeks before the bank reported. A settlement of {fine} is said to be on the table.',
    },
    {
      h: 'Insider questions for {bank} founder',
      b: "{founder}'s personal dealings in the bank's stock before earnings have drawn the securities regulator's attention.",
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
  TROPHY_BOUGHT: [
    {
      h: '{bank} founder buys {trophy} for {price}',
      b: '{founder} added the {kind} to a growing private collection this week.',
    },
    {
      h: '{trophy} changes hands at {price}',
      b: 'The buyer of the {kind}, people close to the deal say, is {bank} founder {founder}.',
    },
  ],
  TROPHY_SOLD: [
    {
      h: '{founder} parts with {trophy}',
      b: 'The {bank} founder sold the {kind} for {price}.',
    },
    {
      h: '{trophy} is back on the market, and sold',
      b: '{founder} let the {kind} go this week, raising {price}.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
