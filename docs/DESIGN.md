# Vault Street — Game Design

Source of truth for intent. Formulas and numbers live in `SIMULATION.md`, screens in `SCREENS.md`, data in `CONTENT.md`. Last updated 2026-10-23.

---

## 1. Pitch

You found a bank with a fresh charter: $2,000,000 of charter capital locked in the treasury and $750,000 to spend. Lease a storefront, build your first branch, set your rates and fees, hire tellers and a branch manager, and start gathering deposits. Lend them out, carefully. Ride the interest-rate cycle, build a headquarters, take the bank public, buy your rivals, and expand into the world's financial capitals. Your personal fortune grows alongside: homes, cars, collectibles, a jet, a sports franchise, and a climb up the rich list.

- **Working title:** Vault Street. Alternatives on file: Basis Point, Prime Rate.
- **Repo:** `VaultStreet`.
- **Audience:** players of mobile tycoon and management sims who like numbers they can act on. Built for short phone sessions or long desktop sessions.

## 2. Pillars

1. **Faithful tycoon structure.** Coffee Inc 2's loop carries over system for system: city map → location → tabbed location screen → HQ floors → capital markets → personal empire (§3).
2. **Real banking, made legible.** Deposits fund loans, loans default, capital caps growth, and rates move. Every bank mechanic shows up as a number in the original's UI language: coins (stars), bars, margin rings, pentagons and income statements.
3. **Decisions, not chores.** Delegation exists at every level (branch managers, executives, auto-funding), so the game scales from one branch to five hundred.
4. **Phone-first.** Every screen fits a phone in portrait, and a game week is a natural micro-session.
5. **One bold look.** The world is engraved like a banknote; the interface is a quiet deco vault (ART_DIRECTION).

## 3. Faithfulness contract

- **Keep identical in structure.** Everything in the mapping table (§3.1). Where the original has a screen, field, toggle or flow, Vault Street has its banking equivalent in the same place in the hierarchy, using the same kind of control.
- **Change.** The industry, all names and writing, all art and iconography, and the default currency ($, switchable in settings).
- **Add (bank twists).** Each must be explainable in one sentence and shown with existing UI patterns:
  - Balance sheet and **capital ratio** with regulator tiers (§5.6)
  - **Liquidity** and wholesale funding, with funding freezes and bank runs (§5.6, §5.8.4)
  - **Central banks** per country and a **business cycle** that moves rates, defaults and demand (§5.7)
  - **Deposit beta:** rivals pass on only part of a rate hike to savers (§5.9)
  - **Loan Desk:** individual business loan applications using the startup pentagon (§5.4.3)
  - **Adverse selection:** charging far above market attracts riskier borrowers (§5.4.2)
  - **Government bonds** that lose market value when rates rise (§5.8.4)
  - **Foreclosed homes (REO)** from defaulted mortgages (§5.11)
  - **Payroll partnerships** in place of plantations (§5.8.4)
  - **Venture debt** alongside equity investing (§5.12)
  - **Insider-trading** risk on your personal trades (§5.16)
  - **Regulator approval** on mergers, and **lobbying** (§5.10, §5.8.10)

### 3.1 Mapping table

| Coffee Inc 2 | Vault Street | Notes |
|---|---|---|
| Coffee shop | Branch | |
| Property for lease: weekly rent, deposit, foot traffic, area map | Available location (storefront) | Adds a demographics panel |
| Build store: exterior, interior, espresso machine, brewer, blender | Build branch: exterior, lobby, teller line, vault, ATM | Each option shows price and quality/productivity stars |
| Store tabs: Service, Product, Marketing, Finance | Branch tabs: Service, Products, Loan Desk, Marketing, Finance | Loan Desk is new |
| Staff count, hourly salary, staff skill, staff morale | Same | |
| Store manager: People, Product, Marketing, Ethics; four delegation toggles; fire manager | Branch manager: same skills; Staffing & wages, Products & rates, Branch marketing, Branch troubles, Loan approvals | One extra toggle |
| Reviews: Price, Product, Service, Atmosphere, plus review cards | Rates, Products, Service, Branch, plus review cards | |
| Menu tabs: Hot, Cold, Food | Deposits, Lending, Cards & Services | |
| Product card: rating, on menu, sales last week, unit cost, margin ring, price | Product card: rating, offered, new accounts last week, balance, funding cost, margin ring, rate or fee | |
| Company blend (radar, price per lb), Manage Blends; blend quality feeds product ratings | House underwriting model (radar, cost per application), Manage Models; model quality feeds the Products rating | |
| Roasters selling packaged blends and roasting your custom blend | Credit bureaus selling scoring models and hosting your custom model | Map layer |
| Coffee bean inventory: lots, harvest year, price/lb, quantity, radar | Funding inventory: lots, maturity, rate, amount, radar | Treasury floor |
| Plantations: hectares, yield curve, "year X of Y", replant | Payroll partnerships: employees, deposit curve, "year X of Y", renew | Employers layer |
| Ten marketing campaigns with levels and weekly costs | Ten branch campaigns with levels and weekly costs | See CONTENT |
| HQ floors: Finance, HR, Product, Supply, Marketing, IT, Executive, Investment, Add Floor | Finance, HR, Products, Treasury, Marketing, IT & Security, Risk & Compliance, Executive, Investment, Add Floor | Risk is new |
| Understaffing warnings from floor advisors | Same, plus coverage % per floor | |
| HR employee benefits carousel | Same, plus Staff Mortgage Discount | |
| Develop new product: type, target price, 4/8/12/24/48 weeks, weekly budget, star odds | Same, with bank product templates | |
| Force the prices to all stores | Apply rates to all branches | |
| Commercial bank: business loans, line of credit | Rival bank HQ: corporate loans and credit line | You borrow corporate cash |
| Central bank rate headlines | Central bank building per country, plus headlines | Rates drive the economy |
| Investment bank: Market, Equity, M&A | Same | Private placement and IPO added |
| Secondary offering: shares, price, fees (4.55%), proceeds | Same | |
| Stock card: price chart, market cap, dividend, 52w range, P/E, top shareholders, trade | Same | |
| Coffee companies M&A | Rival bank M&A | Regulator approval required |
| Competitor store: reviews, menu prices | Rival branch: reviews, rate sheet | |
| Weekly results with cash flow and newspaper (Top, Retail, Business, Market, Politics, Sports) | Weekly results with The Daily Ledger (Top, Banking, Business, Markets, Politics, Sports) | |
| Company incidents ("case 1 of 1") | Incidents | Bank-specific cases |
| Executive floor: board meeting, dividends, CEO pay, six seats (CEO, COO, CFO, CPO, CMO, CTO), delegation, option/RSU grants | Same six, plus a Chief Risk Officer as a seventh seat | Regulator can cap dividends |
| Investment floor: ventures, benchmark pentagon, funding rounds, company/private toggle | Same | Plus venture debt |
| Conventions | Fintech and finance conventions | |
| Real estate: buy, rent per m², occupancy, ROI, for sale | Same | Plus foreclosed homes |
| Airports, departures board with distances, weekly mileage limit, private jet | Same | |
| Vacation homes (can rebuild), car dealer | Same | Dealer financing tab added |
| Auction house: upcoming auctions, your items, appraisal, counterfeit | Same | |
| Football franchise: club, uniform, players, transfers, finance | Sports franchise, simplified | Kit sponsorship boosts brand |
| Personal wealth: salary, total assets donut, stocks, real estate, other assets | Same | Plus rich list |
| Settings, save slots, cloud sync | Settings, save slots, export/import save code | |
| Map layers (13 types) | 14 types: Branches, Offices, Real Estate, Credit Bureaus, Banks, Investment Banks, Marketing Agencies, Conventions, Lobbying Firms, Sports Teams, Auto Dealers, Auction Houses, Universities, Employers | |

## 4. Loops and arc

### 4.1 Weekly loop
1. Read the weekly results and The Ledger.
2. Spot what changed: a central bank move, a rival price war, a branch running hot.
3. Act: adjust rates, staff and campaigns; approve business loans; top up funding.
4. Expand: lease, build, hire.

### 4.2 Quarterly loop
- Quarter-end earnings arrive for you, rivals and listed companies.
- Board meeting: set the dividend and CEO pay.
- Dividends are paid three weeks later.
- Regulator review.
- Startups report results and raise new rounds.

### 4.3 Arc
| Phase | Typical years | Shape |
|---|---|---|
| 1. Founder | 0–2 | One city, 1–4 branches, private. Learn deposits, then lending, then capital. No HQ needed while tiny ("founder mode"). |
| 2. Regional | 1–5 | First HQ office and floors, 5–30 branches, treasury and partnerships, Loan Desk volume. Capital starts to bind, so private placements come in. |
| 3. Public | 3–10 | IPO, board votes and share price, buying small rivals, more cities in your country, real estate and ventures. The personal empire begins. |
| 4. Global | 8+ | New countries with their own central banks, hundreds of branches, big M&A, jets and franchises, the rich list. |

There's no fixed ending. Milestones, the annual rich list and the "fastest growing banks" ranking provide goals. You can fail through regulatory takeover or insolvency (§5.18).

## 5. Systems

### 5.1 Time
- The date sits top-right. Speeds are Pause, 1×, 2× and 4× (1× = one day per second).
- The economy settles weekly; quarters and central bank meetings follow the calendar.
- Weekly results pop up every week by default (setting: every week, every quarter, or off).
- The game auto-pauses for decisions: incidents, board meetings, and (optional setting) expiring loan applications.

### 5.2 World and map
- Real cities with procedurally generated maps, seeded per city, with no real street layouts.
- Each city has districts with their own foot traffic, demographics, incomes and rents: Financial, Downtown, Midtown, University, Suburbs, Industrial and Waterfront.
- Pins mark every interactive building. The Layers sheet filters the 14 types in §3.1.
- **Start cities:** Saskatoon (small market, cheap rents), Calgary, Toronto and New York (biggest market, highest rents). The city sets the market's character, not the difficulty.
- **New Game options:**
  - **Difficulty:** Easy, Normal, Hard or Expert. Harder levels mean fewer prospects, better-run rivals with sharper rates, and more loan defaults (SIMULATION §26 `DIFFICULTY`). Normal is the balance reference.
  - **Competitors:** 1–5 rival banks in each city, defaulting to the city's usual count (CONTENT §2). Fewer rivals also means fewer rival branches.
  - **Starting cash:** $500k, $750k (default), $1M or $1.25M of spendable cash. Charter capital stays at $2M.
  - **Currency:** $, C$, £, € or ¥, the symbol money is shown in (as in the original's start options). It changes display only and can be switched later in Settings.
- Other cities open up through travel (§5.17).
- **One global enterprise.** You can fly to any city at any time and buy anything there: branches, offices, buildings, stakes, rival banks. Everything you own in every city keeps running every week at once, so the bank grows into a single worldwide business. Start cities differ in market size, rents and rivals, and that difference stays.

### 5.3 Storefronts and building a branch
- **For-lease storefronts** show:
  - weekly rent, security deposit and foot traffic
  - demographics: students, young professionals, families, retirees, businesses
  - income level and homeowner share
  - the count and average rating of nearby rival branches
- **Build Branch.** Pick five components: Exterior, Lobby, Teller line, Vault and ATM. Each option shows its price and coins for quality and productivity (vault: security).
  - Lobby tier sets the number of advisor offices. Wealth Advice needs at least one, and mortgages sell better with more.
  - After the cost summary comes a one-week fit-out ("Opening soon"; an assumption, since the original's build time wasn't visible), then a grand-opening awareness boost.
- **Closing a branch:**
  - You get back the lease deposit minus two weeks' rent, plus 30% of equipment value.
  - Accounts move to your nearest branch in the city, with extra churn, or leave if there is none.

### 5.4 Running a branch
Five tabs. Coffee Inc has four; the Loan Desk is the bank addition.

#### 5.4.1 Service
- **Customer reviews:** overall rating plus Rates, Products, Service and Branch, with a carousel of review cards that mention real causes ("Free espresso while I signed my mortgage? Fine, you win.").
- **Staff:** count and hourly wage steppers, skill and morale bars, and a wait indicator (Short / Busy / Long).
- **Branch manager:**
  - Portrait and the four skills: People, Product, Marketing, Ethics.
  - Manager since, and an annual salary stepper.
  - Delegation toggles: Staffing & wages, Products & rates, Branch marketing, Branch troubles, Loan approvals.
  - Fire or hire (a choice of three candidates).

#### 5.4.2 Products
- **House underwriting model card** at the top, like the original's company blend.
- **Category control:** Deposits / Lending / Cards & Services.
- **Product cards** show:
  - coins for product quality and an Offered toggle
  - new accounts last week with the change, and the balance
  - funding cost, a margin ring and the spread
  - a price stepper (interest rate or fee)
- **Pricing trade-offs:**
  - Savers chase rates and borrowers chase low rates.
  - Fees drive away students first.
  - Charging far above market brings in riskier borrowers (adverse selection).
- **v1 catalog:**
  - Deposits: Everyday Chequing, High-Interest Savings, 1-Year GIC, Student Account, Business Account
  - Lending: Personal Loan, Auto Loan, Mortgage, Line of Credit, Small Business Loan (via the Loan Desk)
  - Cards & Services: Credit Card, Wealth Advice, Safe Deposit Box, FX & Wires
- Product development adds variants (§5.8.3), which carry a delete icon like the original's.

#### 5.4.3 Loan Desk
- Local businesses apply each week. Each application shows:
  - business name and sector
  - amount, term and collateral
  - the most they'll pay
  - a pentagon: Management, Track record, Market, Competitiveness, Financial health
- Approve at a rate you choose, decline, or let it expire after two weeks.
- An estimated risk band appears only with a Risk & Compliance floor or a manager with Product skill ≥ 60.
- **Delegated decisions** follow the manager's Product skill and Ethics plus the company risk appetite.
- Approved loans are tracked individually, and big defaults make the news.

#### 5.4.4 Marketing
- Ten campaigns, each with levels and costs (CONTENT): Free Lobby Coffee, Charging Station, Saturday Hours, Sign-Up Bonus, Paperless Pledge, Direct Mail, Money Workshops, Community Sponsors, Social Media, Local Paid Search.
- Campaigns build awareness, nudge ratings and target customer segments.
- The Sign-Up Bonus trades more new deposits for flightier customers.

#### 5.4.5 Finance
- Branch revenue and branch income, each with its weekly change.
- A five-week paired bar chart.
- The branch income statement (Week / Quarter / Year).
- Balances: deposits, loans and customers.

### 5.5 Customers and competition
1. **Prospects.** Each branch draws prospects from foot traffic, scaled by awareness and by how much of the neighbourhood already banks with you (saturation).
2. **Share.** Prospects split by overall rating between you, nearby rival branches, your own nearby branches (cannibalisation), and the city's big incumbent banks.
3. **Capacity.** Teller stations × productivity, plus ATMs, adjusted by staffing, skill and morale, caps how many you serve. Overflow becomes long waits and poor Service reviews.
4. **Products.** New customers choose products by segment affinity, price versus market, product quality and loan approval.

### 5.6 The bank layer
Shown to the player in one place, the Company summary:
- **Deposits fund loans.** Customer deposits aren't your money. They sit in the treasury as liquid assets or get lent out, and you earn the spread.
- **Corporate cash** (top bar) is the company's own money: profit, capital raised and corporate borrowing. It pays for branches, salaries, acquisitions and dividends. Deposits can never be spent as corporate cash.
- **Charter capital.** The bank starts with $2M of charter capital held in the treasury. It counts toward equity and liquidity but can never be spent. Together with the $750k of spendable cash, this keeps the founder phase to one branch, maybe two, like the original's £320k start.
- **Funding transfer rate.** Inside each branch, deposits earn a funding credit and loans pay a funding charge at the central bank rate. Each branch's income therefore shows whether it gathers cheap money and lends it well.
- **Liquidity.** Liquid assets must stay at or above 10% of deposits; the player sets a higher target in Treasury. On a shortfall, Treasury borrows overnight (auto-funding); without funding, new lending freezes.
- **Capital ratio** = equity ÷ risk-weighted assets.
  - Loans consume capital: mortgages lightly, business loans fully, equity stakes heavily.
  - Grow capital by keeping profits or issuing shares.

  | Tier | Ratio | Effect |
  |---|---|---|
  | Strong | ≥ 14% | Cheaper funding |
  | Adequate | ≥ 10.5% | No restrictions |
  | Watch | ≥ 8% | Dividends capped |
  | Restricted | ≥ 6% | No dividends, no new branches or acquisitions, lending halved |
  | Critical | < 6% | No new lending, fines. Too long below 4.5% means regulator takeover. |
- **Bank runs.** A terrible reputation plus weak capital or liquidity can trigger a run. Deposits flee fast until you respond.

### 5.7 Macro and central banks
- **Cycle.** Every country moves through expansion, slowdown, recession and recovery.
- **Central bank.** Each country's central bank (real institution names, simulated decisions) meets eight times a year; some meet four times. Policy follows inflation and growth.
- **Effects.** The cycle moves loan demand, default rates, house prices, the yield curve (which inverts before recessions), stock prices and deposit growth.
- **On the map.** The central bank building shows the country dashboard and offers an emergency lending facility, which carries stigma.

### 5.8 HQ and offices
- **Offices.** Lease office buildings (floors, area, weekly rent, deposit). Each floor holds one department. Desks per floor depend on the building (24 or 32, as in the original); Investment floors have 32 and the Executive suite 7. Departments can span floors and offices.
- **Each department shows:**
  - employees (n / desks) and open positions
  - annual salary
  - skill and morale
  - coverage: staffing versus what the company's size requires
- An advisor calls out shortfalls.
- **Founder mode:** with two or fewer branches nothing is required. Requirements phase in from three to six branches.

#### 5.8.1 Finance
- Company statements (income, balance sheet, cash flow; Week/Quarter/Year), a revenue and net income chart, and a capital and liquidity summary.
- Understaffed:
  - statements are delayed
  - an investor-relations discount hits your share price
  - late filings are fined once you're public

#### 5.8.2 HR
- Benefits carousel: Tuition Support, Pension Match, Employee Stock Plan, Childcare Support, Free Lunch & Snacks, Volunteer Days, Staff Mortgage Discount, Wellness Program, Remote Fridays.
- Each shows cost per employee, estimated weekly cost and its effects. Benefits apply to everyone.
- Understaffed: hiring slows and morale drifts down.

#### 5.8.3 Products
- House underwriting model: a radar (Accuracy, Speed, Inclusion, Fraud shield, Fairness) and cost per application. Manage Models mixes data sources. Model quality nudges every branch's Products rating, as the blend does in the original. Custom models can also be commissioned at a credit bureau, like a custom blend at a roaster.
- Risk appetite, five levels.
- Company product lineup with "Apply rates to all branches".
- Product development: type, target price tier, 4/8/12/24/48 weeks and a weekly budget, with a live star-odds table.
- A company-wide deposits and loans trend chart.

#### 5.8.4 Treasury
- **Liquidity:** a gauge and the policy settings (target liquidity, bond share, auto-funding).
- **Government bonds:** market value, yield and unrealised gain or loss.
- **Funding inventory:** one card per lot with counterparty, type, rate, amount, maturity, and a radar (Cost, Term, Stability, Flexibility, Discretion).
- **Funding market:** offers refresh every two weeks. A strong treasury team and capital ratio bring more and better offers.
- **Payroll partnerships:** employer, employees, "Year 3 of 7", deposit curve and relationship health. Renew or let lapse.

#### 5.8.5 Marketing
Brand awareness by city, brand campaigns (TV, billboards, podcasts, creators, arena naming rights) and agency packages.

#### 5.8.6 IT & Security
- The mobile app rating feeds the Products rating and reduces branch visits.
- Losing the CTO drags the app rating down until the seat is filled.
- Breach and outage odds.
- Digital projects, run as developments of type Digital.

#### 5.8.7 Risk & Compliance (new floor)
- Shows loss rates by product, delinquency, model performance and regulator status.
- Understaffed: higher defaults, more fines and worse delegated loan decisions.

#### 5.8.8 Executive
- Quarterly board meeting.
- Senior executives: COO, CFO, CPO, CMO and CTO, as in the original, plus a Chief Risk Officer as a seventh seat.
- Each profile has skills (Leadership, Expertise, Loyalty), delegation toggles, salary, stock option and RSU grants with vesting, and a fire button.

#### 5.8.9 Investment
- Company portfolio: stocks, ventures, real estate and venture debt.
- Ventures pipeline. More staff finds more startups.

#### 5.8.10 Outside HQ: agencies, lobbyists, universities
- **Marketing agencies** sell city-wide campaign packages.
- **Lobbying firms** push regulatory changes at a price, with a chance of failing and a chance of a Ledger exposé.
- **Universities** offer student-account partnerships and a graduate program that improves hiring pools.

### 5.9 Rivals
- **Who they are.** Each city has rival banks with a strategy (Incumbent, Disruptor, Premium or Community). Each has branches on the map, published rate sheets, reviews, quarterly earnings, dividends and executives, plus share prices if listed.
- **How they behave:**
  - expand into strong neighbourhoods and close losing branches
  - react to price wars
  - pass rate hikes to savers slowly (deposit beta)
- **Failures.** Weak rivals can fail in recessions; their branch networks go up for distressed sale.
- **Corporate lending.** Rival bank HQs (Banks layer) lend to your company: business loans and a line of credit. This is corporate cash, never deposits.

### 5.10 Capital markets
Investment banks on the map, with tabs Market / Equity / M&A:
- **Market:**
  - sector tabs: Banking, Technology, Energy, Auto, Retail, Real Estate
  - company cards: price chart, market cap, dividend and yield, 52-week range, P/E, top shareholders
  - trade from the company or the personal account
- **Equity:**
  - While private: private placements, selling up to 25% per round.
  - IPO once eligible: equity ≥ $25M, four profitable quarters, a finance team in place, and capital at least Adequate.
  - After listing: secondary offerings showing new shares, price per share, gross proceeds, underwriting fee and capital raised.
- **M&A:**
  - Buy rival banks with an offer price and premium.
  - Acceptance depends on the premium and the target's health.
  - The regulator checks your post-deal capital and local market share.
  - Acquired branches convert to your brand over eight weeks.
- After the IPO, your share price tracks book value × (ROE ÷ cost of equity), moved by news, earnings and sentiment.

### 5.11 Real estate
- **Buy buildings** as the company or personally. Listings show size, estimated value, market rent, occupancy and asking price.
- **Run them.** Set rent per m² and occupancy responds. Weekly rent, maintenance and vacancy costs give ROI. List any building for sale.
- **Foreclosures.** Defaulted mortgages leave foreclosed homes (REO) in each city. Sell them (fast, at a discount), rent them out, or hold.

### 5.12 Ventures and conventions
- **Where startups come from.** The Investment floor surfaces startups that are raising money. Conventions show exclusive ones; they're announced in the Ledger, sit on the map for a week, and must be attended in person.
- **Startup screen:** description, founded, CEO, pre-money valuation, benchmark pentagon, quarterly financials, the current round with two offer lots (invest as Company or Private), funding history, top shareholders.
- **Lifecycle.** Startups grow, raise up or down rounds, IPO, get acquired, or fail.
- **Bank twist:** offer **venture debt** instead of buying shares.

### 5.12a Currencies (FX)
- **A country bet.** Every country's currency is an investment: buy it when you think that country will do well against your home country, sell when you think it will slip. It's deliberately simple, a "country up or down" position, not real currency trading.
- **What moves it:** the country's growth and interest rate against your home country's, its business cycle (recessions weaken a currency), plus noise. The Hong Kong currency is pegged to the US one.
- **Where:** a Currencies view at any investment bank (beside the stock market), for the company or personally. Positions appear in the Investment floor portfolio and on the balance sheet.
- Your operations are still booked in one currency; FX here is only an investment.

### 5.13 Governance
- **Quarterly board meeting.** Set the dividend per share and your CEO compensation, then the board votes. Your ownership, company performance and how reasonable the proposal is decide the result.
- **Regulator caps** dividends in weak capital tiers.
- **Dividends** are paid three weeks after declaration; an incident reminds you to keep the cash.
- **Executives** can resign or be poached; equity grants improve loyalty.

### 5.14 Incidents
- Case-based modals ("Case 1 of 2") with two or three choices:
  - robbery and ATM skimming
  - data breach, card fraud ring and mis-selling
  - regulator audit and insider-trading probe
  - viral complaint, staff walkout and branch flood
  - executive poached and price war
  - bank-run rumour and big default
  - dividend reminders
- Branch incidents can be delegated to managers.

### 5.15 The Daily Ledger
- The newspaper sits in the weekly results and is archived in the menu.
- Tabs: Top / Banking / Business / Markets / Politics / Sports.
- Articles come from real simulation events:
  - branch openings
  - central bank decisions with GDP figures
  - earnings, dividends and executive moves
  - conventions, rankings, fines and failures
  - housing, auctions and sports

### 5.16 Personal layer
- **Founder profile:** name, avatar, title and salary.
- **Personal cash** comes from salary, dividends, rents and trades.
- **Spend it on:**
  - vacation homes (which can be rebuilt to raise their value) and cars
  - collectibles from auction houses (appraise them to discover counterfeits)
  - a private jet
  - a sports franchise, whose kit sponsorship boosts your bank's brand
- **Personal Wealth screen:** total assets with weekly change, a donut (cash, stocks, real estate, other), and holdings with cost basis and gains.
- **Annual rich list.**
- **Insider trading:** trading your own bank's stock just before earnings risks an investigation.

### 5.17 Travel
- **Airports.** Every city map has one. Departure boards list destinations with real distances.
- **Flying** animates across the map and loads the new city.
- **Where you need to be.** Opening branches or visiting buildings in a city requires being there. Existing branches can be managed from the Branches list anywhere.
- **Travel is never blocked.** You can fly anywhere at any time.
- **Weekly mileage:** flights within 24,140 km per week are free, as in the original. Remaining mileage shows on every departure board. Past the allowance, a destination still flies, as a paid one-way ticket from personal cash (the original charges a flat fare). If personal cash can't cover it, the bank pays the rest as a travel expense.
- **First visit:** a city's storefronts, rivals and buildings are generated when you first land there, the same in a given save whenever you arrive. Regional sites (Fort McMurray, Pilbara, Midland) are small maps with an airport and a big employer, whose payroll deal any of your branches in that country can host.
- **Private jet:** bought with personal cash (Corvid 600, 6,000 km range; Albatross 8000, global). Adds a "Fly now" option from any map, and its flights never cost a ticket (assumption); a hop beyond the jet's range flies by the normal rules.

### 5.18 Goals, milestones, failure
- **Milestones:** first branch, first loan, first profitable quarter, 10 branches, HQ fully staffed, IPO, first acquisition, $1B in deposits, five countries, billionaire founder, rich list #1.
- **Failure:**
  - **Regulatory takeover:** Critical capital for too long, after an emergency recapitalisation offer is declined or fails.
  - **Insolvency:** corporate cash below zero for four weeks with no credit available.
- The game-over screen is a Ledger front page.

### 5.19 Settings and saves
- Settings: currency symbol, distance units, weekly results frequency, default speed, auto-pause, sound, reduced motion, text size, founder avatar.
- Autosave every week plus three manual slots.
- Export/import save code to move a game between devices.

### 5.20 Onboarding
- The first branch manager guides the opening steps: lease, build, set the savings rate, hire a manager, read the weekly results, start lending, approve a business loan.
- It's skippable, and hints stay available in the advisor bar.

## 6. Out of scope for v1
- FX conversion between currencies (one display currency; currencies exist only as an investment, §5.12a)
- Multiplayer
- Derivatives and crypto
- Real-world street maps
- App Store packaging
- Voice acting

## 7. Decision log
Add one dated line per decision. Never delete entries; supersede them.

- 2026-10-23: Working title Vault Street, repo `VaultStreet`, GitHub Pages hosting.
- 2026-10-23: Stack: Vite + TypeScript + Preact + Canvas 2D, deployed via GitHub Actions. Matches the studio's Season Ticket workflow.
- 2026-10-23: Daily clock with a weekly economic tick, plus quarterly and calendar events (SIMULATION §2).
- 2026-10-23: Loan Desk added as a fifth branch tab.
- 2026-10-23: Coffee supply chain becomes Treasury funding; plantations become payroll partnerships; company blend becomes the underwriting model; roasters become credit bureaus.
- 2026-10-23: The commercial bank becomes rival bank corporate lending, plus a central bank building per country.
- 2026-10-23: Default currency symbol $, switchable in settings; no FX in v1.
- 2026-10-23: Corporate cash is kept separate from the banking book; deposits can't be spent (SIMULATION §13–15).
- 2026-10-23: Art direction "Banknote Deco": an engraved currency-style world with a deco vault UI.
- 2026-10-23: Start cities Saskatoon (Easy), Calgary (Normal), Toronto (Hard), New York (Expert).
- 2026-10-23 (review): Executive seats follow the original's six (CEO, COO, CFO, CPO, CMO, CTO), plus a CRO as a seventh. The Executive suite has 7 desks.
- 2026-10-23 (review): Start with $750k to spend plus $2M of charter capital locked in the treasury, so the founder phase begins with one branch, maybe two, like the original's £320k start.
- 2026-10-23 (review): Faster branch ramp (3× intake, stronger saturation) so a mid build pays back in under ~40 weeks, keeping the original's expansion snowball.
- 2026-10-23 (review): Company loans target about 80% of deposits (mortgage approval lowered to 0.42).
- 2026-10-23 (review): Loan Desk applicants accept up to FTP + 5–5.5%.
- 2026-10-23 (review): Product development uses 4/8/12/24/48-week terms and a weekly budget; reference odds 29/40/27/4/0.
- 2026-10-23 (review): Weekly travel allowance of 24,140 km, as in the original.
- 2026-10-23 (review): The house model's quality feeds the Products rating, as the blend does in the original. Custom models can be hosted at a credit bureau.
- 2026-10-23 (review): The app rating defaults to about 3.75 without an IT team. A CTO vacancy drags it down until the seat is filled.
- 2026-10-23 (review): Vacation homes can be rebuilt (option seen in the original; effects assumed).
- 2026-10-23 (review): Assumptions not seen in the recordings: one-week fit-out, 1 day per second at 1×, executive skill names, jet mileage bonus.
- 2026-10-24: Work lands straight on `main` (owner's choice); every push must pass lint, tests and build.
- 2026-10-24: Toolchain pinned to Preact 10.x and TypeScript 6.0 (typescript-eslint doesn't support TypeScript 7 yet); Vite 8, Vitest 5, ESLint 10.
- 2026-10-24: The title shows only New Game and Continue until saves exist (Stage 2), when Load and Settings join them.
- 2026-10-24: `buildBranch` leases the storefront and builds in one step; there is no separate lease command. The first week's rent is paid up front.
- 2026-10-24: New branches open with deposits, FX & Wires, the Loan Desk, a safe deposit box (if the vault has boxes) and wealth advice (if the lobby has an advisor office). Other lending and cards start off, so the tutorial's "Turn on Personal Loans" step is meaningful.
- 2026-10-24: Rival rate sheets are one per bank, shared by all its branches.
- 2026-10-24: Fee competitiveness for % fees (wealth, FX) uses a 0.25pp floor in place of $1. Chequing churn compares fees against the market, since its pay rate is fixed.
- 2026-10-24: Until HQ floors exist (Stage 4), every department coverage reads as 1. The central bank window is used automatically after overnight funding in Stage 1. Foreclosed homes (REO) build up at recovery value until Stage 7 adds hold, rent and sell.
- 2026-10-24: The overnight limit shrinks with the capital tier (×1 Strong/Adequate, ×0.75 Watch, ×0.5 Restricted, ×0.25 Critical). This is an assumption; the docs named a `ratingMult` without values.
- 2026-10-24 (owner's call): Keep CONTENT's fee levels; a mature branch earns about $45–70k a week, close to the original's store economics. SIMULATION §25 targets updated to match.
- 2026-10-24: Stage 1 calibration: CATCHMENT_MULT 2.5 → 1.0, PROSPECT_RATE 0.030 → 0.040, SATURATION_EXP 2.5 → 2.8, price factors use PF_RATE_STEP 0.01, FX_PER_CUSTOMER 1,800 → 900, Loan Desk median amount $120k → $70k, lower deposit and wealth tickets, mortgage approval 0.48 (CONTENT §5).
- 2026-10-24: Insolvency and game-over checks are deferred to Stage 2, when there is a UI to show them.
- 2026-10-24: `closeBranch` moves loans to the nearest branch in the city and 85% of accounts and deposits with them (an assumption for "extra churn"); the rest leave, paid from reserves. Closing your only branch in a city is refused while it holds loans. Equipment recovery uses book value; the remaining book value is written off as depreciation.
- 2026-10-24: Game over arrives in Stage 2: insolvency after 4 weeks of negative corporate cash, and regulator takeover after 13 weeks with a capital ratio below 4.5% (the 8-week wait plus the 5-week recapitalisation window). The recapitalisation offer itself waits for incidents.
- 2026-10-24: The simulation uses its own exp/log/pow/cos/tanh (`detmath.ts`) because JavaScript engines round the built-ins differently, which made the determinism snapshot differ between Node 22 and CI's Node 24 (and would between browsers).
- 2026-10-24: Stage 2 UI choices: branch products are a vertical list (not a carousel) so every toggle and price is visible on a phone; the margin ring shows revenue kept after FTP, servicing and expected loss; the branch panel title wraps to two lines; title-screen Saves and Settings open as a centred column rather than a drawer.
- 2026-10-24: Browser storage lives in `src/sim/save/storage.ts`, the only module allowed to touch it (CLAUDE.md); the simulation never calls it.
- 2026-10-24 (owner's call): Difficulty is its own New Game setting (Easy, Normal, Hard, Expert) instead of coming from the start city. The wizard also picks 1–5 competitors and a starting cash amount from a small range ($500k–$1.25M). Normal, the city's usual rival count and $750k reproduce the balance reference exactly.
- 2026-10-24: The Loan Desk's weekly counts (approved, refused by the applicant, declined by you or your manager, expired) live in the simulation as `Branch.desk`, so they survive reloads and include manager decisions. The approval rate is approved ÷ (approved + refused + declined). Branch P&L history grows from 26 to 52 weeks for a full-year statement.
- 2026-10-24: UI polish: tapping a price shows it in the units you type (3.25 for 3.25%, 12 for $12/mo); the advisor bar lists every applicable line, most pressing first, and cycles on tap with a 1/3 counter; capital ratios above 100% read "100%+" with a note that the ratio settles as lending grows.
- 2026-10-24: Stage 3 street grid: a street every 4th row and column, leaving 3×3 blocks; storefront lots snap to the nearest free tile facing a street, and water cities get a wavy shoreline band. The layout is a pure function of the city (`src/sim/cityLayout.ts`), shared by the sim and the map art. Parks, four landmarks (central bank, university clock tower, stadium, airport) and filler buildings fill lot-free blocks; landmarks are scenery until their systems arrive. Map art constants live in `src/config/map.ts`, apart from the simulation's balance file.
- 2026-10-24: Map view: layers default to on; the Branches layer (your branches, rival branches, storefronts for lease) arrives with the map, and each of the other 13 layers arrives with the stage that builds its system (`src/data/mapLayers.ts`). Branches has a "For lease only" sub-filter (stored as `settings.layers['branches.leaseOnly']`), and the Layers sheet keeps the old city list as an accessible "List view".
- 2026-10-24: Map pins cluster below zoom 0.75 within 36 screen px (greedy grouping in world space, so clusters don't shuffle while panning); tapping a cluster zooms to 1. For-lease tags shrink to brass dots at the same zoom. Your branch pins always draw on top.
- 2026-10-24: Map camera: opens on your first branch at zoom 1, otherwise the financial district at zoom 0.5; remembered per city for the session but not saved. The screen centre stays within the city plus a margin. Mouse wheel and trackpad zoom rather than pan. Map pins don't scale with the text-size setting.
- 2026-10-24: Map renderer: chunks are a constant 256 CSS px on screen per zoom stop (not 16×16 tiles), with a 40 M px least-recently-used cache for iOS memory limits. Light comes from the back-left: left faces get light hatching, right faces medium, openings and glazing dense; cast shadows fall to the lower right. Line weight and hatch spacing scale with the zoom stop, and the 0.5 stop drops window detail. Rival lots get a striped awning in their ink; every storefront lot gets a glazed ground floor; a pier runs out from every street that meets the water. The microprint ring repeats the city name in caps (the one exception to sentence case, like banknote microtext).
- 2026-10-24: Week-by-week play (owner request): the HUD time pill gains a Next week button. It runs the remaining days of the current week at once, then pauses. It uses the same day and weekly ticks as real-time play, so the results are identical; only the pacing changes.
- 2026-10-24: Funding market: offer sizes round to $100k, offers last until the next two-weekly refresh, and borrowing part of an offer leaves the rest available. Covered bonds are only offered while mortgages leave cover to spare, and borrowing is capped at mortgages ÷ 1.25 minus covered bonds outstanding.
- 2026-10-24: Early repayment of a funding lot is allowed only for flexible types (Term Interbank; flexibility ≥ 5): the full amount at par from reserves, with no break fee, refused if it would take liquidity below LIQ_MIN. Lots pay interest at every weekly tick up to and including maturity.
- 2026-10-24: Manual central bank window borrowing carries the same stigma as automatic use on every draw; the automatic repayment rule (above target + 5pp) still repays it. Manual repayment can't take liquidity below LIQ_MIN.
- 2026-10-24: Releasing the Treasury floor clears market offers (lots run to maturity); releasing the Marketing floor stops brand campaigns.
- 2026-10-24: Brand campaign costs are flat (CONTENT §11 doesn't scale them by city). Their segment boosts multiply the new-customer mix like branch campaign boosts, with the boost above 1 scaled by Marketing coverage. Agency packages need no staff, so Marketing coverage doesn't scale them. Brand marketing runs in tick step 8 (corporate items).
- 2026-10-24: Arena Naming Rights is refused until sports franchises exist (Stage 9). The Prestige package's Branch +0.1 starts on purchase; buying it again refreshes the 26 weeks.
- 2026-10-24: Risk floor: model performance compares the default rate the booked PDs predicted (before the credit cycle and Risk shortfall) with the defaults seen. Delinquency is a proxy: the last 4 weeks' average defaults × a 13-week arrears pipeline, as a share of the balance.
- 2026-10-24: The quarterly regulator review runs from the first quarter. With no branch managers, ethics reads as 50. Until incidents arrive (Stage 5) a failed review's fine is paid at once and logged as a `REGULATOR_AUDIT` event.
- 2026-10-24: Product development tiers: the default price number moves with the tier (rates −0.10pp / 0 / +0.15pp, matching CONTENT's Senior Saver row; fees ×0.85 / ×1 / ×1.25) and Premium adds +0.05 to the Products rating where offered. Development spending is paid per week of progress (total = budget × weeks) and pauses without a Products floor; digital templates run once each.
- 2026-10-24: Developed products are first-class products (`dev_N`) with their own offers and books, built from the base product plus template and tier. They start switched off at every branch, compare against the base product's market price (fee templates scale it by their fee), and count toward Products breadth through their base. Deleting one moves its customers and balances onto the base product at each branch, so nothing has to run off.
- 2026-10-24: Company lineup: while "Apply rates to all branches" is on, HQ owns every branch's prices and lineup (branch toggles say "Set at HQ." and managers stop setting products). Turning it on copies the first branch's prices and lineup. `setCompanyOffered` also works with it off, reaching every branch whose manager doesn't run Products & rates; new branches follow the HQ lineup.
- 2026-10-24: Underwriting: switching blends old into new with weights 2/3 then 1/3; custom models refresh weekly with the Products team; bureau-hosted models are commissioned and adopted in one step at a bureau in your current city; saved custom models can be overwritten only while not in use.
- 2026-10-24: HQ offices: each city has 3–9 office buildings for lease (half in the financial district), 3–10 floors with 24 or 32 desks, about 45 m² per desk. You lease the whole building; each floor's fit-out is paid when a department moves in. Credit bureaus and marketing agencies stand on their own street-facing tiles. All of it is seeded from a separate `sites:{city}` stream so storefront lots never move.
- 2026-10-24: HQ coverage above full staffing gives +25% of the excess as a bonus, capped at +5%. HQ officers' skill settles from a higher base than tellers (55 + up to 40 with pay), so an IT team paid at market keeps the app near its founder-era rating. A new floor starts with a staff target that covers its current requirement.
- 2026-10-24: Benefits: effects scale linearly up to a stated reference amount (Free Lunch $60/wk, Childcare $6k/yr, Volunteer Days $100/wk, Wellness $1,500/yr, Staff Mortgage 1%), then grow at half slope up to 1.5×. Attraction points add to the hiring attraction ratio (+1 point = +0.01). Retention effects multiply quits by (1 − retention) each.
- 2026-10-24: Stage 4 tuning: per-branch HQ requirements cut about 40% and the Risk PD penalty raised to 1.5 × (1 − k′), so skipping the HQ visibly costs more than staffing one (balance strategy `nohq` ends year 6 ~13% behind `steady`, with loan losses near 2%). Scripted strategies lease their first office at 4 branches and pause expansion until every department reaches 90% coverage.
- 2026-10-24: HQ UI: model mix sliders always total 100% (moving one rescales the others in proportion) for one-handed play; funding lot cards show their details inline instead of a Details button; the window Borrow slider runs to the larger of $1M and 10% of deposits, with a stigma warning only when no stigma is running; the Treasury floor also carries the one-way "Transfer cash to Treasury".
- 2026-10-24: Map pins (owner request): open branch locations show a blank "$" medallion and read "Available" in the list, Layers filter and panel title; the "For lease" tag is kept for buildings you rent (office buildings now, with their type icon). Third-party places you deal with but don't rent (credit bureaus, agencies, and investment banks when Stage 7 adds them) keep type medallions.
- 2026-10-24: Correction: investment banks arrive with Stage 6 (Governance and capital markets), not Stage 7. As the owner confirmed, you deal with them rather than own them, so they get a type medallion, never the "$" coin or the "For lease" tag.
- 2026-10-24: Stage 5 map buildings: each rival present in a city gets a head office in the financial district (Banks layer), each city gets City Hall, a port in waterfront cities, any named employers (Saskatoon's Prairie Potash Co.) and common types up to 2–4 employers, plus one university (named or "University of {City}"). About 60% of employers start with a rival as their payroll bank. They are seeded from a separate `sites5:{city}` stream so lots, offices and Stage 4 sites never move. The central bank pin sits on the city's domed landmark and speaks for that city's country.
- 2026-10-24: Every country in CONTENT §1 runs its macro economy and central bank meetings from Stage 5, even before you can operate there (multi-city is Stage 8), so the Ledger can report them and the world feels alive.
- 2026-10-24: Rivals keep simplified books from Stage 5: each branch holds deposits and loans (seeded branches start mature: $45M × city income × overall/3.4 of deposits, loans at 82% of deposits) and each bank an equity figure from a strategy capital ratio (disruptors thin at 8–10%, premium banks 13–15%) over 75%-weighted loans. Their CEO names come from the name pools.
- 2026-10-24: Corporate interest and incident costs are operating expenses (not interest expense), so they don't distort NIM. Partnership signing fees are intangible assets amortized as a non-cash expense and deducted from CET1.
- 2026-10-24: Credit cycle slope 0.16 → 0.35 (SIMULATION §4.5). With 0.16 a recession only lifted annual loan losses from about 0.8% to 1.0%, below the §25 band of 1.2–2.5%; at 0.35 the seed-42 run's year-2/3 recession books 1.6% while expansion years stay at 0.8–0.9%. Acceptance test: `tests/sim/recessionDefaults.test.ts`.
- 2026-10-24: Reserves earn the policy rate minus 0.50% (a deposit-facility rate, as most central banks pay), not the full policy rate. The deposits-only `turtle` strategy fell from about 59% to about 40% of `steady`'s year-5 equity (target under 40%); `steady` itself moved by under 5%.
- 2026-10-24: Rival AI (Stage 5). A rival branch's deposit target is its mature size cut by local crowding and by your strong-share branches nearby; new branches ramp along `1 − (1 − t)³` over 156 weeks (a straight ramp tripped the 26-week closure rule before branches matured). Rivals expand only after 4 reported quarters with positive trailing profit and CR > 11% (6% per monthly check, disruptors ×0.25), stop once they hold 30% of a city's lots or fewer than 30% are free, and pay the build cost from equity. A rival's last branch never closes. Quarterly payouts steer each rival toward its strategy capital target; dividend yields use notional shares (book $20, price = book × clamp(ROE/10%, 0.5–2.5)) until Stage 6. Disruptors feel recessions hardest; any rival under 2% CR fails in any phase. A failed network goes to the city's active rival with the fewest branches after 8 distressed weeks (Stage 6 adds buying it).
- 2026-10-24: Price wars add their bump to rival deposit rates at once (cap +0.60pp) and fade by 0.01pp a week after your Rates streak ends. Your "Match" answer is a 26-week +0.15pp savings boost at your branches in that city, so it works with HQ "apply to all".
- 2026-10-24: Rival corporate lending: each active rival with a head office in a city where you have a branch makes 2–3 business-loan offers every 4 weeks, sized within 40% of equity minus corporate debt already owed; each lender's line of credit is 20% of equity. Payments are taken even when cash is short (the insolvency rule then applies); lines are never drawn automatically.
- 2026-10-24: Rival HQ pins are the bank-icon medallion ringed in the rival's ink with a small pennant; a distressed rival's HQ fades with a dashed ring and a seized one leaves the map. The central bank pin is a slightly larger navy medallion with a brass columned dome. Employers and universities you partner with get a small brand-ink seal.
- 2026-10-24: The Daily Ledger is composed in the simulation (tick step 16) and stored as text: the currency symbol is fixed at print time. An issue covers the week's tick plus events from between ticks. Central bank stories: your home country always, other countries you operate in always, elsewhere at most two of the biggest moves. Politics: about one proposal per country every 80 weeks; only the capital buffer (+1pp on tier thresholds for 52 weeks) has a game effect, and other policies' copy promises nothing. Every country has a fictional sports league. Fastest Growing ranks banks by asset growth since the last year end. The yield curve takes 0 / 45% / 80% / 100% of the term premium at overnight / 2y / 5y / 10y. The archive headlines each issue with its biggest story other than your routine weekly figures.
- 2026-10-24: Incidents. fraudShield (0–10) = 4 × IT coverage′ + 0.4 × the underwriting model's fraud score + an ATM bonus (wall 0, dual 0.5, smart 1, lobby 1.5); card fraud ignores the ATM. CTO expertise reads 50 until Stage 6 and a branch without a manager reads ethics 50. "For N weeks" means N weekly ticks; rating hits move the displayed rating at once and its target until they expire. Delegated managers pick by expected cost (cash plus non-cash effects valued in weeks of branch revenue), with noise that shrinks with their People and Ethics skills, and never pick the option that fires themselves. Robbery: the uninsured 20% is paid when the case opens, and the vault upgrade buys the next tier at half price as a fixed asset. Regulator audit consultants cost the fine plus half again (read literally they were cheaper than paying). Only new cases open the modal; pending ones wait behind a "N cases" chip under the date pill and show an oxblood dot on the branch pin. EXEC_POACHED and DIVIDEND_DUE wait for Stage 6, INSIDER_PROBE for Stage 9.
- 2026-10-24: Supersedes the Stage 2 takeover entry: after 8 weeks below 4.5% CR the regulator offers an emergency recapitalisation (shares at 50% of book value per share, enough for 10.5% CR, rounded up to $1,000). Declining, letting it lapse, or still being under 4.5% five weeks after accepting means takeover. Bank runs start only when their case can be raised (8-week cooldown).
- 2026-10-24: Partnerships. New deals start at health 60; perksBonus = HR benefits' morale points, capped at 10. Partner accounts pay the package's rate (or a fee account's fixed pay rate) with no monthly fees, posted at company level rather than in the host branch's P&L. Renewal opens in the last 52 weeks at today's signing fee × (1.5 − health/100) and extends the term 364 weeks, so the curve stays at its peak. On termination, lapse or release the unamortized fee is written off and the balance runs off evenly over 12 weeks; if the host branch closes the deal moves to another branch in the city. Student partnerships: 6k/10k/16k/24k students by city size (S/M/L/XL), $30 per student × incomeIndex, $600 per participating student, one student and one payroll deal per university. Graduate program: $120k × wageIndex a year (benefits line), +10 skill for manager candidates and +1 hire a week at branches and HQ floors; it ends if the yearly fee can't be paid.
- 2026-10-24: Event toasts remember the last event announced rather than a position in the event log (the log drops old weeks each tick, which could repeat or skip toasts).
- 2026-10-24: Stage 6 foundation. Saves move to version 7 (executives, governance, cap table, stock market, personal account, M&A). Every v1 city gets an investment bank: cities CONTENT §16 doesn't list borrow the nearest house in their country or region (Saskatoon and Montréal → Ashgrove Capital, Seattle → Whitlock & Rowe, Frankfurt and Amsterdam → Meridian Partners). Its pin is a chart medallion (Investment Banks layer), never the "$" coin or "For lease". Stock exchanges and the market index ("Ledger Composite") are fictional; market beta comes from the sector. The cap table is one list of holders (the founder is one of them); every new share goes through one function so holders always sum to shares outstanding. Recapitalisation shares go to a "Deposit Protection Fund" holder.
- 2026-10-24: Board votes (unspecified in the original): you and your executives vote with your shares; outside holders approve a dividend by its payout ratio and a CEO salary by how it compares with a CEO market rate (1.5× the executive market salary), with penalties for big raises and weak ROE (SIMULATION §17.3). While you hold a majority every proposal passes, as the chairman does in the original. A dividend is a liability for the 3 weeks before payment; the founder's share goes to personal cash.
- 2026-10-24: Executives: market salary $180k + $60k per $1B of assets (× city wages, capped at $2.5M); severance 26 weeks; grants up to 2% of shares, vesting yearly over 4 years, options exercised whenever vested and in the money; grant cost is a non-cash expense matched by paid-in capital. execMult multiplies the department's staff effectiveness, so a weak executive (expertise under 40) can hurt. Leadership only sets the asking salary in v1. The CTO vacancy penalty applies only after you've had a CTO. Each delegation is a small weekly routine using the normal commands (details in SIMULATION §17.4); the COO's benefits spending is capped at 8% of payroll, because without a cap it bought every benefit. Releasing the Executive suite fires every executive with severance. The Employee Stock Plan gives executives +5 loyalty.
- 2026-10-24: CEO salary is paid from the first week ($120k a year into personal cash), as §22 specifies. It trims about $2,300 a week from a young bank's profit.
- 2026-10-24: Stock market details: listed-company dividends pay at quarter-end without a price drop; listed rivals use your bank's §19.5 price model and are priced at book until their first report; private rivals trade at book and seized rivals at 0. Company holdings are marked to market weekly through the P&L (`investmentGains`), so the balance identity holds. You and your company together may own at most 30% of a listed company or rival; more is a takeover. Company trading works from the investment bank without an Investment floor (Stage 7).
- 2026-10-24: Your share price: incidents knock sentiment by 3% + 12% × a per-type severity (a routine robbery barely; a data breach or bank run hard; viral complaints, floods, reminders, city and personal cases not at all), because shocking on every branch mishap kept a 50-branch bank 20% below its target. Sentiment stays within 0.4–1.8. The IPO float % is the public's share after listing; the ticker comes from your monogram. An IPO can't be launched while one is pending, placements stop while it is, and a secondary offering is capped at 25% of outstanding. The placement investor is a fund not yet on your cap table. The Employee Stock Plan costs 0.5% of payroll per discount point in cash (not modelled as dilution).
- 2026-10-24: M&A closing keeps the books balanced by treating the target's cash as D + E − L (less corporate debt you owed it, which is settled, and its lease deposits, which move to you); if that is negative its loans are written down to fair value. Your company's existing stake counts toward the price at market; personal shares are bought out at the offer price. Acquired fit-outs aren't booked as fixed assets. Converted branches get a build by the seller's strategy, full staff with morale −10, a generated manager with every delegation on, every product they can serve, and books split by a mature mix. The rebrand cost is spread over the 8 conversion weeks. A regulator block doesn't start the 4-week retry wait; an accepted deal you can no longer afford lapses. A distressed network's ask is rolled once at failure (P/B 0.4–0.7, floored at $1 a share); while you have an offer pending it isn't split. Converting branches keep the old bank's ink on the map with a progress ring and a "Converting" label.
- 2026-10-24: The steady balance strategy takes a 25% private placement when its capital ratio is under 13% and cash is short, and launches a 25%-float IPO as soon as eligible; it lists in years 5–6 on seeds 42, 7 and 99.
- 2026-10-24 (owner): One global enterprise. You can travel to any city at any time and buy any asset there; everything you own in every city runs at once. Supersedes the weekly travel cap: flights inside the 24,140 km weekly allowance are free, flights past it cost a flat one-way fare from personal cash (the original's behaviour), and jet flights are always free.
- 2026-10-24 (owner): Currencies become an investment category (DESIGN §5.12a, SIMULATION §19.10): a simplified "country up or down" position per foreign currency, traded at investment banks as the company or personally, built with Stage 7. Operations stay in one currency.
- 2026-10-24 (owner): The New Game options step offers a starting currency ($, C$, £, €, ¥), as the original does. It sets the display symbol only (defaulting to the saved preference); books stay in one currency.
- 2026-10-24: Stage 7 buildings. Every city has property buildings (4/6/8/10 by size); a convention centre stands in L/XL cities and every host city; each country's lobbying firm has an office in its cities (Switzerland borrows Rue Royale Affairs, Japan Harbourline Policy Group). Calgary gains the Foothills Founders Fair (week 28) so every start city has a convention before travel arrives.
- 2026-10-24: Stage 7 books. New P&L lines: venture debt interest (interest income), rental income and property gains (fee & other income; property gains are non-cash) and property costs and lobbying (opex). Venture marks use investment gains and venture debt write-offs loan losses. Risk weights: ventures 2.5, venture debt 1.5, buildings 1.0, currencies 1.0. Company investing in startups, venture debt and buildings is refused at the Restricted and Critical tiers, like acquisitions.
- 2026-10-24: Ventures. A round's new shares come as two equal lots (a 30% round gives the original's two 15% lots); the round price is the mark from the day the round opens; unsold lots go to funds. Margins approach the sector margin as product maturity reaches 8; a startup that runs out of cash fails; IPOs list at 1.0–1.5× the last round. A startup you hold or lend to stays visible anywhere. Convention exclusives you never backed leave at year end; finished startups you didn't hold keep the last 12. Two sectors in the seed list get their own μ: Energy storage 0.06 and Agtech/Fintech 0.065.
- 2026-10-24: Real estate. A rejected offer locks the listing until the next refresh. Building value is the §21.1 estimate at today's cre (rent and occupancy don't change it). Rent ranges 50–160% of market. REO selling can't be called off and carries no cost meanwhile.
- 2026-10-24: Lobbying. The third campaign is "Stall the capital buffer bill" (offered only while one is pending) instead of "Delay fee-cap legislation", since there is no fee-cap law in the game. One pending campaign per type; exposure is rolled win or lose (fine of half the fee, −0.03 awareness, a Ledger exposé). A fast-track is used by the next deal that closes.
- 2026-10-24: Stage 8 travel. The fare past the weekly allowance is $80,000 × the destination's cost index (the original shows a flat £80,000). It comes from personal cash; if that runs short, the bank pays the rest as a travel expense (P&L `travel`), so travel is never blocked. Flights are instant in the simulation; the plane animation is cosmetic.
- 2026-10-24: A city is generated on first visit from streams seeded per city, so it's identical whenever you arrive; cities after the start city draw their rivals from their own stream so a visit never shifts weekly rival draws. Rival counts in later cities follow each city's usual count, shifted by your New Game choice (e.g. one fewer than usual everywhere).
- 2026-10-24: The start city is the bank's home (saved as `meta.homeCityId`): its country's central bank lends to you (overnight and emergency window), taxes you and lists your shares. Branches everywhere else still run on their own country's rates and economy.
- 2026-10-24: HQ prices ("Apply rates to all branches") are kept per country, because policy rates differ (0.75% in Japan, 4.5% in the US); a country's list starts from its first branch's rate sheet or its default prices.
- 2026-10-24: Private jets are personal assets: upkeep 8% and depreciation 6% of value a year (SIMULATION §22), resold at 90% of current value. One jet at a time.
- 2026-10-24: Stage 8 travel UI. The city pill stays bottom centre (SCREENS §0.2) and opens a Travel sheet. Free and jet rows fly on tap; fares and jet purchases and sales ask to confirm. The departures board groups regions as Americas (CA, US), Europe (UK, EA, CH) and Asia-Pac (JP, AU, SG, HK). The flight overlay uses hand-drawn coarse continents and bows the arc slightly so short hops read as arcs. The game clock keeps running while you fly. A first visit starts the camera over the financial district (a regional site between its airport and employer). Regional maps draw only the airport landmark and low buildings.
- 2026-10-24: Stage 8 multi-city rules. A rival's lagging rate sheet belongs to its home country (its first city); in other countries it prices at its strategy target for that country. HQ brand campaigns can target any city you've reached (or its country) from anywhere; agency packages need you in the agency's city. The capital-buffer lobbying campaigns are offered only at home, where the buffer binds. Branches outside the home city are named "{City} {District}". The Ledger's "your cities" are home plus branch cities; its rate watch follows your busiest city. The central bank panel says how many of your branches price off its rate.
- 2026-10-24: Balance strategies (Stage 8): steady and aggressive build only on lots scoring at least 25% of the city's best, and when none are left fly on — home-country cities nearest first, then the rest by distance from home (never regional sites). HQ leases another building when every floor is full (coverage used to stall at 88%, capping growth at 76 branches).
- 2026-10-24: Stage 9 buildings. Every M/L/XL city has one car dealer; auction houses stand in their CONTENT §16 cities; each vacation home stands on the map of a city in its region (Muskoka → Toronto, Whistler and Okanagan → Vancouver, Hamptons → New York, Aspen → Seattle, Côte d'Azur → Paris, Lake Como → Frankfurt, Swiss Alpine → Zürich, Kyoto → Tokyo, Byron Bay → Sydney). We added Lake Waskesiu Cabin (Saskatoon, $1.6M) and Bow Valley Ranch (Calgary, $3.9M) so every start city has one. Clubs play at their city's stadium landmark.
- 2026-10-24: Sports franchise numbers (unspecified in the original): yearly revenue about 12% of value (tickets 30%, broadcasting 40%, merchandise 15%, sponsorship 15%), payroll about 55% and operations 25% of revenue; value grows 5% a year with the league, ±10% with results. Kit sponsorship by your bank adds 0.004 brand awareness a week in every city of the club's country and gives up the outside sponsor's income. A company-owned club is a balance-sheet asset (risk weight 2.5), marked through investment gains.
- 2026-10-24: Dealer financing: the bank pays a dealer $120k a year for 3 years; auto-loan demand at your branches in that city rises 25%.

