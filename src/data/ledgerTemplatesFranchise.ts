// The Weekly Ledger's templates for Stage 9 stories: your club's season finish
// (CONTENT §23 SPORTS), buying and selling a club, kit sponsorship and a big
// signing. Merged into LEDGER_TEMPLATES via ledgerTemplatesEmpire.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const FRANCHISE_TEMPLATES = {
  CLUB_SEASON: [
    {
      h: '{club} finish {pos} in the {league}',
      b: '{club} closed the season with a record of {record}.',
    },
    {
      h: '{pos} place for {club}',
      b: 'The {league} season is over: {club} finished {record}. Owner {owner} is said to be {mood}.',
    },
  ],
  CLUB_BOUGHT: [
    {
      h: '{owner} buys the {club}',
      b: 'The {league} club changes hands for {price}.',
    },
    {
      h: '{club} sold to {owner} for {price}',
      b: 'Supporters wait to hear what the new owner has planned for the {league} side.',
    },
  ],
  CLUB_SOLD: [
    {
      h: '{owner} sells the {club}',
      b: 'The club fetched {price}. A new owner takes over this week.',
    },
    {
      h: 'New owner for the {club}',
      b: '{owner} has sold up for {price}.',
    },
  ],
  NAMING_RIGHTS: [
    {
      h: '{bank} puts its name on the {stadium}',
      b: 'Home of {club}, the ground will carry the lab’s name for as long as the deal runs. Some fans say they will never call it that.',
    },
    {
      h: '{stadium} gets a banking makeover',
      b: '{bank} bought the naming rights to the home of {club}. New signs go up before the next home game.',
    },
  ],
  KIT_SPONSOR: [
    {
      h: '{bank} name goes on {club} shirts',
      b: 'The lab replaces the outside sponsor. Fans across {theCountry} will see a lot more of it.',
    },
    {
      h: '{club} unveil new shirt sponsor: {bank}',
      b: 'The deal puts the lab in front of supporters all over {theCountry}.',
    },
  ],
  CLUB_SIGNED: [
    {
      h: '{club} sign {player}',
      b: 'The {position} arrives for a fee of {fee}.',
    },
    {
      h: 'Big signing: {player} joins the {club}',
      b: 'The club paid {fee} for the {position}.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
