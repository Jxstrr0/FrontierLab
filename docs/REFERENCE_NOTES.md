# Reference Notes — the original's systems

What *Coffee Inc 2* does, recorded from the owner's gameplay screen recordings (October 2026). Use this for **structure and calibration only**.

- Never copy its names, writing, art, icons, company names or exact layouts.
- Never commit screenshots or recordings of it to this repo.
- The original displays £; numbers are quoted as observed.
- Re-checked against the recordings on 2026-10-23. Anything marked "not verified" is inferred.

---

## 1. Map and HUD
- **Map:** an isometric, illustrated real-world-style city (London, San Francisco, Paris, plus small remote regions such as a Kenyan plantation town and a US mountain resort).
- **Top bar:** company logo with cash on the left (e.g. £123,406,678); date on the right (e.g. Dec 10, 2036).
- **Bottom bar:** layers button, city pill with a flag, and a hamburger menu (Wealth, Settings, Save game, Exit game).
- **Layers filter:** All, Stores, Offices, Real Estate, Roasters, Banks, Investment Banks, Marketing Agencies, Conventions, Lobbying Firms, Sports Teams, Auto Dealers, Auction Houses, Universities.
- **Pins:** colour-coded by type. Own stores and competitor stores use different colours. "For lease" tags mark available properties and offices.

## 2. Stores

### 2.1 Property for lease
- Image, an advisor line about the trade-off (e.g. low foot traffic but cheap rent), weekly rent (£626), security deposit (£3,758 upfront), foot traffic (8,083/week), an area map, and Build Store.
- This was a new game in San Francisco on Jan 1, 2022, starting with £320,000 cash.

### 2.2 Build store
- Pick Exterior (e.g. £45,600 / £69,280 / £84,000), Interior (e.g. £115,144 / £146,096), Espresso machine (e.g. £7,600; quality and productivity stars), Brewer (e.g. £21,200), and Blender (e.g. £1,184, quality 4, productivity 5).
- Each opens a carousel of options with descriptions. A cost summary follows.

### 2.3 Store screen
- **Header:** store name and address, with the manager portrait and a greeting line.
- **Four tabs:**
  - **Service:**
    - customer reviews: overall 4.3 from 4,807 reviews, broken down into Price 3.9, Product 3.9, Service 4.5, Atmosphere 4.5
    - review cards that quote reasons tied to active campaigns (e.g. thanks for the power strip)
    - staff count (3) and hourly salary (£11.50) steppers; staff skill 99; staff morale 99
    - store manager: name; skills People 93, Product 87, Marketing 96, Ethics 86; manager-since date; annual salary (£68,124) stepper
    - four delegation toggles (staffing and salary; products and pricing; store marketing; store troubles) and Fire Manager
  - **Product:**
    - a company blend card (blend name and tier, a five-axis flavour radar, price per lb £25.80, inventory ∞, Manage Blends)
    - menu tabs Hot / Cold / Food
    - product cards: name, star rating, On Menu toggle, sales last week (e.g. 86,481, +4,061 / +5%), unit cost (£1.07), margin ring (71%), price stepper (£3.75), and a delete icon on some cards
    - HQ has "Force the prices to all stores"
  - **Marketing:** about ten campaign cards with level names and costs.
    - Free WiFi (regular speed, £140/wk)
    - Desk Power Strip (£90/wk)
    - Free Music Streaming (£280/wk)
    - Buy 1 Get 1 Free (Everyday, 11% of revenue)
    - Recyclable Cups (60% recyclable, +£0.25 per unit cost)
    - Direct Mail
    - Catering (£150/wk)
    - Community Sponsors (Generous, £800/wk)
    - Social Media
    - Local Paid Search (Aggressive, £1,000/wk)
  - **Finance:**
    - store revenue £83,701 (−£921, −1%) and store income £51,322 (+£1,663, +3%)
    - a five-week paired bar chart
    - store income statement with revenue by category (hot, cold, food) and expenses (beans, cost of goods, etc.) with weekly deltas

## 3. Competitor store
- Reviews block (4.2; Price 3.3, Product 3.9, …), review cards, and the full store menu with prices (around 15 items with prices). No actions.

## 4. HQ offices
- **Office for lease:**
  - e.g. 7 floors and 7,560 m²
  - department list with Add toggles and desk capacity. Capacity varies by building: the London listing showed 24 desks per floor (Finance, Products, Supply Chain); the San Francisco listing showed 32 (HR, Finance, Investment) and Executives 6. Engineering also appears as a department.
  - HQ floors later showed 18/26, 19/38 and 16/28 employees/desks. How 26, 28 and 38 arise isn't visible (mixed buildings or upgrades).
  - weekly rent £7,318; security deposit £58,545; Rent Office
- **HQ tabs:** Finance, HR, Product, Supply, Marketing, IT, Executive, Investment, + Add Floor. Multiple offices can exist, each with different floors.
- **Each floor shows:**
  - isometric office art with people at desks
  - employees stepper (18/26), open positions (0 or 15), annual salary (£82,000; £70,000 for supply)
  - officer skill 93, officer morale 90
  - the advisor warns about understaffing (e.g. financial statements delayed for lack of finance staff)
- **Finance floor:** total revenue £46.7M and net income £20.1M; weekly bars; corporate income statement with period tabs.
- **HR floor:** benefits carousel (about 9) with per-employee amounts, estimated weekly cost and a "+3 / +4" badge, plus Close HR Floor.
  - College Tuition Support (£10,000 per employee per year; est. £26,077/wk)
  - Retirement
  - Stock Options
  - Childcare Support
  - Free Lunch & Snacks
  - Volunteer Support (£100/wk per employee; est. £8,128/wk)
- **Product floor:**
  - company blend and menu, Force Prices toggle
  - sales charts (hot 1,795,937 cups +5%; cold 1,653,673 −5%)
  - Product Developments with New Product
- **Develop New Product:**
  - name, product type (icons include hot drinks, Cold Soft Drink, Sweets, Lunch), target price (Low / Medium / Premium)
  - R&D terms: 4 / 8 / 12 / 24 / 48 weeks
  - **weekly** R&D budget stepper (£5,000 per week)
  - outcome estimation at 4 weeks, £5,000/week, Low price: 5★ 0%, 4★ 4%, 3★ 27%, 2★ 40%, 1★ 29%. A second frame (settings not visible) showed 0 / 4 / 37 / 40 / 19.
  - an open-positions chip (+3) for the Product team
  - Start Development
- **Supply floor:**
  - plantations list (named regions with hectares: 1,060 / 620 / 620 / 530)
  - coffee bean inventory lots: name, harvest year, price/lb (£5.88, £5.11, £12.63), inventory lb (214,920; 122,400), radar, Details
- **Executive floor:**
  - board meeting once per quarter (you're the chairman; compensation and dividends); last-meeting date; Hold Meeting
  - meeting screen: dividend per share (e.g. £0.20) stepper; CEO compensation (£650,000) stepper; Take Votes
  - senior executive grid: six seats — CEO, COO, CFO, CPO, CMO, CTO (the Executive floor has 6 desks)
  - **COO profile:**
    - three skill bars (labels not legible in the recordings)
    - delegation toggles: store operations, HR benefits, HR division
    - annual salary £1,500,000
    - equity grant list (25,000 options at £83, 4-year vesting)
    - Add Grant: Stock Option / RSU, shares, strike price, vesting table
    - Fire
- **Investment floor:**
  - portfolio value (£6.17B) with donut, List Portfolio
  - Ventures carousel: startup cards with an illustration, sector, description, founded date, Details. More staff, more companies found.

## 5. Weekly results, newspaper, incidents
- **Weekly results:**
  - weekly revenue (£46,949,588, −£152,623 / 0%) and weekly net income (£16,927,761, +£377,315 / +2%)
  - cash from operations (+£16.78M), investing (−£90,000), financing (−£41,230), net cash flow
- **Newspaper** (parody masthead), dated weekly, tabs Top / Retail / Business / Market / Politics / Sports. Sample articles:
  - a competitor opened a new store in a city
  - "fastest growing companies" list
  - own CTO and a rival CFO resigned
  - central bank held its rate at 5.00% (GDP +1.75%, forecast 1.47%); another country's central bank held at 3.25% (GDP −0.25%, forecast 0.54%)
  - quarterly revenue moves for competitors and tech companies (−2.7%, −6.2%, −34.5%)
  - quarterly dividends declared by banks (e.g. £0.30, 2.52%)
  - a tech conference announced, with "find the convention icon to attend"
- **Company incident modal:** e.g. "a quarterly dividend of £19.5M is due in three weeks — keep cash", with a case counter ("Case 1 of 1") and Close.

## 6. Investment bank
- Tabs Market / Equity / M&A.
- **Market:**
  - sector tabs (Coffee, Technology, Auto, Finance)
  - stock cards: price chart, price (£62.53), exchange, market cap (£1.96B), dividend (£0.74, 4.76%), 52-week high (£69.89) and low (£21.17), P/E (25.4), top shareholders (a person 65.36%, the player 18.52%, the player's company 16.12%), Trade
  - private companies show "It's a private company"
- **Equity, secondary offering:**
  - new shares 34,000 (0.01%) at £45.30
  - "net proceeds" £1,540,336, which is actually gross
  - underwriting fees (4.55%) £70,085
  - raised capital £1,470,251
  - Issue New Shares
- **M&A:** competitor cards with Offer M&A, then an offer price per share, shares, total cost (£1.64B), available cash, Offer Merger.
- **Trade sheet:** "trade holding shares without going through investment banks"; shares slider; Buy / Sell; available cash.

## 7. Commercial bank
- Tabs Loans / Credit.
- **Business loans:**
  - £1,482,140,000 at 9.05%, 12 months, weekly payment £29,836,669
  - £2,255,430,000 at 10.35%, 24 months, £24,030,295/wk
- **Business line of credit:** £800,000,000 available; used £0 at 12.20%; withdraw slider.
- The newspaper also shows banks paying dividends, so banks are listed companies too.

## 8. Real estate
- **Owned building:**
  - address, 7,990 m², estimated value £31.6M, purchase price £31.0M
  - annual rent £1,205 per m² (stepper), occupancy 85.3%
  - weekly rent revenue £156,590; weekly maintenance 104,678; weekly overhead 0; weekly rent income 51,911
  - ROI 8.71%
  - Real Estate Sale toggle
- **For sale:** 15,794 m², occupancy 85.6%, asking £71.2M, Offer Purchase.
- Maintenance runs about 67% of rent revenue at about 85% occupancy, which explains the ~9% ROI.

## 9. Supply chain extras
- **Roaster:** packaged blends (standard £19.56/lb, premium £27.56/lb; radar; Buy) and "My Blend" (custom, £15.87/lb).
- **Plantation:**
  - located in a remote region, 100 ha
  - current plant variety with radar, health "Healthy", value, harvest month, yield (~135,000 lb/yr), year planted
  - lifecycle "Year X of 23" (X not verified) with a yield curve chart (rise, 100% plateau, decline)
  - Manage Plants

## 10. Personal layer
- **Personal Wealth:**
  - name, title (CEO), annual salary £650,000
  - total assets £33.25B (+£1.0B, +3%) with a donut: cash £2.36B, stocks £27.44B (82%), real estates £3.23B, others £223M
  - stocks list with shares, cost basis, current value and gain/loss (own company stake ~£27.08B)
  - real estate list across many cities with ROI and gain/loss
  - other assets: collectibles with purchase price and value
- **Vacation home:** "not a rental; personal money"; "can rebuild"; asking £3.69M; Offer Purchase.
- **Car dealer:** luxury showroom with a car carousel (supercar parodies), Details and Buy.
- **Auction house:**
  - upcoming auctions with dates (e.g. a famous finals jersey)
  - your items: purchase price £1,212,000, fair market value, transaction history, Appraise
  - the result can be "Counterfeit" with a FAKE stamp and value £0
  - sell tab lists your collectibles (art parodies)
- **Football franchise:**
  - offer purchase at about £1.57B
  - tabs Franchise / Uniform / Players / Transfer / Finance
  - payrolls (star players £82.17M; total £132.17M)
  - star player list with ratings and salaries
  - transfer window closed message
  - financial report with revenue and expense lines and net income

## 11. Travel
- Airports per city.
- Departures board styled like split-flap, listing destinations with distances (e.g. Paris 348 km from London; plantation regions 5,760–6,405 km).
- **Weekly mileage limit:** the airport shows "Flown this week" and "Remaining mileage": 0 km flown / 24,140 km remaining at the start of a week, then 6,753 / 17,387 after one flight. Travel is capped per week.
- A flight animates across the map, then the destination map loads.
- Private Jet card ("fly anywhere on your schedule, at a price").

## 12. Conventions and startups
- A convention event screen lists ventures to invest in.
- **Startup screen:**
  - description, founded date, CEO portrait
  - pre-money valuation (£5.84M)
  - benchmark pentagon: Management, Product Maturity, Market Size, Competitiveness, Financial Health
  - Financial: Income / Balance Sheet toggle with quarterly bars (revenue £0, net income −£1.71M)
  - funding round (e.g. Series D) with a Company / Private toggle and available cash
  - two offer lots ("391,159 shares (15.00%) £312,927 — Invest")
  - funding history (Seed £255,440; Series A £377,280; …)
  - top shareholders (funds and people with %)
  - "They accepted our investment" / "isn't raising capital right now"

## 13. Settings and saves
- **Settings:** unit of measurement (km), currency (£ GBP), toggles, avatar picker grid.
- **Save Business:** cloud sync toggle, save slots showing company name, date and cash, Save Here.

## 14. Calibration numbers (one place)
| Observation | Value |
|---|---|
| New game cash | £320,000 (Jan 1, 2022) |
| Cheap lease | £626/wk, deposit £3,758 (6×), traffic 8,083/wk |
| Mature store weekly revenue / income | £83.7k / £51.3k |
| Late game weekly revenue / net income | £46.9M / £16.9M (Dec 2036, ~15 years) |
| Founder net worth, late game | £33.25B |
| Office lease | 7 floors, £7,318/wk, deposit 8× |
| HQ salaries | £70–82k |
| CEO / COO pay | £650k / £1.5M |
| Executive seats | 6: CEO, COO, CFO, CPO, CMO, CTO |
| Underwriting fee | 4.55% |
| Commercial loans | 9.05% (12 mo), 10.35% (24 mo); credit line 12.20% |
| Real estate ROI | ~8.7% at 85% occupancy |
| Dev odds, 4 weeks + £5k/week + Low price | 29 / 40 / 27 / 4 / 0 (1★→5★) |
| Weekly travel allowance | 24,140 km |
| Startup offer lots | 15% each |
| Startup pre-money (early) | ~£5.8M |
