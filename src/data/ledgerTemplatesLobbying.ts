// The Weekly Ledger's templates for lobbying stories (Stage 7, CONTENT §23):
// exposés of your campaigns and briefs on their outcomes. Merged into
// LEDGER_TEMPLATES via ledgerTemplatesInvestments.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const LOBBYING_TEMPLATES = {
  LOBBY_EXPOSED: [
    {
      h: 'Exposed: {bank} paid {firm} to {campaign}',
      b: 'Inference reporters traced the money. The lab pays a {fine} fine and customers are not impressed.',
    },
    {
      h: 'Lobbying row engulfs {bank}',
      b: 'Papers show {firm} was hired to {campaign}. Regulators fined the lab {fine}.',
    },
    {
      h: '{bank} caught lobbying in {theCountry}',
      b: 'The campaign, run by {firm}, has cost the lab a {fine} fine and some goodwill.',
    },
  ],
  LOBBY_WON: [
    {
      h: 'Quiet win for {bank} in the corridors of power',
      b: 'Insiders say {firm} got its way: a push to {campaign} has succeeded.',
    },
    {
      h: 'Lawmakers in {theCountry} hand {bank} a favour',
      b: 'A campaign to {campaign}, run by {firm}, came good this week.',
    },
  ],
  LOBBY_LOST: [
    {
      h: '{bank} lobbying push falls flat',
      b: 'Officials in {theCountry} brushed off a campaign by {firm} to {campaign}.',
    },
    {
      h: 'No dice for {bank} in {theCountry}',
      b: "{firm}'s efforts to {campaign} went nowhere, insiders say.",
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
