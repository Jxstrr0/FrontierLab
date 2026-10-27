// The Weekly Ledger's templates for rival banks (CONTENT §23): branch moves,
// price wars, earnings, dividends, executive exits, failures and the weekly
// rate watch. Tokens in {braces} are filled by src/sim/newsRivals.ts. Merged
// into LEDGER_TEMPLATES by ledgerTemplates.ts.

export const RIVAL_TEMPLATES = {
  RIVAL_BRANCH_OPENED: [
    {
      h: 'New office: {bank} opens in {district}, {city}',
      b: '{bank} opened a sales office at {address} this week.',
    },
    {
      h: '{bank} expands in {city}',
      b: 'A new {bank} sales office has opened its doors at {address} in {district}.',
    },
    {
      h: 'Competition heats up in {district}',
      b: '{bank} is the latest to open on the street, at {address}.',
    },
  ],
  RIVAL_OFFICE_GROWN: [
    {
      h: '{bank} grows in {city}',
      b: '{bank} has expanded its {city} sales office to a {size} one and is hiring.',
    },
    {
      h: 'Bigger {city} office for {bank}',
      b: '{bank} is taking more floor space in {city}: its sales office there is now {size}.',
    },
  ],
  RIVAL_OFFICE_SHRUNK: [
    {
      h: '{bank} cuts back in {city}',
      b: 'After a weak run, {bank} has scaled its {city} sales office down to a {size} one.',
    },
    {
      h: 'Smaller {city} office for {bank}',
      b: '{bank} is giving up floor space in {city} after months of losses. Its office there is now {size}.',
    },
  ],
  RIVAL_CITY_ENTRY: [
    {
      h: '{bank} arrives in {city}',
      b: 'Its first sales office in the city opened at {address} in {district}. {bank} now serves {cities} cities.',
    },
    {
      h: '{bank} enters the {city} market',
      b: 'The newcomer has taken a storefront at {address}, its {cities}th city.',
    },
    {
      h: 'New name on {city} high streets: {bank}',
      b: '{bank} opened its first {city} sales office at {address} this week.',
    },
  ],
  RIVAL_CHARTERED: [
    {
      h: 'New lab on the block: {bank} opens in {city}',
      b: 'Regulators granted {bank} a charter this year. The new {kind} opened a sales office in {city} and says more will follow.',
    },
    {
      h: '{bank} wins a banking charter',
      b: 'A new {kind}, {bank}, has opened its doors in {city}.',
    },
  ],
  RIVAL_MERGER: [
    {
      h: '{buyer} buys {bank} for {price}',
      b: '{buyer} has agreed to buy {bank} and its {n} sales offices. The combined lab serves {cities} cities.',
    },
    {
      h: 'Bank merger: {bank} sold to {buyer}',
      b: "Shareholders accepted {buyer}'s {price} offer. {bank}'s {n} sales offices will carry the {buyer} name.",
    },
  ],
  RIVAL_CAMPAIGN: [
    {
      h: '{bank} blankets {city} with ads',
      b: 'Billboards and bus shelters across {city} carry {bank} colours this week, in a campaign set to run {weeks} weeks.',
    },
    {
      h: 'Ad push from {bank} in {city}',
      b: '{bank} has launched a {weeks}-week marketing drive in {city}, aimed at winning customers from other labs.',
    },
  ],
  RIVAL_APP_LAUNCH: [
    {
      h: '{bank} rebuilds its app',
      b: 'After a year of investment, reviewers now rate the {bank} app {app} stars.',
    },
    {
      h: 'New app from {bank} wins fans',
      b: '{bank} rolled out a new mobile app this year. Its store rating stands at {app} stars.',
    },
  ],
  RIVAL_GROWS_UP: [
    {
      h: '{bank} is not a start-up any more',
      b: 'With offices in {n} cities, the former app-only lab now runs like an established one, and it plans to keep growing.',
    },
    {
      h: '{bank} grows up',
      b: 'Once a phone-only challenger, {bank} now has offices in {n} cities and prices like the big labs.',
    },
  ],
  CITY_GROWTH: [
    {
      h: '{city} grows: {lots} new storefronts',
      b: 'Developers finished {lots} street-level units across {city} this year. Banks are already eyeing the best corners.',
    },
    {
      h: 'New corners for {city} banks',
      b: 'With {lots} storefronts newly open to lease, {city} has room for more sales offices.',
    },
  ],
  RIVAL_BRANCH_CLOSED: [
    {
      h: '{bank} shuts its {city} office',
      b: 'The sales office at {address} in {district} has closed after months of losses.',
    },
    {
      h: '{bank} retreats from {city}',
      b: 'Customers of its {address} office are being moved to other cities.',
    },
  ],
  PRICE_WAR: [
    {
      h: '{bank} cuts Plus to {plusPrice} in {city}',
      b: "The {bump} price cut is aimed squarely at the city's best-rated plans.",
    },
    {
      h: 'Price war: {bank} fights for {city} subscribers',
      b: 'Plus now costs {plusPrice} a month at {bank}, {bump} cheaper this week.',
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
    { h: 'Regulators seize {bank}', b: "{bank}'s {n} sales offices will be offered to buyers." },
    {
      h: '{bank} collapses',
      b: 'Supervisors stepped in over the weekend. Its {n} sales offices are up for sale.',
    },
  ],
  RIVAL_NETWORK_SPLIT: [
    { h: "{bank}'s sales offices find new owners", b: 'The {n} sales offices go to {takers}.' },
    {
      h: 'Carve-up of {bank} complete',
      b: "{takers} take over the failed bank's {n} sales offices.",
    },
  ],
  RATE_WATCH: [
    {
      h: 'Price watch: {leader} leads {city} on price',
      b: 'The cheapest Plus plan in town is {leaderRate} a month at {leader}. {yours}',
    },
    {
      h: 'Where {city} subscribers pay least',
      b: '{leader} charges {leaderRate} a month for Plus. {yours}',
    },
    {
      h: '{city} plan prices under the lens',
      b: 'Cheapest on the table: {leader} at {leaderRate}. {yours}',
    },
  ],
};
