// The Weekly Ledger's world calendar, commodities and archive templates
// (CONTENT §23.5–23.7). Tokens are filled by src/sim/newsTournaments.ts,
// newsWorldCalendar.ts, newsCommodities.ts and newsArchive.ts. Every name and
// event is invented. Merged into LEDGER_TEMPLATES by ledgerTemplates.ts.

export const CALENDAR_TEMPLATES = {
  // ─── Commodities ────────────────────────────────────────────────────────────
  COMMODITY_SPIKE: [
    { h: '{name} jumps {pct} {reason}', b: 'It ended the week at {price}.' },
    { h: '{name} surges to {price}', b: 'Prices rose {pct} this week {reason}.' },
  ],
  COMMODITY_SLUMP: [
    { h: '{name} slides {pct} {reason}', b: 'It ended the week at {price}.' },
    { h: '{name} falls to {price}', b: 'Prices dropped {pct} this week {reason}.' },
  ],
  COMMODITY_HIGH: [
    {
      h: '{name} hits a one-year high',
      b: 'At {price}, {lower} is {year} on a year ago.',
    },
    { h: '{name} at its highest in a year', b: 'Traders pushed it to {price} this week.' },
  ],
  COMMODITY_LOW: [
    {
      h: '{name} sinks to a one-year low',
      b: 'At {price}, {lower} is {year} on a year ago.',
    },
    { h: '{name} at its cheapest in a year', b: 'It changed hands at {price} this week.' },
  ],
  COMMODITY_WRAP: [
    { h: 'Commodities: the month in prices', b: 'Over the last four weeks: {list}.' },
    { h: 'What the world paid this month', b: 'Commodity prices over four weeks: {list}.' },
  ],
  // ─── From the archive ───────────────────────────────────────────────────────
  ARCHIVE: [
    { h: 'From the archive, {ago}: {headline}', b: '{body} (The Weekly Ledger, {date}.)' },
    { h: '{Ago} in the Ledger: {headline}', b: '“{body}” we wrote on {date}.' },
  ],
  // ─── Nations Cup ────────────────────────────────────────────────────────────
  CUP_ANNOUNCED: [
    {
      h: '{city} gets ready for the {year} {cup}',
      b: 'Ten nations kick off in {weeks} weeks. Bookmakers favour {fav}, with {fav2} close behind.',
    },
    {
      h: '{weeks} weeks to the {cup}',
      b: 'Stadiums in {city} are getting a fresh coat of paint. {fav} start as favourites.',
    },
  ],
  CUP_OPENING: [
    {
      h: 'Hosts {host} {result} {rival} in the {cup} opener',
      b: 'The final score in {city} was {score}. The party carried on long into the night.',
    },
    {
      h: '{cup} under way: {host} {result} {rival}',
      b: 'A full house in {city} saw the hosts’ opener end {score}.',
    },
  ],
  CUP_GROUPS: [
    {
      h: '{a1} and {b1} top their {cup} groups',
      b: '{a2} and {b2} also reach the semi-finals. {out} go home without a win to show for it.',
    },
    {
      h: '{cup}: the last four are set',
      b: '{a1}, {a2}, {b1} and {b2} march on. {out} finished bottom of their group.',
    },
  ],
  CUP_SEMIS: [
    {
      h: '{f1} and {f2} reach the {cup} final',
      b: '{f1} beat {l1} {s1}; {f2} saw off {l2} {s2}.',
    },
    {
      h: 'Final set: {f1} v {f2}',
      b: 'In the semi-finals in {city}, {f1} beat {l1} {s1} and {f2} beat {l2} {s2}.',
    },
  ],
  CUP_FINAL: [
    {
      h: '{winner} win the {year} {cup}',
      b: '{winner} beat {loser} {score} in the final in {city}. {star} was named player of the tournament.',
    },
    {
      h: 'Champions! {winner} lift the {cup}',
      b: 'They beat {loser} {score} in {city}. {star} scored the goal of the tournament.',
    },
  ],
  // ─── World Games ────────────────────────────────────────────────────────────
  GAMES_ANNOUNCED: [
    {
      h: '{city} counts down to the {year} {games}',
      b: 'The flame arrives in {weeks} weeks. Hotels are almost full.',
    },
    {
      h: '{weeks} weeks to the {games}',
      b: 'Athletes from ten nations are heading for {city}.',
    },
  ],
  GAMES_OPEN: [
    {
      h: 'The {games} open in {city}',
      b: '{n} athletes marched in the opening ceremony. {flag} carried the {host} flag.',
    },
    {
      h: 'Let the {games} begin',
      b: 'Fireworks lit up {city} as {n} athletes paraded into the stadium.',
    },
  ],
  GAMES_MIDWAY: [
    {
      h: '{star} wins {golds} golds in {sport}',
      b: 'The star of {nation}’s team is the talk of the {games}. {leader} lead the medal table at halfway.',
    },
    {
      h: '{games}: {leader} lead at halfway',
      b: '{star} of {nation} has {golds} golds in {sport} already.',
    },
  ],
  GAMES_CLOSE: [
    {
      h: '{c1} top the {games} medal table',
      b: '{c1} won {g1} golds, ahead of {c2} ({g2}) and {c3} ({g3}). Hosts {host} took {hostGolds}.',
    },
    {
      h: 'The {games} close in {city}',
      b: 'Final tally: {c1} {g1} golds, {c2} {g2}, {c3} {g3}. The flame moves on in four years.',
    },
  ],
  // ─── World Expo ─────────────────────────────────────────────────────────────
  EXPO_OPENS: [
    {
      h: 'The {year} {expo} opens in {city}',
      b: '{n} pavilions show off the future of transport, food and energy. It runs for six months.',
    },
    {
      h: '{city} throws open the {expo}',
      b: 'Visitors can tour {n} national pavilions until the autumn.',
    },
  ],
  EXPO_CLOSES: [
    {
      h: 'The {expo} closes in {city}',
      b: '{n} million visitors came through the gates in six months.',
    },
    {
      h: 'Curtain falls on the {year} {expo}',
      b: 'Organisers in {country} counted {n} million visits.',
    },
  ],
  // ─── Every year ─────────────────────────────────────────────────────────────
  FILM_AWARDS: [
    {
      h: '“{film}” wins best picture at the {awards}',
      b: '{director} of {nation} also took best director at the ceremony in {city}.',
    },
    {
      h: 'Big night for “{film}”',
      b: '{director}’s film swept the {awards} in {city}.',
    },
  ],
  SCIENCE_PRIZE: [
    {
      h: '{prize} in {field} goes to {name}',
      b: 'The {city} researcher is honoured for {work}.',
    },
    {
      h: '{name} of {city} wins the {prize}',
      b: 'This year’s {field} award recognises {work}.',
    },
  ],
  NEW_YEAR: [
    {
      h: '{city} rings in {year} in style',
      b: 'A record fireworks display lit up the skyline at midnight.',
    },
    {
      h: 'Happy {year}!',
      b: 'Crowds in {city} counted down under the biggest fireworks show in the city’s history.',
    },
  ],
  SALE_BOOM: [
    {
      h: 'Record {sale} in {country}',
      b: 'About {n} million shoppers spent {money}. Stores in {city} ran out of televisions.',
    },
    {
      h: 'Tills ring out over the {sale}',
      b: 'Shoppers spent {money}, a record. Retailers say confidence is high.',
    },
  ],
  SALE_QUIET: [
    {
      h: 'Quiet {sale} as shoppers hold back',
      b: 'Spending of {money} fell short of last year. Stores in {city} cut prices again on Sunday.',
    },
    {
      h: 'Bargain hunters stay home',
      b: 'Only about {n} million shoppers turned out for the {sale}, spending {money}.',
    },
  ],
} as const;
