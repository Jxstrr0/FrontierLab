// The Weekly Ledger's templates for governance stories (Stage 6, CONTENT §23):
// dividends declared, board votes that went against the founder, and
// executive hires, departures and firings. Merged into LEDGER_TEMPLATES via
// ledgerTemplatesCapital.ts. Tokens in {braces} come from src/sim/newsGovernance.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const GOVERNANCE_TEMPLATES = {
  DIVIDEND_DECLARED: [
    {
      h: '{bank} declares {dps} dividend',
      b: 'The board approved a quarterly dividend of {dps} a share, {total} in all, payable in three weeks.{change}',
    },
    {
      h: 'Payday for {bank} shareholders',
      b: 'Directors signed off on {dps} a share for the quarter.{change} The cheques go out in three weeks.',
    },
    {
      h: '{bank} board rewards shareholders',
      b: 'A dividend of {dps} a share ({total}) is on its way to holders of {bank} stock.{change}',
    },
  ],
  BOARD_DIVIDEND_VOTE: [
    {
      h: '{bank} board blocks dividend',
      b: 'Directors voted down a proposed payout of {dps} a share, with only {forPct} in favour.',
    },
    {
      h: 'No dividend at {bank} after shareholder revolt',
      b: 'Outside holders rejected a {dps} payout as too rich for the bank’s earnings. Only {forPct} voted for it.',
    },
  ],
  BOARD_SALARY_VOTE: [
    {
      h: '{bank} shareholders reject CEO pay rise',
      b: 'A proposal to pay {founder} {salary} a year won just {forPct} of the vote. Pay stays at {current}.',
    },
    {
      h: 'Board says no to {founder}’s raise',
      b: 'Investors balked at a {salary} salary for the {bank} chief. The vote: {forPct} in favour.',
    },
    {
      h: 'Pay revolt at {bank}',
      b: 'Shareholders turned down {founder}’s request for {salary}. Pay stays at {current} for now.',
    },
  ],
  EXEC_HIRED: [
    {
      h: '{bank} names {name} {title}',
      b: '{name} joins the senior team this week, taking the {short} seat on the executive floor.',
    },
    {
      h: 'New {short} at {bank}',
      b: '{bank} has hired {name} as {title}. The appointment takes effect immediately.',
    },
    {
      h: '{name} joins {bank}',
      b: 'The bank filled its {title} role with {name}, rounding out the leadership bench.',
    },
  ],
  EXEC_RESIGNED: [
    {
      h: '{bank} {short} resigns',
      b: '{name} stepped down as {title} of {bank}, effective immediately.',
    },
    {
      h: 'Shake-up at {bank} as {name} departs',
      b: 'The {title} has left the bank. A search for a successor is under way.',
    },
    {
      h: '{bank} loses its {short}',
      b: '{name} is out as {title}. Insiders say a rival came calling.',
    },
  ],
  EXEC_FIRED: [
    {
      h: '{bank} fires {short} {name}',
      b: 'The bank dismissed its {title} this week. Severance is put at {severance}.',
    },
    {
      h: '{name} shown the door at {bank}',
      b: '{bank} parted ways with its {title}, paying {severance} in severance.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
