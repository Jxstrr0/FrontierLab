// More World desk templates (CONTENT §23.1, added 2026-10-26): crime and
// courts, science, travel and food, culture and odd news. Tokens as in
// ledgerTemplatesGlobe.ts, plus {title} from the beat's pool
// (newsWorldBeatsMore.ts). Every name and event is invented. Merged into
// LEDGER_TEMPLATES by ledgerTemplates.ts.

export const GLOBE_MORE_TEMPLATES = {
  // ─── Crime and courts ───────────────────────────────────────────────────────
  WORLD_HEIST: [
    {
      h: 'Thieves strip a {city} jeweller of {money}',
      b: 'The gang tunnelled in from a vacant shop next door over a long weekend. Police in {theCountry} have appealed for witnesses.',
    },
    {
      h: 'Daring museum heist in {city}',
      b: 'Paintings worth about {money} vanished overnight. The alarm, staff say, was “switched off for cleaning.”',
    },
  ],
  WORLD_FORGERY: [
    {
      h: 'Art forger goes on trial in {city}',
      b: 'Prosecutors say {name} sold {n} fake paintings to galleries across {theCountry}.',
    },
    {
      h: '“Masterpieces” unmasked as fakes',
      b: 'Experts in {city} found {n} works in a private collection were painted in the last decade.',
    },
  ],
  WORLD_SCAM_ALERT: [
    {
      h: 'Police warn of a text-message scam in {theCountry}',
      b: 'About {n} people have reported fake parcel-delivery texts this month. Never share a code sent to your phone.',
    },
    {
      h: 'Phone scammers target {city} pensioners',
      b: 'Callers pose as officials and ask for savings to be moved “to safety.” {n} cases have been reported.',
    },
  ],
  WORLD_COURT: [
    {
      h: 'Landmark ruling in {theCountry}’s top court',
      b: 'Judges voted {n} to 2 that delivery riders are employees, not contractors. Firms have a year to comply.',
    },
    {
      h: 'Court in {city} backs the right to repair',
      b: 'Makers must sell spare parts for {n} years after a product launches, the judges ruled.',
    },
  ],
  WORLD_SMUGGLING: [
    {
      h: 'Customs seize {money} of fake watches in {city}',
      b: 'The haul was hidden in a shipping container of garden furniture.',
    },
    {
      h: 'Smuggling ring broken up at {city} port',
      b: 'Officers in {theCountry} recovered goods worth {money}. Six people have been charged.',
    },
  ],
  // ─── Science ────────────────────────────────────────────────────────────────
  WORLD_SPECIES: [
    {
      h: 'New species found near {city}',
      b: 'Scientists have named {title}, found in a patch of forest just outside the city.',
    },
    {
      h: 'Biologists discover {title}',
      b: 'The find in {theCountry} is the first new species recorded in the region for decades.',
    },
  ],
  WORLD_COMET: [
    {
      h: 'Comet visible from {city} this week',
      b: 'Look low in the west after sunset. It won’t return for {n} thousand years.',
    },
    {
      h: 'Stargazers in {theCountry} catch a bright comet',
      b: 'Observatories in {city} report record visitor numbers. The comet fades in about {n} weeks.',
    },
  ],
  WORLD_AI: [
    {
      h: 'Lab in {city} unveils a talking-robot nurse',
      b: 'In trials it answered {n}% of patient questions without help. Unions want a say before it’s used on wards.',
    },
    {
      h: 'AI spots crop disease from orbit',
      b: 'Researchers in {theCountry} say their system is right {n}% of the time, weeks before farmers notice.',
    },
  ],
  WORLD_FOSSIL: [
    {
      h: 'Dinosaur skeleton found near {city}',
      b: 'The {n}-million-year-old fossil is almost complete. A farmer spotted a bone while fixing a fence.',
    },
    {
      h: 'Fossil hunters strike lucky in {theCountry}',
      b: 'A {n}-million-year-old sea reptile has been dug from a cliff near {city}.',
    },
  ],
  WORLD_OCEAN: [
    {
      h: 'Submarine reaches record depth',
      b: 'A crew from {theCountry} dived {n} km and filmed creatures never seen before.',
    },
    {
      h: 'Coral reef recovering, divers say',
      b: 'Surveys off {theCountry} found {n} times more young coral than five years ago.',
    },
  ],
  WORLD_TELESCOPE: [
    {
      h: '{theCountry} switches on a giant telescope',
      b: 'Its {n}-metre mirror will search for planets around nearby stars.',
    },
    {
      h: 'Astronomers in {city} spot a distant planet',
      b: 'It orbits a star {n} light-years away and may have water.',
    },
  ],
  // ─── Travel and food ────────────────────────────────────────────────────────
  WORLD_RESTAURANT: [
    {
      h: 'Queues round the block in {city}',
      b: 'A new restaurant serving {title} is booked {n} weeks ahead. The chef trained in her grandmother’s kitchen.',
    },
    {
      h: '{city} chef wins top honours',
      b: '{name}’s {title} earned the country’s highest culinary award. Tables are booked {n} weeks out.',
    },
  ],
  WORLD_FOOD_FEST: [
    {
      h: 'Food festival takes over {city}',
      b: '{n} thousand visitors came for street stalls from every corner of {theCountry}.',
    },
    {
      h: '{city} eats its way through the weekend',
      b: 'The annual food fair drew {n} thousand people. The pie-eating contest ended in a tie.',
    },
  ],
  WORLD_LIVEABLE: [
    {
      h: '{city} named one of the world’s most liveable cities',
      b: 'It ranked number {n} on parks, transport and schools in an annual survey.',
    },
    {
      h: 'Good news for {city}: it’s a top place to live',
      b: 'A survey of 140 cities put it at number {n}. Locals complained about the rents.',
    },
  ],
  WORLD_TOWER: [
    {
      h: '{city} tops out its tallest tower',
      b: 'The {n}-storey building will hold offices, flats and a viewing deck.',
    },
    {
      h: 'New skyscraper changes the {city} skyline',
      b: 'Builders have finished the frame of a {n}-storey tower. It opens next year.',
    },
  ],
  WORLD_ROUTE: [
    {
      h: 'Non-stop flights from {city} to {other}',
      b: 'The new route takes about {n} hours. Seats sold out in a day.',
    },
    {
      h: '{city} gets a direct link to {other}',
      b: 'Airlines say demand for the {n}-hour flight is strong.',
    },
  ],
  // ─── Culture ────────────────────────────────────────────────────────────────
  WORLD_BESTSELLER: [
    {
      h: '“{title}” tops the bestseller list',
      b: 'The debut novel by {name}, a former teacher from {city}, is number {n} in four countries.',
    },
    {
      h: 'Readers can’t put down “{title}”',
      b: 'Bookshops in {theCountry} report queues for {name}’s novel, set in {city}.',
    },
  ],
  WORLD_GAME_LAUNCH: [
    {
      h: '“{title}” breaks launch records',
      b: 'The video game from a {city} studio sold {n} million copies in its first week.',
    },
    {
      h: 'Gamers queue overnight for “{title}”',
      b: 'Made by a small team in {theCountry}, it sold {n} million copies in days.',
    },
  ],
  WORLD_THEATRE: [
    {
      h: '“{title}” is the hit of the season in {city}',
      b: 'The musical marked its {n}th performance this week. Tickets are scarce until spring.',
    },
    {
      h: 'Standing ovation for “{title}”',
      b: 'Critics in {city} call it the best new show in a decade. It has run {n} times.',
    },
  ],
  WORLD_STREET_ART: [
    {
      h: 'Mystery mural appears overnight in {city}',
      b: 'The {n}-metre painting of a fox reading a newspaper is drawing crowds. Nobody has claimed it.',
    },
    {
      h: '{city} street artist unmasked',
      b: '{name} admits painting {n} murals around the city and says “there are more coming.”',
    },
  ],
  WORLD_ORCHESTRA: [
    {
      h: '{city} orchestra celebrates {n} years',
      b: 'A free concert in the park drew families from across {theCountry}.',
    },
    {
      h: 'Youth orchestra from {city} wins top prize',
      b: 'The {n} young players beat ensembles from around the world.',
    },
  ],
  // ─── Odd news ───────────────────────────────────────────────────────────────
  WORLD_BIG_VEG: [
    {
      h: '{city} grower’s {title} sets a record',
      b: 'It weighs {n} kg. {name} says the secret is “talking to it every morning.”',
    },
    {
      h: 'Giant {title} wins the county show',
      b: 'The {n} kg monster from near {city} needed a forklift to reach the judges.',
    },
  ],
  WORLD_ESCAPEE: [
    {
      h: 'Escape in {city}: {title} on the loose',
      b: 'It was spotted {n} times around the city before keepers coaxed it home with snacks.',
    },
    {
      h: 'On the run in {city}: {title}',
      b: 'Residents have filmed it in {n} different gardens. Police say it is “not dangerous, just busy.”',
    },
  ],
  WORLD_RECORD_TRY: [
    {
      h: '{city} sets a record for {title}',
      b: '{n} volunteers helped. Judges confirmed the result after a careful count.',
    },
    {
      h: 'Record attempt in {city}',
      b: 'Locals went for {title}. {n} people turned out, and the judges were impressed.',
    },
  ],
  WORLD_CENTENARIAN: [
    {
      h: '{city} woman celebrates her {n}th birthday',
      b: 'Her advice for a long life: “Walk every day, and never lend money to your cousins.”',
    },
    {
      h: '{n} candles for a {city} grandfather',
      b: 'He still swims every morning and does the crossword in pen.',
    },
  ],
  WORLD_PIGEON: [
    {
      h: 'Lost pigeon flies home to {city}',
      b: 'It turned up {n} km from home three years ago. Its owner had kept its perch ready.',
    },
    {
      h: 'Racing pigeon wins a {n} km race to {city}',
      b: 'The winner beat 2,000 birds and earned its owner a trophy and a year’s seed.',
    },
  ],
} as const;
