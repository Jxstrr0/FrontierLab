# Screens & UI Spec

Screen-by-screen layout. Design at 390×844 portrait first. Visual styling is in ART_DIRECTION.md; field behaviour and formulas are in SIMULATION.md.

---

## 0. Global

### 0.1 Panel anatomy
Every building panel uses the same five parts, mirroring the original's structure:
1. **Header:** icon medallion, title, subtitle (address or type), close ✕.
2. **Advisor bar:** an oval engraved portrait and a one-line speech. Tap to cycle contextual hints. Lines are in CONTENT.
3. **Hero vignette:** a procedural engraving of the building, about 16:9. Small corner buttons where needed (e.g. "details").
4. **Content:** scrolls.
5. **Bottom tab bar:** when the panel has tabs. The current tab sits in a brass pill and is scrolled to the middle whenever it changes. When the tabs don't all fit, the bar scrolls sideways and a side with hidden tabs fades under a chevron (tap to page that way). The five branch tabs fit at 390 px.

**Phone vs desktop:** on phones, panels slide up full-screen. On screens ≥ 900 px wide, they open as a right drawer, `min(480px, 40vw)` wide, over the map. Modals are centered cards; on phones they become bottom sheets. While any panel, sheet or modal is open the game clock holds (DESIGN §5.1); it resumes when you close it.

### 0.2 HUD (over the map)
- **Top-left:** bank medallion + corporate cash. Tap → Company summary (§24).
- **Top-right:** date pill and speed control.
  - Tap cycles 1× → 2× → 4×. Long-press or the ❚❚ button pauses.
  - While paused, the pill hides the speed and dims. It also reads paused while a panel, sheet or popup is open, since the clock runs only on the map.
  - **Next week** button (▶|): plays out the rest of the week instantly, runs the weekly tick (weekly results, autosave, auto-pause checks) and leaves the game paused. This allows week-by-week play.
- **Bottom-left:** Layers button.
- **Bottom-center:** city pill with an engraved flag. Tap → Travel sheet (the nearest airport's departures, plus "Fly now" if you own a jet).
- **Bottom-right:** Menu.
- **Badges:** pins show a small oxblood dot for an unresolved incident, a brass dot for pending Loan Desk applications.
- **Cases chip:** while incidents wait for a decision, an "N cases" chip sits under the date pill and reopens the incident modal.

### 0.3 Menu sheet
Wealth · Company · Branches · Portfolio · The Ledger (archive) · Milestones · Settings · Save game · Exit to title.

### 0.4 Formatting
- **Money:**
  - cards and headlines: compact (`$1.48B`, `$29.8M`, `$83.7K`)
  - statements: full (`1,482,140,000`)
  - **currency:** the books are kept in one money (dollars). The chosen symbol converts every amount on screen, in news and in incident text at fixed rates (`CURRENCY_RATES` in `src/data/settingsOptions.ts`: $ 1, C$ 1.35, £ 0.80, € 0.90, ¥ 150), so every currency is worth the same and none is 1:1 with another. Typed money (steppers, the currency trade amount) is entered in the chosen currency and converted back. Exact prices keep two decimals, except yen, which has none (`¥675`).
- **Deltas:** `+$1,663 (+3%)`, jade when positive and oxblood when negative. Text only, no arrows.
- **Rates:** two decimals with % (`3.25%`). Rate steppers move in 0.05pp steps; fee steppers in $1 (or $5 for annual fees).
- **Ratings:** coin row plus a number (`4.3`).

### 0.5 Components
| Component | Behaviour |
|---|---|
| `Stepper` | − value +. Long-press accelerates. Tap the value to type. Shows a min/max hint. |
| `Toggle` | On/off with a label. |
| `Segmented` | Category switch (Deposits / Lending / Cards & Services; Week / Quarter / Year). |
| `CoinRating` | Five brass coins with fractional fill, plus a number. |
| `StatBar` | Label, bar, value (Skill 93). |
| `RingGauge` | Margin ring with a % in the center and a caption (spread). |
| `RadarRosette` | Five-axis pentagon on a guilloche grid, with labels outside. |
| `BarChart` | Paired bars (revenue = ivory, income = brass) for the last 5 weeks, with date labels. |
| `LineChart` | Multi-series weekly trend. |
| `Donut` | Engraved ring segments with a legend. |
| `Carousel` | Horizontal snap with page dots, as in the original. |
| `Card` | Certificate-style card: double hairline and corner rosettes. |
| `Badge` | Capital tier, risk band, status. |
| `Toast` | Small transient notice above the bottom bar. |

---

## 1. Title and New Game

**Title screen ("Living skyline", docs/COVER_SCREEN.md):** top to bottom, inside the 16 px safe-area gutters:
- **Skyline panel**, full width, `clamp(300px, 50svh, 440px)` tall, on map paper: a live engraving of a real city drawn by the map renderer in that city's ink, panning slowly left and right (±26 px at 358 px wide, 26 s a sweep). A 1 px outer rule and a hairline inner rule in the city ink frame it, with the city name repeated as microprint in the band between them. **Returning player:** the city they're in, from the latest save card, with their bank's flags on the lots and offices they hold there (and rivals' flags in rival inks); the camera frames their nearest flag. **New player:** one of the 20 storefront cities, a different one each launch, starting with Saskatoon, with three showcase flags in Vault Blue. Until it's printed the panel shows its paper, rules and a faint guilloche; then the city crossfades in (400 ms). Reduced motion (system or in-game) holds it still and centred; the pan pauses while the page is hidden. Screen readers hear one description ("An engraved map of Saskatoon printed in prairie ochre, with your bank's flags on three rooftops.").
- **Caption row:** "Now showing {city}" (new player) or a brand-ink dot with "{bank} · {city}" (returning; an older save card without the cover record says "{bank} · Now showing {city}"), and five small brass dots, the first filled.
- **Wordmark** "VAULT STREET" on one line (Bodoni Moda 900, 38 px), and the tagline "Found a bank. Build an empire."
- **Menu:** Continue (primary, latest save) and New game (secondary; primary when there's no save), full width and 48 px tall; then Load · Settings · Credits as a row of three 44 px pills.
- **Footer**, one line: "A Longlight Interactive game · v{version}" and a **Check for updates** button: it asks the site for a newer version and reloads into it, or says you have the latest (handy in the home-screen app, which iOS often resumes rather than reloading).
- **Wide screens (≥ 900 px) and landscape:** two columns, the panel on the left at `min(60vw, 760px)` and full height, the words, menu and footer in a centred column on the right (max 360 px). Landscape phones under 500 px tall stack instead, with the panel at 45% of the height.

**New Game wizard** (5 steps, with Back and Next):
1. **Your bank:**
   - name (max 24 characters)
   - monogram (2 letters, auto-filled from the name)
   - **logo shape** (9 chips, each a small medallion in the shape: Coin, Shield, Lozenge, Hexagon, Plaque, Rosette, Tile, Pebble, Octagon; CONTENT §7b), with a one-line description
   - brand ink (12 swatches)
   - live medallion preview (in the chosen shape; the top bar, panel icons, the branch seal and the plaque over the counter all use it)
   - **house style** (6 chips: Old Exchange, Jazz Age, Clean Line, Market Street, Civic Stone, Quant Noir) under a live storefront wearing your name, ink and the style, with the style's one-line description; the confirm step lists it
2. **Founder:** name and the avatar builder (portrait parts, §ART): the live portrait with a one-line summary and a Shuffle button, then the parts in two groups, **Face** (head shape, eyes, brows, mouth, age, skin tone swatches) and **Style** (hair, facial hair, glasses, attire), each a row with ‹ › steppers showing the option name and its position (e.g. 3/4). The same picker opens from Settings → Edit founder avatar.
3. **Start city:** a Segmented row of regions (Canada / U.S. / Europe / Asia-Pacific), opening on the chosen city's region, then a card for each city in that region (all 20 cities with storefronts), each with:
   - the country (euro-area cities show their own country)
   - average rent, usual rival count, market size, policy rate
   - a one-line flavour
   - the intro line says the start city's country becomes the bank's home (central bank, tax, exchange)
4. **Game options:**
   - Difficulty: Segmented (Easy / Normal / Hard / Expert) with a one-line description of each
   - Competitors: Stepper 1–5 (defaults to the city's usual count)
   - Starting cash: Segmented ($600K / $900K / $1.2M / $1.5M), shown in the chosen currency (¥90M / ¥135M / ¥180M / ¥225M)
   - Currency: Segmented ($ / C$ / £ / € / ¥), defaulting to the saved preference; the display symbol only, changeable later in Settings
5. **Confirm:**
   - summary
   - advanced: seed (random by default), start date
   - "Open the doors" button

After the wizard, the map opens with the tutorial (§27).

## 2. Map

- **Canvas map:** isometric engraved city with pinch zoom (3 levels plus continuous), pan, and inertia.
- **Pins** are DOM marks positioned over the canvas. The shape says the category, the colour and glyph say the type (ART_DIRECTION §2 Pins):
  - **crest** (shield) = a bank. Yours: filled with your brand ink and monogram. Rivals: ivory with their ink ring and monogram. Head offices (your HQ, rival HQs) wear a small brass crown. **Everything you own** is a brand-ink crest too, with its own ivory glyph in place of the monogram: office (HQ, crowned), building (property), villa (vacation home), trophy (club). They stack on top and cluster with your branches.
  - **coin** = an open branch location: a small ivory "$" coin, quieter than everything else.
  - **medallion** = a place you deal with (bureau, investment bank, agency, convention, lobbying firm, employer, university, car dealer, auction house): filled with the type's own ink, ivory glyph.
  - **price tag** = something to rent or buy: offices ("For lease"), buildings and vacation homes ("For sale"). Once yours they become crests; "Selling" and "Rebuilding" show as a note under the crest.
  - **seal** = a landmark (central bank, airport, stadium): larger, scalloped.
- **Captions** from zoom 1.5: places show their type ("Credit bureau") in the type's ink; rival branches show the bank's short name. Captions follow the Text size setting.
- At the far zoom, nearby pins cluster, but only like with like (yours, rivals, open locations, places, tags; landmarks never cluster). A cluster shows a fanned stack of up to three member marks with a count chip; open locations collapse into a quiet brass dot "×N". Its label names what's inside.
- Tap a pin to open its panel. Tapping empty map does nothing.
- **Layers sheet:** a key to the five pin shapes, then an "All" toggle plus one toggle per type (14). Each row shows the actual pins it toggles. Toggles persist in settings.

## 3. Available location (storefront)

- **Header:** "Available location" with the address.
- **Advisor:** a generated traffic and rent comment ("Foot traffic is light here, but so is the rent.").
- **Hero:** empty storefront with an "Available" sign.
- **Fields:**
  - weekly rent (/week) and security deposit (upfront)
  - foot traffic (/week)
  - **Demographics:** five bars (Students, Young professionals, Families, Retirees, Businesses), plus income level (Low / Mid / High, with the index in small type) and homeowners %
  - **Your bank in {city}:** your branches here against the advice for a city this size ("4 of about 5") and a Market reached bar (SIMULATION §9.2). When the city is well covered (at the advised count, or 80% reached) the advisor adds that another branch would mostly split customers with your own.
  - **Nearby competition:** rival branch count within the radius and their average coins
  - **Area map:** a mini district map with this lot highlighted
- **Button:** Build branch.
  - Disabled with a reason when the capital tier forbids it, when cash is insufficient (show the amount required), or when you're not in this city.

## 4. Build branch

- **Starting pick:** the fit-out you last built with (`company.lastBuild`), so the parts don't need choosing again; before your first build, the mid reference build if cash allows, then basic, then the cheapest parts.
- **Hero:** the vignette updates live as you change parts. The same Inside / Outside switch as the branch panel shows the banking hall the lobby, teller line, vault and ATM picks make.
- **Five tiles:** Exterior, Lobby, Teller line, Vault, ATM. Each shows the current pick's thumbnail and price.
- **Tap a tile** to open a picker sheet: a carousel of options with name, one-line description, coins (Quality, Productivity, or Security for vaults), extra facts (stations, advisor offices, boxes), price, and Select.
- **Summary:**
  - itemized parts, lease deposit and first week's rent
  - total vs available cash
  - cash after build, and the cash cover it leaves (weeks of running costs, `src/sim/cashCover.ts`); both turn red with a warning line when under `ATTENTION.cashCoverWeeks`, because a new branch loses money for its first couple of months
  - **Build** button, then "Opening in 1 week" on the pin

## 5. Branch panel

- **Header:** "{Bank} — {District}" with the address.
- **Advisor:** the branch manager's portrait with a contextual line (CONTENT Advisor lines).
- **Hero:** the exterior, with an **Inside / Outside** pill (44 px tall) in the corner that switches to the banking hall (ART_DIRECTION §3) and back; the choice holds for the session. The inside view shows the real staff, morale tint and a queue as long as the wait, with a caption such as "3 of 3 windows open · busy".
- **Tabs:** Service · Products · Loan Desk · Marketing · Finance.

### 5.1 Service
- **Customer reviews:**
  - big overall number + coins + "n reviews"
  - four rows: Rates, Products, Service, Branch (coins + number)
  - review card carousel: customer mini-portrait, coins, a short quote
- **Staff:**
  - Staff stepper (shows "needed n")
  - Hourly wage stepper (shows the market wage)
  - a row of staff figures with mood bubbles (jade / brass / oxblood)
  - Staff skill and Staff morale bars
  - Wait chip: Short / Busy / Long
- **Branch manager:**
  - portrait and name
  - Manager skills bars: People, Product, Marketing, Ethics
  - "Manager since {date}"
  - Annual salary stepper, its hint showing market pay (SIMULATION §6.5) and the range, and a line under it: "Underpaid: rivals are more likely to poach them" (oxblood), "Paid about market" or "Well paid…", plus "Your COO reviews this pay once a quarter" while the COO's Pay reviews is on
  - Delegation toggles: Staffing & wages · Products & rates · Branch marketing · Branch troubles · Loan approvals
  - Fire manager (confirm)
  - **With no manager:** "Hire a manager" opens a sheet of 3 candidate cards (skills, salary ask, Hire). Below the cards, "New candidates · $fee" pays a recruiter for 3 new ones (the fee doubles each time until the free refresh, which the note under it counts down); before your first hire, the tutorial guide stays as the first card.

### 5.2 Products
- **House model card:** name, rosette, cost per application, "Manage models" (opens the HQ Products floor if it exists, otherwise a tip pointing to credit bureaus).
- **Segmented control:** Deposits | Lending | Cards & Services.
- **Product card carousel:**
  - icon, name, coins (product stars), Offered toggle
  - "New accounts last week" with the count and delta
  - Balance (or AUM)
  - Funding cost (FTP) or unit cost
  - Margin ring (%) with a spread caption (`Spread +2.40%`)
  - Price stepper (rate or fee)
  - trash icon on developed variants
  - The SBL card shows totals and "Managed on the Loan Desk →".
- **HQ lock:** when "Apply rates to all branches" is on at HQ, steppers lock and show "Set at HQ".

### 5.3 Loan Desk
- **Summary strip:** applications this week · approved · declined · approval rate · business loan balance · delinquent count.
- **Application cards:**
  - sector icon, business name, sector
  - amount · term · collateral
  - "Will pay up to x.xx%"
  - rosette (Management, Track record, Market, Competitiveness, Financial health)
  - risk band badge (when visible)
  - Rate stepper (defaults to the SBL price)
  - Approve / Decline
  - expiry chip ("Expires next week")
- **Active business loans:** a collapsible list (name, balance, rate, weeks left, status).

### 5.4 Marketing
- **Two-column grid of campaign cards:**
  - small vignette and name
  - level selector (Off + levels, labels from CONTENT)
  - cost line (per week, per new account, or % of fees)
  - effect hint (e.g. "Awareness ++ · Branch rating +")

### 5.5 Finance
- **Headline figures:** Branch revenue (with weekly change in $ and %) and Branch income (with change).
- **Chart:** paired bars for the last 5 weeks.
- **Branch income statement** (Week | Quarter | Year), with the line groups from SIMULATION §12.
- **Balances box:** Deposits, Loans, Customers.
- **Footer:** Rename branch, Close branch (confirm, showing what you get back).

## 6. Rival branch

- **Header:** rival brand + district, with the address.
- **Advisor:** "This is {Rival}'s branch. Their savings rate is {x}; ours is {y}."
- **Reviews:** same block as §5.1.
- **Rate sheet:** two columns of products with prices, plus a "vs our nearest branch" column (jade/oxblood) when you have a branch in the city.

## 7. Rival bank HQ (Banks layer)

Tabs: Overview · Loans · Credit.
- **Overview:** strategy, branch count, cities, public/private, share price, capital band (Strong / Adequate / Watch / …), CEO name.
- **Loans:** business loan offer cards with amount, interest rate, maturity, weekly payment, and Apply. Active loans show the balance and a "Repay early" option.
- **Credit:** line of credit with available limit, used amount, rate, and a draw/repay slider.

## 8. Central bank

- **Header:** institution name with the city.
- **Advisor:** a line from the governor's office.
- **Big policy rate**, plus the last decision with its date and the next meeting date.
- **Indicators:** GDP growth last quarter and forecast, inflation, unemployment, house price index trend.
- **Yield curve mini-chart:** overnight / 2y / 5y / 10y.
- **Standing lending facility:** the rate, your current usage, and Borrow / Repay (emergency; a stigma warning shows on first use).

## 9. Office for lease

- **Header** with the address; advisor line.
- **Hero:** building vignette.
- **Stats:** floors, area m².
- **Department list:** one Add toggle per department (description + desks). You can't select more departments than there are floor slots.
- **Costs:** weekly rent, security deposit, fit-out total.
- **Rent office** button, with available cash shown under it.

## 10. HQ

- **Header:** "{Bank} HQ" with the address, and an **Office** button. Shows an office switcher if you have more than one.
- **Office sheet** (from the header button): address, floors in use, weekly rent, which department sits on each floor; a **Tab order** card listing the floors you have in the order their tabs run along the bottom bar, each with ▲ ▼ arrows (44 px) to move it past its neighbour, and **Reset order** once any has moved (the order is saved with the game; departments you add later slot in where the usual order puts them); then **Release floor · {department}** (the floor you're on; "Close HR floor" on HR) and **Release office**, each with its confirm.
- **Bottom icon bar** (only departments you have): an icon over a short label for each floor, scrolling sideways when they don't fit. Finance (ledger) · HR (people) · Products (card) · Treasury (vault) · Marketing (megaphone) · IT (screen) · Risk (shield) · Executive (briefcase) · Investment (rising chart) · Add floor (plus).

**Every department floor shows:**
- **hero:** engraved isometric office interior whose desk count reflects staffing, furnished per department (ART_DIRECTION §3)
- **advisor:** a coverage-aware line ("We're short on finance staff — statements are running late.")
- **Employees:** stepper (`18 / 24`) with an Open positions chip
- **Annual salary:** stepper with the market hint
- staff figures with mood bubbles
- Skill and Morale bars
- **Coverage meter:** "Needs 21 · Coverage 86%"

**Floor-specific content:**
- **Finance:**
  - total revenue and net income with weekly change
  - bar chart
  - Statements: Income / Balance sheet / Cash flow, each Week | Quarter | Year
  - capital ratio (tier badge + meter with thresholds) and liquidity ratio; at Watch or worse, a "How to fix this" checklist under the meter (as §24)
  - risk appetite Segmented (1–5), with the level's name, its effect on loan volume and defaults, and a line naming who else steers it when a CRO (Risk appetite switch) or CFO (Capital switch) is seated
  - "Delayed" placeholders when short-staffed
- **HR:**
  - **Branch managers** card: a "Hire managers for empty branches" toggle (on by default; hint "Each week, the strongest candidate in the city"; SIMULATION §16.11), a "Branches without a manager" count, and, when the COO's Branch operations is on, a note that the COO hires first and also turns on the branch's delegation
  - Employee benefits carousel (vignette, name, description, control stepper, estimated weekly cost, effect badge like "+3 morale")
  - "Close HR floor" (release the floor)
- **Products:**
  - house model (rosette, cost/app, model name) and Manage models (sliders for each data input that sum to 100%, with a live rosette and cost)
  - company deposits and loans line chart with week-over-week changes
  - **Product lineup** (category Segmented + product cards like §5.2, at company level) and the "Apply rates to all branches" toggle
  - Product developments list (progress bar, weeks left) and New product
  - **New product form:**
    - name and product type grid (template icons)
    - target price tier: Low / Medium / Premium
    - development time: 4 / 8 / 12 / 24 / 48 weeks
    - weekly budget stepper, with the total cost under it
    - open-positions chip for the Products team
    - probability table (5★ … 1★ with %)
    - Start development
- **Treasury:**
  - liquidity gauge (LR vs minimum and target), with a funding freeze banner when active, and a one-way "Transfer cash to Treasury"
  - Treasury policy: target LR slider, bonds share slider, auto-funding toggle
  - Bonds: market value, book, unrealized gain/loss, yield, duration
  - **Funding inventory:** lot cards with counterparty, type, rate, amount, maturity date and rosette, plus Details and "Repay early" where flexibility allows
  - **Funding market:** offer cards with an amount slider and Borrow
  - **Central bank:** the standing facility from §8 (window rate, window and overnight usage, Borrow / Repay with the stigma warning)
  - **Partnerships:** cards with employer, employees, "Year 3 of 7", deposits and a health bar. Tap to open the partnership view (§14).
- **Marketing:** brand awareness by city (bars), brand campaign cards (scope: city or country; level; cost), active agency packages.
- **IT & Security:** app rating coins with a 26-week trend, a security posture summary, digital projects (developments of type Digital).
- **Risk & Compliance:**
  - loss-rate table by product (annualized, 13-week)
  - delinquency
  - model performance: predicted vs actual default rate
  - regulator status and last review result
- **Executive:**
  - Board meeting card: explanation, last meeting date, Hold meeting (enabled once per quarter)
  - Senior executives grid: eight seats (CEO, COO, CFO, CPO, CMO, CTO, CRO, CREO) with portrait, name and title; empty seats show Hire, which opens a sheet of the seat's candidates with a paid "New candidates · $fee" button at the bottom (as for branch managers)
- **Investment:**
  - portfolio value with weekly change, a donut (Stocks, Ventures, Real estate, Venture debt, Currencies) and List portfolio
  - Ventures carousel (vignette, name, sector, short description, founded, Details)
- **Add floor sheet:** department choices with descriptions, desks and fit-out cost.

### 10.1 Executive profile (sheet)
- portrait, name, title, hired date
- Leadership, Expertise and Loyalty bars
- delegation toggles for the role; three carry a **dial** (a stepped slider with named 44 px stops and a tagline estimating the company impact of the chosen stop, SIMULATION §17.2 "Delegation dials") nested under the switch:
  - COO · HR benefits: **Morale target** 70 / 80 / 90, tagline "Benefits +$1.2K/wk (3.4% of payroll, budget 8%) · morale 68 → about 80" (", as far as the budget reaches" when the budget stops short; "Needs an HR floor at HQ." without one)
  - COO · Pay reviews: **Review cadence** Quarterly | Annual, tagline "4 reviews a year · pay lags the market by up to 0.8% between reviews · next review +$22.6K/yr for 6 people", followed by the **Pay premium over market** stepper (−10% to +30%, "Market" at 0) with when the last review ran
  - CMO · Brand campaigns: **Awareness target** 40% / 50% / 60% / 70%, tagline "Campaigns +$25.0K/wk (2.1% of revenue, budget 3%) · pushes 3 of 6 cities · +9% new customers" ("· held back by the budget" when a city can't be afforded; "Needs a Marketing floor at HQ." without one)
- CFO: under the switches, for each Investing switch that is on, two lines: "For the bank: next stock, Cobalt AI for $5.44M, in 2 weeks." and "For the bank: next startup, 13% of Brightloom (scores 7.4) for $1.20M, in 2 weeks.", or what holds it back ("Waiting for spare cash: …", "The bank's stocks are at 5% of its assets.", "The bank's startup stakes would pass 3% of its assets.", "The capital ratio would fall under 12%.", the regulator at a restricted tier, "No startup on the floor's list scores 6 or more right now.", "Startups come from the Investment floor: add one at HQ.")
- CFO and CRO: **Branch guidance now**: the deposit and loan rate offsets and how much stricter or looser approvals are, noting which switch is off
- COO, CMO and CPO: **Branch guidance now**: the COO's wage and headcount change, the CMO's campaign push, or the CPO's fee change and whether the lineup is wider or narrower, noting when the switch is off
- CREO: four switches. **Rents: the bank's buildings** and **Rents: your own buildings**, each with an **Occupancy** dial under it (80% / 85% / 90% / 95% / 100%; tagline: "Rent +5% per m² · net rent $2.53M/yr, $177K less than at 100%", "As full as tenants allow · net rent $1.15M/yr across 2 buildings", or with no buildings "No buildings yet: …"); then **Buying: the bank's buildings** and **Buying: your own buildings**. Then a note: "Managing 3 buildings of the bank's and 1 of yours: tenants pay up to 8% over market, and rents are reviewed every 4 weeks (next in 2 weeks)." (or, with both off, how many buildings wait on the switches), and for each Buying switch that is on: "For the bank: next, 803 Copper Lane in Calgary for $3.27M (13.8% a year), in 3 weeks." or what holds it back ("Waiting for spare cash: …", "The bank's buildings would pass 5% of its assets.", "The capital ratio would fall under 12%.", the regulator at a restricted tier, "No building for sale earns its keep right now.")
- COO only: **Growth cities**: every city you have visited, home first, each with a switch (may the Expansion delegation build here) and an **Open now** button that has the COO build their usual pick at once; the hint under each city shows how many branches you already have there (open or being built), then the next storefront and its cost, or why nothing can be built there
- annual salary stepper
- grants list: type, shares, strike, vesting progress
- **Add grant:**
  - Stock option | RSU
  - shares stepper
  - strike price stepper (options only)
  - 4-year vesting preview table
  - Add
- Fire (confirm, showing severance)

### 10.2 Board meeting (modal)
- **Dividends:** current dividend per share and yield, new per-share stepper, payout ratio, and the regulator cap note when the tier restricts it.
- **CEO compensation:** current, plus a new stepper.
- **Take votes:** an animated tally (For / Against %) per item, then the outcome. If approved, the declared dividend schedules its payment in 3 weeks.
- **Quarterly reminder (Stage 6):** the same modal opens once per quarter with Later / Hold meeting when the board hasn't met (after weekly results and incidents).

## 11. Startup detail

- **Header:** name with the sector.
- **Advisor:** "They're raising a Series C." / "They aren't raising right now."
- **Profile:** description, founded date, CEO portrait and name, pre-money valuation.
- **Benchmark rosette.**
- **Financial:** Income | Balance sheet toggle; total revenue and net income with quarterly bars.
- **Funding:**
  - round name and Company | Private toggle
  - available cash for the chosen account
  - two offer-lot cards: "{Name} stock — n shares (15.00%) $price — Invest"
- **Venture debt:** amount and rate steppers, Offer loan.
- **Funding history:** round, amount, date.
- **Top shareholders:** names with %.

## 12. Investment bank

- **Header:** name, "Investment bank".
- **Hero:** trading floor vignette.
- **Tabs:** Market · Equity · M&A.

**Market:**
- the Ledger Composite index card (value, weekly change, sparkline)
- sector Segmented: Banking, Technology, Energy, Auto, Retail, Real estate, Currencies
- **Currencies** (SIMULATION §19.10): one card per foreign currency with flag-free country medallion, name, index vs home with weekly change and sparkline, a one-line "why it's moving" (growth, rates, cycle), your position (company / personal) and Buy / Sell with an amount stepper and Company | Private toggle
- company card carousel:
  - monogram, name, ticker and exchange
  - sparkline and price
  - Market cap, Dividend (yield), 52-week high and low, P/E
  - Top shareholders (3 rows)
  - Trade
- **Trade sheet:** Company | Private toggle, shares slider and field, Buy / Sell, cost preview, available cash, current position.

**Equity:**
- **While private:**
  - Private placement card: new shares stepper (% of outstanding), price per share, gross, fee, capital raised, investor name, Raise
  - IPO card: eligibility checklist (✓/✗ per rule), float % stepper, indicative price, fee %, Launch IPO
- **While public:** Secondary offering card:
  - New shares stepper (with % of outstanding)
  - Price per share
  - Gross proceeds
  - Underwriting fee (x.xx%)
  - Capital raised
  - Issue new shares
- **While public:** Share buyback card (SIMULATION §19.6a):
  - shares stepper (% of outstanding, up to 10%)
  - shares retired, price per share (with the 2% premium), broker's fee, total cost
  - your stake after, capital ratio after
  - a note when the minimum public float caps the size, and the date of the next allowed buyback
  - Buy back for $X (disabled with the reason when blocked)

**M&A:**
- rival bank cards: like Market cards, plus branches, cities and deposits; distressed sales get a special badge
- **Offer M&A sheet:**
  - offer price per share stepper and premium % (as the board sees it, after any share-part discount)
  - shares outstanding
  - once listed, "Paid in your shares": Cash · 25% · 50% · 75% · All; with a share part, rows for paid in new shares, new shares issued (% of outstanding) and your stake after
  - paid in cash (total cost when all cash)
  - available cash
  - regulator pre-check (✓/✗ with reasons)
  - Offer merger
- The response arrives the next week.
- Below the cards: integrations in progress (bank, branches, weeks left) and completed deals.
- **Converting branches (Stage 6):** while an acquired branch converts, its map pin keeps the old bank's ink and monogram with a brass progress ring and (at close zoom) a "Converting" label; the branch panel shows the old medallion and a "Converting from X: N weeks left" banner.

## 13. Credit bureau
- Header and advisor.
- Packaged models carousel: name, tier, rosette, cost per application, "Use as house model".
- The current house model is marked.
- My model: commission a custom mix (sliders per data input, live rosette and cost), hosted by the bureau.

## 14. Employer (partnerships)

- **Header:** employer name with its type.
- **Advisor** and **hero** vignette.
- **Stats:** employees, average income, current banking partner (a rival or none).
- **Deal:**
  - signing fee and contract length
  - expected deposits curve chart
  - package selector (deposit product)
  - host branch selector
  - Sign partnership
- **Yours:**
  - health bar, "Year X of 7", deposits and accounts
  - curve with a "you are here" marker
  - Renew (shows the fee) / Release

## 15. Marketing agency · Lobbying firm · University

- **Marketing agency:** package cards (name, cities, weeks, cost, awareness boost) with Buy.
- **Lobbying firm:**
  - campaign cards with cost, success %, exposure risk %, and Lobby
  - the outcome arrives in 4–8 weeks
  - campaigns: "Ease the capital buffer by 1pp for 4 quarters", "Fast-track a merger review", "Stall the capital buffer bill" (only while one is pending; there is no fee-cap law to delay)
  - sections: In force, Under way (weeks left), Past campaigns
- **University:**
  - Student partnership: same as an employer deal, but with student accounts
  - Graduate program: yearly cost ($120k × wageIndex); adds +10 to candidate skill and +1 hire a week

## 16. Real estate

- **For sale:**
  - address, building space m², estimated value
  - market rent (/m²/yr) and occupancy
  - asking price
  - Company | Private toggle
  - offer price stepper, Offer purchase
- **Owned:**
  - address, space, estimated value, purchase price
  - **Real estate income:**
    - annual rent per m² stepper, hint "Market rent $1,205 /m²/yr" plus ", heading to $1,260" while market rent is still catching up with the cycle (SIMULATION §21.2)
    - when the CREO's switch covers this owner: "{Name} (CREO) reviews this rent every 4 weeks; tenants here pay up to 8% over market."
    - occupancy % (and "Heading toward" while it is still moving)
    - weekly rent revenue, weekly maintenance and weekly vacancy cost
    - weekly net rent income
    - ROI %
  - **Real estate sale:** For Sale toggle
- **Foreclosed homes** (Company → Real estate): units, value, carrying cost, rent income, and Rent / Sell all.
- **Map pins:** a building's pin shows only while it's for sale ("For sale" tag, never "For lease") or once you own it (your seal; "Selling" while For Sale is on). Unlisted buildings say "Not for sale right now; listings refresh every 4 weeks".

## 17. Convention

- **Header:** event name with its dates.
- **Advisor:** "Founders everywhere. Let's find a deal."
- **Hero:** exhibition hall vignette.
- **Ventures carousel:** exclusive startups.
- **Networking:** 1–2 cards (an executive candidate, a partnership lead).
- **Before it opens:** the dates and "Opens in N weeks" (announced 4 weeks ahead; open for 4 weeks). The convention centre's pin shows only from the announcement to the end of the event.

## 18. Airport and travel

- **Header:** airport name; advisor.
- **Hero:** terminal vignette.
- **Stats:** flown this week and remaining mileage (weekly allowance).
- **Departures board:** split-flap styled rows (airport code tiles, destination, country, distance in km or mi), nearest first, with a region filter (All / Americas / Europe / Asia-Pac). Rows mark "New" for places you haven't visited, "regional site", and your branch count there. Tap a row to fly: the plane follows a dotted great-circle arc across a world map (tap to skip; a still frame with reduced motion), then the destination map loads and a toast welcomes you. Rows beyond the remaining mileage stay tappable and show the one-way fare ("$104K ticket"); a confirm shows what personal cash pays and what the bank pays as a travel expense. Travel is never blocked.
- **Private jet card:** without a jet, both models (price, range, Buy with confirm). With one: value, weekly upkeep, Fly now (the board in jet mode: rows within range read "Jet") and Sell (shows resale, confirm).
- **City pill** (bottom centre of the map, SCREENS §0.2): tap for the Travel sheet — where you are, this week's mileage, Go to the airport, and Fly now with a jet.

## 19. Vacation home · Car dealer · Auction house

- **Vacation home:** address, location, "Personal purchase — not a rental property", asking price, Offer purchase. Once owned: Rebuild (cost, weeks, value gain).
- **Car dealer:** the showroom, a car carousel (maker, model, price, a line of flavour, Buy with personal cash).
- **Auction house:** tabs Buy | Sell.
  - Buy: upcoming auctions (lot card: vignette, name, estimate, date). Details shows the description, max bid stepper and Place bid.
  - Sell: your items (purchase price, fair value, status Unverified / Genuine / Counterfeit with a stamp), Appraise (shows the fee), Consign.

## 20. Sports franchise

- **For sale:** club name and sport, league, last-season finish, owner, valuation, Company | Private toggle, Offer purchase.
- **Owned** — tabs Club · Kit · Squad · Transfers · Finance:
  - **Club:** position, record, fan mood, stadium.
  - **Kit:** colour pickers and shirt sponsor. Choosing your bank boosts brand awareness in that country.
  - **Squad:** star players (name, position, rating, salary) and payroll totals (stars, others, total).
  - **Transfers:** window status, available players, sign / release.
  - **Finance:** revenues (tickets, broadcasting, merchandise, sponsorship), expenses (payroll, operations), net income.

## 21. Weekly results (modal)

- **Header:** bank medallion, "Weekly results" ("Monthly results" / "Quarterly results" when the setting rolls the period up), ✕. Under it: "Week 9 · ending 7 Mar 2027" or "February 2027 · 4 weeks, ending 28 Feb 2027"; the date is the last day the week (or period) covers. A monthly or quarterly report opens on the tick that closes the period's last week, never partway into the next one.
- **Date line:** "Week N · ending {date}", or for a roll-up "{October 2027 | Q4 2027} · N weeks, ending {date}" (a snapshot week belongs to the month or quarter its last day falls in, so a month is 4 or 5 weeks).
- **Headline figures:** revenue and net income for the period, each with the change on the last week / month / quarter ("First month of trading" when there is none).
- **Cash flow:** Cash from operations, Investing, Financing, Net cash flow, summed over the period.
- **The Weekly Ledger card** (the period's latest issue):
  - masthead and date
  - tabs: Top | World | Banking | Business | Markets | Politics | Sports (they scroll sideways on a phone)
  - two-column article grid (icon vignette, headline, 1–2 sentence body)
- **Earlier this month / quarter** (roll-ups only): a card listing each earlier issue's date and lead headline; the archive in the menu has the full issues.
- When Finance is short-staffed, the figures read "Delayed".
- Close resumes the game.

## 22. Incident (modal)

- **Header:** "Incident" with the scope (branch name or company).
- **Advisor:** portrait with the incident text.
- **Pager:** "Case 1 of N".
- **Options:** 2–3 buttons, each with its cost and an effect preview.
- **Footer:** "Your manager can handle these" (link to delegation) for branch incidents.

## 23. Personal wealth

- **Profile:** avatar, name, "CEO, {Bank}", annual salary.
- **Total assets:** big figure with weekly change, plus a donut (Cash, Stocks, Real estate, Others) and a legend with values.
- **Stocks:** cards with shares, cost basis, current value and gain/loss, plus Trade.
- **Real estate:** cards with ROI, value and gain.
- **Other assets:** homes, cars, collectibles, jet, franchise.
- **Rich list:** rank chip ("#38 on the Rich List").

## 24. Company summary (menu → Company)

- **Where to look** at the top: the three things that most need you, worst first (Urgent / Watch / Note), each a tap to the right screen: capital tier, corporate cash below zero or under `ATTENTION.cashCoverWeeks` of running costs, open cases, a lending freeze or liquidity under the minimum (or under target with auto-funding off), expiring loan applications, branches losing money for 4 weeks, ratings under 2.5, understaffing, loan losses over the CRO ceiling, morale under 50, branches without a manager, empty executive seats, switched-off delegations, low awareness. "All clear" when nothing qualifies. Ranking in `src/sim/attention.ts`, thresholds in `ATTENTION`.
- capital ratio with tier badge and a meter with thresholds
- at Watch, Restricted or Critical, a "How to fix this" checklist under the meter (`src/data/capitalFixes.ts`): sell new shares at an investment bank (Private placement, or Secondary offering once listed), sell company stocks and startup stakes, turn risk appetite down (Finance floor), hold off on growth and dividends; at Critical, a line on the emergency rescue
- **Cash** card: corporate cash, running costs a week and **cash cover** (weeks of running costs; red under `ATTENTION.cashCoverWeeks`)
- liquidity ratio with the Treasury gauge's status badge, the target, overnight borrowing when any, and a line saying whether auto-funding is holding the target
- totals: assets, deposits, loans, equity
- share price or private valuation, with the 52-week range, market cap, your stake and top shareholders
- a Personal line: personal cash plus holdings
- one-line explanations ("Deposits fund loans; capital limits growth") with a "Learn more" sheet
- links to the full statements (Finance floor, or a simplified view without an HQ)

## 25. Branches list

- Sortable rows: name, city, coins, deposits, loans, weekly income, issues badge.
- Filter by city (sideways-scrolling chips, hidden with one city). Once the bank spans several countries, chips and rows show the country code and "All cities" groups rows under country headings, home first.
- Tap a row to open the branch panel (works from any city).

## 26. Settings and saves

- **Settings:**
  - currency symbol ($, C$, £, €, ¥) and distance units (km/mi)
  - results frequency (every week / every month / every quarter / off)
  - default speed
  - auto-pause on incidents and on expiring applications
  - sound, reduced motion, text size (100 / 115 / 130%)
  - edit founder avatar
  - **Tutorial:** Replay tutorial, the Guides switch and "Show the guides again" (§27)
  - **Developer:** a "Developer tools" switch, saved on this device only (not in the game save). When on, in a game, a button adds `DEV_PAYMENT` ($10,000,000) to corporate cash as paid-in capital (`devPayment` command; no shares issued, the books still balance). From the title screen it only notes that the tools work inside a game.
- **Saves:**
  - autosave card
  - 3 slot cards (bank name, date, cash; Save here / Load / Delete)
  - Export save code (copy, share sheet) and Import save code (paste; validates the version)

## 27. Tutorial

Led by your first branch manager in a bar with their portrait, name, step and line; each step lights its target with a brass ring and moves on when you do the thing, never on a timer. When the ring's target is low on the screen the bar docks at the top, under an open panel's header so its Close button stays reachable.

### 27.1 Part 1: Opening week
Steps (each skipped when there's nothing to do, e.g. every branch already has a manager):
1. Tap a storefront
2. Build a branch
3. Set the savings rate
4. Hire a manager
5. Unpause and read the first weekly results
6. Turn on Personal Loans
7. Approve your first business loan
8. Run a campaign (Marketing tab: any campaign above Off; skipped where the manager runs marketing)
9. Meet the bank (open the Company summary from your cash, top left: corporate cash versus deposits, and the capital ratio; done when you close it)

Then a closing card that says the guides will return as the bank grows. "Skip tutorial" sits in the bar; Settings → Replay tutorial starts it again.

### 27.2 Part 2: Growing the bank
After Part 1 is finished or skipped, with Settings → Guides on (the default):
- **Guides** start on the map, one at a time, when a mechanic opens up, and pause the clock. Each has a "Skip guide" button and a step count; a step that ends on reading shows "Got it".

  | Guide | Starts when | Steps |
  |---|---|---|
  | Capital is slipping | capital tier Watch or worse | open the Company summary, read the capital fixes, close it (ends early if capital recovers) |
  | Headquarters | the founder ramp begins (third branch) and you have no office | tap an office for lease; pick Finance and HR, Rent office; read Coverage on the HQ floor, close it |
  | The executive suite | you have an Executive suite and no executives | Menu → HQ → Executive suite → an empty seat → Hire; then "Got it" on choosing their jobs |
  | Going public | every IPO rule is met while private | tap an investment bank; read the IPO card on the Equity tab, close it (ends early once listed) |
  | A second city | the city you're in is well covered (§3) and you've never flown | tap the city name → Go to the airport; read the departures, fly or close |
  | Your own fortune | personal cash reaches GUIDES.wealthCash | Menu → Personal wealth; read it, close it |

- **First-look tips** show once, the first time you open each HQ floor, each map place (rival branch and HQ, central bank, bureau, agency, employer, university, investment bank and its M&A tab, startup, property, convention, lobbying firm, airport, vacation home, car dealer, auction house, sports club), Personal wealth, the Ledger, a branch's Finance tab, a board meeting and an incident. They end on "Got it" or when you move on. Popup tips dock at the top, clear of the choices. A finished guide marks the tips it already covered.
- **Settings:** a Guides switch, and "Show the guides again" to see every guide and tip once more.

## 28. Milestones (menu → Milestones)

- Subtitle: "n of 11 reached".
- One row per milestone (data/milestones.ts) in order: a filled brass diamond ◆ when reached with "Reached {date}", an outline ◇ with the goal otherwise.
- Read-only. Reaching one toasts "Milestone reached: …"; the big ones also make a Ledger story.

## 29. Portfolio (menu → Portfolio)

The same view as the HQ Investment floor's portfolio, reachable from anywhere:
- Company / Private toggle
- portfolio value with weekly change and the donut (Stocks, Ventures, Real estate, Venture debt, Currencies)
- the holdings list; empty states point to investment banks, the Investment floor and conventions
