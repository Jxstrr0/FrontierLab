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
5. **Bottom tab bar:** when the panel has tabs. The current tab sits in a brass pill and is scrolled to the middle whenever it changes. When the tabs don't all fit, the bar scrolls sideways and a side with hidden tabs fades under a chevron (tap to page that way). The five sales office tabs fit at 390 px.

**Phone vs desktop:** on phones, panels slide up full-screen. On screens ≥ 900 px wide, they open as a right drawer, `min(480px, 40vw)` wide, over the map. Modals are centered cards; on phones they become bottom sheets. While any panel, sheet or modal is open the game clock holds (DESIGN §5.1); it resumes when you close it.

### 0.2 HUD (over the map)
- **Top-left:** your lab's medallion + corporate cash. Tap → Company summary (§24).
- **Top-right:** date pill and speed control.
  - Tap cycles 1× → 2× → 4×. Long-press or the ❚❚ button pauses.
  - While paused, the pill hides the speed and dims. It also reads paused while a panel, sheet or popup is open, since the clock runs only on the map.
  - **Next week** button (▶|): plays out the rest of the week instantly, runs the weekly tick (weekly results, autosave, auto-pause checks) and leaves the game paused. This allows week-by-week play.
- **Bottom-left:** Layers button.
- **Bottom-center:** city pill with an engraved flag. Tap → Travel sheet (the nearest airport's departures, plus "Fly now" if you own a jet).
- **Bottom-right:** Menu.
- **Badges:** pins show a small oxblood dot for an unresolved incident, a brass dot for new proposal requests on the Deal Desk.
- **Cases chip:** while incidents wait for a decision, an "N cases" chip sits under the date pill and reopens the incident modal.

### 0.3 Menu sheet
Company · HQ · Sales offices · Personal wealth · The Inference (archive) · Settings · Save game · Exit to title. (Portfolio moved under Personal wealth and Milestones and Frontier projects under Company on 2026-10-30, owner's review B4.)

### 0.4 Formatting
- **Money:**
  - cards and headlines: compact (`$1.48B`, `$29.8M`, `$83.7K`)
  - statements: full (`1,482,140,000`)
  - **currency:** the books are kept in one money (dollars). The chosen symbol converts every amount on screen, in news and in incident text at fixed rates (`CURRENCY_RATES` in `src/data/settingsOptions.ts`: $ 1, C$ 1.35, £ 0.80, € 0.90, ¥ 150), so every currency is worth the same and none is 1:1 with another. Typed money (steppers, the currency trade amount) is entered in the chosen currency and converted back. Exact prices keep two decimals, except yen, which has none (`¥675`).
- **Deltas:** `+$1,663 (+3%)`, jade when positive and oxblood when negative. Text only, no arrows.
- **Rates:** two decimals with % (`3.25%`). Rate steppers move in 0.05pp steps; plan price steppers in $1 (or $5 for annual plans); usage prices per million tokens in their own step (CONTENT Products).
- **Ratings:** coin row plus a number (`4.3`).

### 0.5 Components
| Component | Behaviour |
|---|---|
| `Stepper` | − value +. Long-press accelerates. Tap the value to type. Shows a min/max hint. |
| `Toggle` | On/off with a label. |
| `Segmented` | Category switch (Plans / API / Apps (the full name of the last is Apps & Services); Week / Quarter / Year). |
| `CoinRating` | Five brass coins with fractional fill, plus a number. |
| `StatBar` | Label, bar, value (Skill 93). |
| `RingGauge` | Margin ring with a % in the center and a caption (spread). |
| `RadarRosette` | Five-axis pentagon on a guilloche grid, with labels outside. |
| `BarChart` | Paired bars (revenue = ivory, income = brass) for the last 5 weeks, with date labels. |
| `LineChart` | Multi-series weekly trend. |
| `Donut` | Engraved ring segments with a legend. |
| `Carousel` | Horizontal snap with page dots, as in the original. |
| `Card` | Certificate-style card: double hairline and corner rosettes. |
| `Badge` | Safety tier, risk band, status. |
| `Toast` | Small transient notice above the bottom bar. |

---

## 1. Title and New Game

**Title screen ("Living skyline", docs/COVER_SCREEN.md):** top to bottom, inside the 16 px safe-area gutters:
- **Skyline panel**, full width, `clamp(300px, 50svh, 440px)` tall, on map paper: a live engraving of a real city drawn by the map renderer in that city's ink, panning slowly left and right (±26 px at 358 px wide, 26 s a sweep). A 1 px outer rule and a hairline inner rule in the city ink frame it, with the city name repeated as microprint in the band between them. **Returning player:** the city they're in, from the latest save card, with their lab's flags on the lots and offices they hold there (and rivals' flags in rival inks); the camera frames their nearest flag. **New player:** one of the 20 storefront cities, a different one each launch, starting with Saskatoon, with three showcase flags in Midnight Blue (the default brand ink's name). Until it's printed the panel shows its paper, rules and a faint guilloche; then the city crossfades in (400 ms). Reduced motion (system or in-game) holds it still and centred; the pan pauses while the page is hidden. Screen readers hear one description ("An engraved map of Saskatoon printed in prairie ochre, with your lab's flags on three rooftops.").
- **Caption row:** "Now showing {city}" (new player) or a brand-ink dot with "{lab} · {city}" (returning; an older save card without the cover record says "{lab} · Now showing {city}"), and five small brass dots, the first filled.
- **Wordmark** "Frontier Lab" on one line (Bodoni Moda 900, 38 px), and the tagline "Found a lab. Build an empire."
- **Menu:** Continue (primary, latest save) and New game (secondary; primary when there's no save), full width and 48 px tall; then Load · Settings · Credits as a row of three 44 px pills.
- **Footer**, one line: "A Longlight Interactive game · v{version}" and a **Check for updates** button: it asks the site for a newer version and reloads into it, or says you have the latest (handy in the home-screen app, which iOS often resumes rather than reloading).
- **Wide screens (≥ 900 px) and landscape:** two columns, the panel on the left at `min(60vw, 760px)` and full height, the words, menu and footer in a centred column on the right (max 360 px). Landscape phones under 500 px tall stack instead, with the panel at 45% of the height.

**New Game wizard** (5 steps, with Back and Next):
1. **Your lab:**
   - "Lab name" (max 24 characters)
   - monogram (2 letters, auto-filled from the name)
   - **logo shape** (9 chips, each a small medallion in the shape: Coin, Shield, Lozenge, Hexagon, Plaque, Rosette, Tile, Pebble, Octagon; CONTENT §7b), with a one-line description
   - brand ink (12 swatches)
   - live medallion preview (in the chosen shape; the top bar, panel icons, the office seal and the plaque over the counter all use it)
   - **house style** (6 chips: Old Exchange, Jazz Age, Clean Line, Market Street, Civic Stone, Quant Noir) under a live storefront wearing your name, ink and the style, with the style's one-line description; the confirm step lists it
2. **Founder:** name and the avatar builder (portrait parts, §ART): the live portrait, pinned to the top of the scrolling area so it stays in view, with a one-line summary and a Shuffle button beside it; then the parts in three groups, **Face** (features, head shape, eyes, brows, mouth, age, skin tone swatches), **Hair** (style, hair colour swatches, facial hair) and **Style** (glasses, attire, outfit colour swatches). Each part is a row with ‹ › steppers showing the option name and its position (e.g. 3/4); colour rows show round swatches with the chosen colour's name. The same picker opens from Settings → Edit founder avatar.
3. **Start city:** a Segmented row of regions (Canada / U.S. / Europe / Asia-Pacific), opening on the chosen city's region, then a card for each city in that region (all 20 cities with storefronts), each with:
   - the country (euro-area cities show their own country)
   - rows: Rents, Usual rival labs, Market size, Policy rate
   - a one-line flavour
   - the intro line says the start city's country becomes the lab's home (central bank, tax, exchange)
4. **Game options:**
   - Difficulty: Segmented (Easy / Normal / Hard / Expert) with a one-line description of each
   - Competitors: Stepper 1–5 (defaults to the city's usual count)
   - Seed money: Segmented ($1M / $1.5M / $2M / $2.5M, default $1.5M), shown in the chosen currency (¥150M / ¥225M / ¥300M / ¥375M), with the note "Your seed round: all of it is yours to spend."
   - Currency: Segmented ($ / C$ / £ / € / ¥), defaulting to the saved preference; the display symbol only, changeable later in Settings
5. **Confirm:**
   - summary
   - advanced: seed (random by default), start date
   - "Open the doors" button

After the wizard, the map opens with the tutorial (§27).

## 2. Map

- **Canvas map:** isometric engraved city with pinch zoom (3 levels plus continuous), pan, and inertia.
- **Pins** are DOM marks positioned over the canvas. The shape says the category, the colour and glyph say the type (ART_DIRECTION §2 Pins):
  - **crest** (shield) = a lab. Yours: filled with your brand ink and monogram. Rivals: ivory with their ink ring and monogram. Head offices (your HQ, rival HQs) wear a small brass crown. **Everything you own** is a brand-ink crest too, with its own ivory glyph in place of the monogram: office (HQ, crowned), building (property), villa (vacation home), trophy (club). They stack on top and cluster with your sales offices.
  - **coin** = an open storefront location: a small ivory "$" coin, quieter than everything else.
  - **medallion** = a place you deal with (data vendor, investment bank, agency, convention, lobbying firm, employer, university, car dealer, auction house): filled with the type's own ink, ivory glyph.
  - **price tag** = something to rent or buy: offices ("For lease"), buildings and vacation homes ("For sale"). Once yours they become crests; "Selling" and "Rebuilding" show as a note under the crest.
  - **seal** = a landmark (central bank, airport, stadium): larger, scalloped.
- **Captions** from zoom 1.5: places show their type ("Data vendor") in the type's ink; rival sales offices show the lab's short name. Captions follow the Text size setting.
- At the far zoom, nearby pins cluster, but only like with like (yours, rivals, open locations, places, tags; landmarks never cluster). A cluster shows a fanned stack of up to three member marks with a count chip; open locations collapse into a quiet brass dot "×N". Its label names what's inside.
- Tap a pin to open its panel. Tapping empty map does nothing.
- **Layers sheet:** a key to the five pin shapes, then an "All" toggle plus one toggle per type (16). Each row shows the actual pins it toggles. Toggles persist in settings. **Sales Offices** (your offices, rival offices and open locations; id `branches` kept for saved toggles), **Data Centers** (yours, with your crest) and **Energy Sites** (the regional sites, an amber bolt medallion; they used to sit in the Employers layer) each have their own toggle (C2d1). The key's crest row reads "Labs".

## 3. Available location (storefront)

- **Header:** "Available location" with the address.
- **Advisor:** a generated traffic and rent comment ("Foot traffic is light here, but so is the rent.").
- **Hero:** empty storefront with an "Available" sign.
- **Fields:**
  - weekly rent (/week) and security deposit (upfront)
  - foot traffic (/week)
  - district
  - **Demographics:** five bars (Students, Developers, Consumers, Researchers, Small shops), plus income level (Low / Mid / High, with the index in small type). (The bank-era homeowners % row was dropped in v0.1.51: nothing in the lab game reads it.)
  - **Your lab in {city}:** "Your sales office here" (its size, or none yet) and a Market reached bar (SIMULATION §9.2). When the city is well covered (80% reached) the advisor says a bigger office would mostly split customers with your own.
  - **Nearby competition:** rival sales offices within N tiles, their average rating, and your other sales offices nearby
  - **Area map:** a mini district map with this lot highlighted
- **Buttons:** Build sales office, and Build data center (§5b).
  - Disabled with a reason when the safety tier forbids it, when the city already has your office, when cash is insufficient (show the amount required), or when you're not in this city.

## 4. Build sales office

- **Starting pick:** the fit-out you last built with (`company.lastBuild`), so the parts don't need choosing again; before your first build, the mid reference build if cash allows, then basic, then the cheapest parts.
- **Hero:** the vignette updates live as you change parts. The same Inside / Outside switch as the sales office panel shows the inside the lobby, sales desks, machine room and demo kiosk picks make.
- **Five tiles:** Exterior, Lobby, Sales desks, Machine room, Demo kiosks (slot ids `teller`, `vault`, `atm`). Each shows the current pick's thumbnail and price. Option names follow, e.g. Standard Sales Floor, Machine Room, Wall Kiosk (`src/app/build/builds.ts`).
- **Tap a tile** to open a picker sheet: a carousel of options with name, one-line description, coins (Quality, Productivity, or Security for the machine room), extra facts (stations, "meeting rooms" for the lobby, "storage bays" for the machine room, kiosk traffic), price, and Select.
- **Summary:**
  - itemized parts, lease deposit and first week's rent, plus a **Market-entry licence** row on the first office in a new region (SIMULATION §20a)
  - total vs available cash
  - cash after build, and the cash cover it leaves (weeks of running costs, `src/sim/cashCover.ts`); both turn red with a warning line when under `ATTENTION.cashCoverWeeks`, because a new office loses money for its first couple of months
  - **Build** button, then "Opening in 1 week" on the pin

## 5. Sales office panel

- **Header:** the office name (usually its district), with "{Lab} · address" under it, so a long lab name never pushes the district off the line.
- **Advisor:** the office manager's portrait with a contextual line (CONTENT Advisor lines).
- **Hero:** the exterior, with an **Inside / Outside** pill (44 px tall) in the corner that switches to the inside (ART_DIRECTION §3) and back; the choice holds for the session. The inside view shows the real staff, morale tint and a queue as long as the wait, with a caption such as "3 of 3 windows open · busy".
- **Tabs:** Service · Products · Deal Desk · Marketing · Finance.

### 5.1 Service
- **Customer reviews:**
  - big overall number + coins + "n reviews"
  - four rows: Price, Products, Service, Sales office (coins + number)
  - review card carousel: customer mini-portrait, coins, a short quote
- **Staff:**
  - Staff stepper (shows "needed n")
  - Hourly wage stepper (shows the market wage)
  - a row of staff figures with mood bubbles (jade / brass / oxblood)
  - Staff skill and Staff morale bars
  - Wait chip: Short / Busy / Long
- **Office manager:**
  - portrait and name
  - Manager skills bars: People, Product, Marketing, Ethics
  - "Manager since {date}"
  - Annual salary stepper, its hint showing market pay (SIMULATION §6.5) and the range, and a line under it: "Underpaid: rivals are more likely to poach them" (oxblood), "Paid about market" or "Well paid…", plus "Your COO reviews this pay once a quarter" while the COO's Pay reviews is on (each HQ department floor's Team card shows the same line under its salary)
  - Delegation toggles: Staffing & wages · Products & prices · Sales office marketing · Sales office troubles · Deal approvals
  - Fire manager (confirm)
  - **With no manager:** "Hire a manager" opens a sheet of 3 candidate cards (skills, salary ask, Hire). Below the cards, "New candidates · $fee" pays a recruiter for 3 new ones (the fee doubles each time until the free refresh, which the note under it counts down); before your first hire, the tutorial guide stays as the first card.

### 5.2 Products
- **AI model card:** name, rosette (Reasoning, Speed, Breadth, Safety, Efficiency), data licence per customer a year, "Manage models" (opens the HQ Products floor if it exists, otherwise a tip pointing to data vendors).
- **Segmented control:** Plans | API | Apps (`CATEGORY_NAMES`: "Apps & Services" in full, shortened to fit the switch at 390 px).
- **Product card carousel:**
  - icon, name, coins (product stars), Offered toggle
  - "New seats last week" (plans) or "New sign-ups last week" (usage), with the count and delta
  - ARR, with "incl. partners" when partnership seats count here
  - Cost per seat (a month) or Compute cost (per million tokens)
  - Margin ring (%) with a caption: the fee ("Fee $20.00", or "Free") or the price
  - Price stepper (fee per seat a month or a year, or $ per million tokens)
  - trash icon on developed variants
  - The Enterprise contracts card shows Contracts, Contract ARR and Requests waiting, and "Managed on the Deal Desk →" (no ring gauge or price stepper).
- **HQ lock:** when "Apply rates to all sales offices" is on at HQ, a **Set prices here** toggle card sits above the products (hint: which HQ list the office follows, or that it sets its own). Off, steppers and offer toggles lock and show "Set at HQ"; on, the office sets its own prices and lineup.

### 5.3 Deal Desk
- **Summary strip:** requests this week · won · lost · declined · win rate · contracts held · contract ARR.
- **Discount limit card:** a stepper for the most the office will knock off a business's budget (`DEAL.defaultLimit` to start, up to `DEAL.discountMax`). A note says who bids when the desk is delegated (the office manager, or the Chief Safety Officer under Deal Desk policy).
- **Public tenders** (SIMULATION §11.7; shown when the office has any, or as a one-line note when the lab is below Adequate after `TENDER.firstWeek`):
  - Open tender card: dome icon, body name ("Calgary Transit Commission"), what it's for, a "Closes in N weeks" chip, yearly budget and term, the discount stepper with the win chance and contract value, the sealed bid if any, and Seal bid / Update bid / Withdraw.
  - Held tender card: body name, a "Yours" chip, contract value a year and end date.
  - A foot note: bids are sealed, Safety weighs most, Restricted cancels.
- **Proposal requests (RFP cards):**
  - sector icon, business name, sector, size
  - yearly budget, and the rival lab holding it (if any)
  - rosette (AI readiness, Budget, Data sensitivity, Switching cost, Financial health)
  - discount stepper (from the discount limit) with the contract value and the win chance
  - Bid / Decline
  - expiry chip ("Expires this week" when `dueWeek ≤ week + 1`)
- **Renewals due:** cards for contracts renewing at the next quarter start (`DEAL.renewalNoticeWeeks` ahead).
  - Yours: the renewal offer stepper (starts at the current discount) and the keep chance.
  - A rival's (needs Enterprise contracts on): a "Make an offer" toggle; on, it offers the discount limit and shows the stepper, the win chance and the rival's value next to yours.
- **Contracts:** a collapsible list (open when 6 or fewer): business, value a year, renewal date. Rows are ≥ 44 px and open the business card.
- **Badge:** the tab lights for any new RFP, a rival renewal with no offer yet, or an open tender with no bid.

### 5.4 Marketing
- **Two-column grid of campaign cards:**
  - small vignette and name
  - level selector (Off + levels, labels from CONTENT)
  - cost line (per week, per new account, or % of revenue)
  - effect hint (e.g. "Awareness ++ · Office rating +")

### 5.5 Finance
- **Headline figures:** office revenue (with weekly change in $ and %) and office income (with change).
- **Chart:** paired bars for the last 5 weeks.
- **Office income statement** (Week | Quarter | Year), with the line groups from SIMULATION §12 (Other income is demo kiosk fees; Bad debts is the expense row for unpaid contracts).
- **Balances box:** ARR (contracts included), Customers.
- **Office size card:** the size (Starter, Standard, Large or Flagship), the cost to grow to the next one and its new weekly rent, and a **Grow office** button (confirm, showing fit-out, extra lease deposit, total and new rent; the reason shows under the button when it can't). At Flagship the card says it is the largest size.
- **Footer:** Rename, Close sales office (confirm, showing what you get back; with one office per city, accounts go to the office in the nearest city).

## 5b. Data centers

- **Entry points:** a **Build data center** button under Build sales office on an available storefront (§3), with its own blocker line; an **Energy site** section on a regional employer's panel (§14) listing your data centers there with a **Build data center** button; your data center's pin on the map (your crest, noted "Data center" or "Fit-out"), its row on the city list, and a **Data centers** list under the Sales offices screen (§25).
- **Build data center:** three part tiles (GPU hall, Power, Cooling) with price and what each does; tapping one opens a sheet listing that slot's options. A **Running it** card (GPUs running, power bill and rent a week, fit-out weeks), a note when the power feed can't run the whole hall, then a summary (parts, deposit, first week's rent, total, cash available) and **Build for $X**.
- **Data center panel:** header with the name, place and city; the advisor says how long the fit-out has left, or that its GPUs serve customers before spot and which cities get faster service. The Compute card (§24) sits under the status card. Status card (Online or Fit-out with weeks left, GPUs in the hall, GPUs running (red when power caps it), PUE). Parts as tiles with **Upgrade** (a sheet that greys out parts no better than the fitted one or that you can't afford; the hall is locked during fit-out; "Best fitted" on the top part). Weekly costs (rent, power). **Close data center** with a confirmation showing equipment sold, deposit back and cash back.

- **Power deal:** on an energy site's employer panel, above the Energy site section, in place of the plans deal (SIMULATION §13.7a). Before signing: what the deal brings (contracted GPUs in the pool, X% off power for your data centers in the country), signing fee, contract years, price per GPU-week, a take-or-pay note, the blocker line and **Sign · $X**. Once signed: health bar, "Year X of 7", contracted GPUs, weekly bill, price per GPU-week, a line on what moves health, **Renew · $X** (opens in the last year) and **Release** with a confirmation. The data center screens show the discounted power bill.

## 6. Rival sales office

- **Header:** the rival lab's name, with the district and address.
- **Advisor:** "This is {Rival}'s sales office. Their Plus plan is {x}; ours is {y}."
- **Customer reviews:** same block as §5.1.
- **Price sheet:** two groups, Plans (Plus, Pro, Team) and API and apps (Standard API, Batch API, Code Assistant, Agent Studio), in Theirs and Ours columns (jade/oxblood), with "Compared with our {name} sales office." when you have one nearby. The rival sheet on the city list shows Plus, Pro, Team and the Standard API, and "A new lab, founded in {year}" for a lab founded during the game.

## 7. Rival lab HQ

No tabs: one overview page.
- **Advisor:** "{Name} head office. Know your competition."
- **Overview:** Sales offices, Cities, Shares (Listed · ticker, or Private), Share price, Customers, ARR (with its yearly growth once two quarters are in), Cash, Runway badge (Strong / Adequate / Watch / … from SIMULATION §18.5, with the runway in weeks or years), AI model (name · quality), Model released, Researchers, Chief executive, then recent quarters. The rival sales-office sheet (§2) adds the office's customers and ARR under its rating.
- Rival labs don't lend to you; corporate borrowing is on the investment bank's Debt tab (§12).

## 8. Central bank

- **Header:** institution name with the city.
- **Advisor:** a line from the governor's office.
- **Big policy rate**, plus the last decision with its date and the next meeting date.
- **Indicators:** GDP growth last quarter and forecast, inflation, unemployment, house price index trend.
- **Yield curve mini-chart:** overnight / 2y / 5y / 10y.
- **Rate note:** in a country where you're licensed, "Your {n} sales offices in {country} sell into an economy this rate steers: customer budgets rise and fall with it."
- **Standing lending facility:** only in the home country and only for a bank-era save that still carries funding (`hasLegacyFunding`): the facility card (rate, usage, Borrow / Repay with a stigma warning). Otherwise there is no card (SIMULATION §13.5).

## 9. Office for lease

- **Header** with the address; advisor line.
- **Hero:** building vignette.
- **Stats:** floors, area m².
- **Department list:** one Add toggle per department (description + desks). You can't select more departments than there are floor slots.
- **Costs:** weekly rent, security deposit, fit-out total.
- **Rent office** button, with available cash shown under it. Above it, a blocker line when the lease isn't allowed: two main offices already, or a second office in the same country as the first.

## 10. HQ

- **Header:** "HQ" with "{Lab} · address · city" under it (the Office button leaves little room for a long title), and an **Office** button. Shows an office switcher if you have more than one.
- **Office sheet** (from the header button): address, floors in use, weekly rent, which department sits on each floor; a **Tab order** card listing the floors you have in the order their tabs run along the bottom bar, each with ▲ ▼ arrows (44 px) to move it past its neighbour, and **Reset order** once any has moved (the order is saved with the game; departments you add later slot in where the usual order puts them); then **Release floor · {department}** (the floor you're on; "Close HR floor" on HR) and **Release office**, each with its confirm.
- **Bottom icon bar** (only departments you have): an icon over a short label for each floor, scrolling sideways when they don't fit. Finance (ledger) · HR (people) · Products (card) · Compute (server) · Marketing (megaphone) · Platform (screen; dept `it`) · Safety (shield; dept `risk`) · Executive (briefcase) · Investment (rising chart) · Add floor (plus). The Platform & Security floor's tab reads Platform and the Safety & Alignment floor's reads Safety, to fit the bar.

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
  - **Results:** total revenue and net income with weekly change, and the bar chart
  - **Runway and liquidity:** runway (SIMULATION §15, what lenders price on): months or "Not burning cash", the runway tier badge, a four-band meter (Critical under 6 months, Tight 6–12, Comfortable 12–24, Strong 24+) and a Net burn row; the liquidity ratio and target rows show only when there is a liquidity ratio (bank-era saves with deposits)
  - (The Launch posture dial moved to the Safety & Alignment floor on 2026-10-30.)
- **Safety & Alignment** also carries, under the regulator card:
  - **Launch posture** (code `riskAppetite`, SIMULATION §16.8): Segmented (1–5, "Launch posture, 1 very cautious to 5 very bold"), with the level's name (Very cautious, Cautious, Balanced, Bold, Very bold), a hint such as "Deal odds +6 pts, safety exposure +16%, and over-claims are likelier." ("Standard deal odds and safety risk." at Balanced) and a line naming who else steers it: the Chief Safety Officer ("tunes this to the safety tier every 4 weeks"; Launch posture switch)
  - **Statements:** Income / Balance sheet / Cash flow, each Week | Quarter | Year
  - "Delayed" placeholders when short-staffed
- **HR:**
  - Employee benefits carousel (vignette, name, description, control stepper, estimated weekly cost, effect badge like "+3 morale")
  - "Close HR floor" (release the floor)
- **Products:**
  - In this order: AI model, Training run, Research team, Leaderboard, ARR trend, Product lineup, Product developments.
  - **AI model** (rosette, licence per customer a year, model name), a **What it does** block (Compute per customer vs baseline, Price headroom over market, Data licence) and Manage models (sliders for each training dataset that sum to 100%, with a live rosette and cost; Customer Feedback shows "Unlocks at 5,000 customers")
  - **ARR trend:** company ARR line chart with week-over-week changes (weeks closed before schema 6 read ARR as 0)
  - **Product lineup** (category Segmented + product cards like §5.2, at company level) and the "Apply rates to all sales offices" toggle
  - Product developments list (progress bar, weeks left) and New product
  - **New product form:**
    - name and product type grid (template icons)
    - target price tier: Low / Medium / Premium
    - development time: 4 / 8 / 12 / 24 / 48 weeks
    - weekly budget stepper, with the total cost under it
    - open-positions chip for the Products team
    - probability table (5★ … 1★ with %)
    - Start development
  - **Training run:** with no run, the model name (default "Gen N"), a focus picker over the five axes, training time (the development terms), weekly budget stepper ($20k up, step $5k) with total cost, an odds table (each star result with its % and lift, e.g. "+0.4 on all, +0.4 more Reasoning") and Start. While a run is under way: name, focus, progress bar, weeks left, budget and spent so far, and Cancel (with a confirm). "Paused: no Products floor" if the floor goes.
  - **Leaderboard:** a line on today's quality bar and your price headroom, then every lab ranked by model quality (rank, lab, model, quality to one decimal), your row highlighted. A rival HQ panel's Overview shows that lab's AI model (name · quality) and when it shipped.
  - **Research team:** "Your team: N of 8", the training boost, and your researchers (portrait, name, stars, specialty, salary a year, **Let go** with a confirm) with the team's weekly pay. Then the **Talent market**: everyone else, best first (top 8, Show all), with where they work ("At <rival>" or "Available"), salary a year, the signing bonus when poaching, and **Hire** / **Poach**. The Training run card adds a line under its odds: "Your research team adds +N, your CPO +M." The CPO's profile shows their training-odds boost, and a rival HQ panel's Overview lists its researchers (count and stars).
  - Manage models lists trained models as "Trained · Gen N" with **Launch** (a model never switched on; its first switch is the launch, §16.15) or **Use as AI model**, and **Open weights** (a confirm card spells out the trade; an "Open weights" badge once released).
  - The What it does block adds **Launch buzz** ("+7% headroom, fading") while a launch's hype lasts and **API headroom (open weights)** (red) while an open model drags usage prices.
- **Compute** (dept id `treasury`):
  - An **Outage** or **Capacity crunch** banner at the top while either runs
  - **Compute pool:** the Compute card (§24), with a "GPUs rented in lots" row when you have any, then the **Compute policy** card: spot limit this week, emergency burst on top, the "GPU offers +8%" stigma row while it lasts, a note on how the limit moves, and the **Auto spot-buy** toggle (hint: buys at spot then burst / runs on your own GPUs only, with a waitlist)
  - **Rented GPUs:** totals card (GPUs rented, weekly bill), then lot cards with provider, reservation type, price per GPU-week, GPUs, end date, weeks left and a rosette (Cost, Term, Reliability, Flexibility, Latency). No early cancel.
  - **GPU market:** offer cards with provider, type, price per GPU-week, "Up to" GPUs, term, price vs spot and rosette, a GPU slider (step 50+) with Max, **Rent N GPUs**, the weekly bill under it, and when the next offers arrive
  - **Legacy funding** (only while a bank-era save still carries deposits, wholesale lots, overnight or window borrowing, `hasLegacyFunding`): Liquidity (gauge and policy), Funding inventory, Funding market, Central bank (the standing facility from §8).
  - **Partnerships:** cards with employer, people, ARR, seats and a health bar. Tap to open the partnership view (§14).
- **Marketing:** brand awareness by city (bars), brand campaign cards (scope: city or country; level; cost), active agency packages.
- **Platform & Security** (dept id `it`): Mobile app (rating coins with a 26-week trend), Security (posture summary), Digital projects (developments of type Digital).
- **Safety & Alignment** (dept id `risk`):
  - **Losses:** a loan delinquency card, shown only when a bank-era save still has loans to report
  - **Model performance:** predicted vs actual losses
  - **Regulator and safety:** safety ratio with tier badge and the safety meter, Safety cover, Model exposure, Next safety audit, Chance it fails, Last safety audit, Failed audits, and a notice during a mandated pause, a revoked licence or strict watch
- **Executive:**
  - Board meeting card: explanation, last meeting date, Hold meeting (enabled once per quarter)
  - Senior executives grid: seven seats (CEO, COO, CFO, CPO, CMO, CTO, Chief Safety Officer; on a phone the last cell spans both columns) with portrait, name and title; empty seats show Hire, which opens a sheet of the seat's candidates with a paid "New candidates · $fee" button at the bottom (as for office managers)
- **Investment:**
  - portfolio value with weekly change, a donut (Stocks, Ventures, Real estate, Compute credits) and List portfolio
  - Ventures carousel (vignette, name, sector, short description, founded, Details)
- **Add floor sheet:** department choices with descriptions, desks and fit-out cost.

### 10.1 Executive profile (sheet)
- portrait, name, title, hired date
- Leadership, Expertise and Loyalty bars
- delegation toggles for the role; eight carry a **dial** (a stepped slider with named 44 px stops and a tagline estimating the company impact of the chosen stop, SIMULATION §17.2 "Delegation dials") nested under the switch:
  - COO · HR benefits: **Morale target** 70 / 80 / 90, tagline "Benefits +$1.2K/wk (3.4% of payroll, budget 8%) · morale 68 → about 80" (", as far as the budget reaches" when the budget stops short; "Needs an HR floor at HQ." without one)
  - COO · Pay reviews: **Review cadence** Quarterly | Annual, tagline "4 reviews a year · pay lags the market by up to 0.8% between reviews · next review +$22.6K/yr for 6 people", followed by the **Pay premium over market** stepper (−10% to +30%, "Market" at 0) with when the last review ran
  - CPO · Routine training runs: **Training style** Quantity / Balanced / Quality, tagline "12-week runs at $150K/wk on Speed · 38% chance of 4★ or better" ("· waits for more cash" when cash is short, "Needs a Products floor at HQ." without one)
  - CTO · Compute: **Cover target** 60% / 75% / 90%, tagline "Covered now 40% · would reserve 2,250 GPUs now, $65.4K/wk" ("· nothing to reserve" once covered, "· within 5% of target, nothing to reserve" when the gap is under `CTO_COMPUTE.slack`, "· no offer under spot fits; checks again next week", "No GPU demand yet.", "Needs a Compute floor at HQ." without one)
  - CMO · Brand campaigns: **Awareness target** 40% / 50% / 60% / 70%, tagline "Campaigns +$25.0K/wk (2.1% of revenue, budget 3%) · pushes 3 of 6 cities · +9% new customers" ("· held back by the budget" when a city can't be afforded; "Needs a Marketing floor at HQ." without one)
  - CSO · Launch posture: **Posture ceiling** Balanced / Bold / Very bold, tagline "Posture now Balanced · safety tier Strong · steps up to Bold in 2 weeks" ("steps down to Cautious in 2 weeks", "holds", or "at the ceiling, holds")
  - COO · Expansion: **Cash reserve** 8 wk / 13 wk / 26 wk, tagline "Keeps $1.9M in cash · next opens in Toronto for $412K in 3 weeks" ("next grows the Calgary office for …", or the first growth city's blocker: "Not enough spare cash: the COO keeps 13 weeks of costs in reserve.", "No growth city marked.")
  - CPO · Developments: **Product focus** Plans / API / Apps / Any, tagline "Next: Realtime API, 12 weeks at $25K/wk" ("Every API product is developed; next: Max, …", "· once the current development ends" while one runs, "Every product is developed.", "Needs a Products floor at HQ." without one)
- CPO: with **Research talent** on, two lines: "Next hire: Mara Okonkwo (4★) at $484K/yr, in 2 weeks." (or "Research talent: Researcher pay would pass 3% of revenue." / "Waiting for spare cash: 8 weeks of costs stay in reserve." / "Nobody is on the open market right now." / "The research team is full (8).") and "Researcher pay $1.2M/yr, 38% of the 3%-of-revenue budget. Hires from the open market only; poaching from rivals stays with you."
- CFO: under the switches, for each Investing switch that is on, two lines: "For the lab: next stock, Cobalt AI for $5.44M, in 2 weeks." and "For the lab: next startup, 13% of Brightloom (scores 7.4) for $1.20M, in 2 weeks.", or what holds it back ("Waiting for spare cash: …", "The lab's stocks are at 5% of its assets.", "The lab's startup stakes would pass 3% of its assets.", "The credit ratio would fall under 12%.", the regulator at a restricted tier, "No startup on the floor's list scores 6 or more right now.", "Startups come from the Investment floor: add one at HQ.")
- CFO and Chief Safety Officer: **Sales office guidance now**: the deposit and loan rate offsets and approvals (dormant: no product uses them), noting which switch is off
- COO, CMO and CPO: **Sales office guidance now**: the COO's wage and headcount change, the CMO's campaign push, or the CPO's fee change and whether the lineup is wider or narrower, noting when the switch is off
- CFO: Capital, Share sales and Dividends first; then an **Investing** heading over **The lab's money** and **Your money** (with the investing note, SIMULATION §17.2); then a **Buildings** heading over four switches. **Rents: the lab's buildings** and **Rents: your own buildings**, each with an **Occupancy** dial under it (80% / 85% / 90% / 95% / 100%; tagline: "Rent +5% per m² · net rent $2.53M/yr, $177K less than at 100%", "As full as tenants allow · net rent $1.15M/yr across 2 buildings", or with no buildings "No buildings yet: …"); then **Buying: the lab's buildings** and **Buying: your own buildings**. Then a note: "Managing 3 buildings of the lab's and 1 of yours: tenants pay up to 8% over market, and rents are reviewed every 4 weeks (next in 2 weeks)." (or, with both off, how many buildings wait on the switches), and for each Buying switch that is on: "For the lab: next, 803 Copper Lane in Calgary for $3.27M (13.8% a year), in 3 weeks." or what holds it back ("Waiting for spare cash: …", "The lab's buildings would pass 5% of its assets.", "The credit ratio would fall under 12%.", the regulator at a restricted tier, "No building for sale earns its keep right now.")
- COO only: **Growth cities**: every city you have visited, home first, each with a switch (may the Expansion delegation build here) and an **Open now** button that has the COO build their usual pick at once (**Grow now** where you already have an office, which grows it a size); the hint under each city shows "No office yet" or the office's size, then the next storefront or size and its cost, or why nothing can be done there
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
- **Quarterly reminder:** the same modal opens once per quarter with Later / Hold meeting when the board hasn't met (after weekly results and incidents).

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
- **Compute credits** (venture debt): amount and fee steppers, Offer credits; the profile shows the balance as Compute credits.
- **Funding history:** round, amount, date.
- **Top shareholders:** names with %.

## 12. Investment bank

- **Header:** name, "Investment bank".
- **Hero:** trading floor vignette.
- **Tabs:** Market · Equity · Debt · M&A.
- **Advisor:** "Welcome to {Bank}. Raising capital, borrowing or buying a competitor?"

**Market:**
- the Inference Composite index card (value, weekly change, sparkline)
- sector Segmented: AI labs, Technology, Energy, Auto, Retail, Real estate
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
  - IPO card: eligibility checklist (✓/✗ per rule: ARR ≥ $100M, 4 profitable quarters, Finance cover, safety tier, recession unless runway is Strong), float % stepper, indicative price, fee %, Launch IPO
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
  - your stake after, runway after
  - a note when the minimum public float caps the size, and the date of the next allowed buyback
  - Buy back for $X (disabled with the reason when blocked)

**Debt** (SIMULATION §19.9): borrowing for corporate cash. A bank lends to labs with a sales office in its city.
- **Notice** when you have no sales office in the bank's city: "{Bank} lends to labs with a sales office in {city}. Open one here to borrow." The offers stay hidden and the credit line shows $0 available.
- **Venture debt:** a blurb (fixed-rate term loans priced on your runway and ARR, paid back weekly; corporate debt capped at 40% of equity, with the room left; new offers every 4 weeks), then offer cards: amount, Interest rate, Maturity ("2 years", "18 months"), Weekly payment and **Apply** (disabled with "More than your borrowing room right now." when too big). "No offers right now. Check back after the next refresh." when there are none.
- **Credit line:** a card with Limit, Used, Available and Interest rate; a note (a revolving line, limit 60% of equity and moving with it, interest weekly on what you use); a Draw / Repay Segmented, an amount slider and a **Draw $X** / **Repay $X** button.
- **Your debt** (when you owe any): a card per term loan (Term loan from, Balance, Interest rate, Weekly payment, Weeks left, **Repay early ($X)**, disabled with a note when cash is short) and a card per line drawn at another lender, including rival labs in old saves (Credit line with, Used, Interest rate, **Repay $X**).

**M&A:**
- **Labs:** rival lab cards, like Market cards, plus Sales offices, Cities, Customers, ARR and the Runway badge (SIMULATION §18.5), sorted by ARR; a private lab's reference row reads "Fair value / share" (§19.8); distressed sales get a special badge
- **Offer M&A sheet:**
  - offer price per share stepper and premium % (as the board sees it, after any share-part discount)
  - shares outstanding
  - once listed, "Paid in your shares": Cash · 25% · 50% · 75% · All; with a share part, rows for paid in new shares, new shares issued (% of outstanding) and your stake after
  - paid in cash (total cost when all cash)
  - available cash
  - regulator pre-check (✓/✗ with reasons): "Runway after the deal" (months left once the cash price is paid, needs 12), and "Customer share in {city}" ("{x}% of the city's AI customers (limit {y}%)"), or "Not tested for a distressed sale: the regulator wants the lab rescued"
  - Offer merger
- The response arrives the next week.
- Below the cards: Integrations in progress (lab, sales offices converting, weeks left) and Completed deals.
- **Converting sales offices:** while an acquired office converts, its map pin keeps the old lab's ink and monogram with a brass progress ring and (at close zoom) a "Converting" label; the sales office panel shows the old medallion and a "Converting from X: N weeks left" banner.

## 13. Data vendor
- Header ("{Vendor} data vendor") and advisor.
- Packaged models carousel: name, tier, rosette, licence per customer a year, "Use as AI model".
- The current AI model is marked.
- A note that custom mixes are built on the HQ Products floor (Manage models). The vendor's own "My model" mixer, the same sliders in a second place, went on 2026-10-30 (owner's review, B2); a hosted custom model from an older save keeps working.

## 14. Employer (partnerships)

- **Header:** employer name with its type.
- **Advisor** and **hero** vignette.
- **Stats:** Employees, Average income, then the **Anchor account** card (§14b): the employer's one deal, bid for on the sales office's Deal Desk.
- An energy site shows the power deal instead (§5b).
- The staff plan deal card went on 2026-10-30 (owner's review, B1). A staff plan deal from an older save shows under **Yours** while it runs off.

## 14b. Business

Opened by tapping a business pin on the map (the **Businesses** layer, which also shows employers).
- **Header:** business name, with "sector · size · address · district" under it and the Businesses medallion.
- **Advisor:** one line on who serves them, or that they have no AI vendor yet.
- **Card:**
  - AI budget (a year)
  - AI vendor (a rival lab, you, or None)
  - Contract value and Renews (month and year), shown only while under contract
  - a pentagon: AI readiness, Budget, Data sensitivity, Switching cost, Financial health
- An employer's panel (§14) shows the same card under **Anchor account**.
- **Map:** business pins are handshake medallions. A business served by you or a rival gets that lab's colour on its awning, and a partner seal on the pin when it is yours.
- Bidding and renewals happen on the sales office's Deal Desk tab (§5.3).

## 15. Marketing agency · Lobbying firm · University

- **Marketing agency:** a status line ("{Model} just launched: book a launch campaign in the next N weeks", or how to open the window), then **Launch campaigns**: package cards (name, city, weeks, cost, awareness boost, "Launch buzz held at full for N weeks") with Buy, disabled outside the 8-week window.
- **Lobbying firm:**
  - campaign cards with cost, success %, exposure risk %, and Lobby
  - the outcome arrives in 4–8 weeks
  - campaigns: "Ease the AI safety rules for 4 quarters", "Fast-track a merger review", "Stall the AI safety bill" (only while one is pending; there is no price-cap law to delay)
  - sections: In force, Under way (weeks left), Past campaigns
- **University:**
  - stats: Staff, Students
  - Student partnership: the same deal card as **Student plans**, with Campus Plan by default
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
    - when the CFO's switch covers this owner: "Managed by your CFO: {Name} reviews this rent every 4 weeks; tenants here pay up to 8% over market."
    - occupancy % (and "Heading toward" while it is still moving)
    - weekly rent revenue, weekly maintenance and weekly vacancy cost
    - weekly net rent income
    - ROI %
  - **Real estate sale:** For Sale toggle
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
- **Departures board:** split-flap styled rows (airport code tiles, destination, country, distance in km or mi), nearest first, with a region filter (All / Americas / Europe / Asia-Pac). The new regions (SIMULATION §20a) are left off the board and the flight map until they open at week 260. Rows mark "New" for places you haven't visited, "regional site", and whether you have a sales office there. Tap a row to fly: the plane follows a dotted great-circle arc across a world map (tap to skip; a still frame with reduced motion), then the destination map loads and a toast welcomes you. Rows beyond the remaining mileage stay tappable and show the one-way fare ("$104K ticket"); a confirm shows what personal cash pays and what the lab pays as a travel expense. Travel is never blocked.
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
  - **Kit:** colour pickers and shirt sponsor. Choosing your lab boosts brand awareness in that country.
  - **Squad:** star players (name, position, rating, salary) and payroll totals (stars, others, total).
  - **Transfers:** window status, available players, sign / release.
  - **Finance:** revenues (tickets, broadcasting, merchandise, sponsorship), expenses (payroll, operations), net income.

## 21. Weekly results (modal)

- **Header:** your lab's medallion, "Weekly results" ("Monthly results" / "Quarterly results" when the setting rolls the period up), ✕. Under it: "Week 9 · closed 8 Mar 2027" or "February 2027 · 4 weeks, closed 1 Mar 2027"; the date is the day the week (or period) closed, which is the date on the top bar when the report opens and the date the Finance floor charts and the Ledger give that week. A monthly or quarterly report opens on the tick that closes the period's last week, never partway into the next one.
- **Date line:** "Week N · closed {date}", or for a roll-up "{October 2027 | Q4 2027} · N weeks, closed {date}" (a snapshot week belongs to the month or quarter its last day falls in, so a month is 4 or 5 weeks).
- **Headline figures:** revenue and net income for the period, each with the change on the last week / month / quarter ("First month of trading" when there is none).
- **Cash flow:** Cash from operations, Investing, Financing, Net cash flow, summed over the period.
- **The Weekly Inference card** (the period's latest issue):
  - masthead and date
  - tabs: Top | World | AI | Business | Markets | Politics | Sports (they scroll sideways on a phone)
  - two-column article grid (icon vignette, headline, 1–2 sentence body)
- **Earlier this month / quarter** (roll-ups only): a card listing each earlier issue's date and lead headline; the archive in the menu has the full issues.
- When Finance is short-staffed, the figures read "Delayed".
- Close resumes the game.

### 21b. Annual report (modal)

Opens on the first tick of a new year, after the results modal closes (before any incident or board reminder). Reopened from the Ledger archive, whose list starts with the annual reports, newest first ("Annual report 2031" and its headline).
- **Header:** your lab's medallion, "Annual report {year}" ("The decade in review" every tenth year), ✕.
- **Front page:** the Weekly Inference masthead with "Annual edition · year N" (or "Decade edition") and the date, then a headline and standfirst (SIMULATION §22a, CONTENT §26b).
- **Story:** ARR, sales offices and valuation at the close; the milestones reached this year (up to three named, then "and N more"); your net worth and rich list place.
- **The year in figures:** a table of revenue, net income, ARR, valuation, sales offices, customers, model quality, safety, your net worth and rich list place, this year beside last year.
- **Decade edition:** instead of the year table, a bar chart of yearly revenue and net income for the last ten years, and the same table as "Then and now" (the first year of the decade beside this one).
- **Continue** closes it and resumes the game.

## 22. Incident (modal)

- **Header:** "Incident" with the scope (sales office name or company).
- **Advisor:** portrait with the incident text.
- **Pager:** "Case 1 of N".
- **Options:** 2–4 buttons, each with its cost and an effect preview. Cases marked `hideCosts` (the board's capital review) show no cost tag: their effects state the amounts.
- **Footer:** "Your manager can handle these" (link to delegation) for office incidents.

## 23. Personal wealth

- **Profile:** avatar, name, "CEO, {Lab}", annual salary.
- **Total assets:** big figure with weekly change, plus a donut (Cash, Stocks, Real estate, Others) and a legend with values.
- **Stocks:** cards with shares, cost basis, current value and gain/loss, plus Trade.
- **Real estate:** cards with ROI, value and gain.
- **Other assets:** homes, cars, collectibles, jet, franchise.
- **Rich list:** rank chip ("#38 on the Rich List").
- **Portfolio** button at the bottom (every holding, the lab's and yours; §29).

## 24. Company summary (menu → Company)

- **Where to look** at the top: the three things that most need you, worst first (Urgent / Watch / Note), each a tap to the right screen: a mandated pause or revoked licence, the safety tier, corporate cash below zero or under `ATTENTION.cashCoverWeeks` of running costs, open cases, a funding freeze or liquidity under the minimum (legacy saves only), expiring proposal requests, sales offices losing money for 4 weeks, ratings under 2.5, understaffing, loan losses over the Chief Safety Officer's ceiling (legacy), morale under 50, sales offices without a manager, empty executive seats, switched-off delegations, low awareness. "All clear" when nothing qualifies. Ranking in `src/sim/attention.ts`, thresholds in `ATTENTION`.
- safety ratio (SIMULATION §15) with the regulator's tier badge, a meter with the tier lines, and a breakdown line (Safety cover, model exposure)
- a notice during a mandated pause or a revoked licence (what is blocked and until when) or strict watch (until when, tier lines 10 points higher, audits twice as likely)
- at Watch, Restricted or Critical, a "How to fix this" checklist under the meter (`src/data/capitalFixes.ts`): hire safety staff on the Safety & Alignment floor, pay them better, seat a Chief Safety Officer, train or switch to a safer model, grow the Safety team before shipping a model far ahead of the frontier; at Critical, a line on the mandated pause and the licence
- **Cash** card: corporate cash with the runway tier badge, **Runway** (months, or "Not burning cash") with the runway meter and a line on what it gates, then running costs a week and **cash cover** (weeks of running costs; red under `ATTENTION.cashCoverWeeks`)
- a liquidity section (Target, Overnight borrowing), only while an older save still holds deposits or overnight borrowing
- **Compute** card (SIMULATION §13.0): spot price per GPU-week with the chip phase badge (Chip glut green, Normal market, Chip shortage red), a line chart of the price index over the last 104 weeks, GPUs your customers used last week, GPUs running in your data centers, the share they covered, and what the rest costs at spot a week, with a one-line note
  - a red **Waitlist** or **Outage** badge under the phase badge; "Bought at spot" reads "N of M max" against the spot limit; red "Emergency burst" and "Not served (waitlist)" rows when non-zero; "Spot and burst bill" a week; "Pool cost vs spot" (green under 100%) once the pool has paid anything. The Company explainer "Compute: own it or rent it" covers the internal charge and the limit.
- **Totals:** Assets, ARR, Treasury reserves (only when above $0, which only bank-era saves have), Equity
- share price or private valuation, with the 52-week range, market cap, your stake and top shareholders
- a Personal line: personal cash plus holdings
- one-line explanations ("Grow recurring revenue; watch the compute bill") with a "Learn more" sheet: Revenue recurs, compute bills · Compute: own it or rent it · Safety limits growth · Treasury reserves · Cash cover
- statements: the income statement runs Plans, API, Apps & services, Enterprise contracts, Other income → Revenue → Compute → Gross profit → Operating expenses → Interest expense (when any) → Bad debts → Depreciation → Pre-tax → Tax → Net income. The balance sheet lines are in SIMULATION §14.4; treasury reserves, loans, stocks, ventures, compute credits, real estate, partnership fees, goodwill, deposits, wholesale funding, corporate debt and dividends payable show only when non-zero.
- **Goals:** two buttons, Milestones (n of 32) and Frontier projects (n of 6), which open §28 and §28a
- links to the full statements (Finance floor, or a simplified view without an HQ)

## 25. Sales offices list

- Sortable rows: name, city, coins, ARR, customers, weekly income, issues badge (sort by Name, Rating, ARR, Customers or Income). A Data centers list follows (§5b).
- Filter by city (sideways-scrolling chips, hidden with one city). Once the lab spans several countries, chips and rows show the country code and "All cities" groups rows under country headings, home first.
- Tap a row to open the sales office panel (works from any city).

## 26. Settings and saves

- **Settings:**
  - currency symbol ($, C$, £, €, ¥) and distance units (km/mi)
  - results frequency (every week / every month / every quarter / off)
  - default speed
  - auto-pause on incidents and on expiring proposal requests
  - sound, reduced motion, text size (100 / 115 / 130%)
  - edit founder avatar
  - **Tutorial:** Replay tutorial, the Guides switch and "Show the guides again" (§27)
  - **Developer:** a "Developer tools" switch, saved on this device only (not in the game save). When on, in a game, a button adds `DEV_PAYMENT` ($10,000,000) to corporate cash as paid-in capital (`devPayment` command; no shares issued, the books still balance). Two more switches sit under it, in a game only, and are stored in the game save (`flags.devStaff`, `flags.devNoBankruptcy`, optional, no schema change):
    - **Top staff** (`setDevStaff`): holds every sales office's staff and every HQ team's skill and morale at `DEV_STAFF` (95) or better, now and after every weekly update, so a high-staff game can be tested. Off, they drift back to where pay and management put them.
    - **Free top rerolls** (`setDevRerolls`): manager and executive "New candidates" cost nothing (the button reads "Free"), and every rerolled candidate's skills land in `DEV_REROLL` (95–99, the normal roll squeezed into that range so candidates still differ), with the asking salary to match. Lists already on offer and the free monthly refresh are unchanged. Before your first manager hire the guide keeps the first place on the list.
    - **No bankruptcy** (`setDevNoBankruptcy`): weeks in the red never end the game. Cash still goes negative and the warnings still show.
    From the title screen the section only notes that the tools work inside a game.
- **Saves:**
  - autosave card
  - 3 slot cards (lab name, date, cash; Save here / Load / Delete)
  - Export save code (copy, share sheet) and Import save code (paste; validates the version)

## 27. Tutorial

Led by your first office manager in a bar with their portrait, name, step and line; each step lights its target with a brass ring and moves on when you do the thing, never on a timer. When the ring's target is low on the screen the bar docks at the top, under an open panel's header so its Close button stays reachable.

### 27.1 Part 1: Seed to first contract
Runs from the seed round (your starting cash) to the first enterprise contract, about five to eight minutes for a new player. Steps, in `TUTORIAL_ORDER` (each skipped when there's nothing to do, e.g. every sales office already has a manager):
1. Find a storefront (the seed round is your cash, top left; tap a $)
2. Build a sales office (one per city)
3. Set the Plus price (the office's Products tab → Plans; monthly plans are ARR)
4. Turn on the API (Products tab → API → Standard API; new offices open with it off)
5. Hire a manager (Service tab)
6. Run a campaign (Marketing tab: any campaign above Off; skipped where the manager runs marketing)
7. Open the doors (tap play, read the first weekly results, Continue)
8. Meet the lab (open the Company summary from your cash, top left: the safety ratio and tier, then cash, ARR and compute; done when you close it)
9. Win your first contract (Deal Desk tab: bid on the proposal request the tutorial asks a local business for; a lost or declined bid brings another request at once; done when a contract is won)

The first step and the contract step start paused. Then a closing card that says the guides will return as the lab grows. "Skip tutorial" sits in the bar; Settings → Replay tutorial starts it again.

### 27.2 Part 2: Growing the lab
After Part 1 is finished or skipped, with Settings → Guides on (the default):
- **Guides** start on the map, one at a time in this order, when a mechanic opens up, and pause the clock. Each has a "Skip guide" button and a step count; a step that ends on reading shows "Got it".

  | Guide | Starts when | Steps |
  |---|---|---|
  | Safety is slipping | safety tier Watch or worse | open the Company summary, read the safety fixes, close it (ends early if the tier recovers) |
  | Headquarters | the founder ramp begins (office units past FOUNDER_RAMP.fromBranches) and you have no office | tap an office for lease; pick Finance and HR, Rent office; read Coverage on the HQ floor, close it |
  | Safety & Alignment | the founder ramp has begun, you lease an office, and have no Safety & Alignment floor | Menu → HQ → Add floor → Add on Safety & Alignment; read the floor, close it |
  | Short of compute | a capacity crunch, an outage, or an emergency burst in the last few weeks | with a Compute floor: Menu → HQ → Compute floor, read the compute card, close it; without one: open the Company summary, read the compute card (add a Compute floor or build a data center), close it |
  | The executive suite | you have an Executive suite and no executives | Menu → HQ → Executive suite → an empty seat → Hire; then "Got it" on choosing their jobs |
  | Train our own model | you have a Products floor and have never trained | Menu → HQ → Products floor → Start training; ends on a started run, or once you have seen the floor and left |
  | Going public | every IPO rule is met while private (ARR of $100M and the rest) | tap an investment bank; read the IPO card on the Equity tab, close it (ends early once listed) |
  | A second city | the city you're in is well covered (§3) and you've never flown | tap the city name → Go to the airport; read the departures, fly or close |
  | Your own fortune | personal cash reaches GUIDES.wealthCash | Menu → Personal wealth; read it, close it |

- **First-look tips** show once, the first time you open each HQ floor, each map place (rival sales office and HQ, central bank, data vendor, agency, employer, business, data center, university, investment bank and its M&A tab, startup, property, conference, lobbying firm, airport, vacation home, car dealer, auction house, sports club), Personal wealth, the Inference, a sales office's Finance tab, a board meeting and an incident. They end on "Got it" or when you move on. Popup tips dock at the top, clear of the choices. A finished guide marks the tips it already covered (Safety & Alignment → that floor's tip, executives → the Executive suite's, training → the Products floor's, travel → the airport's, wealth → Personal wealth's).
- **Settings:** a Guides switch, and "Show the guides again" to see every guide and tip once more.

## 28. Milestones (Company → Goals)

- Subtitle: "n of 32 reached" (the count is `MILESTONES.length`; 32 since the AI milestones of 2026-10-27, CONTENT §19b).
- One row per milestone (data/milestones.ts) in order: a filled brass diamond ◆ when reached with "Reached {date}", an outline ◇ with the goal otherwise.
- Read-only. Reaching one toasts "Milestone reached: …"; the big ones also make a Ledger story.

## 28a. Frontier projects (Company → Goals)

- **Under way** card (when one runs): name, a progress bar with the percent done, weeks left, weekly payment, spent so far, "Stalled: not enough cash" when stalled, and a Cancel button that asks to confirm ("what was spent is gone").
- One card per project (SIMULATION §16.14, CONTENT §7d): name, blurb, reward line, today's price, length and minimum ARR. A Start button when it can start, otherwise the reason (finished, needs another first, ARR too low, another under way, not enough cash).
- The house model card shows "/ {ceiling}" and its rosettes scale to the raised ceiling.

## 29. Portfolio (Personal wealth → Portfolio)

The same view as the HQ Investment floor's portfolio, reachable from Personal wealth:
- Company / Private toggle
- portfolio value with weekly change and the donut (Stocks, Ventures, Real estate, Venture debt)
- the holdings list; empty states point to investment banks, the Investment floor and conventions
