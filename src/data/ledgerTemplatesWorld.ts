// The Weekly Ledger's templates for central banks, the economy, housing,
// markets, rankings, sports and politics (CONTENT §23). Tokens in {braces} are
// filled by src/sim/news*.ts. Every central bank headline carries {rate}.
// Merged into LEDGER_TEMPLATES by ledgerTemplates.ts.

export const WORLD_TEMPLATES = {
  // ─── Central banks ──────────────────────────────────────────────────────────
  CB_HOLD: [
    {
      h: '{cb} holds its rate at {rate}',
      b: "At this week's meeting the {cb} kept its policy rate at {rate}. GDP growth was {gdp} last quarter; it expects {fc} this quarter.",
    },
    {
      h: '{cb} stands pat at {rate}',
      b: 'Policymakers in {theCountry} left rates alone, with inflation at {infl} and growth of {gdp} last quarter.',
    },
    {
      h: 'No change from the {cb}: rate stays {rate}',
      b: 'The {cb} sees growth of {fc} this quarter after {gdp} last quarter, and is in no hurry to move.',
    },
  ],
  CB_RAISE: [
    {
      h: '{cb} raises rate to {rate}',
      b: 'The {cb} moved its policy rate by {bp} basis points to {rate}, citing inflation of {infl} and growth of {gdp}.',
    },
    {
      h: '{cb} lifts borrowing costs to {rate}',
      b: 'A {bp} basis-point rise in {theCountry}. Loans get dearer; savers should see better rates.',
    },
    {
      h: 'Rates up: {cb} tightens to {rate}',
      b: 'With inflation at {infl}, the {cb} added {bp} basis points. It expects growth of {fc} this quarter.',
    },
  ],
  CB_CUT: [
    {
      h: '{cb} cuts rate to {rate}',
      b: 'The {cb} moved its policy rate by {bp} basis points to {rate}, citing inflation of {infl} and growth of {gdp}.',
    },
    {
      h: '{cb} eases policy to {rate}',
      b: 'A {bp} basis-point cut in {theCountry} as growth cools to {gdp}. Cheaper credit helps borrowers; savers earn less.',
    },
    {
      h: 'Relief for borrowers as {cb} trims to {rate}',
      b: 'Policymakers cut by {bp} basis points with inflation at {infl}. They see growth of {fc} this quarter.',
    },
  ],
  // ─── The economy ────────────────────────────────────────────────────────────
  ECONOMY_EXPANSION: [
    {
      h: '{country} growth holds firm',
      b: 'Output is growing at {gdp} a year, with inflation at {infl} and unemployment at {unemp}.',
    },
    {
      h: '{country} economy keeps its stride',
      b: 'Order books are full and unemployment is {unemp}. Growth runs at {gdp}.',
    },
    {
      h: 'Busy tills across {theCountry}',
      b: 'Shops and factories report a strong month. Inflation sits at {infl}.',
    },
  ],
  ECONOMY_SLOWDOWN: [
    {
      h: '{country} growth cools',
      b: 'Growth has slowed to {gdp}, inflation sits at {infl} and unemployment at {unemp}.',
    },
    {
      h: '{country} economy loses momentum',
      b: 'Firms are holding back on hiring; unemployment is {unemp} and growth only {gdp}.',
    },
    {
      h: 'Caution creeps into {theCountry}',
      b: 'Lenders are watching credit quality as growth eases to {gdp}.',
    },
  ],
  ECONOMY_RECESSION: [
    {
      h: 'Recession tightens its grip on {theCountry}',
      b: 'Growth stands at {gdp} and unemployment has climbed to {unemp}.',
    },
    {
      h: 'Downturn bites in {theCountry}',
      b: 'Firms are cutting back. Expect more missed payments while unemployment is {unemp}.',
    },
    {
      h: '{country} jobless rate reaches {unemp}',
      b: 'Growth of {gdp} and inflation of {infl} leave households stretched.',
    },
  ],
  ECONOMY_RECOVERY: [
    {
      h: 'Recovery takes root in {theCountry}',
      b: 'The economy is growing at {gdp} a year, with unemployment still {unemp}.',
    },
    {
      h: 'Green shoots in {theCountry}',
      b: 'Confidence returns as growth reaches {gdp}. Credit is easing back open.',
    },
    {
      h: '{country} climbs out of the slump',
      b: 'Hiring picks up; unemployment is {unemp} and inflation {infl}.',
    },
  ],
  // ─── Housing and markets ────────────────────────────────────────────────────
  HOUSING_UP: [
    { h: '{city} home prices rise {pct} over the year', b: 'Analysts point to {reason}.' },
    {
      h: 'House prices climb {pct} in {theCountry}',
      b: 'Estate agents in {city} credit {reason}.',
    },
    { h: 'Buyers pay {pct} more for homes in {city}', b: 'The annual rise reflects {reason}.' },
  ],
  HOUSING_DOWN: [
    { h: '{city} home prices fall {pct} over the year', b: 'Analysts point to {reason}.' },
    { h: 'House prices slip {pct} in {theCountry}', b: 'Estate agents in {city} blame {reason}.' },
    { h: 'Homes in {city} lose {pct} in a year', b: 'The annual fall reflects {reason}.' },
  ],
  MARKET_UP: [
    { h: 'Markets rally as {sector} stocks rise', b: 'The {index} gained {pct} this week.' },
    {
      h: 'The {index} climbs {pct}',
      b: 'Investors piled into {sector} shares in a busy week of trading.',
    },
    {
      h: 'Green screens: {sector} shares lift the {index}',
      b: 'The index ended the week up {pct}.',
    },
  ],
  MARKET_DOWN: [
    { h: 'Markets slide as {sector} stocks fall', b: 'The {index} lost {pct} this week.' },
    { h: 'The {index} drops {pct}', b: 'Sellers circled {sector} shares through the week.' },
    {
      h: 'Red screens: {sector} shares weigh on the {index}',
      b: 'The index ended the week down {pct}.',
    },
  ],
  FASTEST_GROWING: [
    {
      h: 'The fastest growing labs of {year}',
      b: "{bank} tops this year's list after growing assets {pct}. {second} and {third} follow.",
    },
    {
      h: '{bank} named fastest growing lab of {year}',
      b: 'Assets rose {pct} over the year, ahead of {second} and {third}.',
    },
  ],
  // ─── Sports ─────────────────────────────────────────────────────────────────
  SPORTS_RESULT: [
    {
      h: '{winner} beat {loser} {score}',
      b: 'A {margin} win in the {league}{extra}. {winner} are now {record} on the season.',
    },
    {
      h: '{winner} edge past {loser}',
      b: 'The {league} clash ended {score}{extra}. {loser} fall to {loserRecord}.',
    },
    { h: 'Victory for {winner} in the {league}', b: '{winner} saw off {loser} {score}{extra}.' },
  ],
  SPORTS_DRAW: [
    { h: '{home} and {away} share the points', b: 'The {league} meeting finished {score}.' },
    {
      h: 'Stalemate as {home} meet {away}',
      b: 'Neither side could find a winner in a {score} {league} draw.',
    },
  ],
  SPORTS_SEASON: [
    {
      h: '{club} finish {pos} in the {league}',
      b: '{club} closed the season with a record of {record}. {runnerUp} were runners-up.',
    },
    {
      h: '{club} crowned {league} champions',
      b: 'A {record} season puts them top, ahead of {runnerUp}.',
    },
  ],
  // ─── Politics ───────────────────────────────────────────────────────────────
  POLICY_PROPOSED: [
    {
      h: '{country} government proposes {policy}',
      b: 'The proposal from the {party} would {effect} if passed. A vote is due within weeks.',
    },
    {
      h: '{party} tables {policy}',
      b: 'Lawmakers in {theCountry} will vote soon on a plan to {effect}.',
    },
    {
      h: 'Plan for {policy} goes before {country} lawmakers',
      b: 'The {party} says it would {effect}.',
    },
  ],
  POLICY_PASSED: [
    {
      h: '{country} passes {policy}',
      b: 'Lawmakers voted the plan through. It will {effect}.{impact}',
    },
    {
      h: 'Vote carries: {policy} becomes law in {theCountry}',
      b: 'The measure will {effect}.{impact}',
    },
  ],
  POLICY_REJECTED: [
    {
      h: '{country} lawmakers reject {policy}',
      b: 'The plan to {effect} fell short of a majority.',
    },
    {
      h: '{policy} voted down in {theCountry}',
      b: 'The {party} vows to bring the idea back another day.',
    },
  ],
  POLL: [
    {
      h: 'Poll: {leader} ahead in {theCountry}',
      b: 'Support for the {leader} stands at {leaderShare}, with the {second} on {secondShare}.',
    },
    {
      h: '{country} survey puts {leader} in front',
      b: '{leaderShare} of voters back the {leader} and {secondShare} the {second}, with no election in sight.',
    },
    {
      h: 'Latest {country} poll: {leader} on {leaderShare}',
      b: 'The {second} sit next on {secondShare}.',
    },
  ],
};
