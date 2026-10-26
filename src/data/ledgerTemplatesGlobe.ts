// The Weekly Ledger's World desk templates (CONTENT §23.1): weather, science,
// work and everyday life around the ten countries, none of it about your bank.
// Tokens in {braces} are filled by src/sim/newsWorldDesk.ts: {city},
// {country}, {theCountry}, {other} (a second country), {n}, {money}, {name},
// {job}, {gdp}, {infl}, {unemp}. Every name and event is invented. Merged into
// LEDGER_TEMPLATES by ledgerTemplates.ts.

export const GLOBE_TEMPLATES = {
  // ─── Weather and nature ─────────────────────────────────────────────────────
  WORLD_SNOWSTORM: [
    {
      h: '{city} digs out after {n} cm of snow',
      b: 'Schools shut and flights were grounded as a storm swept across {theCountry}. Ploughs worked through the night.',
    },
    {
      h: 'Blizzard brings {city} to a standstill',
      b: 'Up to {n} cm fell in a day. Shops reported a run on shovels, salt and soup.',
    },
  ],
  WORLD_HEATWAVE: [
    {
      h: '{city} swelters at {n}°C',
      b: 'Officials in {theCountry} opened cooling centres and asked residents to check on elderly neighbours.',
    },
    {
      h: 'Heatwave grips {theCountry}',
      b: 'Temperatures reached {n}°C in {city}. Ice-cream sellers and air-conditioner fitters report record weeks.',
    },
  ],
  WORLD_TYPHOON: [
    {
      h: 'Typhoon lashes {city}',
      b: 'Ferries were cancelled and shutters went up across {theCountry} as winds topped {n} km/h. Clean-up crews are out.',
    },
    {
      h: '{city} braces for a typhoon',
      b: 'Forecasters expect gusts of {n} km/h. Markets may close early if the warning is raised.',
    },
  ],
  WORLD_MONSOON: [
    {
      h: 'Monsoon rains soak {city}',
      b: '{n} mm fell in three days. Drivers are asked to avoid low-lying roads.',
    },
    {
      h: 'Wettest week of the year for {city}',
      b: 'The monsoon brought {n} mm of rain. Umbrella sales are up and outdoor dining is down.',
    },
  ],
  WORLD_BUSHFIRE: [
    {
      h: 'Bushfire threatens towns near {city}',
      b: 'Crews are fighting a blaze across {n} hectares. Residents have been told to prepare to leave.',
    },
    {
      h: 'Firefighters hold the line outside {city}',
      b: 'A {n}-hectare fire is contained after a week of hot, dry winds. Volunteers were thanked by name in parliament.',
    },
  ],
  WORLD_FLOOD: [
    {
      h: 'River bursts its banks in {city}',
      b: 'Sandbags lined the streets as water rose {n} cm above the flood mark. Insurers are bracing for claims.',
    },
    {
      h: 'Floodwater recedes in {city}',
      b: 'Homeowners are counting the cost after the river peaked {n} cm over its banks.',
    },
  ],
  WORLD_HARVEST: [
    {
      h: 'Bumper harvest across {theCountry}',
      b: 'Farmers report yields {n}% above last year. Food prices could ease into winter.',
    },
    {
      h: 'Farmers cheer a record harvest',
      b: 'Grain stores are full across {theCountry}, with yields up {n}% on last year.',
    },
  ],
  WORLD_DROUGHT: [
    {
      h: 'Hosepipe ban for {city}',
      b: 'Reservoirs are {n}% full after a dry summer. Farmers in {theCountry} are watching the skies.',
    },
    {
      h: 'Drought tightens its grip on {theCountry}',
      b: 'With rainfall {n}% below normal, growers near {city} are selling livestock early.',
    },
  ],
  WORLD_AURORA: [
    {
      h: 'Northern lights dazzle {city}',
      b: 'A burst of solar activity painted the sky green over {theCountry}. Hotels report a rush of late bookings.',
    },
    {
      h: 'Aurora hunters flock to {city}',
      b: 'Clear skies and a strong solar wind drew {n} thousand visitors to watch the lights.',
    },
  ],
  WORLD_BLOSSOM: [
    {
      h: 'Blossom season opens in {city}',
      b: 'Parks are packed as the trees came into flower {n} days earlier than usual.',
    },
    {
      h: 'Picnic crowds greet the blossom in {city}',
      b: 'Forecasters say the flowers will last about {n} days. Riverside cafés are fully booked.',
    },
  ],
  // ─── Science and building ───────────────────────────────────────────────────
  WORLD_TRANSIT: [
    {
      h: 'New rail line opens in {city}',
      b: 'The {n} km line links the suburbs to downtown. Commuters say it cuts their trip by half.',
    },
    {
      h: '{city} cuts the ribbon on its new metro',
      b: 'After six years of digging, {n} km of track is open. Fares are free for the first weekend.',
    },
  ],
  WORLD_BRIDGE: [
    {
      h: '{city} bridge reopens after repairs',
      b: 'The {n}-year-old crossing is back in service. Traffic on the detour route is already easing.',
    },
    {
      h: 'Engineers finish a new bridge in {city}',
      b: 'The span carries {n} thousand vehicles a day and took three years to build.',
    },
  ],
  WORLD_SATELLITE: [
    {
      h: '{country} launches a weather satellite',
      b: 'The craft reached orbit on its first try. Forecasters say it will sharpen storm warnings.',
    },
    {
      h: 'Lift-off for {theCountry}’s newest satellite',
      b: 'The {n}-tonne craft will map farmland and coastlines from orbit for a decade.',
    },
  ],
  WORLD_MEDICAL: [
    {
      h: 'Researchers in {city} report a trial success',
      b: 'A new treatment helped {n}% of patients in early testing. Larger trials begin next year.',
    },
    {
      h: '{city} hospital pioneers a faster scan',
      b: 'Doctors say the method cuts waiting times by {n}%. Other hospitals in {theCountry} plan to follow.',
    },
  ],
  WORLD_POWER: [
    {
      h: 'Wind and sun power {theCountry} for a day',
      b: 'Renewables met {n}% of demand on Sunday, a national record.',
    },
    {
      h: 'Record clean-power week for {theCountry}',
      b: 'Wind and solar farms supplied {n}% of the grid’s power, grid operators said.',
    },
  ],
  WORLD_DATACENTRE: [
    {
      h: '{city} lands a {money} data centre',
      b: 'Construction starts this spring and will employ {n} people once the halls are full.',
    },
    {
      h: 'Server farm coming to {city}',
      b: 'The {money} project is one of the largest investments in {theCountry} this year.',
    },
  ],
  WORLD_AIRPORT: [
    {
      h: 'New terminal opens at {city} airport',
      b: 'It can handle {n} million passengers a year. Airlines are adding routes to match.',
    },
    {
      h: '{city} airport sets a passenger record',
      b: '{n} million travellers passed through last year, the most since it opened.',
    },
  ],
  // ─── Work and prices ────────────────────────────────────────────────────────
  WORLD_STRIKE: [
    {
      h: 'Dock workers strike in {city}',
      b: 'Ships are queueing offshore on day {n} of the walkout. Unions want pay to keep up with inflation of {infl}.',
    },
    {
      h: 'Rail strike snarls {city}',
      b: 'Train drivers in {theCountry} walked out for {n} days over pay. Roads into the city are jammed.',
    },
    {
      h: 'Teachers walk out across {theCountry}',
      b: 'Schools in {city} are shut for {n} days as talks over pay stall.',
    },
  ],
  WORLD_LAYOFFS: [
    {
      h: 'Factory near {city} cuts {n} jobs',
      b: 'Managers blamed falling orders. Unemployment in {theCountry} now stands at {unemp}.',
    },
    {
      h: 'Job losses mount in {theCountry}',
      b: 'A plant outside {city} let {n} workers go this week, with unemployment at {unemp}.',
    },
  ],
  WORLD_HIRING: [
    {
      h: 'Help wanted: {city} employers struggle to hire',
      b: 'With unemployment at just {unemp}, cafés and builders in {theCountry} are offering signing bonuses.',
    },
    {
      h: 'Jobs boom in {theCountry}',
      b: 'Unemployment is down to {unemp}. Firms in {city} say finding staff is their biggest worry.',
    },
  ],
  WORLD_PRICES: [
    {
      h: 'Shoppers in {theCountry} feel the pinch',
      b: 'Prices are rising {infl} a year. A weekly shop in {city} costs noticeably more than last spring.',
    },
    {
      h: 'Grocery bills climb in {city}',
      b: 'With inflation at {infl}, families in {theCountry} are trading down to store brands.',
    },
  ],
  WORLD_FACTORY: [
    {
      h: 'New factory brings {n} jobs to {city}',
      b: 'Builders broke ground this week. Hiring starts next year.',
    },
    {
      h: '{city} wins a {n}-job plant',
      b: 'Local leaders in {theCountry} beat four other towns to the investment.',
    },
  ],
  WORLD_TRADE_DEAL: [
    {
      h: '{country} and {other} sign a trade pact',
      b: 'Tariffs on {n} categories of goods will fall to zero over five years.',
    },
    {
      h: 'Trade deal between {country} and {other}',
      b: 'Negotiators met in {city} to sign the agreement. Exporters on both sides welcomed it.',
    },
  ],
  WORLD_SUMMIT: [
    {
      h: 'Finance ministers meet in {city}',
      b: 'Talks focused on growth, now {gdp} in {theCountry}. A joint statement is expected on Friday.',
    },
    {
      h: '{city} hosts a world economic summit',
      b: 'Delegates from {n} countries discussed trade and tax. Hotels in the city are full.',
    },
  ],
  WORLD_TOURISM: [
    {
      h: 'Tourists flock to {theCountry}',
      b: '{n} million visitors came last year, a record. {city} drew the biggest crowds.',
    },
    {
      h: 'Record summer for {city} hotels',
      b: 'Occupancy hit {n}%. Strong growth of {gdp} has more people travelling.',
    },
  ],
  WORLD_GLOOM: [
    {
      h: 'Consumer confidence slumps in {theCountry}',
      b: 'Shoppers are the gloomiest in {n} years. Unemployment has risen to {unemp}.',
    },
    {
      h: 'Shoppers stay home in {city}',
      b: 'Footfall is down {n}% on last year as households in {theCountry} save what they can.',
    },
  ],
  WORLD_RENTS: [
    {
      h: 'Renters squeezed in {city}',
      b: 'Asking rents are up {n}% in a year. Tenants’ groups in {theCountry} want more homes built.',
    },
    {
      h: '{city} rents hit a new high',
      b: 'The average flat now lets for {n}% more than a year ago.',
    },
  ],
  WORLD_BUILDING_SLOWS: [
    {
      h: 'Cranes fall still in {city}',
      b: 'Builders in {theCountry} started {n}% fewer homes this quarter as prices soften.',
    },
    {
      h: 'House-building slows in {theCountry}',
      b: 'Starts are down {n}% on last year. Developers near {city} are waiting for buyers to return.',
    },
  ],
  // ─── Everyday life ──────────────────────────────────────────────────────────
  WORLD_FESTIVAL: [
    {
      h: '{city} film festival draws record crowds',
      b: '{n} thousand people saw screenings over ten days. The top prize went to a first-time director.',
    },
    {
      h: 'Music festival takes over {city}',
      b: 'About {n} thousand fans filled the parks for three days of concerts.',
    },
  ],
  WORLD_MARATHON: [
    {
      h: '{name} wins the {city} marathon',
      b: 'The winning time was 2 hours {n} minutes. More than twenty thousand runners finished.',
    },
    {
      h: 'Course record falls in {city}',
      b: '{name} crossed the line in 2 hours {n} minutes to win the city’s marathon.',
    },
  ],
  WORLD_MUSEUM: [
    {
      h: 'New museum opens in {city}',
      b: '{n} thousand visitors came through the doors in the first week.',
    },
    {
      h: 'Builders in {city} unearth a Roman-era coin hoard',
      b: 'Archaeologists counted {n} coins. They will go on show at the city museum.',
    },
  ],
  WORLD_LOTTERY: [
    {
      h: '{city} {job} scoops {money} jackpot',
      b: 'The winner plans to “carry on as normal, but with a better car.”',
    },
    {
      h: 'Lucky ticket: {money} prize goes to {city}',
      b: 'A local {job} bought it on the way home from work.',
    },
  ],
  WORLD_ZOO: [
    {
      h: 'Twin panda cubs born at {city} zoo',
      b: 'Keepers say mother and cubs are doing well. Visitors can see them from spring.',
    },
    {
      h: '{city} zoo welcomes a baby giraffe',
      b: 'The calf stood {n} minutes after birth and is already 1.8 metres tall.',
    },
  ],
  WORLD_GOOD_NEWS: [
    {
      h: 'Lost wallet returned to {city} man after {n} years',
      b: 'Builders found it behind a wall. The cash inside is no longer legal tender.',
    },
    {
      h: '{city} library book returned {n} years late',
      b: 'The librarians waived the fine. The borrower called the book “a page-turner.”',
    },
  ],
  WORLD_CHESS: [
    {
      h: '{name}, {n}, becomes a chess grandmaster',
      b: 'The teenager from {city} is the youngest player in {theCountry} to earn the title.',
    },
    {
      h: '{city} hosts the national chess final',
      b: '{name} took the title after a {n}-move final game.',
    },
  ],
} as const;
