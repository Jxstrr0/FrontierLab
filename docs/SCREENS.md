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
5. **Bottom tab bar:** when the panel has tabs. It scrolls horizontally if there are more than 5 tabs.

**Phone vs desktop:** on phones, panels slide up full-screen. On screens ≥ 900 px wide, they open as a right drawer, `min(480px, 40vw)` wide, over the map. Modals are centered cards; on phones they become bottom sheets.

### 0.2 HUD (over the map)
- **Top-left:** bank medallion + corporate cash. Tap → Company summary (§24).
- **Top-right:** date pill and speed control.
  - Tap cycles 1× → 2× → 4×. Long-press or the ❚❚ button pauses.
  - While paused, the pill hides the speed and dims.
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

**Title screen:**
- engraved logo lockup "Vault Street"
- Continue (latest autosave), New Game, Load, Settings
- version string, "A Longlight Interactive game"

**New Game wizard** (5 steps, with Back and Next):
1. **Your bank:**
   - name (max 24 characters)
   - monogram (2 letters, auto-filled from the name)
   - brand ink (8 swatches)
   - live medallion preview
2. **Founder:** name and the avatar builder (portrait parts, §ART).
3. **Start city:** four cards (Saskatoon, Calgary, Toronto, New York), each with:
   - average rent, usual rival count, market size, policy rate
   - a one-line flavour
4. **Game options:**
   - Difficulty: Segmented (Easy / Normal / Hard / Expert) with a one-line description of each
   - Competitors: Stepper 1–5 (defaults to the city's usual count)
   - Starting cash: Segmented ($500K / $750K / $1M / $1.25M)
5. **Confirm:**
   - summary
   - advanced: seed (random by default), start date
   - "Open the doors" button

After the wizard, the map opens with the tutorial (§27).

## 2. Map

- **Canvas map:** isometric engraved city with pinch zoom (3 levels plus continuous), pan, and inertia.
- **Pins** are DOM medallions positioned over the canvas:
  - yours: brand ink with monogram
  - rivals: their brand color ring
  - open branch locations: a blank "$" medallion
  - buildings for rent (office buildings): brass "For lease" tag with the type icon
  - building for sale and special buildings (bureaus, agencies, investment banks): type icons
- At the far zoom level, nearby pins cluster with a count.
- Tap a pin to open its panel. Tapping empty map does nothing.
- **Layers sheet:** an "All" toggle plus one toggle per type (14) with icons. Toggles persist in settings.

## 3. Available location (storefront)

- **Header:** "Available location" with the address.
- **Advisor:** a generated traffic and rent comment ("Foot traffic is light here, but so is the rent.").
- **Hero:** empty storefront with an "Available" sign.
- **Fields:**
  - weekly rent (/week) and security deposit (upfront)
  - foot traffic (/week)
  - **Demographics:** five bars (Students, Young professionals, Families, Retirees, Businesses), plus income level (Low / Mid / High, with the index in small type) and homeowners %
  - **Nearby competition:** rival branch count within the radius and their average coins
  - **Area map:** a mini district map with this lot highlighted
- **Button:** Build branch.
  - Disabled with a reason when the capital tier forbids it, when cash is insufficient (show the amount required), or when you're not in this city.

## 4. Build branch

- **Hero:** the vignette updates live as you change parts.
- **Five tiles:** Exterior, Lobby, Teller line, Vault, ATM. Each shows the current pick's thumbnail and price.
- **Tap a tile** to open a picker sheet: a carousel of options with name, one-line description, coins (Quality, Productivity, or Security for vaults), extra facts (stations, advisor offices, boxes), price, and Select.
- **Summary:**
  - itemized parts, lease deposit and first week's rent
  - total vs available cash
  - **Build** button, then "Opening in 1 week" on the pin

## 5. Branch panel

- **Header:** "{Bank} — {District}" with the address.
- **Advisor:** the branch manager's portrait with a contextual line (CONTENT Advisor lines).
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
  - Annual salary stepper
  - Delegation toggles: Staffing & wages · Products & rates · Branch marketing · Branch troubles · Loan approvals
  - Fire manager (confirm)
  - **With no manager:** "Hire a manager" opens a sheet of 3 candidate cards (skills, salary ask, Hire).

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

- **Header:** "{Bank} HQ" with the address. Shows an office switcher if you have more than one.
- **Bottom tabs** (only departments you have): Finance · HR · Products · Treasury · Marketing · IT · Risk · Executive · Investment · + Add floor.

**Every department floor shows:**
- **hero:** engraved isometric office interior whose desk count reflects staffing
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
  - capital ratio (tier badge + meter with thresholds) and liquidity ratio
  - "Delayed" placeholders when short-staffed
- **HR:**
  - Employee benefits carousel (vignette, name, description, control stepper, estimated weekly cost, effect badge like "+3 morale")
  - "Close HR floor" (release the floor)
- **Products:**
  - house model (rosette, cost/app, model name) and Manage models (sliders for each data input that sum to 100%, with a live rosette and cost)
  - risk appetite Segmented (1–5)
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
  - Senior executives grid: seven seats (CEO, COO, CFO, CPO, CMO, CTO, CRO) with portrait, name and title; empty seats show Hire
- **Investment:**
  - portfolio value with weekly change, a donut (Stocks, Ventures, Real estate, Venture debt) and List portfolio
  - Ventures carousel (vignette, name, sector, short description, founded, Details)
- **Add floor sheet:** department choices with descriptions, desks and fit-out cost.

### 10.1 Executive profile (sheet)
- portrait, name, title, hired date
- Leadership, Expertise and Loyalty bars
- delegation toggles for the role
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
- sector Segmented: Banking, Technology, Energy, Auto, Retail, Real estate
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

**M&A:**
- rival bank cards: like Market cards, plus branches, cities and deposits; distressed sales get a special badge
- **Offer M&A sheet:**
  - offer price per share stepper and premium %
  - shares outstanding and total cost
  - available cash
  - regulator pre-check (✓/✗ with reasons)
  - Offer merger
- The response arrives the next week.
- Below the cards: integrations in progress (bank, branches, weeks left) and completed deals.
- **Converting branches (Stage 6):** while an acquired branch converts, its map pin keeps the old bank's ink and monogram with a brass progress ring and a "Converting" label; the branch panel shows the old medallion and a "Converting from X: N weeks left" banner.

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
  - examples: "Ease the capital buffer by 1pp for 4 quarters", "Fast-track a merger review", "Delay fee-cap legislation"
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
    - annual rent per m² stepper
    - occupancy %
    - weekly rent revenue, weekly maintenance and weekly vacancy cost
    - weekly net rent income
    - ROI %
  - **Real estate sale:** For Sale toggle
- **Foreclosed homes** (Company → Real estate): units, value, carrying cost, and Sell all / Rent / Hold.

## 17. Convention

- **Header:** event name with its dates.
- **Advisor:** "Founders everywhere. Let's find a deal."
- **Hero:** exhibition hall vignette.
- **Ventures carousel:** exclusive startups.
- **Networking:** 1–2 cards (an executive candidate, a partnership lead).

## 18. Airport and travel

- **Header:** airport name; advisor.
- **Hero:** terminal vignette.
- **Stats:** flown this week and remaining mileage (weekly allowance).
- **Departures board:** split-flap styled rows with destination and distance (km or mi). Tap a row to fly: the plane animates across the map, then the destination map loads. Rows beyond the remaining mileage are greyed out ("Not enough mileage this week").
- **Private jet card:** Buy jet, or Fly now once owned.

## 19. Vacation home · Car dealer · Auction house

- **Vacation home:** address, location, "Personal purchase — not a rental property", asking price, Offer purchase. Once owned: Rebuild (cost, weeks, value gain).
- **Car dealer:** tabs Showroom | Dealer financing.
  - Showroom: car carousel (maker, model, price, a line of flavour, Buy with personal cash).
  - Dealer financing: partner with the dealer for auto-loan referrals in this city (fee, expected volume, Sign).
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

- **Header:** bank medallion, "Weekly results", ✕.
- **Headline figures:** weekly revenue and weekly net income, each with weekly change.
- **Cash flow:** Cash from operations, Investing, Financing, Net cash flow.
- **The Daily Ledger card:**
  - masthead and date
  - tabs: Top | Banking | Business | Markets | Politics | Sports
  - two-column article grid (icon vignette, headline, 1–2 sentence body)
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

- capital ratio with tier badge and a meter with thresholds
- liquidity ratio
- totals: assets, deposits, loans, equity
- share price or private valuation, with the 52-week range, market cap, your stake and top shareholders
- a Personal line: personal cash plus holdings
- one-line explanations ("Deposits fund loans; capital limits growth") with a "Learn more" sheet
- links to the full statements (Finance floor, or a simplified view without an HQ)

## 25. Branches list

- Sortable rows: name, city, coins, deposits, loans, weekly income, issues badge.
- Filter by city.
- Tap a row to open the branch panel (works from any city).

## 26. Settings and saves

- **Settings:**
  - currency symbol ($, C$, £, €, ¥) and distance units (km/mi)
  - weekly results frequency (every week / every quarter / off)
  - default speed
  - auto-pause on incidents and on expiring applications
  - sound, reduced motion, text size (100 / 115 / 130%)
  - edit founder avatar
- **Saves:**
  - autosave card
  - 3 slot cards (bank name, date, cash; Save here / Load / Delete)
  - Export save code (copy, share sheet) and Import save code (paste; validates the version)

## 27. Tutorial

Advisor-led steps, each highlighting its target with a brass ring:
1. Tap a storefront
2. Build a branch
3. Set the savings rate
4. Hire a manager
5. Unpause and read the first weekly results
6. Turn on Personal Loans
7. Approve your first business loan

It's skippable from the advisor bar, and replayable in Settings.
