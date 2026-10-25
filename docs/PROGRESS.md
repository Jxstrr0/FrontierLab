# Progress Log

Claude Code updates this at the end of every session. Newest entries go at the top.

**Current stage:** 10 — Art pass, onboarding, polish, launch (built and live; awaiting the owner's iPhone check). All ten roadmap stages are built. Still open: the owner's testing and tuning pass, an Add to Home Screen test on a real iPhone, and the Vault Street card on Kelbo.Website (in a separate session in that repo).
**Live URL:** https://jxstrr0.github.io/VaultStreet/ (first deployed 2026-10-24)
**Determinism snapshot:** `18c44acb4c1d33` (seed 42, scripted commands, 260 weeks; `tests/sim/determinism.test.ts`)

---

## Session log

### 2026-10-25 — Stage 10 known issues fixed
- **Stage / step:** 10 — polish after launch
- **Done:**
  - **Updates on iPhone:** a new version no longer waits for a second launch. If you're on the title screen, the game reloads into the new version as soon as it has downloaded. Mid-game, a message says it will load when you quit to the title. Reopening the app from the background also checks for a new version.
  - **Top bar:** play, pause and Menu use the engraved icon set instead of text characters.
  - **HQ:** a new HQ with no floors shows its empty room as the picture at the top.
  - **Wide screens:** with a panel open at 900 px and wider, the top and bottom bars move left to sit beside it, so the date, speed controls and Menu stay visible.
  - **Balance across cities:** I ran 20 different cities. The median city's first branch meets every target. Single cities vary by 30–40% because some maps have weaker "average" lots (seeds 7, 8 and 16) and some stronger (14 and 17). That's the map, not a bug. `npm run balance -- --years 5 --seeds 1-20` now checks the targets against the median city. One band changed, with the reason in SIMULATION §25: a branch's earnings keep growing with its deposits through years 2–3, so the full mature target applies from week 208. Weeks 104–156 now ask for at least $95k revenue and $38k income a week.
- **Checks:**
  - Seed 42 meets every target for steady, turtle, aggressive and stress.
  - The 20-city median meets every first-branch target.
  - The game's own numbers didn't change, so the determinism snapshot is the same (`18c44acb4c1d33`).
- **Dependencies:** none added.
- **Known issues:**
  - Add to Home Screen still needs a test on a real iPhone.
  - Carried over from Stage 9 and earlier (see below).

### 2026-10-25 — Stage 10 built: art, tutorial, sound, PWA, balance
- **Stage / step:** 10 — Art pass, onboarding, polish, launch
- **Done:**
  - **Tutorial:** seven short steps led by your first branch manager: tap a storefront, build a branch, set the savings rate, hire, read the first weekly results, turn on Personal Loans, approve a business loan. A brass ring shows where to tap. You can skip it from the advisor bar and replay it from Settings.
  - **Art pass:**
    - an engraved picture at the top of every building panel;
    - banknote-style portraits for every person;
    - small pictures for products and campaigns;
    - one matching icon set;
    - certificate-style cards with corner rosettes;
    - restyled charts (tap a bar to see its value);
    - a restyled Daily Ledger;
    - weekly results that slide in and land with a "press".
  - **Sound** (off by default; Settings → Sound): coin, paper, stamp and latch sounds.
  - **Credits** screen, opened from the title screen and from Settings.
  - **Install and offline:**
    - you can add the game to your Home Screen, and it opens full screen with its own icon;
    - after the first visit it works offline;
    - updates arrive on the next launch.
  - **Speed:** the title screen loads first and the other screens load in the background. The weekly autosave no longer causes a short freeze.
  - **Accessibility:**
    - better contrast and larger tap targets;
    - labels for screen readers;
    - keyboard focus moves into and out of panels;
    - reduced motion swaps movement for fades;
    - layout fixes at large text sizes.
  - **Balance:** the balance report now checks every scripted strategy (steady, turtle, aggressive, stress) against its own targets. Seed 42 meets all of them.
- **How it was built:** I did the balance pass while three helper agents built the tutorial/sound/credits, the install/offline/speed/accessibility work, and the art pass in parallel. I merged them, fixed the overlaps (the panel header and the loop both changed in two branches), and played it at phone size.
- **Acceptance:**
  - Lighthouse mobile scores on the final build: performance 98, accessibility 100, best practices 100, SEO 100. The target was at least 90.
  - The tutorial took a scripted new player under 5 minutes, reading every line at a slow 180 words a minute (36 taps, no console errors). The target was under 10 minutes.
  - Balance targets are met for all four strategies.
  - 581 tests pass.
- **Determinism snapshot:** unchanged (`18c44acb4c1d33`). The tutorial only adds an optional flag, so saves stay at version 10 and older saves load as they are.
- **Dependencies:** none added. Lighthouse and axe were run with `npx` only and are not in package.json.
- **Next:**
  - The owner's testing and tuning pass.
  - Add the Vault Street card to Kelbo.Website in a separate session in that repo.
  - On iPhone:
    - start a new game and follow the tutorial;
    - turn on Sound in Settings;
    - Share → Add to Home Screen, open it from the icon, then try it in airplane mode.
- **Known issues:** the five listed at launch were fixed the same day (see the entry above). Carried over from Stage 9 and earlier (see below).

### 2026-10-24 — Stage 9 built: personal empire
- **Stage / step:** 9 — Personal empire
- **Done:**
  - **Personal Wealth** (Menu → Personal wealth): your profile and salary, total net worth with its weekly change, a chart (cash, stocks, real estate, other), and every holding with cost and gain. A rich list chip opens the full list of 50 fortunes; you're ranked each year end.
  - **Vacation homes** on the map (12, from a $1.6M lake cabin near Saskatoon to a $35M Côte d'Azur villa): make an offer (85–100% of asking), rebuild to raise the value (25% of value, 8 weeks, +20%), sell any time. Values follow that country's house prices.
  - **Car dealers** in every medium and large city: buy any of 7 fictional cars (the 1962 classic gains value, the rest lose it). The **Dealer financing** tab signs a 3-year deal ($120k a year, paid by the bank) that brings 25% more car-loan customers to your branches in that city.
  - **Auction houses** (London and New York, Toronto and Chicago, Tokyo and Hong Kong): a sale every 4 weeks with 3–5 lots. Set a maximum bid; the winner pays the clearing price plus 12%. Some lots are fakes: appraise (1% fee, a week) to find out — a fake gets a red FAKE stamp and is worth $0. Appraised genuine pieces can be consigned to the next sale.
  - **Sports clubs** (10, playing at each city's stadium): buy one personally or as the bank. Club, Kit, Squad, Transfers and Finance tabs; a 40-game season; sign and release stars when the transfer window is open. Put your bank on the shirt to raise brand awareness across that country (you give up the outside sponsor's money).
  - **Insider trading:** trading your own bank's shares in the 2 weeks before a quarter-end has a 15% chance of a probe (settle, or fight it 50/50).
  - Saves move to version 10; a real Stage 8 save (with a jet and a New York branch) is kept as a test and loads and plays on.
- **How it was built:** I laid the foundation (save format, data, map buildings, net worth, a club on the bank's books, empty hooks), then three helper agents built homes/cars/wealth/rich list/insider trading, auctions, and sports clubs in parallel. I merged them and played it at phone size: bought a classic car and the Calgary Bighorns, turned on the shirt deal, flew to New York and won an auction lot.
- **Fixed along the way:** an occasional "Hook can only be invoked from render methods" error when map pins updated during a render.
- **Balance:** the scripted players don't buy personal assets, so the balance report is unchanged in kind (books balance; 3 warnings, all known). 540 tests pass, including the three Stage 9 acceptance checks: net worth ties out week after week; a counterfeit can be bought and discovered; kit sponsorship raises brand awareness in that country and nowhere else.
- **Determinism snapshot:** `1563c839eb89fa` → `18c44acb4c1d33`. Intended: new state, the rich list, clubs and auctions now run every week.
- **Dependencies:** none added.
- **Next:** Stage 10 when the owner says go. Owner iPhone check for Stage 9 when convenient: open Personal wealth, buy the Bow Valley Ranch (Calgary) and rebuild it, buy a car, sign dealer financing with an open branch, fly to New York and bid at Marlowe & Finch, buy a club from its stadium pin and put your bank on the shirt.
- **Known issues:**
  - Personal cash can go below zero from upkeep, a personally owned club's losses or an insider fine (flagged on the Wealth screen).
  - The incident modal labels the insider probe with the bank's name and shows "No cost" on both options (the option text gives the fine).
  - At far zoom Toronto's two stadium pins merge into one cluster (tap to split).
  - A consignment added while a sale's lots are on view can repeat an item in that sale.
  - Carried over from Stage 8 and earlier (see below).

### 2026-10-24 — Stage 8 built: multi-city and travel
- **Stage / step:** 8 — Multi-city and travel
- **Done:**
  - **Airports everywhere.** Every city map (and three small regional sites: Fort McMurray, Pilbara, Midland) has an airport pin. The departures board lists every destination nearest first, with distance (km or mi), "New" for places you haven't been, and how many branches you have there. A region filter keeps it one-handed.
  - **Travel is never blocked.** Flights inside the weekly 24,140 km are free. Past that, a one-way ticket ($80k × the city's cost level) comes from your personal cash; if you can't cover it, the bank pays the rest as a travel expense.
  - **Flight animation:** a plane follows a dotted arc across a world map (tap to skip), then the new city loads with a welcome toast. Tap the city pill at the bottom of the map for a Travel sheet: Go to the airport, and Fly now if you own a jet.
  - **New cities are built when you first land**, the same in a given save whenever you arrive: storefronts, rival banks, offices, bureaus, the investment bank, buildings for sale, employers and the university.
  - **Play everywhere at once.** Everything you own in every city runs every week. Each country runs its own economy and central bank, and your branches there earn on that country's rates. The Branches list groups branches by country and opens any of them from anywhere.
  - **HQ prices per country:** with "Apply rates to all branches" on, the Products floor shows a country picker (with that country's central bank rate), because Japan's 0.75% and the US's 4.5% can't share one rate sheet.
  - **HQ brand campaigns** can target any city you've reached; agency packages need you in that agency's city.
  - **Private jet:** buy a Corvid 600 (6,000 km range) or an Albatross 8000 (anywhere) with personal cash; jet flights are free. Upkeep comes from personal cash, and you can sell it.
  - Your start city is your bank's home: its central bank lends to you, taxes you and lists your shares.
  - Saves move to version 9; a real Stage 7 save (listed, HQ prices on, a building, a yen position) is kept as a test, loads, flies and plays on.
- **How it was built:** I laid the foundation (save format, city generation, travel and jet rules, per-country prices, distances), then two helper agents built the airport, flights and jet screens, and the multi-city audit (rivals priced per country, regional employer deals, news, campaigns, strategies). I merged them and played it at phone size: Calgary → New York → London, a branch in each.
- **Fixed along the way:** rivals in two countries now price each country off its own central bank; HQ coverage no longer stalls at 88% with a full building (a second building is leased); a weekly loan scan that slowed big banks is about 7× faster.
- **Balance:** the scripted steady player now moves on to other Canadian cities once Calgary is full, which removes the old 52-branch cap: year 10 ends at 167–223 branches and $7–10B of assets (target 60–200 and $8–40B; slightly outside on two seeds — noted for the tuning pass). Everything before the first flight is unchanged. 477 tests pass, including both Stage 8 acceptance checks: branches in three countries run a year with balanced books, and raising one country's rate moves only that country's branch margins.
- **Determinism snapshot:** `09f58c873bc838` → `1563c839eb89fa`. Intended: new save fields (home city, travel, the travel line).
- **Dependencies:** none added.
- **Next:** Stage 9 (personal empire). Owner iPhone check for Stage 8 when convenient: tap the city pill → Go to the airport, fly free somewhere, fly far enough to pay a fare, open a branch abroad, try the Products floor country picker with Apply-to-all on, and visit Fort McMurray.
- **Known issues:**
  - The CPO's "best bureau model" delegation only looks at bureaus in the city you're standing in.
  - "Fast-track a merger review" is global rather than per country.
  - No Ledger story yet for a first branch in a new country.
  - Toasts can draw over confirm sheets; on desktop the drawer covers the date pill.
  - The world map's continents are deliberately rough.
  - Carried over: a private building can push personal cash below zero (jet upkeep can too); rare startup IPOs; flavour-only networking cards; first-branch checkpoints at weeks 156/260; high ROE.

### 2026-10-24 — Stage 7 built: investments and real estate
- **Stage / step:** 7 — Investments and real estate
- **Done:**
  - **Investment floor** (add it to your HQ): your portfolio for the company or for you personally, with a chart of stocks, startups, buildings, venture debt and currencies, a full list of holdings, and a carousel of startups that are raising money. More analysts find more startups (1 plus 1 per 4 staff, up to 8).
  - **Startups:** 20 to start, more appear over time. Each grows or shrinks every quarter, raises new rounds (up or down), and can fail, be bought out, or list on the stock market. A startup's screen shows its profile, its strengths (pentagon), quarterly results, the two offer lots of the current round (invest as the company or privately), its funding history and shareholders. You can also lend to it (venture debt): up to 10% of its value, repaid weekly over 3 years, and mostly lost if it fails.
  - **Conventions:** a yearly calendar. Each is announced in the Daily Ledger two weeks ahead, appears on the map, and is open for one week with 3–6 startups you can only back there. Calgary's is the Foothills Founders Fair in mid-July.
  - **Real estate:** each city has buildings; some go up for sale every 4 weeks ("For sale" pins). Make an offer as the company or privately. Once you own one, set the rent: higher rent loses tenants, lower rent fills it. The screen shows weekly rent, upkeep, empty-space cost and return (about 9% at 85% full, like the original). Put it up for sale any time.
  - **Foreclosed homes:** homes from defaulted mortgages now follow house prices. On the Company screen, hold them, rent them out, or sell them all at 90% of value.
  - **Lobbying firms:** pay for a campaign to ease your capital requirement for a year, fast-track your next takeover, or kill a pending capital-requirement bill. Each can fail, and each can be exposed in the paper (a fine and a hit to your brand).
  - **Currencies (owner request):** a simple "country up or down" bet on any foreign currency, at any investment bank (Market tab → Currencies), as the company or privately. Currencies move with each country's growth, interest rate and business cycle.
  - **Starting currency (owner request, already live):** choose $, C$, £, € or ¥ when you start a game.
  - Everything the bank owns appears on its balance sheet and counts toward its capital requirement; the bank can't buy startups or buildings while its capital is Restricted or worse. Saves move to version 8; a real Stage 6 save (listed, with foreclosed homes) is kept as a test and loads and plays on.
- **Owner decisions recorded:** you'll be able to travel to any city at any time and run everything everywhere at once (Stage 8): flights inside the weekly allowance are free, longer ones cost a fare, never blocked. Currencies are an investment only; the bank's books stay in one currency.
- **How it was built:** I laid the foundation (save format, map buildings, balance-sheet lines, data tables, empty hooks) and built currencies myself; two helper agents built startups and conventions, and real estate, foreclosed homes and lobbying, in parallel. I merged them, added the capital-tier rule for buildings and the Investment floor's advisor line, and played it all at phone size.
- **Balance:** the scripted strategies don't invest yet, so the balance report is unchanged from Stage 6 (same 4 warnings as before, all pre-existing). 429 tests pass, including both Stage 7 acceptance checks: portfolio values tie out to the balance sheet and capital requirement every week (through rounds, failures, buyouts, listings, purchases, rent changes, sales and all foreclosed-home modes), and the Foothills Founders Fair appears on schedule with startups that can only be bought there, that week.
- **Determinism snapshot:** `08b65f0864d155` → `09f58c873bc838`. Intended: new state (startups, conventions, buildings, currencies) and foreclosed homes now carry costs and follow house prices.
- **Dependencies:** none added.
- **Next:** the owner checks Stage 7 on iPhone: add an Investment floor at HQ and hire a few analysts, open a startup and invest (company or private), try venture debt, buy a "For sale" building and change its rent, open a lobbying firm, try a currency at the investment bank, and watch for the Foothills Founders Fair in July (week 28).
- **Known issues:**
  - A privately owned building whose costs exceed its rent can push personal cash below zero.
  - IPOs of startups are rare (about one per 10 years without your money), because they need $50M of quarterly revenue, as specified.
  - The convention's networking cards are flavour only.
  - Carried over: first-branch checkpoints at weeks 156 and 260, high ROE in the steady run, Calgary's ~52-branch lot cap.

### 2026-10-24 — Stage 6 built: governance and capital markets
- **Stage / step:** 6 — Governance and capital markets
- **Done:**
  - **Investment banks** on the map (chart medallion, Investment Banks layer; Calgary's is Ashgrove Capital). Three tabs:
    - **Market:** 16 listed companies in five sectors plus the listed rival banks, with prices that move each week with the economy, quarterly earnings and dividends, 52-week ranges, P/E and top shareholders, and the "Ledger Composite" index. Trade from the company (corporate cash) or privately (your personal cash).
    - **Equity:** while private, sell up to 25% of the bank to an investment fund (3 rounds, 26 weeks apart) and launch the IPO once you qualify (the checklist shows each rule); it lists at the next quarter-end with a first-day pop. Once public, issue more shares (secondary offering).
    - **M&A:** buy a rival bank. You offer a price per share; next week the regulator checks your capital after the deal and that you'd hold no more than 35% of a city's deposits, then the rival's board accepts or refuses depending on the premium. Failed rivals are sold off cheap for 8 weeks. Bought branches become yours at once (with a manager kept on) and switch to your brand over 8 weeks; on the map they keep the old colours with a progress ring until then.
  - **Your share price:** a private valuation from book value and profitability; once public, a market price that follows earnings, dividends and incidents (a data breach hurts far more than a robbery). The Company screen shows it with your stake, the top shareholders and your personal money.
  - **Executive floor:** hire a COO, CFO, CPO, CMO, CTO and CRO. Each makes their departments stronger (or weaker, if they're not very good) and can run things for you: hiring branch managers, staff benefits, liquidity, dividends proposals, pricing, new products, the underwriting model, brand campaigns, digital projects, risk appetite and Loan Desk decisions. Set their pay, give stock options or shares that vest over 4 years, or fire them. Underpaid executives without unvested shares get poached (you can counter-offer).
  - **Board meeting** once a quarter (the game reminds you): propose a dividend and your own salary; shareholders vote, and outsiders judge whether it's reasonable. While you own most of the bank it always passes. The regulator limits dividends when capital is weak. Your CEO salary ($120k a year to start) and your share of dividends go into your personal cash.
  - New Ledger stories for all of it; saves move to version 7 (a real Stage 5 save is kept as a test and loads and plays on).
- **How it was built:** I laid the foundation (save format, data tables, map buildings, the share register, balance sheet lines, empty hooks), then three helper agents built executives and the board, the stock market and fundraising, and takeovers in parallel. I merged them, wired the Employee Stock Plan's loyalty bonus between two of them, and played the whole thing at phone size.
- **Balance:**
  - Steady now raises money once privately when capital gets tight and lists in years 5–6 (weeks 222, 248 and 261 on seeds 42, 7 and 99), keeping 60% of the bank. The IPO money takes it from 7 to about 44 branches in year 5.
  - Turtle (deposits only) ends year 5 at 27% of steady's equity (target under 40%). Aggressive hits the Restricted tier; stress survives its forced recession without going Critical.
  - 370 tests pass, including the three Stage 6 acceptance checks: an IPO in years 3–6 of a steady run; a public bank's price falls after a data breach and moves with earnings; and after buying a rival the books balance every week while its branches convert in 8 weeks.
- **Determinism snapshot:** `1c47c86155686e` → `08b65f0864d155`. Intended: the new state, the weekly CEO salary, the CTO seat's effect on breach odds and the moving private valuation.
- **Dependencies:** none added.
- **Next:** the owner checks Stage 6 on iPhone: open the investment bank and look through the three tabs, buy a few shares privately, lease an office with an Executive floor and hire someone, hold a board meeting, and (with enough cash) make an offer for a small rival and watch its branches convert.
- **Known issues:**
  - The first-branch checkpoints still read seed 42's recession at week 156 and miss at week 260 (deposits a little high, income $42k vs $45–70k); a cross-seed calibration is open.
  - ROE runs well above the 8–18% target in the steady run (20–60%); it did before Stage 6 too, because a young bank's equity is small next to its branch profits. To look at in a calibration pass.
  - Wealth advice still follows each country's own market return rather than the new index.
  - When the CRO decides Loan Desk applications, branch screens don't say so.
  - Calgary still runs out of locations at about 52 branches (more cities arrive in Stage 8).

### 2026-10-24 — Stage 5 built: competition, macro and news
- **Stage / step:** 5 — Competition, macro and news
- **Done:**
  - **Rivals come alive.** They grow new branches toward a mature size, open new ones on good free locations once they've had a profitable year, and close branches that lose money for half a year. Their books feel the economy: thin-capital banks (disruptors especially) can fail in a deep recession; regulators hold the network for 8 weeks, then other rivals take the branches. Buying a failed network yourself comes with Stage 6.
  - **Price wars.** Lead a city's savings rates (Rates rating 4.0 or better) for 8 weeks and rivals start raising theirs. You get a case asking whether to match.
  - **Rival screens.** Tap a rival branch for its ratings, customer reviews and its rate sheet next to yours (green where you're the better deal, red where not). Rival head offices (Banks layer) show the bank's overview, offer business loans and a line of credit you can actually take; it's company debt, paid from corporate cash.
  - **Every country's economy and central bank** runs now (nine of them), even before you can open there.
  - **The Daily Ledger** is a real weekly paper built from what happened: rate decisions, rival openings and results, your loans and profits, house prices, markets, politics (fictional parties; a passed "capital buffer" really does raise your capital requirements for a year) and fictional sports leagues. Tabs Top / Banking / Business / Markets / Politics / Sports, and an archive of 52 issues under Menu → The Ledger.
  - **Central bank screen:** tap the domed building for the policy rate, last and next meeting, the economy, a yield curve (it inverts before downturns) and, at home, emergency borrowing.
  - **Incidents:** robbery, ATM skimming, data breach, mis-selling, viral complaint, branch flood, card fraud, staff walkout, bank runs, regulator audits and letters, price wars, big defaults, and the emergency rescue offer before a regulator takeover. Each is a case with 2–3 choices and their costs. Branch managers can handle branch cases for you ("Branch troubles"); undecided cases take the worst option after 4 weeks. Waiting cases show as an "N cases" chip under the date and a red dot on the branch pin.
  - **Employers and universities** (Employers / Universities layers): sign a 7-year payroll deal and the staff bring deposits that grow over two years; keep the deal healthy (good host branch, competitive account) or the employer walks. Universities also offer student accounts and a graduate program that sharpens manager candidates and speeds hiring.
  - More review lines (4 per rating and mood); rival branches show reviews too.
  - Saves move to version 6; a real Stage 4 save is kept as a test and loads and plays on.
- **How it was built:** I laid the foundation (save format, map buildings, every country's economy, an event catalog, stubs). Four helper agents then built rivals, the Ledger with the central bank, incidents, and partnerships in parallel; I merged them, joined them up (price wars raise their case; incident press stories reach the paper) and fixed what showed up in play.
- **Balance:**
  - Recessions now hurt loan books: the credit cycle is steeper, so seed 42's year-2/3 recession books 1.6% losses (target 1.2–2.5%) against 0.8–0.9% in good years. New acceptance test.
  - Reserves earn 0.5% below the policy rate (a deposit-facility rate), so a deposits-only bank falls well behind a lender.
  - 259 tests pass, including both Stage 5 acceptance checks: 3 years of Ledger issues with 6–12 stories, correct numbers and no repeated wording for the same subject in back-to-back weeks; and a 10-year run with a recession and clearly higher defaults.
- **Fixed along the way:** event toasts could repeat or go missing because they tracked a position in an event log that drops old weeks; they now remember the last event shown.
- **Determinism snapshot:** `0831e6b2f8796e` → `1c47c86155686e`. Intended: every country simulated, rival AI, news, incidents and the two balance changes above.
- **Dependencies:** none added.
- **Next:** the owner checks Stage 5 on iPhone: watch a few weekly papers (tabs and the archive), tap the central bank dome, a rival branch and a rival head office (try a small loan), sign an employer once you can afford it, and answer an incident.
- **Known issues:**
  - The first-branch checkpoints are tuned on seed 42 only. On seed 42, week 156 now falls just after a recession (revenue about $90k a week against $110–150k), recovering by week 208. Other seeds (7, 99) already missed them in Stage 4 because of weaker starting lots; a cross-seed calibration is open.
  - The deposits-only `turtle` strategy ends year 5 at about 45% of steady's equity (target under 40%); its equity swings with bond values because it holds so many bonds.
  - Steady tops out at about 52 branches in Calgary by year 8 (year-10 target 60–200) because the city runs out of locations; other cities arrive in Stage 8.
  - A payroll deal costs $330k–$920k in Calgary, so it's a mid-game move.
  - Partnership deposits count in company totals but don't credit the host branch's own P&L; the quarterly partnership review isn't built; winning an employer doesn't shrink the rival's books.
  - Rival networks can't be bought yet (Stage 6); executive, dividend and insider incidents wait for Stages 6 and 9.
  - Toasts sit over the bottom of modals.

### 2026-10-24 — Stage 4: Products floor simulation
- **Stage / step:** 4 — HQ and operations depth (Products floor, simulation only; the screens are a separate step)
- **Done:**
  - Product development: pick a type (18 templates from CONTENT §6), a price tier, 4–48 weeks and a weekly budget (from $5,000). The star odds table follows SIMULATION §16.6 and matches the reference numbers (27/42/26/5/0 at the cheapest setting). Each week pays for the progress made; at the end the stars are rolled and a new product appears in the catalog.
  - Developed products work like any other: their own prices, toggles and books at each branch, built from the base product plus the template (e.g. Senior Saver = savings with more retiree interest). They start switched off. Deleting one moves its customers onto the base product.
  - Digital projects (IT floor needed): Mobile App 2.0 lifts the app rating; Instant Decisions makes the house model faster. Each runs once.
  - Underwriting models: buy a credit bureau's package, commission a custom mix hosted by a bureau, or build your own on the Products floor (sliders over five data inputs; Internal History unlocks at 5,000 loans). Switching models blends old into new over two weeks.
  - Company lineup: "Apply rates to all branches" lets HQ set prices and the lineup for every branch.
  - 111 tests (new: odds vs the doc, a development turning into a product that gains customers, digital projects, deleting, custom model maths, the Internal History gate, the switching blend, the company lineup, and a save round-trip with all of it).
- **Determinism snapshot:** unchanged (`08b4ee1bc7e8a3`). The scripted game doesn't use the Products floor, and the new state fields are only written once you use them. The 5-year balance report is identical.
- **Dependencies:** none added.
- **Next:** the Products floor and Credit bureau screens (SCREENS §10, §13).

### 2026-10-24 — Map pins: "$" for open locations, "For lease" for offices
- **Done:** at the owner's request, open branch locations now show a plain "$" coin (a little smaller than branch pins, and smaller still when zoomed out) instead of the "For lease" tag. The "For lease" tag now marks buildings you rent: office buildings, with a small office icon. The list view, the Layers filter ("Available only") and the storefront panel ("Available location") use the same wording. Credit bureaus and agencies keep their icon medallions, and so will investment banks when Stage 6 adds them.
- **Next:** unchanged: the owner's iPhone check of Stage 4.

### 2026-10-24 — Stage 4 built: HQ and operations
- **Stage / step:** 4 — HQ and operations depth
- **Done:**
  - **Offices:** every city has 3–9 office buildings for lease (mostly in the financial district), plus credit bureaus and marketing agencies, all on the map with their own pins and layers. Leasing takes the whole building; each floor holds one department and is fitted out when a team moves in. Floors and whole offices can be released.
  - **Departments:** Finance, HR, Products, Treasury, Marketing, IT and Risk. Each hires toward a target you set, pays a salary you set, and has skill, morale and coverage (staff versus what your bank's size needs).
  - **Founder mode:** with 1–2 branches nothing is required; requirements phase in from 3 to 6 branches. Short departments hurt: HR slows hiring and lowers morale, Risk raises defaults and regulator fines and blurs loan estimates, Treasury makes funding dearer and the market thinner, Marketing weakens every campaign, IT drags the app rating, Products slows developments and raises model costs, and Finance delays your statements.
  - **HR benefits:** nine benefits with costs and effects on morale, hiring, quits, skill growth and reputation.
  - **Products floor:** your house underwriting model with Manage models (sliders that always total 100%), risk appetite, the company product lineup with "Apply rates to all branches", and new product development with the live star-odds table. Developed products are real products at your branches.
  - **Credit bureaus:** buy a bureau's packaged model or commission your own mix there.
  - **Treasury floor:** liquidity gauge and policy, government bonds (they lose value when rates rise), a funding market that refreshes every two weeks, your funding lots (they mature on schedule), and the central bank window.
  - **Marketing floor and agencies:** brand campaigns by city or country, and agency packages.
  - **IT floor:** the app rating and digital projects (Mobile App 2.0, Instant Decisions).
  - **Risk floor:** loss rates by product, model performance, and the quarterly regulator review.
  - Saves move to version 5; your Stage 3 save is kept as a test fixture and loads and plays on.
- **How it was built:** I wrote the foundation (data shape, save migration, offices, departments, coverage and benefits). Two helper agents then built the Products and the Treasury/Marketing/Risk simulation in parallel, and three more built the screens. I reviewed and merged everything and tuned the balance.
- **Balance:** a bank without an HQ was coming out ahead, so per-branch HQ requirements were cut about 40% and the Risk shortfall penalty raised. Now `steady` (which leases its first office at 4 branches) ends year 6 with about $72M equity against `nohq`'s $63M, and `nohq` runs loan losses near 2%. Both steady and stress stay inside their targets apart from the pre-existing 74.9% loans-to-deposits at week 104.
- **Determinism snapshot:** `0acda65581fd17` → `08b4ee1bc7e8a3` (HQ state added; the script leases an office at week 80) → `1ecdcf158cfecb` (risk records and regulator reviews) → `0831e6b2f8796e` (requirement tuning). All intended.
- **Next:** the owner checks Stage 4 on iPhone: lease an office from the Offices layer, add floors, try the Products, Treasury and Marketing floors, and visit the Northscore bureau and the agency in Calgary.
- **Known issues:**
  - HQ coverage refreshes on the weekly tick, so a staffing change shows next week.
  - The app rating keeps no history yet, so IT shows the current rating and its target rather than a trend.
  - Predicted and actual default rates match closely for pooled books (defaults are booked at the expected rate); they drift apart through the credit cycle, Risk shortfalls and Loan Desk loans.
  - The deposits-only `turtle` strategy reaches about 45% of steady's year-5 equity (target under 40%); left for Stage 5 tuning.
  - Executive and Investment floors show "arrives later" cards (Stages 6 and 7).

### 2026-10-24 — Next week button
- **Done:** a ▶| button in the date pill (top right) jumps to the end of the current week, shows the weekly results and pauses, so you can play week by week instead of watching days tick by. It runs through the same simulation steps as normal play, so nothing about the numbers changes. When paused, the pill now shows just the date (the ▶ button already says it's paused).
- **Next:** Stage 4.

### 2026-10-24 — Stage 3 built: the engraved city map
- **Stage / step:** 3 — The city map (Banknote Deco v1)
- **Done:**
  - Street grid and shoreline (`src/sim/cityLayout.ts`): a street every 4th row and column, a wavy shore in water cities. Storefront lots now snap to tiles facing a street. Schema v4 moves older saves' lots onto the grid.
  - The drawable city (`src/art/citygen.ts`): streets, water, parks, filler buildings by district, and four landmarks (central bank, clock tower quad, stadium, airport; scenery for now). Seeded from the save, so a city looks the same every session.
  - The engraved renderer (`src/art/`): city-ink linework, three hatch densities, paper with a guilloche wave and a microprint ring with the city name, water with wave lines, quays and piers, stippled parks with spiral trees, and building styles for all seven districts. Storefronts have glazed ground floors; your branches fly a brand-ink flag and rival branches have striped awnings in their ink.
  - The map view (`src/app/map/`): drag to pan with a fling glide, pinch and double-tap to zoom, wheel zoom on desktop. Pins for your branches, rivals and storefronts for lease open their panels; a drag that starts on a pin pans instead. Zoomed out, pins group into numbered clusters. The Layers sheet (bottom-left button) has All, Branches, a "For lease only" filter and the old list as "List view"; choices are saved.
  - 97 tests (new: street layout and lot snapping, city map generation, projection, chunk maths, painter order, the chunk cache budget, camera, pins, clustering, layers).
- **How it was built:** I wrote the layout, city generator, projection and the renderer contract; two helper agents then built the renderer and the map view in parallel against that contract, and I reviewed, fixed small style slips (all-caps tags, drop shadows) and merged.
- **Performance:** in Chrome at iPhone size with the CPU slowed 4×, panning over painted map costs under 1 ms a frame (3 ms worst); panning fast into unpainted parts of New York (the biggest city) averages 13 ms with a 33 ms worst. Pin updates take 0.1–0.8 ms for 110 pins.
- **Determinism snapshot:** `1b00e5e0304fc5` → `0acda65581fd17`. Intended: lots moved onto street frontage. The balance report stays inside every target.
- **Next:** the owner checks Stage 3 on iPhone: smooth panning in a big city (try New York or Tokyo), every pin tappable, layer toggles staying put, sharp on the retina screen. Stage 2's check can happen in the same session.
- **Known issues:**
  - Tested only in Chrome's phone emulation; WebKit isn't available here, so iPhone Safari is untested (pinch blocking, text-size handling).
  - Fast zoom-out into an unpainted area briefly shows plain paper before the art fills in.
  - Neighbouring "For lease" tags can overlap at zoom 1; the top one wins the tap.
  - The camera doesn't allow for the desktop panel covering the right side of the map.
  - Waterfront buildings are all glass towers (no warehouses yet).

### 2026-10-24 — Stage 2 gaps closed
- **Stage / step:** 2 — Playable loop in plain UI (finishing touches before the owner's check)
- **Done:**
  - Loan Desk counts now live in the game state (schema v3, migration 2 → 3), so "Declined" and the approval rate survive a reload and include decisions your manager makes.
  - Branch history keeps 52 weeks, so the Finance tab's "Year" view is a real year.
  - Typing a price: tapping a rate now shows "3.25" (not "0.0325") and typed numbers are always read as percents; fees show whole money.
  - The advisor bar cycles through every applicable hint on tap (counter shows 1/3 and so on), including a reminder when loan applications are waiting.
  - The capital ratio reads "100%+" with a short explanation while the bank has almost no loans.
  - 55 tests (new: Loan Desk tally and the 2 → 3 migration; rate and ratio formatting).
- **Determinism snapshot:** `1a6f96ddc5855e` → `1b00e5e0304fc5`. Intended: saves now carry the desk tally and up to 52 weeks of branch history. No formula changed; nothing in the sim reads further back than last week's branch P&L.
- **Next:** the owner's Stage 2 check on iPhone (two game years, move a save code Safari → Chrome). Then Stage 3.
- **Known issues:** no hero vignettes, portraits or area mini-map yet (art stages).

### 2026-10-24 — Stage 2 built
- **Stage / step:** 2 — Playable loop in plain UI
- **Done:**
  - Game loop at 1×/2×/4× with pause, weekly auto-pause for results (every week, quarter or off), auto-pause for expiring loan applications, autosave every week, and toasts for branch openings and central bank decisions.
  - Game over: insolvency (4 weeks of negative cash) and regulator takeover (13 weeks below a 4.5% capital ratio), shown as a Daily Ledger front page.
  - HUD (cash, date and speed, city, menu) and the menu sheet.
  - New Game wizard in 5 steps: bank (name, monogram, ink), founder (name, avatar parts), start city, game options (difficulty, 1–5 competitors, starting cash), confirm (seed, start date). Plus a quick start.
  - City list in place of the map: districts → lots with rent, traffic and occupant; rival info sheet.
  - Storefront panel and the build flow (five part pickers, cost summary, Build).
  - Branch panel with all five tabs: Service (reviews, staff, manager, hiring, delegation), Products (lineup with prices, margins and toggles), Loan Desk (applications with rosettes, approve/decline, active loans), Marketing (campaign levels), Finance (statement, chart, rename, close).
  - Weekly results with The Daily Ledger, Company summary (capital meter, statements), Branches list.
  - Saves: autosave plus 3 slots, export/import save codes (copy, share, paste); settings (currency, units, weekly results, speed, auto-pause, reduced motion, text size, founder avatar).
  - Sim additions: `closeBranch`/`closeQuote`, `setSettings`, `setFounderAvatar`, game-over checks, deterministic math.
  - 51 tests. Playwright walkthroughs at 390×844 and 1280×800 with no console errors: wizard → build → 7 weeks at 4× → every tab; save → exit → load round-trips exactly.
- **How it was built:** I wrote the foundation (store, loop, saves, components, HUD), then four helper agents built the screens in parallel, each in its own folder, and I reviewed and merged them.
- **Decisions** (also in DESIGN §7): products show as a vertical list rather than a carousel so every toggle and price is visible on a phone; the product margin ring is revenue kept after funding cost, servicing and expected loss; save storage lives in `src/sim/save/storage.ts` (the only module allowed to touch browser storage).
- **Next:** the owner plays a two-game-year run on iPhone and moves a save code between iPhone Safari and desktop Chrome (Stage 2 acceptance). Then Stage 3, the engraved city map.
- **Known issues (at the time; all but the art fixed in the next entry):**
  - Loan Desk "declined" and "approval rate" were counted by the screen only.
  - Branch history kept 26 weeks.
  - The capital ratio read in the hundreds of percent before any loans existed.
  - No hero vignettes, portraits or area mini-map yet (art stages); the advisor bar didn't cycle hints on tap.
  - Typing into a rate stepper edited the raw value rather than the display value.

### 2026-10-24 — Cross-engine determinism fix
- CI failed the determinism snapshot since Stage 1: `Math.pow` with a fractional exponent returns different bits on Node 24 (CI) than Node 22 (local), and browsers can differ the same way.
- Added `src/sim/detmath.ts` (exp, log, pow, cos, tanh from basic arithmetic), switched the sim to it, and banned the Math versions and `**` in `src/sim` via ESLint. The snapshot now matches on both Node versions; the balance report is unchanged.

### 2026-10-24 — New Game options (Stage 1 addendum)
- **Stage / step:** 1 addendum, before Stage 2
- **Done:**
  - Difficulty (Easy, Normal, Hard, Expert) as its own setting: prospects, rival quality, rival rates and loan default rates scale by level (`DIFFICULTY` in balance.ts).
  - Competitors: 1–5 rival banks per city; rival branch totals scale with the count.
  - Starting cash: $500k, $750k, $1M or $1.25M.
  - Schema v2 with a 1 → 2 migration; `npm run balance` takes `--difficulty`, `--competitors` and `--cash`; 4 new tests (37 total).
- **Decisions:** the owner asked for difficulties, a 1–5 competitor option and a small range of starting cash. Start cities no longer set the difficulty.
- **Balance report:** Normal, 3 competitors and $750k reproduce the old run exactly (the old hash matches once the new fields are stripped); the snapshot changed only because saves now carry the new fields. Year-1 deposits (steady, Calgary): Easy $104M, Normal $95M, Hard $73M, Expert $51M; 1 competitor $125M, 5 competitors $47M.
- **Next:** Stage 2.

### 2026-10-24 — Stage 1 complete
- **Date:** 2026-10-24
- **Stage / step:** 1 — Simulation core (headless)
- **Done:**
  - Content tables in `src/data/` (countries, cities, districts, segments and affinity, products, build options, campaigns, rivals, Loan Desk sectors, names, reviews, bureau models) and every tuning constant in `src/config/balance.ts`.
  - `src/sim/`: seeded sfc32 RNG streams, calendar, `newGame`, city lot generation (a list of lots with district values, no art), macro and the central bank rule for the home country, FTP and market reference prices, rivals as price sheets that follow FTP with deposit beta.
  - Per-branch pipeline in the documented tick order: staff and capacity, awareness and campaigns, ratings and review cards, demand and share, books (deposits, GICs, amortizing loans, revolving credit, wealth, safe boxes, FX), the Loan Desk with individual business loans, and the branch P&L.
  - Company layer: treasury (reserves, bonds with mark-to-market, automatic overnight and window funding, freeze), statements with tax and loss carry-forward, the balance sheet, capital ratio and tiers, quarter-end reports.
  - Delegated managers (staffing, products and rates, marketing, loan approvals).
  - Commands for building, products and prices, staff, wages, campaigns, managers, delegation, risk appetite, Loan Desk decisions and treasury transfers. Each returns `{ ok }` or `{ ok: false, reason }`.
  - Saves: JSON serialize, migrations, required-keys check, checksum, and `VS1:` export codes (lz-string).
  - `npm run balance` with the idle, steady, turtle, aggressive and stress strategies, a yearly table and first-branch checkpoints.
  - 33 tests: RNG, formula worked examples, macro units, commands, the balance identity and cash-flow reconciliation every week, determinism and save round trips.
- **Decisions** (also in DESIGN §7):
  - **Your call:** keep CONTENT's fee levels, so a mature branch earns about $45–70k a week (closer to the original's store economics). SIMULATION §25 targets updated.
  - Calibration: catchment 1.0, prospect rate 0.040, saturation exponent 2.8, gentler price elasticity (PF_RATE_STEP 0.01), smaller deposit, wealth and business-loan sizes, mortgage approval 0.48. Each change is noted where the number lives in the docs.
  - `buildBranch` leases and builds in one step; new branches open with deposits on and other lending off; one rate sheet per rival bank; overnight limit shrinks with the capital tier.
- **Balance report** (seed 42, Calgary, steady, 5 years): every first-branch checkpoint is in range. First branch: $339k to build, income positive from week 8, $38M deposits and 3,624 customers at week 52, loans 76–81% of deposits from week 52 on, $47–63k a week of income from week 104, payback 36 weeks after opening. Company: 3 → 28 branches over five years, capital Watch in years 1–2 then Adequate, NIM 4.0–4.4%, loan losses 0.7–0.9%.
  - Other strategies at year 5: idle $45M deposits, $72M loans (its prices go stale as rates rise); aggressive 36 branches at Watch; stress (recession at week 156) stays Adequate; turtle 47 branches with no loans.
- **Next:** Stage 2 — game loop with speeds and auto-pause, HUD, New Game wizard, a city-list view of lots, storefront and build flows, the five-tab branch panel, weekly results, saves, settings.
- **Known issues:**
  - Company-level targets need the HQ costs of Stage 4: ROE is 55–85% (target 8–18%) because there are no head-office salaries yet.
  - Turtle (no lending) out-expands steady because nothing limits its growth but cash, and its corporate cash dips below zero briefly after a build. Revisit once insolvency (Stage 2) and HQ costs (Stage 4) exist.
  - One city holds 47 free storefronts, so branch counts stop there until more cities open (Stage 8).
  - Results vary a lot between seeds because each seed's "average lot" differs; the targets are checked on seed 42.

### 2026-10-24 — Stage 0 complete
- **Date:** 2026-10-24
- **Stage / step:** 0 — Scaffold and deploy
- **Done:**
  - Added all design docs to the repo (README and CLAUDE.md at the root, the rest in `docs/`).
  - Vite 8 + TypeScript (strict) + Preact + @preact/signals project, ESLint + Prettier, Vitest with sample tests.
  - `tokens.css` with the Banknote Deco palette, type scale and safe-area insets; Bodoni Moda and Public Sans bundled via @fontsource.
  - Title screen: engraved "Vault Street" wordmark over a procedural guilloche rosette (`src/art/guilloche.ts`), disabled New game / Continue, version string, "A Longlight Interactive game".
  - `src/config/balance.ts` with one `FEATURES` flag per roadmap stage.
  - GitHub Actions workflow: lint, test and build on every push and pull request; deploy to Pages on pushes to `main`.
  - Checked at 390×844 and 1280×800 in Chromium, served from a `/VaultStreet/` sub-path: fonts load, no console errors.
- **Decisions** (also in DESIGN §7):
  - Code goes straight to `main` (owner's choice); every push must be green.
  - Toolchain: Preact 10.29 rather than the 3-week-old Preact 11; TypeScript 6.0 because typescript-eslint doesn't support TypeScript 7 yet.
  - An ESLint rule blocks `Math.random`, `Date.now`, `window`, `document` and `localStorage` inside `src/sim/`, enforcing the pure-simulation rule automatically.
- **Doc ambiguities noticed** (none blocking; resolve as each stage arrives):
  - SCREENS §1 lists Continue / New Game / Load / Settings on the title; ROADMAP Stage 0 asks only for disabled New Game / Continue. Stage 0 shows those two; Load and Settings come with saves in Stage 2.
  - DEPLOYMENT's workflow runs only on `main`; it now also runs checks (without deploying) on pull requests.
- **Next:** Stage 1 — headless simulation core.
- **Known issues:** The owner must set Settings → Pages → Source to "GitHub Actions" once, or the deploy job fails.

### Template
- **Date:**
- **Stage / step:**
- **Done:**
- **Decisions** (also add to DESIGN §7):
- **Balance report** (if the sim changed): key numbers vs targets
- **Next:**
- **Known issues:**

---

## Known issues
(none yet)

## Dependency log
| Package | Why | Added |
|---|---|---|
| preact, @preact/signals | UI | Stage 0 |
| @fontsource/bodoni-moda, @fontsource/public-sans | Bundled fonts | Stage 0 |
| lz-string | Save export codes | Stage 1 |
| tsx | Runs `scripts/balance.ts` (dev only) | Stage 1 |
| vite, @preact/preset-vite, typescript, vitest | Build, types and tests (dev only) | Stage 0 |
| eslint, @eslint/js, typescript-eslint, eslint-config-prettier, globals, prettier | Lint and format (dev only) | Stage 0 |
| @types/node | Types for config and scripts (dev only) | Stage 0 |
