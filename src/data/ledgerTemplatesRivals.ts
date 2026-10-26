// The Weekly Ledger's templates for rival banks (CONTENT §23): branch moves,
// price wars, earnings, dividends, executive exits, failures and the weekly
// rate watch. Tokens in {braces} are filled by src/sim/newsRivals.ts. Merged
// into LEDGER_TEMPLATES by ledgerTemplates.ts.

export const RIVAL_TEMPLATES = {
  RIVAL_BRANCH_OPENED: [
    {
      h: 'New branch: {bank} opens in {district}, {city}',
      b: '{bank} opened a branch at {address} this week.',
    },
    {
      h: '{bank} expands in {city}',
      b: 'A new {bank} branch has opened its doors at {address} in {district}.',
    },
    {
      h: 'Competition heats up in {district}',
      b: '{bank} is the latest to open on the street, at {address}.',
    },
  ],
  RIVAL_CITY_ENTRY: [
    {
      h: '{bank} arrives in {city}',
      b: 'Its first branch in the city opened at {address} in {district}. {bank} now serves {cities} cities.',
    },
    {
      h: '{bank} enters the {city} market',
      b: 'The newcomer has taken a storefront at {address}, its {cities}th city.',
    },
    {
      h: 'New name on {city} high streets: {bank}',
      b: '{bank} opened its first {city} branch at {address} this week.',
    },
  ],
  CITY_GROWTH: [
    {
      h: '{city} grows: {lots} new storefronts',
      b: 'Developers finished {lots} street-level units across {city} this year. Banks are already eyeing the best corners.',
    },
    {
      h: 'New corners for {city} banks',
      b: 'With {lots} storefronts newly open to lease, {city} has room for more branches.',
    },
  ],
  RIVAL_BRANCH_CLOSED: [
    {
      h: '{bank} shuts {district} branch',
      b: 'The branch at {address} in {city} has closed after months of losses.',
    },
    {
      h: '{bank} retreats from {district}',
      b: 'Customers of the {address} branch are being moved elsewhere in {city}.',
    },
  ],
  PRICE_WAR: [
    {
      h: '{bank} lifts savings rate to {savingsRate} in {city}',
      b: "The {bump} basis-point rise is aimed squarely at the city's best-rated savings accounts.",
    },
    {
      h: 'Price war: {bank} fights for {city} savers',
      b: 'Savings now pay {savingsRate} at {bank}, up {bump} basis points this week.',
    },
  ],
  RIVAL_EARNINGS_UP: [
    {
      h: '{company} revenue rises {pct}',
      b: '{company} reported quarterly revenue of {revenue}, up {pct} from the previous quarter.',
    },
    {
      h: 'Strong quarter for {company}',
      b: 'Revenue grew {pct} to {revenue}; net income was {net} for {quarter}.',
    },
    {
      h: '{company} beats last quarter',
      b: 'Revenue of {revenue} was {pct} higher than the quarter before.',
    },
  ],
  RIVAL_EARNINGS_DOWN: [
    {
      h: '{company} revenue falls {pct}',
      b: '{company} reported quarterly revenue of {revenue}, down {pct} from the previous quarter.',
    },
    {
      h: 'Tough quarter for {company}',
      b: 'Revenue slipped {pct} to {revenue}; net income was {net} for {quarter}.',
    },
    {
      h: '{company} sales soften',
      b: 'Revenue of {revenue} was {pct} lower than the quarter before.',
    },
  ],
  RIVAL_DIVIDEND: [
    {
      h: '{company} pays quarterly dividend',
      b: '{company} declared a cash dividend of {dps} ({yield}) per share for {quarter}.',
    },
    {
      h: '{company} rewards shareholders',
      b: 'A dividend of {dps} a share for {quarter} gives a yield of {yield}.',
    },
  ],
  RIVAL_EXEC_RESIGN: [
    {
      h: '{company} {title} resigns',
      b: '{name} stepped down as {title} of {company}, effective immediately.',
    },
    {
      h: 'Shake-up at {company}',
      b: '{name} has left the {title} role. A search for a successor is under way.',
    },
  ],
  BANK_FAILURE: [
    { h: 'Regulators seize {bank}', b: "{bank}'s {n} branches will be offered to buyers." },
    {
      h: '{bank} collapses',
      b: 'Supervisors stepped in over the weekend. Its {n} branches are up for sale.',
    },
  ],
  RIVAL_NETWORK_SPLIT: [
    { h: "{bank}'s branches find new owners", b: 'The {n} branches go to {takers}.' },
    { h: 'Carve-up of {bank} complete', b: "{takers} take over the failed bank's {n} branches." },
  ],
  RATE_WATCH: [
    {
      h: 'Rate watch: {leader} leads {city} savings',
      b: 'The best easy-access rate in town is {leaderRate} at {leader}. {yours}',
    },
    {
      h: 'Where savers in {city} get the most',
      b: '{leader} pays {leaderRate} on savings. {yours}',
    },
    {
      h: '{city} savings rates under the lens',
      b: 'Top of the table: {leader} at {leaderRate}. {yours}',
    },
  ],
};
