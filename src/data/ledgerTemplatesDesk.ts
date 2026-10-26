// The Weekly Ledger's desk templates (CONTENT §23.2–23.4): the company desk
// (a listed company's big share move and its corporate news), the Money Column,
// elections, and your record week. Tokens in {braces} are filled by
// src/sim/newsCompanyDesk.ts, newsColumn.ts, newsElections.ts and newsWeek.ts.
// Merged into LEDGER_TEMPLATES by ledgerTemplates.ts.

export const DESK_TEMPLATES = {
  // ─── Company desk ───────────────────────────────────────────────────────────
  STOCK_MOVER_UP: [
    {
      h: '{company} jumps {pct} {reason}',
      b: '{ticker} closed the week at {price}. Analysts say the rally has further to run.',
    },
    {
      h: 'Buyers pile into {company}',
      b: 'Shares rose {pct} to {price} {reason}.',
    },
    {
      h: '{ticker} soars {pct}',
      b: '{company} rallied {reason}, ending the week at {price}.',
    },
  ],
  STOCK_MOVER_DOWN: [
    {
      h: '{company} slides {pct} {reason}',
      b: '{ticker} ended the week at {price}. Some analysts call it a buying chance.',
    },
    {
      h: 'Sellers hit {company}',
      b: 'Shares fell {pct} to {price} {reason}.',
    },
    {
      h: '{ticker} tumbles {pct}',
      b: '{company} dropped {reason}, closing the week at {price}.',
    },
  ],
  COMPANY_CEO: [
    {
      h: '{company} names {name} chief executive',
      b: 'The board picked an outsider. {name} starts next month and promises “a fresh look at everything.”',
    },
    {
      h: 'New boss at {company}',
      b: '{name} takes the top job after the long-serving chief executive retired.',
    },
  ],
  COMPANY_LAUNCH: [
    {
      h: '{company} unveils {product}',
      b: 'It goes on sale next quarter. Reviewers who tried it early were impressed.',
    },
    {
      h: 'First look: {product} from {company}',
      b: 'The company says it took three years to develop. Pre-orders open this week.',
    },
  ],
  COMPANY_EXPAND: [
    {
      h: '{company} expands in {city}',
      b: 'The company is adding {n} jobs at a new site. Building starts this summer.',
    },
    {
      h: '{city} wins {company} investment',
      b: '{company} picked the city for a {n}-job site, citing its skilled workforce.',
    },
  ],
  // ─── The Money Column ───────────────────────────────────────────────────────
  COLUMN_RATES_UP: [
    {
      h: 'Money Column: should you fix your mortgage?',
      b: 'With the {cb} at {rate} and moving up, a fixed rate buys peace of mind. Savers, meanwhile, should shop around.',
    },
    {
      h: 'Money Column: rising rates, winners and losers',
      b: 'At {rate}, borrowers pay more and savers earn more. Check what your bank pays before you leave money idle.',
    },
  ],
  COLUMN_RATES_DOWN: [
    {
      h: 'Money Column: rates are falling, what now?',
      b: 'The {cb} is at {rate}. Borrowers can refinance; savers may want to lock in a term deposit before rates fall further.',
    },
    {
      h: 'Money Column: cheaper credit, thinner savings',
      b: 'With the policy rate down to {rate}, easy-access savings will pay less. Compare fixed terms.',
    },
  ],
  COLUMN_INFLATION: [
    {
      h: 'Money Column: is your cash shrinking?',
      b: 'Prices are rising {infl} a year in {theCountry}. A savings account below that loses buying power.',
    },
    {
      h: 'Money Column: beating inflation of {infl}',
      b: 'Readers ask where to keep cash. A spread of savings and long-term investments is the usual answer.',
    },
  ],
  COLUMN_HOUSING: [
    {
      h: 'Money Column: buying your first home',
      b: 'Prices in {theCountry} are up {hpi} in a year. Save a bigger deposit and the mortgage gets cheaper.',
    },
    {
      h: 'Money Column: rent or buy?',
      b: 'With homes {hpi} dearer than a year ago, readers wonder if they’ve missed the boat. Run the numbers before you rush.',
    },
  ],
  COLUMN_DOWNTURN: [
    {
      h: 'Money Column: building a rainy-day fund',
      b: 'Unemployment is {unemp} in {theCountry}. Three to six months of spending set aside is the usual advice.',
    },
    {
      h: 'Money Column: getting through a downturn',
      b: 'Pay down expensive card debt first and keep an emergency fund. Talk to your lender early if money gets tight.',
    },
  ],
  COLUMN_EVERGREEN: [
    {
      h: 'Money Column: the 50-30-20 budget',
      b: 'Half for needs, a third for wants, a fifth for savings. A simple rule that works for most readers.',
    },
    {
      h: 'Money Column: check your credit card rate',
      b: 'Card balances cost far more than the policy rate of {rate}. Clear them before you invest.',
    },
    {
      h: 'Money Column: start small, start now',
      b: 'A little saved every month adds up. Automate it on payday and you won’t miss it.',
    },
  ],
  // ─── Elections ──────────────────────────────────────────────────────────────
  ELECTION_CALLED: [
    {
      h: '{country} goes to the polls in {weeks} weeks',
      b: 'The {leader} lead on {leaderShare}, with the {second} on {secondShare}. The {governing} hope to hold on.',
    },
    {
      h: 'Election called in {theCountry}',
      b: 'Voting is {weeks} weeks away. Polls put the {leader} ahead on {leaderShare}.',
    },
  ],
  ELECTION_WON: [
    {
      h: '{party} win power in {theCountry}',
      b: 'Voters turned out the {old}. The new government takes office next week.',
    },
    {
      h: 'Change of government in {theCountry}',
      b: 'The {party} won with {share} of the vote, ending the {old}’s term.',
    },
  ],
  ELECTION_HELD: [
    {
      h: '{party} re-elected in {theCountry}',
      b: 'The governing party won {share} of the vote and another term.',
    },
    {
      h: 'Four more years for the {party}',
      b: 'Voters in {theCountry} returned the government with {share} of the vote.',
    },
  ],
  // ─── Your bank ──────────────────────────────────────────────────────────────
  BANK_WEEK_RECORD: [
    {
      h: 'Record week for {bank}',
      b: 'Net income of {net} on {revenue} of revenue is the best week in the bank’s history.',
    },
    {
      h: '{bank} posts its best week yet',
      b: 'The bank kept {net} from {revenue} of revenue, topping its previous record.',
    },
  ],
} as const;
