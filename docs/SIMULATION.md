# Simulation Spec

How the economy works, step by step. Every CAPS name is a key in `src/config/balance.ts` (§26). Content values (products, equipment, cities…) are in `CONTENT.md`. Design intent is in `DESIGN.md`.

**Bank names in the code.** Frontier Lab was converted from the bank game Vault Street (`docs/archive/CONVERSION_PLAN.md`). Some code names kept their bank words. This doc uses the AI meaning and gives the code name in backticks once:

| Code name | Meaning in the game |
|---|---|
| `branch` | a sales office |
| `bankName`, `RivalBank` | your lab's name, a rival lab |
| `company.tier` | the safety tier (§15) |
| `RECAP_OFFER` | the mandated pause offer (§15) |
| `BANK_RUN` | the "Outage rumour" incident (§13.8) |
| `company.riskAppetite`, `setRiskAppetite` | the launch posture (§16.8) |
| `deposits_1b` milestone | "A billion in ARR" |
| `teller`, `vault`, `atm` build slots | sales desks, machine room, demo kiosks (§6.4) |
| product category `deposits` / `lending` / `cards` | Plans / API / Apps & Services |
| product kind `sbl`, P&L line `loanDesk` | Enterprise contracts (§11) |
| dept `treasury`, `risk`, `it` | the Compute, Safety & Alignment, and Platform & Security floors |
| exec seat `cro` | Chief Safety Officer |
| `underwriting` | data licences (§16.7) |

---

## 1. Conventions

- **Money:** JS number in currency units. Round only for display.
- **Rates:** decimal annual rates (0.0325 = 3.25%). Weekly accrual = annual / 52.
- **Ratings:** continuous 1.0–5.0, displayed as coins with one decimal.
- **Scales:** skills and morale 0–100; awareness 0–1.
- **Helpers:** `clamp(x, lo, hi)`, `ema(x, target, k) = x + k × (target − x)`, `pp` = percentage point (0.01).
- **Expected values:** flows use expected values plus small seeded noise (`noise(±5%)` = ×(1 + U(−0.05, 0.05))). Use Poisson only where counts are small (incidents).
- **Balance identity:** after every weekly tick, assets = liabilities + equity (to within $1). Assert this in tests.

## 2. Clock and tick order

**Daily** (1 game day = 1 s at 1×):
- Advance the date.
- Resolve scheduled events due today: fit-out done (the sales office opens), auction closed, dividend paid, offer expired. (Flights are instant; the flight animation is cosmetic.)
- Animate the HUD cash and date.

**Weekly** (every 7th day), in this order (`src/sim/engine.ts`, `weeklyTick`):
1. Macro for every country, including central bank meetings (§4).
2. The chip cycle's compute price index (§13.0).
3. Rival prices, then market reference prices (§5).
4. Rivals: expansion, books, campaigns (§18).
5. Data centers: fit-out countdown, rent and power (§9.9).
6. Each open sales office, in order: delegation, staff (§6), campaigns, awareness (§7), ratings (§8), demand (§9), books (§10.7), Deal Desk (§11), costs, the office P&L (§12) and review cards.
7. Contracts: mid-term business failures and outage walk-outs (`runContracts`, §11.3).
8. Power deals (§13.7a).
9. Compute: tally demand, settle the pool, retire expired GPU lots (§13.0).
10. City brand awareness (§7).
11. Partnerships (§13.7).
12. Treasury: reserve interest and any legacy funding (§13).
13. Offer refreshes: funding offers (§13.6), then GPU offers (§13.0).
14. HQ: floors, coverage and benefits (§16), then product developments (§16.6), the training run (§16.12), the AI model (§16.7) and the app rating (§16.9).
15. Corporate items: brand marketing, corporate debt, executives, the talent market, HR manager hiring, manager poaching, governance, M&A, real estate, ventures, conventions, lobbying, depreciation (§14, §16–§21).
16. Close the week: P&L, cash flow, balance sheet, tax and the weekly snapshot (§14).
17. The safety ratio and regulator tier (`evaluateSafety`), then the pause and failure checks (§15). Runway (§15) is not stored: it is worked out from cash and the weekly closes whenever it is read.
18. Personal: cash and salary, travel (reset the km allowance, jet upkeep), personal assets, auctions, sports franchises (§22).
19. Markets: listed prices, your valuation, portfolios (§19), then currencies (§19.10).
20. **Quarter start** (the first weekly tick after Mar 31, Jun 30, Sep 30, Dec 31):
    - earnings for every listed company, rivals and you
    - the safety audit (§15)
    - rivals' quarter (failures, mergers, §18)
    - the talent war (§16.13), then rival model releases (§16.12)
    - the renewal season for business contracts (§11.3)
    - markets, governance (dividends declared and paid 3 weeks later; the board meeting unlocks), ventures report and raise (§20), the insider-trading check (§22)
    - the quarter's report sums the weeks whose last day falls in it, so when this tick lands on the quarter's first day the week just closed still counts for the old quarter
21. **Year start** (first tick of a new year):
    - the Fastest Growing ranking and the Rich List
    - next year's conventions calendar
    - sports season results
    - `feeIndex` steps up by the year's nominal growth; rival prices re-price; price lists are reviewed (§4.6)
    - cities grow; rivals' year (learning, charters, technology, §18)
22. Incidents (§23).
23. Net-worth history and milestones.
24. News (§24).
25. Housekeeping: manager candidate pools refresh, old events are trimmed. The UI then shows the weekly results and autosaves.

**Central bank meetings:** each country meets on the fixed week-of-year list in CONTENT (Countries table). A meeting in a given week is processed inside step 1.

**Auto-pause** when any of these needs a decision: an unresolved incident, the results modal (every week, or the tick that closes a month's or quarter's last week, per the setting; a week belongs to the month its last day falls in, and the report rolls up every week of the period that just ended), the board meeting reminder (once per quarter), or Deal Desk proposal requests expiring this week (optional setting). The clock also holds, without changing the speed setting, while any panel or sheet is open: days pass only on the map.

## 3. RNG and determinism

- Use the `sfc32` PRNG.
- Transcendental math (exp, log, non-integer powers, cos, tanh) goes through `src/sim/detmath.ts`, built from + − × ÷ and sqrt only. Engines are free to round `Math.pow` and friends differently (Node 22 and 24 already disagree), and these are bit-identical everywhere. ESLint bans the Math versions and `**` in `src/sim`.
- **Per-system streams:** each stream's seed = hash(saveSeed, streamName). Stream names include `macro`, `rivals`, `demand`, `compute`, `gpuMarket`, `training`, `market`, `ventures`, `incidents`, `news`, `politics` (bills and votes), `commodities` and `reviews` (office review cards), `citygen:{cityId}`, `businesses:{cityId}`, `people` and `auctions`. Adding draws to one system then never reshuffles another, which keeps balancing stable. (The `loanDesk` stream name is a leftover from the bank game.)
- **Storage:** every stream's state lives in `GameState.rng`.
- **Helpers:**
  - `next()`, `range(a, b)`, `int(a, b)`
  - `normal(μ, σ)` (Box–Muller)
  - `poisson(λ)`: Knuth's method for λ < 30, otherwise a rounded normal approximation
  - `pickWeighted(items)`
  - `lognormal(median, σ)`

## 4. Macro (per country)

**State:**
- `phase` ∈ {Expansion, Slowdown, Recession, Recovery} and `weeksInPhase`
- `gdp` (annual % growth), `inflation` (%), `unemployment` (%)
- `hpi` (house price index, 100 at start) and `cre` (commercial property index)
- `policyRate` and `termPremium`
- `gdpHistory` (last 13 weeks)

### 4.1 Phase transitions
Each phase lasts at least MACRO_MIN_PHASE_WEEKS = 13 weeks. After that, transitions are checked weekly:

| From | To | Weekly probability |
|---|---|---|
| Expansion | Slowdown | 0.008 |
| Slowdown | Recession | 0.025 |
| Slowdown | Expansion | 0.015 |
| Recession | Recovery | 0.035 |
| Recovery | Expansion | 0.025 |

That gives an average expansion of about 2.5 years and an average recession of about 7 months. `forceRecessionAtWeek` (balance-script option) overrides this.

### 4.2 Targets by phase
| Phase | GDP % | Inflation % | Unemployment % | HPI drift / yr | CRE drift / yr | Term premium |
|---|---|---|---|---|---|---|
| Expansion | +2.6 | 2.6 | 5.0 | +5% | +3% | +0.60% |
| Slowdown | +0.9 | 3.2 | 5.6 | +1% | 0% | −0.30% (inverted curve) |
| Recession | −1.6 | 1.4 | 7.6 | −7% | −8% | +0.30% |
| Recovery | +1.9 | 1.9 | 6.6 | +2% | +1% | +1.20% (steep curve) |

### 4.3 Weekly update
- `x = ema(x, target, MACRO_EMA = 0.06) + normal(0, σx)` for GDP, inflation and unemployment, with σ = 0.05, 0.04 and 0.03.
- `hpi ×= 1 + drift/52 + normal(0, 0.002)`; same for `cre`, using the CRE drift.
- `termPremium = ema(termPremium, target, 0.05)`.

### 4.4 Policy rule (meeting weeks only)
**Units:** gdp, inflation and unemployment are stored in percent (2.6 means 2.6%). policyRate, neutralRate and termPremium are stored as decimals (0.0325). Table values shown in % convert to decimals. Convert explicitly; never mix the two.
1. `targetPct = neutralRate × 100 + 1.5 × (inflation − inflationTarget) + 0.5 × (gdp − 2.0)`, then `target = targetPct / 100`.
2. `diff = target − policyRate`.
3. Hold if `|diff| < 0.00125`. Otherwise move by `sign(diff) × 0.0025`, or `0.0050` if `|diff| > 0.01`.
4. Keep the rate between POLICY_FLOOR (0.25%) and POLICY_CAP (9%).
5. Emit a `CB_DECISION` event carrying the last-quarter GDP (mean of `gdpHistory`) and a forecast (the phase GDP target + normal(0, 0.2)).

**Pegged countries** (CONTENT `peggedTo`) copy the anchor's rate plus a spread and skip their own rule.

### 4.5 Derived factors
These are read by other systems:

| Factor | Formula | Read by |
|---|---|---|
| `creditCycle` | `max(0.8, 1 + CREDIT_CYCLE.slope (0.35) × (unemployment − 5.0))` | business failures (§11.3), the rival downturn factor (§18.1) |
| `loanDemand` | `clamp(1 + 0.05 × (gdp − 2) − 0.12 × (policyRate − neutralRate) × 100, 0.6, 1.3)` (`LOAN_DEMAND`; rates × 100 to get pp) | prospects (§9.2): a strong economy brings more sign-ups |
| `hpiYoY` | % change of hpi over 52 weeks | news, homes |
| `equityMarketDrift` | Expansion +8%/yr, Slowdown 0, Recession −15%/yr, Recovery +18%/yr | listed prices (§19) |

### 4.6 The nominal index
Each country carries `nominal`, its price-and-wealth level: 1 at the start of a game, and every week `nominal ×= 1 + (gdp + inflation + NOMINAL_INDEX.trend) / 100 / 52` (`trend` = 4 percentage points, the one dial). In an expansion that is about 9% a year; over a cycle about 8%, so the level doubles in roughly nine years. It is read by:
- **Prices and usage.** New usage tickets (§9.6) are × the city's country index, and `feeIndex` (fixed-dollar plan and app prices, yours and rivals') steps up by the same yearly rate. So a mature office's ARR, and the whole lab, keep growing with the economy once a city is full.
- **Pay.** `marketWage`, department market salaries, manager base salaries and executive market pay are × the index of the city they're paid in, so wages rise with incomes (delegated staffing and the COO's pay reviews follow; a manual player sees "Underpaid").
- **Rivals.** A rival office's mature book (§18.1) and the build cost of a new office are × the index.
- **The rich list** (§22) grows with the home country's index.
- **Price lists.** Each country also carries `listIndex`, its price list: 1 at the start, and at each year end it steps to that year's `nominal`, so catalogue prices hold still through the year like a printed price list. Charged × the list of the city's country (`listPrice`, `listLevel`): office builds and equipment (and the fixed asset recorded), equipment upkeep and office overhead, office campaign costs (weekly, per new account and per account), incident repair and apology options, HQ floor fit-outs and office listing rents, flight fares, cars at the dealer, partnership and power-deal signing and renewal fees, lobbying fees, business budgets, data center parts, and a rival office's weekly running cost. Charged × the home country's list: brand campaigns, agency packages, private jets and the merger rebrand bill. At the review every rent moves by the step `nominal / listIndex`: free storefronts, your office leases, HQ office listings and leased HQ offices (a lease deposit stays as paid). New storefronts and offices are generated at today's list. Not indexed: homes (they follow house prices), clubs, collectibles and startups (their own markets), percentage fees and player-set budgets.

The §25 checkpoints are in start-of-game money: `npm run balance` deflates them by the home country's index and prints the index in its yearly table.

## 5. Prices

- **Default prices:** each product has a default price rule (CONTENT Products). A fixed-dollar fee (a plan's monthly price, an app's price) is `value × feeIndex`; a per-unit or percent price is the value itself. Rivals and new offices start from it.
- **Market reference `m(p, city)`:** the average current price of product p across the rival offices in the city, weighted by each office's size multiplier (§18.4). If no rival offers p, use the default rule. Your own offices are excluded, so you can't move the market reference yourself (`updateMarketRefs`).
- **Rival prices:** `base × (1 + strategy fee stance − price-war cut)` (§18.6), drifting toward that target at RIVAL_PRICE_DRIFT (2%) of the gap a week. Fee prices re-price yearly with `feeIndex` (§4.6).
- **Bank-era rate machinery (still computed, nearly idle):** FTP is still worked out each week (`FTP_short = policyRate`, `FTP_long = policyRate + termPremium`), along with the deposit beta (DEPOSIT_BETA_UP 0.45, DEPOSIT_BETA_DOWN 0.75) and loan pass-through. They only touch rate-priced products, and the only one left is Enterprise contracts (`sbl`, default `FTP_short + 4.5%`), whose list rate nothing reads: the Deal Desk prices by discount off a business's budget (§11.1).

## 6. Sales office staff, capacity, managers

### 6.1 Market wage
`marketWage(city) = BASE_TELLER_WAGE (24.00/hr) × city.wageIndex × nominal` (the country's nominal index, §4.6).

### 6.2 Morale
1. `M* = 50 + 40 × tanh(3 × (wage/marketWage − 1)) + 0.15 × (managerPeople − 50) + benefitsMorale + campaignMorale − 25 × max(0, W − 1) − incidentPenalty − (no manager ? 5 : 0)`
2. Clamp `M*` to 0–100.
3. `morale = ema(morale, M*, 0.10)`.

`W` is the wait index (§6.4). `benefitsMorale` comes from HR (§16.5), applied company-wide.

### 6.3 Skill, quits, hiring
- **Skill target:** `S* = 35 + 40 × clamp((wage/marketWage − 0.8)/0.6, 0, 1) + 0.10 × managerPeople + tuitionBonus`.
- **Skill movement:** skill rises 0.6 per week toward `S*` (falls 3 per week if above it). New hires join at 0.8 × `S*`.
- **Quits per week:** `staff × QUIT_BASE (0.004) × (2 − morale/100)² × (1 − retentionBonus)`. Accumulate the fractional part in state; a quit happens when it reaches 1.
- **Hiring:** `openPositions = targetStaff − staff`. Hires per week = `min(open, round((HIRE_BASE (1) + floor(2 × hrCoverage' × attraction)) × scale))`, where `scale` is the sales office's size mult (Starter 1 … Flagship 9) or, for an HQ department, its floor count, so a bigger office recruits as fast for its size, and `attraction = clamp(wage/marketWage, 0.7, 1.3) × benefitsAttraction`.

### 6.4 Capacity and waits
**Office size.** Each city holds one sales office of yours, grown in place: `OFFICE_SIZES` = Starter ×1, Standard ×2.5, Large ×5, Flagship ×9 (`size` 0–3 on the office, `src/sim/branch/officeSize.ts`). The size multiplier `sizeMult` scales seats (sales desk stations, the lobby's meeting rooms), staff needed, demo kiosk throughput, rent, lease deposit, overhead, and the cost and upkeep of every interior slot; the exterior is one piece at every size. `upgradeOffice` grows an open office one size: it pays the interior parts × (new mult − old mult) plus the extra lease deposit, multiplies the weekly rent by the ratio and raises the staff target.

The build slots keep their bank ids: `teller` = sales desks, `vault` = machine room, `atm` = demo kiosks (CONTENT §7).

- `staffNeeded = round((teller.stations + lobby.advisorOffices) × sizeMult)`
- `staffing = min(1, staff / staffNeeded)`
- `C = (teller.stations × teller.productivity × staffing + atm.productivity) × sizeMult × (0.7 + 0.3 × skill/100) × (0.85 + 0.15 × morale/100) × campaignCapacity`. `C` is customer interactions per week.
- `visitRate = SERVICE_VISIT_RATE (0.03) × (1.2 − 0.1 × appRating)`. A better app means fewer support visits.
- `L = captured + visitRate × customers` (load)
- `W = L / C` (wait index). Label it Short below 0.8, Busy from 0.8 to 1.1, and Long above 1.1.
- `served = captured × clamp((C − visitRate × customers) / captured, 0, 1)`

### 6.5 Sales office managers
- **Hiring.** Hire from 3 candidates; the pool refreshes free every 4 weeks. **Paid reroll** (`rerollManagerCandidates`, drawn from the `people` stream): a recruiter deals 3 new candidates for CANDIDATE_REROLL.feeShare (7.5%) × the city's manager market pay (MANAGER_BASE_SALARY × wageIndex), rounded to $100; each further reroll before the free refresh multiplies the fee by CANDIDATE_REROLL.growth (2). The free refresh resets the count; a paid reroll doesn't move its date. The fee is posted to `managers`. Until your first manager is hired, the first candidate (the tutorial guide) is kept.
  - Skills: People, Product, Marketing and Ethics, each drawn from normal(62, 16) and clamped to 25–98.
  - Salary ask: `MANAGER_BASE_SALARY (72,000) × city.wageIndex × (0.7 + 0.6 × avgSkill/100)`.
- **People** lifts morale and skill (§6.2, §6.3) and the Service rating (§8).
- **Product** sets delegated pricing quality (§17).
- **Marketing** multiplies campaign effects by `0.8 + 0.4 × marketing/100`.
- **Ethics** multiplies capability over-claim, abuse and walkout incident odds by `1.6 − ethics/100` (§23).
- **No manager:** Service −0.3, morale −5, and no delegation.
- **Market pay and poaching.** A manager's market pay is their hiring ask × `(1 + MANAGER_PAY.tenureGrowth (0.03) × years at the lab)`: rivals pay more for experience, so a fixed salary slowly falls behind. Each week a rival may poach each manager with probability `MANAGER_PAY.poachBase (0.0006) × (pay/market < 0.9 ? 3 : pay/market ≥ 1.1 ? 0.5 : 1)` (stream `managerPoach`). A poached manager leaves at once, every office delegation comes back to you, and a `MANAGER_POACHED` event and toast say so; the COO's Sales office operations (§17.2) rehires. `MANAGER_PAY.salaryStep` (1,000) is the salary stepper's step.

## 7. Awareness and marketing

- **Office awareness `a`.** A new office starts at 0.20, with a grand-opening bonus of +0.15 that decays linearly over 6 weeks.
  - Weekly: `a = a × (1 − AWARENESS_DECAY (0.03)) + Σ gain_c × (1 − a) × mktMult`.
  - `mktMult = (0.8 + 0.4 × managerMarketing/100) × marketingFloorMult`, where `marketingFloorMult` is 1.0 below founder-mode thresholds and otherwise `0.5 + 0.5 × marketingCoverage'`.
- **City brand awareness `b`** (HQ brand campaigns, kit sponsorship, your offices in the city): decays at BRAND_DECAY (0.02) with the same gain shape. Each office in a city adds a passive gain of 0.002.
- **Effective awareness:** `e = 1 − (1 − a)(1 − b)`.
- **Campaign effects** (CONTENT Campaigns):
  - awareness gain per week
  - rating bumps (category and amount)
  - segment boosts (multipliers on segment share among new customers)
  - take-up multipliers (a plan take-up boost, `depositTakeUp`, reads on Plans)
  - churn multipliers
  - a capacity multiplier
  - cost model: weekly fixed, per new account, or a % of revenue

## 8. Ratings

Targets are computed each week. Displayed ratings follow them with `ema(rating, target, 0.20)`.

- **Price (`Rates`):** for each offered product p, take its competitiveness `c_p`, clamped to [−2, +2]:
  - Plans, API and apps: `c_p = (m − price) / max(0.25 × m, FEE_COMP_MIN)`, with floors of $1 for dollar prices, 0.25pp for percent prices and $0.10 for per-unit (per million tokens) prices.
  - Enterprise contracts' rate (the one rate product): `(m − price)/0.005`.
  - Weight each product by `w_p = balanceShare_p + 0.1`.
  - `Rates* = clamp(3.0 + Σ w_p c_p / Σ w_p + bumps, 1, 5)`.
- **Products (the Model rating):**
  - `Products* = clamp(Σ aff_p × stars_p / Σ aff_p + breadth + 0.30 × (appRating − 3) + 0.10 × (modelQuality − 5 − bar rise) + bumps, 1, 5)` (bar rise, §16.7).
  - `modelQuality` = mean of the AI model's five radar values (1–10).
  - `aff_p` = Σ over segments of `mix_s × affinity[s][p]` at this lot, counting only offered products.
  - `breadth` = +0.3 if offered products cover ≥ 80% of the lot's total affinity mass, −0.5 if they cover < 40%, otherwise 0.
- **Service:** `Service* = clamp(1.0 + 2.0 × skill/100 + 1.2 × morale/100 + 0.5 × managerPeople/100 + 0.08 × (model.speed − 5) + latency lift (§9.9) + bumps − 1.5 × max(0, W − 1) − (no manager ? 0.3 : 0), 1, 5)`.
- **Office (atmosphere, `Branch`):**
  - `Branch* = clamp(0.25 × Q_ext + 0.35 × Q_lobby + 0.15 × Q_desks + 0.10 × Q_machineRoom + 0.15 × Q_kiosks + bumps − upkeepPenalty, 1, 5)`, where Q is each slot's quality coins (`BRANCH_RATING_WEIGHTS`).
  - `Q_kiosks` = 2.0 if the office has no demo kiosks (`NO_ATM_QUALITY`).
  - `upkeepPenalty` = 0.2 per 5 years of component age beyond its depreciation life. Refitting a component resets its age.
- **Overall:** `Overall* = 0.30 × Rates + 0.20 × Products + 0.30 × Service + 0.20 × Branch` (`OVERALL_WEIGHTS`).
- **Reviews:** `reviewCount += served × REVIEW_RATE (0.12)`.
- **Review cards:** keep the last 8. Each week, add 1–2 drawn from template pools (CONTENT) keyed to the strongest and weakest category and any active campaigns. Each card's coin value = round(category rating + normal(0, 0.7)), clamped to 1–5.

## 9. Demand and competition

### 9.1 Catchment
- **Office reach:** `traffic = median storefront traffic in the city × min(sizeMult, CITY_BRANCH_GUIDE[size]) × density × OFFICE_TRAFFIC_MULT (1.5)` (`officeTraffic`). The office draws on the whole city, not its own lot: a Starter reaches about one and a half storefronts' worth, and each size reaches more until it matches what the city can support (a Flagship in a small city reaches no more than a Large: `nextSizeAddsReach`).
- `population = traffic × CATCHMENT_MULT (1.0)`
- `penetration = customers / population`

### 9.2 Prospects
`P = traffic × PROSPECT_RATE (0.040) × difficulty.demandMult × (0.25 + 0.75 × e) × loanDemand^0.5 × (1 − penetration)^SATURATION_EXP (2.8) × cityRoom × noise(±5%)`. A closed office (an incident) gets none.

**City-wide pool:** `cityRoom = 1 − reach^CITY_SATURATION_EXP (3)`, where `reach = clamp(your customers in the city ÷ (CITY_MARKET[size] × city density), 0, 1)` and `CITY_MARKET = { S: 32,000, M: 38,000, L: 50,000, XL: 72,000 }` (`src/sim/branch/cityMarket.ts`). A first office alone barely feels it (reach ≈ 0.3 → room 0.97). Dense cities (CONTENT §2, `density`) scale the pool and the guide. `CITY_BRANCH_GUIDE = { S: 5, M: 7, L: 9, XL: 12 }` caps how far a bigger office adds reach, and the storefront panel and scripted strategies use it as advice. Delegated marketing (§17.1) uses the same multiplier.

**Pacing intent:** like the original's stores, an office should reach most of its mature size within about a year, with most of the growth in the first six months, rather than compounding for a decade. High intake plus strong saturation does that.

### 9.3 Share
- `A = (Overall/5)^SHARE_EXP (2.2)` for this office.
- **Competitors:** there is no distance inside a city. Each active rival lab with an office in the city counts once, at weight 1, with `A_j` from its office's overall rating there (plus +0.15 while it runs an ad campaign, §18.9).
- **Incumbent baseline:** `A0 = city.incumbentStrength` (0.25–0.45). This stands for the city's established tech firms not drawn on the map.
- `share = A / (A + Σ A_j + A0)`

**Calibration example:**
- A 3.0★ office with one 3.5★ rival and A0 = 0.35: share ≈ 0.29.
- The same office at 4.3★: share ≈ 0.47.

### 9.4 Capture and service
- `captured = P × share`
- `served` comes from §6.4. Turned-away prospects are logged (they hurt Service through W).

### 9.5 New customers by segment
`n_s = served × mix'_s`, where `mix'` = the lot mix × office and brand campaign segment boosts, renormalized to sum to 1. Segments: Students, Developers, Consumers, Researchers, Small shops (CONTENT Segments).

### 9.6 Product take-up
- **Per segment and offered product:** `q = min(TAKEUP_CAP (0.95), affinity[s][p] × pf[s][p] × (0.6 + 0.2 × stars_p) × approval_p × boost_p × takeUpMult_p)`.
- `boost_p` = the plan take-up campaign effect (Plans only) × any incident take-up effect (e.g. a plan price cut) × the waitlist gate (0 for plans and API during a capacity crunch, §13.0) × the regulator's sales gate (§15).
- `approval_p` = 1 for every product in the catalog. (Only the bank's amortizing and revolving loans needed approval; the code path is still there, with no posture or appetite multiplier.)
- Enterprise contracts (`sbl`) skip take-up: the Deal Desk sells them (§11).
- **Results:**
  - `newAccounts_p = Σ_s n_s × q`
  - Plans: `newVolume_p = newAccounts_p × ticket_p` seats.
  - Usage: `newVolume_p = Σ_s n_s × q × ticket_p × lot.incomeIndex × ticketMult[s][category_p] × noise(±5%)` million tokens a month.

### 9.7 Price factors `pf`
`pf = clamp(1 − sensFee_s × (price − m′) / max(FEE_PF_SCALE (0.5) × m′, FEE_STEP_MIN), 0.20, 1.8)`, where `m′ = m × priceHeadroom` for plans and usage (§16.7). FEE_STEP_MIN = $2 for dollar prices, 0.25pp for percent prices and $0.20 for per-unit prices. Segment sensitivities are in CONTENT (Segments). (The bank's rate price factors, with PF_RATE_STEP = 0.01, now apply to no product that takes up.)

### 9.8 Customers
`customers = round(Σ_p accounts_p / PRODUCTS_PER_CUSTOMER (1.6))`.

### 9.9 Data centers
A second building kind beside the sales office (`src/sim/dataCenters.ts`, commands in `src/sim/commands/dataCenters.ts`, parts in CONTENT §7c). Any number per city, on a free storefront lot (lot rent and deposit, like a sales office) or at a regional energy site's employer (`DATA_CENTER.energySiteRent` ($3,000) × the city's cost index a week, no deposit, at most `DATA_CENTER.perEnergySite` (3) per site). You build only in the city you're in, never at a restricted or critical tier. Prices go through the price list (§4.6).

- **Parts:** a GPU hall (GPUs it holds and fit-out weeks), a power feed (GPUs it can run) and cooling (PUE). `usableGpus = min(hall GPUs, power GPUs)`.
- **Fit-out:** the hall's weeks (8, 12, 16 or 26), counted down in tick step 5, before the sales offices. A fitting-out data center pays rent but no power.
- **Weekly costs (open):** rent to the Rent line; power `usableGpus × DATA_CENTER.powerPerGpuWeek (12) × PUE × powerIndex` to the Equipment line, where `powerIndex` is `DATA_CENTER.energySitePower` (0.5) at an energy site and the city's cost index elsewhere (× `POWER_DEAL.powerDiscount` with a power deal in the country, §13.7a). Worked example: a Twin hall on a Grid feed with Liquid loops at an energy site runs 3,000 GPUs for 3,000 × 12 × 1.25 × 0.5 = $22,500 a week.
- **Latency lift:** each sales office's Service target (§8) gains `DATA_CENTER.liftSameCity` (+0.25 stars) when an open data center is in its city, else `DATA_CENTER.liftNear` (+0.1) when one is within `DATA_CENTER.nearKm` (1,200 km). Not additive across data centers. Its GPUs join the compute pool (§13.0).
- **Accounts:** the hall is a fit-out asset (`FITOUT_LIFE_WEEKS`), power and cooling equipment (`EQUIPMENT_LIFE_WEEKS`), owned by the data center id; the deposit goes to lease deposits.
- **Upgrades:** only to a dearer part in the same slot. The old part's book value is written off to depreciation and the new one bought at today's price. Power and cooling take effect at once; a new hall closes the data center for `ceil(hall weeks × DATA_CENTER.upgradeWeeksShare (0.5))` weeks, then it reopens.
- **Closing:** as a sales office (§6): `CLOSE_RECOVERY` (30%) of book value comes back, the rest is written off, and the deposit is refunded less `CLOSE_RENT_WEEKS` (2) of rent. The lot is freed.

## 10. Books

One `Book` per (office, product): `accounts`, `balance`, `bookRate`, plus last-week flow fields for the UI (`newAccounts`, `newVolume`, `deltaAccounts`). Every product that takes up is a plan or a usage product, and a book's balance is its ARR (§10.7). Code: `src/sim/branch/books.ts`.

### 10.1 Deposits
Retired: the bank's deposit books. Plans (§10.7) took their place.

### 10.2 Amortizing loans
Retired: personal, auto and mortgage loans are gone. Usage products (§10.7) took their place.

### 10.3 Revolving credit
Retired: lines of credit and credit cards are gone. Apps & Services plans (§10.7) took their place.

### 10.4 Wealth Advice
Retired, with no replacement.

### 10.5 Services
Retired: safe deposit boxes and FX & Wires are gone.

### 10.6 Applications and servicing
Retired as loan applications. What remains: each office pays its customers' data licences (§16.7, P&L line `underwriting`) and a support cost per account (`servicing`, CONTENT Products), shown together as "Support & data licences".

### 10.7 Plans and usage
A book's balance is its **ARR** (annual recurring revenue).
- **Plans** (`kind: 'plan'`): `accounts` counts seats. A sign-up brings `ticket` seats (CONTENT §5). Every seat re-bills at today's price:
  - `balance = seats × price × periods`, where periods = 12 for a monthly fee (`INTEREST_PERIODS.monthsPerYear`) and 1 for an annual fee.
  - Compute: `seats × servicing_p × inferenceMult` a week at base prices (§16.7).
- **Usage** (`kind: 'usage'`, priced per million tokens): a sign-up brings `ticket × lot.incomeIndex × ticketMult_segment[category]` million tokens a month (§9.6).
  - When the price moves, the book re-scales: `balance ×= price / bookRate`.
  - Inflow: `balance += newVolume × price × 12`.
  - Organic growth: `balance ×= 1 + organic_p / 52` (customers build more on the API).
  - Compute: `unitCost_p × balance × inferenceMult / (price × 52)` a week at base prices.
- **Churn** for both:
  - `k = churn_p/52 × (1 + rateChurnSens_p × gap) × (1 + OVERALL_CHURN.slope (0.6) × max(0, OVERALL_CHURN.pivot (3.2) − Overall)) × signupChurn × runMult × outageMult`, where `gap = max(0, −c_p)` is the price comparison of §8 (against the headroom-adjusted market), `signupChurn` is the Sign-Up Bonus campaign's multiplier, `runMult` the Outage rumour's (§13.8) and `outageMult` a compute outage's (§13.0).
  - Plans lose `seats × k`; usage books lose `accounts × k` and `balance × k`.
- **Revenue:** `balance / 52` a week, posted to `accountFees` (Plans), `serviceFees` (API) or `cardFees` (Apps & Services).
- **Free-tier conversion:** each week, `conversion_p / 52` of a free tier's seats move to the plan it `convertsTo` (Free Tier → Plus, 12% a year), if that office offers it.
- **Campaign cost per account** is charged here for campaigns priced that way.
- **Customers** = all accounts and seats ÷ PRODUCTS_PER_CUSTOMER.
- **Not on the balance sheet.** ARR is a run-rate, not an asset: revenue reaches the books week by week. Company ARR (`companyArr`) sums every office that isn't closed, Enterprise contract values (§11.5) and partnership mini-books, and is stored in each weekly snapshot (`totals.arr`) for the trend chart and the balance script.

## 11.0 Customer businesses

- **Seeding** (when a city is generated, after rivals and employers), from the city's own `businesses:{cityId}` stream:
  - **Storefronts:** district by district (in id order), `round(free × BUSINESS.lotShare (0.5))` of the free storefronts become businesses, leaving at least `keepFreePerDistrict` (1) free. A business sets `lot.occupant = {type:'business'}`; it is never for lease. Rival growth still counts these storefronts as the city's room (`roomLot`).
  - **Sector:** weighted by district (`SECTOR_DISTRICT_WEIGHT`), from CONTENT §21b; farms only in S/M cities.
  - **Size:** small 55%, mid 33%, large 12% (`BUSINESS.sizes`).
  - **Budget (a year):** `size.budget (6k / 25k / 90k) × lot.incomeIndex × sector.budgetMult × lognormal(1, 0.3) × list level`, rounded to $100.
  - **Pentagon** (AI readiness, Budget, Data sensitivity, Switching cost, Financial health): `round(normal(sector.profile, 1.2))` clamped 1–10; Budget +size.budgetPip (−1/0/+1) and Switching cost +size.switchPip.
  - **Anchors:** every employer site (not regional energy sites) becomes an anchor: `360k × employees / 2,500 × incomeMult × lognormal(1, 0.3) × list level`, the anchor profile (5, 8, 7, 8, 7) with +2 Budget and Switching cost.
  - **Rival contracts:** in a city with rival offices, a business starts with a rival with chance `rivalHeld` (50%; anchors `anchorRivalHeld` 70%), the rival picked by office size + 1 (an anchor keeps its plans partner if that rival is there). Contract value = budget × U(0.7, 1), renewing at the `U{1, termMax}`-th quarter start from now.

## 11. Deal Desk

The Deal Desk sells enterprise contracts to the named businesses of §11.0. Constants are `DEAL` in balance.ts; code is `branch/dealDesk.ts`, `contracts.ts` and `commands/dealDesk.ts`.

### 11.1 RFPs
- **Where:** each open sales office takes requests from the businesses in its city. The **Enterprise contracts** product (id `sbl`) must be on for new requests and bids on rival renewals; your own renewals always show.
- **New RFP:** each week a business with no AI vendor, no open RFP and past its `quietUntil` asks with chance `rfpWeekly (0.07) × (0.25 + 0.75 × awareness) × (1 + 0.12 × (AI readiness − 5)) × campaign Deal Desk effect`. It waits `expiryWeeks` (3) for a bid; an expired, declined or lost request makes the business wait `cooldownWeeks` (13).
- **Renewal RFP:** a contract whose `renewalWeek` (always a quarter start) is within `renewalNoticeWeeks` (4) gets a renewal RFP. Your own carries an offer that starts at the contract's current discount; a rival's has no offer until you make one.
- **Bid:** a discount `d` (0–40%, 1% steps) off the business's budget. Contract value = `budget × (1 − d)`, rounded to $100.

### 11.2 Win and keep chances
Clamped to 5–95%. `stars` is your office's overall rating; the rival is the incumbent on a renewal, else the best-rated rival office in the city.
- **Win** = `winBase (0.5) + discountSlope (1.5) × d + starSlope (0.15) × (stars − rival stars)`, or `+ noRivalBonus (0.2)` instead of the star term with no rival in the city; against an incumbent, `− switchSlope (0.04) × (Switching cost − 5)`.
- **Keep** (your renewal) = `keepBase (0.8) + 1.5 × d + 0.04 × (Switching cost − 5) + 0.15 × (stars − best rival stars)` (or `+ 0.2` with no rival).
- Both add the AI model's contract edge (§16.7), the safety-tier deal edge (§15) and the launch posture's deal edge (§16.8).
- Worked example: a 5% discount, your 3.2 stars against a rival's 3.0, no incumbent, a model at the bar, Adequate tier → `0.5 + 0.075 + 0.03 = 60.5%`.

### 11.3 Settlement
- **New RFP:** a bid is drawn at once. A win signs the contract: the vendor is your office, `renewalWeek` is the `U{termQuarters}`-th quarter start, `underwriting.loansBooked` + 1 (it feeds the AI model's Customer Feedback data), event `CONTRACT_WON`.
- **Renewal season** (tick step 20, a quarter start; `renewalSeason`): every contract due is settled in id order.
  - Yours: no open office → lost. Otherwise keep with the keep chance at the offer; kept contracts reprice to `budget × (1 − offer)` for a new `U{termQuarters}`; lost ones go to the best rival in the city (or no vendor) with `CONTRACT_LOST` (reason `renewal`).
  - A rival's: a merged rival hands it to its buyer; a rival gone from the city drops it. With your offer, you win it at the win chance (event `CONTRACT_WON` with `from`); otherwise the rival rolls over for `termQuarters[0]`.
  - Then each business without a vendor or an open RFP, in a city with rival offices, signs with one at `rivalSignQuarterly` (12%), the rival picked by office size + 1.
- **Mid-term loss only** (tick step 7, `runContracts`):
  - A storefront business under contract fails at `failYear (0.03) × exp(−0.25 × (Financial health − 5)) × creditCycle / 52` a week. Its contract ends (`CONTRACT_LOST`, reason `failed`) and a new business moves into the storefront under the same id. Anchors don't fail.
  - While an outage runs (§13.0), each of your contracts walks to the best rival at `0.02 × (1 + 0.1 × (Data sensitivity − 5))` a week (reason `outage`).
- **Office changes:** closing an office moves its contracts to a target office in the same city, or ends them (reason `office`); offices folding together move them to the keeper.

### 11.4 Delegation
A delegated manager (Delegation → Deal Desk, key `loans`) or the Chief Safety Officer's Deal Desk policy bids for the office within its **discount limit** (`branch.discountLimit`, default 10%): the smallest discount that reaches `delegateTarget` (60%), else the limit if that reaches `delegateFloor` (30%), else it declines. Renewal offers are set the week the renewal appears.

### 11.5 Revenue and costs
Each week an office earns `contractValue / 52` for every contract it holds (P&L line `loanDesk`, shown as Enterprise contracts), spends `computeShare` (30%) of it × `inferenceMult` on compute (base spot dollars, so it joins the GPU demand of §13.0) and `serviceShare` (10%) on servicing. Contract values count in ARR (§10.7). Contracts of $250k a year or more make the news when won from a rival or lost.

### 11.6 Migration 12 → 13
Saves from before the Deal Desk: business loans still current are repaid into treasury reserves at their balance (equity unchanged) and the applications lapse. Offices get `discountLimit`. Business budgets and rival contract values are rescaled to the size bases above (6k / 25k / 90k / 360k).

## 12. Sales office P&L

Revenue goes straight to corporate cash. Code: `src/sim/branch/branchPnl.ts`.

- **Office revenue:** Plans + API + Apps & services + Enterprise contracts (§11.5) + other income.
  - **Other income** is demo kiosk fees: `atm.productivity × sizeMult × ATM_FEE.usage (0.25) × ATM_FEE.fee ($2.50)` a week.
- **Office expenses:**
  - **Compute:** the office's compute at base prices (plan seats, API usage and contracts, §10.7, §11.5) × the internal compute price (§13.0). Stored as `gpus = compute ÷ COMPUTE.spotPerGpuWeek` too. Posted to the company `compute` line.
  - **Loan losses:** always $0 now; the row stays in the list.
  - staff wages (`staff × wage × 40`)
  - manager salary / 52
  - rent
  - campaigns (Marketing)
  - equipment maintenance: EQUIP_MAINT (6%/yr) × the cost of the build slots / 52, plus fit-out upkeep: FITOUT_UPKEEP (2%/yr) × the cost of the exterior and lobby / 52 (together "Equipment & upkeep")
  - support and data licences: servicing (§10.6, §11.5) plus data licences (§16.7)
  - overhead: BRANCH_OVERHEAD ($450) × city.costIndex × list level × sizeMult
- **Office income** = revenue − expenses. Keep 52 weeks of history (`BRANCH_PNL_WEEKS`) so the Finance tab can show a full year.
- Depreciation is a company-level item, not part of office income.
- **Statement line groups:**
  - Revenues: Plans, API, Apps & services, Enterprise contracts, Other income
  - Expenses: Compute, Loan losses, Staff, Manager, Rent, Marketing, Equipment & upkeep, Support & data licences, Overhead

### 12.1 Worked example
Retired: the bank-era branch example no longer applies. §25's office checkpoints are the calibration now.

## 13. Compute and treasury

### 13.0 Compute pool and the chip cycle (`src/sim/compute.ts`)
- **Compute price index** `I`, one for the world (chips are a global market), starting at 1 in the `normal` phase. Like the macro phases (§4), a chip cycle moves between `glut` (target 0.8), `normal` (1.0) and `shortage` (1.3). After at least `COMPUTE.minPhaseWeeks` (13) in a phase: normal → shortage or glut at 1.2% a week each; shortage or glut → normal at 3%. Weekly: `I = clamp(ema(I, target, 0.08) + normal(0, 0.012), 0.5, 2)`, on the `compute` RNG stream. The last 104 weeks are kept for the chart.
- **Demand:** each office's compute bill at base prices (plan seats × servicing, API usage × unit cost, contracts, §10.7, §11.5) converts to GPU-weeks at `COMPUTE.spotPerGpuWeek` ($40). The office P&L row stores it as `gpus`; the pool's demand is the sum over open offices.
- **Owned GPUs:** running GPUs in open data centers, `min(hall, power)` (§9.9), plus power-deal GPUs (§13.7a). They serve demand first, then lots, then spot.
- **What an office pays (the internal compute charge):** `compute × I`, today's spot price for every GPU-week it uses, wherever the GPU came from. The pool books the saving at company level (settle, below).
- **Headroom** = (owned + rented GPUs) ÷ demand.
- **Spot limit:** `spotLimit = min(SPOT.baseGpus + SPOT.trailMult × trail, SPOT.maxGpus) × phaseMult` = min(1,000 + 1.25 × trail, 20,000) × (glut 1.2, normal 1, shortage 0.85), where `trail` is an EMA (0.08 a week) of the spot and burst GPUs you bought. Fast growth outruns the trail, and no lab buys more than 20,000 GPUs at spot: past that it must own or reserve.
- **Allocation:** the gap = max(0, demand − owned − rented). With auto spot-buy on (the default), `spot = min(gap, spotLimit)`, then `burst = min(gap − spot, 0.25 × spotLimit)` at `SPOT.burstPremium` (1.6×) spot; the rest is unserved. With it off, the whole gap is unserved. Any burst week marks you for `SPOT.stigmaWeeks` (4): GPU offers cost `stigmaMarkup` (8%) more.
- **Capacity crunch:** unserved > `SPOT.crunchFrom` (2%) of demand puts new plan and API sign-ups on a waitlist (take-up × 0). **Outage:** after `OUTAGE.afterWeeks` (3) crunch weeks in a row, churn × `OUTAGE.churnMult` (1.8) while the crunch lasts and `OUTAGE.weeks` (2) after. Events: COMPUTE_BURST, COMPUTE_CRUNCH, COMPUTE_CRUNCH_ENDED, COMPUTE_OUTAGE.
- **Settle (tick step 9):** with this week's demand, the pool pays `(spot + 1.6 × burst) × spotPrice` plus every active lot's `gpus × price`, and books `poolCost − Σ office charges` on the company compute line (negative when your GPUs save money). Data-center costs stay on their own lines; power-deal GPUs are billed by the deal (§13.7a). Then the trail, stigma, crunch and outage counters update, and expired lots retire.
- **GPU market (`src/sim/gpuMarket.ts`):** with a Compute floor (dept id `treasury`), offers refresh every `GPU_MARKET.refreshWeeks` (2) at tick step 13: 2 + floor(3 × coverage′) offers, +1 with a CFO of expertise ≥ 70, on the `gpuMarket` RNG stream. Each picks a reservation type from CONTENT §12b by weight. Size = U(type range) × max(1, demandGpus / `GPU_MARKET.sizeScale` 2,000), rounded to `sizeStep` (50). Price per GPU-week = `spot × (1 − discount) × (1 + 0.1 × (1 − coverage′)) × (1 + 0.08 while burst stigma lasts) × U(0.96, 1.04)`, fixed for the term.
- **GPU lots:** `rentGpus` takes 50 GPUs or more from an offer (the rest stays on offer while ≥ 50). A lot rented in week w runs weeks w … w + term − 1: every lot is billed `gpus × price` in the pool settle, then lots whose last week this was retire. No early cancel; rented GPUs are billed whether or not demand uses them.
- **Worked example (lots):** at a 1.0 index with a fully staffed floor, a 1-year lot is offered near $32.80/GPU-week (40 × 0.82). Renting 1,000 GPUs costs $32,800 a week for 52 weeks. If a shortage pushes the index to 1.3, the same GPUs at spot would cost $52,000 a week.
- **Worked example (charge):** an office whose seats and API cost $80,000 a week at base prices uses 2,000 GPU-weeks. At a 1.2 shortage index it is charged $96,000 either way. With one `hall_row` data center (2,000 GPUs, grid power) covering it, the pool pays $0 for those GPUs and books −$96,000 on the compute line, so the company's compute bill is the hall's power and lease; without one, the pool buys 2,000 GPUs at spot (if the spot limit allows) for $96,000 and books $0.

### 13.1 Treasury reserves
- **Reserves `R`:** start at $0. The whole seed round (`START_CASH`) is corporate cash, and paid-in capital equals it. Reserves hold money only in bank-era saves that still carry deposits, wholesale lots or central bank borrowing; a save with none of those had its reserves moved into cash by migration 18 → 19 (DATA_MODEL). Reserves count in equity and can't be transferred out.
- **Corporate cash** is separate (§14) and is what the lab spends.

### 13.2 Weekly flows into reserves
- Reserves earn interest (§13.4). `addToLendingFund` / `topUpLendingFund` can still move cash into reserves, but no screen offers it. There is no reverse transfer.
- Retired: deposit flows, loan principal and recoveries no longer exist.

### 13.3 Liquidity ratio
Retired in play: `LR = reserves / totalDeposits` is null with no deposits. LIQ_MIN (0.10) and the `liqTarget` setting (default 0.15) only matter for an old save that still holds deposits; the Finance floor shows the liquidity row only when there is a ratio.

### 13.4 Reserve interest
Reserves earn the deposit-facility rate, RESERVE_RATE_SPREAD (0.50%) below policy: `R × max(0, policy − 0.005) / 52` cash in.

### 13.5 Shortfall handling
Retired in play. `runTreasury` still runs the bank's overnight and central bank window borrowing, but it measures the shortfall against deposits, which are $0, so it never borrows. A funding freeze can't happen.

### 13.6 Funding market
Legacy. With a Compute floor, funding offers (Term Interbank, CONTENT §12) still refresh every 2 weeks (`FUNDING_REFRESH_WEEKS`), and any wholesale lot an old save holds still pays weekly interest from corporate cash and repays at maturity. The Compute floor shows the funding cards only for a save that still has deposits, lots or overnight borrowing (`hasLegacyFunding`). The rating spread (`RATING_SPREADS`, by runway tier, §15: Strong −0.10pp, Comfortable 0, Tight +0.35pp, Critical +1.00pp) and TREASURY_PENALTY (0.5pp × the Compute floor's shortfall) still price them.

### 13.7 Plans partnerships (employers)
- **Signing:**
  - Signing fee paid from corporate cash (`PARTNER_FEE_PER_EMPLOYEE` $160 × employees × list level). It becomes an intangible asset amortized over the contract.
  - Choose a host sales office in the same city and a package: any plan the host offers that isn't a free tier.
- **Participation curve** over a contract of `L` weeks (default 364):
  - rises along an S-curve from 0 to 0.65 by week 52
  - linear to 0.80 by week 104
  - flat at 0.80 until `L − 104`
  - linear down to 0.45 at `L`
- **ARR target:** `employees × participation × ARR_PER_EMPLOYEE (300) × incomeIndex × (0.5 + 0.6 × health/100)`. The partnership keeps its own mini-book of plan seats and their ARR. It moves toward target at 0.15 of the gap per week and earns `balance / 52` a week as `accountFees` (Plans). Seats are reported inside the host office's product card as "incl. partners".
- **Health:**
  - target = `40 + 12 × (hostOverall − 3) + 10 × c_package + perksBonus`, where `c_package` is the competitiveness of the package (§8)
  - `health = ema(health, target, 0.05)`
  - Health < 30 for 8 straight weeks: the partner terminates and the ARR runs off over 12 weeks.
- **End of term:**
  - Renew at fee × `(1.5 − health/100)` for another full term.
  - Or let it lapse: run off over 12 weeks.
- **Student partnership (universities):** students by city size S 6,000 / M 10,000 / L 16,000 / XL 24,000; fee $30 × students × incomeIndex; ARR $80 per participating student (`STUDENT_PARTNERSHIP.arrPerStudent`); same curve, health and term rules. A university has one staff-plans deal and one student deal at a time.
- **Graduate program (universities):** $120,000 × city wageIndex a year, charged up front and every 52 weeks; +10 skill for manager candidates and +1 hire a week at offices and HQ floors.

### 13.7a Data-centre and power deals (`src/sim/powerDeals.ts`)
The plans partnership reworked for regional energy sites (a regional employer site). Energy sites don't sign plans partnerships; one signed in an older save runs on.
- **Signing:** you must be in the site's city. Fee = `employees × POWER_DEAL.feePerEmployee (500) × listLevel`, paid from corporate cash and amortized over the 364-week contract like a partnership fee (an intangible). The take-or-pay price per GPU-week is fixed at signing: `POWER_DEAL.pricePerGpuWeek (20) × listLevel` (spot is $40 × the compute index). Blocked during a mandated pause.
- **Contracted GPUs:** target = `employees × gpusPerEmployee (1.5) × participation(t, L) × (0.5 + 0.6 × health/100)`, the §13.7 curve, moving 0.15 of the gap a week. They count as owned compute (`compute.ownedGpus`) and serve customers before lots and spot. Each week the lab pays `gpus × price` on the company compute line, used or not.
- **Cheaper power:** while a deal is active, your data centers in the site's country pay `POWER_DEAL.powerDiscount (0.75) ×` their §9.9 power bill.
- **Health:** target = `healthBase (50) + dataCenterBonus (20)` with an open data center of yours in the country, `− tierPenalty[safety tier]` (0 / 0 / 10 / 25 / 40 from Strong to Critical), eased at 0.05. Termination, renewal (fee × (1.5 − health/100), re-priced at today's list), lapse and release follow §13.7, with a 12-week runoff of the GPUs.
- **Tick:** step 8, after the offices and contracts and before the compute tally.

### 13.8 Outage rumour (`BANK_RUN`)
The bank run became a rumour that your service is going down.
- **Trigger:**
  - Condition: average overall rating < `maxOverall` (2.6) AND one of: a compute outage is running (§13.0); the safety tier is Restricted or Critical; the safety tier dropped within the last `tierDropWeeks` (8, read from the weekly closes); the average rating has slid under `slideOverall` (2.2).
  - Chance: 4% per week while the condition holds.
  - Duration: 3–6 weeks.
- **During it:** `runMult = 6` on plan and usage churn (§10.7).
- **Options** (the "Outage rumour" incident, §23):
  - **Service credits:** credits to every customer costing `BANK_RUN.creditShare` (2%) × company ARR, paid from corporate cash. The rumour ends at once.
  - **Cut plan prices:** plan prices −`BANK_RUN.planCut` (10%) everywhere for `BANK_RUN.boostWeeks` (8) weeks, through the `planCut` effect.
  - **Public statement:** works with chance `statementBase` (0.3) + `statementPerPoint` (0.02) per safety-ratio point above `statementFromSr` (70%), at most `statementMax` (0.95).

## 14. Corporate cash and statements

### 14.1 Corporate cash
Shown in the top bar. Moves only with cash items:
- revenue (plans, API, apps, contracts, kiosk fees), interest received
- wages, rents, campaigns, compute, power, data licences
- capex, lease and office deposits
- corporate debt draws, repayments and interest; interest on any legacy wholesale lots
- taxes, dividends, share issuance proceeds
- purchases and sales of assets (stocks, ventures, real estate, currencies)
- partnership and power-deal fees, fines, incident costs

### 14.2 Weekly company P&L
The statement reads like a software company's (`src/app/company/statementData.ts`):

| Line | Contents |
|---|---|
| Plans, API, Apps & services, Enterprise contracts, Other income | office revenue (§12), plus partnership ARR in Plans; other income also holds reserve and venture-debt interest, rents, dividends received and realized gains |
| **Revenue** | the sum |
| Compute | office compute charges, the pool's settle (§13.0), power-deal bills |
| **Gross profit** | revenue − compute |
| Operating expenses | office staff, managers, rents (offices and HQ), HQ salaries, executive pay (including grant expense), marketing (office and brand), equipment and upkeep, power, overheads, support, data licences, benefits, development and training spend, lobbying, travel, fines, incident costs |
| Interest expense | corporate debt and legacy funding; shown only when there is any |
| Bad debts | non-cash: compute-credit (venture debt) write-offs (§20.5) |
| Depreciation & amortization | non-cash: office fit-outs over 10 years, equipment over 5 years, HQ fit-outs over 10 years, partnership and power-deal fees over the contract; goodwill is not amortized |
| Pre-tax income | |
| Tax | country rate on positive pre-tax income, with loss carry-forward; accrued weekly, paid quarterly |
| **Net income** | |

"Weekly revenue" in the weekly results is the Revenue line. Internally the ledger still sums lines into bank-style groups (`netRevenue` = interest income + fee & other income).

### 14.3 Cash flow
- **Operations:** net income + non-cash items (bad debts, D&A, grant expense, investment gains) ± change in taxes payable.
- **Investing:** capex; real estate, stock, venture and currency purchases and sales; partnership and power-deal fees.
- **Financing:** share issuance, dividends paid, corporate debt draws and repayments.
- **Net cash flow** = change in corporate cash. This must reconcile; test it.

### 14.4 Balance sheet
`src/sim/balanceSheet.ts`. Lines marked * show only when non-zero.
- **Assets:** cash; treasury reserves*; loans* (legacy); stocks*; ventures*; compute credits* (venture debt); real estate*; currencies*; sales offices and equipment (fixed assets at book value, data centers and HQ fit-outs included); lease deposits; partnership fees* (unamortized partnership and power-deal fees, the intangibles); goodwill*.
- **Liabilities:** deposits* (legacy); wholesale funding* (legacy); corporate debt* (venture debt and credit lines from investment banks, or rival labs in old saves, §19.9); dividends payable*; taxes payable.
- **Equity** = assets − liabilities: paid-in capital plus retained earnings.
- **Why it balances:** corporate cash moves only with cash items, each matched by a P&L line or another balance-sheet line; non-cash items (depreciation, write-offs, marks) move an asset and equity together.

### 14.5 Statement periods
Week, Quarter and Year sum the weekly records.

### 14.6 Finance delays
If Finance coverage' < 0.9, the newest `ceil((0.9 − k') × 10)` weeks show as "Delayed" in the statements and the weekly results. The simulation runs normally underneath.

## 15. Safety and the regulator

The AI regulator watches a **safety ratio**. Lenders, the CFO and the deal limits watch **runway**: how long the cash lasts. (The bank game's capital ratio became the safety ratio in C7a; the credit ratio that carried its formula for lenders gave way to runway at schema 24.)

**Safety ratio** (`safety.ts`):
- `strength = min(1, safetyCoverage′) + clamp(k − 1, 0, kMax − 1)`: the Safety & Alignment floor's coverage′ (§16.4, so founder mode reads 1 and audit consultants or the regulator's monitors count), plus staffing above the requirement, up to k = 1.2.
- `exposure = max(SAFETY.minExposure 0.8, 1 + frontierWeight (0.15) × max(0, modelQuality − qualityBar) − modelSafetyWeight (0.05) × (Safety axis − 5) + LAUNCH_POSTURE.exposure[posture])`: a model ahead of the frontier carries more risk, a safer model less, and a bolder launch posture more (§16.7, §16.8, §16.12).
- `SR = strength ÷ exposure`, shown as a percent.
- The Safety floor's requirement (CONTENT §9) is `2 + 0.15 × office units + 1 per $50M of ARR`, so a bigger lab needs a bigger Safety team.

**Tiers** (`SAFETY_TIER_THRESHOLDS`; badge shown everywhere the regulator matters):

| Tier | SR | Effects |
|---|---|---|
| Strong | ≥ 105% | Data-sensitive businesses favour you: Deal Desk win and keep chance +4 points × (sensitivity − 5)/5 |
| Adequate | 85–105% | None |
| Watch | 70–85% | Dividends capped at 50% of trailing-4-quarter net income; advisor warnings; deal edge −2 points |
| Restricted | 55–70% | No dividends, sales offices or acquisitions; new sign-ups × 0.5 (`CAPITAL_GATE`); a regulator letter (incident); deal edge −5 |
| Critical | < 55% | No new sign-ups; fine of 0.5% of trailing annual revenue each quarter; deal edge −8 |

- The deal edge scales by `max(0, sensitivity − 5)/5`, so it only matters to data-sensitive businesses.
- An AI safety buffer (§24 Politics) raises every line by `SAFETY.bufferPerPp` (5 points) per point; strict watch raises them by `LICENCE.watchBuffer` (10 points).
- The regulator's gate (`salesGate`) applies to every new sign-up, plans and API alike (§9.6).

**Mandated pause** (`mandatedPause.ts`, the `RECAP_OFFER` case):
- After `MANDATED_PAUSE.offerWeeks` (8) weeks in a row below `revokeLine` (40%), the regulator offers an 8-week pause: no new sign-ups, no new or rival-renewal RFPs and no training (a run in progress waits), while its monitors lift Safety coverage′ by 0.5. The fee is 2% of trailing annual revenue, at least $250k.
- If the ratio is still under the line when the pause ends, or the offer is declined (or its deadline passes), the **licence is revoked**.

**Licence revoked** (owner decision A11, never game over):
- `LICENCE.pauseWeeks` (26) weeks paused as above; your own customers and contracts stay.
- Then the licence is restored under **strict watch** for 52 weeks: tier lines sit 10 points higher and the safety audit fails twice as often.
- The founder's personal fortune is untouched.

**Quarterly safety audit** (`riskFloor.ts`):
- Failure probability: `0.02 × (1 + 3 × (1 − safetyCoverage′)) × (1.6 − avgManagerEthics/100) × exposure`, × 2 under strict watch.
- On failure: a fine of 0.05–0.3% of trailing annual revenue, plus the `REGULATOR_AUDIT` incident (Safety audit) and news.

**Runway** (`runway.ts`, `RUNWAY`):
- `burn = max(0, −average weekly net income over the last EXEC_DELEGATION.revenueWeeks (13) closes)`, the same window as cash cover (§24).
- `months = max(0, cash) ÷ burn ÷ (52/12)`. With no burn (profitable, or no closes yet) there is no runway figure and the lab counts as Strong.
- Tiers (`RUNWAY.tiers`): **Strong** 24 months or more, or not burning cash; **Comfortable** 12–24; **Tight** 6–12; **Critical** under 6, or cash below zero.
- What reads it:
  - lenders' spreads: the rating spread on legacy funding (§13.6) by tier, and venture debt (§19.9) by runway and ARR;
  - the CFO's Capital and Share sales routines (§17.2);
  - the gates: buybacks (§19.6a), acquisitions (§19.8) and the CFO's Buying (§21.1) and Investing (§17.2, §20.4) must leave at least `RUNWAY.gateMonths` (12) months of runway after the spend, so they never push the lab into Tight;
  - the IPO's recession exception (§19.4).
- Worked example: cash $6M, the last 13 closes average −$100k net income. Burn $100k a week, so runway = 6,000,000 ÷ 100,000 ÷ 4.33 = 13.8 months: Comfortable. A buyback costing $1.2M would leave 11.1 months, so it is refused.
- A lab short of runway can only fail by running out of cash (`checkFailure`).

## 16. HQ

### 16.1 Offices
- **Listings:** OFFICE_LISTINGS.countBySize per city (S 2, M 2, L 3, XL 4), split across the financial, downtown and midtown districts by largest remainder; floors 3–10, desks per floor 24 or 32 (set per building).
- **Landmark towers:** London and Moscow each also list one landmark tower in the Financial District (`LANDMARK_TOWERS` in `src/data/landmarkTowers.ts`): London's Kestrel Tower has 20 floors and Moscow's Polaris Tower 18, all with 32 desks. It rents like any listing (per floor, the whole building), so one tower holds every department with room for second floors, with no need for a second main office. It is placed after every other site from its own `tower:{cityId}` stream, so no other lot or site moves.
- **Rent:** weekly rent = `floors × OFFICE_RENT_PER_FLOOR ($1,100) × city.rentIndex`. Deposit = 8 × weekly rent.
- **Floors:** each floor slot holds one department. Fit-out = FLOOR_FITOUT ($120,000) × city.costIndex, a fixed asset.
- **Desks per floor:** set by the building, 24 or 32. Investment floors always have 32. The Executive suite always has 7 desks (`fixedDesks` in `src/data/departments.ts`): you and your six executives, not hired staff.
- **Releasing:** you can release a floor or a whole office. Staff above the remaining desks are let go, with 4 weeks' salary as severance.
- **Main offices:** at most MAIN_OFFICES_MAX (2) office buildings. The second must be in a different country from the first; it adds floors (and desks) to the same departments. Older saves keep any extra offices they hold, but can't lease more until they're under the cap.
- **Company-wide prices:** with "Apply rates to all sales offices" on, every sales office charges its country's HQ price list and follows the HQ lineup, except an office switched to **Set prices here** (`Branch.ownPrices`). That office starts from the HQ prices and lineup, then keeps its own price sheet (its manager can price it under Products & rates delegation); HQ price and lineup changes skip it until it follows HQ again, which re-applies the HQ lineup. Brand campaigns at HQ (§16.10) cover cities and countries, and each office can run its own campaigns on top.

### 16.2 Department state
- `staff`, `desks` (sum across offices), `salary`, `skill`, `morale`, `targetStaff`, `openPositions`.
- Staffing works like §6.2–6.3, using the department market salary (CONTENT Floors) in place of wage.
- Departments: Finance, HR, Products, Compute (`treasury`), Marketing, Platform & Security (`it`), Safety & Alignment (`risk`), Executive, Investment.

### 16.3 Requirements
- Per-department formulas are in CONTENT (Floors), `DEPT_REQUIREMENTS` in balance.ts.
- **Founder-mode ramp:** `ramp = (totalAssets ≥ $250M) ? 1 : clamp((officeUnits − 3)/5, 0, 1)` (FOUNDER_RAMP, FOUNDER_MODE_ASSETS): HQ needs start to bite after 3 office units and are in full at 8, or at once at $250M of total assets.
- **Compute floor:** its requirement is `1 + 1 per $1B of legacy funding`, so in practice a flat 1.
- **Office units:** every per-office requirement and the ramp count office units, not offices: each office counts its size's `hqUnits` (Starter 1, Standard 2, Large 3, Flagship 4). A Flagship does far more business than a Starter but shares its back office, so it weighs on HQ like four Starters rather than nine.

### 16.4 Coverage
- `staffEff = staff × (0.6 + 0.4 × skill/100) × (0.85 + 0.15 × morale/100) × execMult`
- `k = min(1.2, staffEff / max(required, 0.01))`
- `k' = 1 − ramp × (1 − min(k, 1))`. This is the coverage every effect reads.
- **Shortfall curve:** `effect(k') = k'^0.7`. Above 1.0, bonuses are capped at +5%.
- Per-department effects are in CONTENT (Floors).
- **Gating:** some features need the floor to exist, regardless of coverage: the GPU market and legacy funding market (Compute), product development, custom models and training runs (Products), digital projects (Platform & Security), ventures (Investment), executives (Executive), brand campaigns (Marketing).

### 16.5 Benefits
- Each benefit has a control value and a cost formula (CONTENT Benefits).
- Effects add to `benefitsMorale`, `benefitsAttraction`, `retentionBonus`, `tuitionBonus` (skill growth) and reputation.
- They apply to every employee, sales office and HQ.
- The estimated weekly cost is shown on each card.

### 16.6 Product development
- **Inputs:** template (CONTENT), target tier (Low / Medium / Premium), term ∈ {4, 8, 12, 24, 48} weeks, and a **weekly** budget (stepper, minimum $5,000/week), as in the original.
- **Dev score:**
  - `D = 0.40 × T + 0.40 × B + 0.20 × team`
  - `T` = {4: 0.00, 8: 0.20, 12: 0.40, 24: 0.70, 48: 1.00}
  - `B = clamp(log10(weeklyBudget/5000) / log10(100), 0, 1)`, so $5k/week → 0 and $500k/week → 1
  - `team = min(productsCoverage', 1) × avgSkill/100`, or 0.5 while there's no Products floor
- **Star odds:** `P(s)` for s = 1–5 is a normal with `μ = 1.79 + 2.6 × D` and `σ = DEV_SIGMA (0.90)`, integrated over [s − 0.5, s + 0.5], with the tails folded into 1★ and 5★. Show the odds table live; roll the result at completion.
  - Reference: at 4 weeks, £5k/week and Low price, the original showed 1★ 29%, 2★ 40%, 3★ 27%, 4★ 4%, 5★ 0%. At D = 0.10 this model gives about 27 / 42 / 26 / 5 / 0. At D = 1 it gives about 3★ 14%, 4★ 39%, 5★ 45%.
- **Cost:** weekly budget × weeks, paid each week.
- **Duration:** `weeks / max(0.3, productsCoverage')`.
- **Result:** a new catalog product (template + tier + stars). Enable it at sales offices, or company-wide with "Apply to all".
- **Spending and pace:** each week pays `weeklyBudget × progress made`, so the total stays budget × weeks even when a short-staffed team stretches the calendar. Developments pause while there is no Products floor.
- **Target tier** (`DEV_TIER`): the default price moves with the tier (fee products ×0.85 / ×1 / ×1.25; rate products −0.10pp / 0 / +0.15pp), and Premium adds +0.05 to the Products rating where it's offered.
- **Developed products** are full products with their own id, offers and books. Spec = base product + template modifiers (CONTENT §6) + tier; affinity = base + bumps. The market reference is the base product's (× the fee ratio for templates that set their own price). Products rating breadth counts each base product once, covered if it or a variant is offered.
- **Digital templates** (Platform & Security floor required) run once each and create no product: one adds 0.3 to the app rating now and to its target for good (`digitalProjectBonus`, §16.9); another adds 2 to the AI model's Speed (capped at 10).
- **Deleting** a developed product moves its accounts and balances onto the base product's book at each office.

### 16.7 The AI model
- **Radar** (1–10 each): Reasoning, Speed, Breadth, Safety, Efficiency. Plus `costPerCustomer`, the data licence per customer a year. (Code keeps the bank slot names: accuracy, speed, inclusion, fraudShield, fairness.)
- **Packaged models** are licensed from data vendors: fixed data mixes at fixed prices.
- **Custom models** (Products floor required): weights over training datasets (CONTENT §13).
  - `radar = Σ w × profile × qualityMult`, where `qualityMult = 0.9 + 0.2 × productsCoverage' × avgSkill/100`
  - `costPerCustomer = Σ w × cost`
  - The Customer Feedback dataset needs ≥ `INTERNAL_HISTORY.minCustomers` (5,000) customers across the lab. Its Reasoning = `4 + min(5, customers/50,000 × 5)`.
- **Vendor-hosted custom model:** no Products floor needed; same mix rules, with `qualityMult = 0.95` and cost × 1.15.
- **Switching models** takes 2 weeks; old and new blend linearly over that time: the old model's weight is `weeksLeft / (MODEL_SWITCH_WEEKS + 1)`, so 2/3 then 1/3, then fully new. Radar and licence cost both blend.
- Custom models' radars are recomputed every week, so they follow the Products team's coverage and skill and Customer Feedback's growing Reasoning. Radar values cap at 10.
- **What the model does** (`MODEL_EFFECTS`; quality = the radar mean):
  - **Data licences:** each office pays `customers × costPerCustomer × (1 + 0.3 × Products shortfall) / 52` a week (P&L line `underwriting`).
  - **Inference cost:** every compute cost behind plans, usage and contracts × `inferenceMult = 1 − 0.05 × (Efficiency − 7)` (0.85–1.35 over the radar).
  - **Price headroom:** plan and usage demand and churn compare your price with `market × (1 + 0.04 × (quality − qualityBar))`.
  - **Model rating:** `+ 0.1 × (quality − 5 − bar rise)` on the Products rating (§8), where bar rise = `qualityBar − 5.8` (§16.12).
  - **Contracts:** win and keep chances (§11.2) `+ 0.05 × (quality − qualityBar) + 0.03 × (Safety − 5) × (Data sensitivity − 5) / 5`.
  - **Speed** lifts the Service rating (§8) and **Safety** lowers fraud and abuse incident odds (`FRAUD_SHIELD`) and the safety ratio's exposure (§15).
  - The starting package (Clearline Web Base, radar 6, 8, 4, 4, 7) sits at the reference points.
- **CPO delegation:** switches to the local package whose `quality − 0.02 × costPerCustomer` beats the active model's by ≥ 0.3.

### 16.8 Launch posture
The Finance floor's 1–5 dial (code `company.riskAppetite`, set by `setRiskAppetite`; `DEFAULT_LAUNCH_POSTURE` 3). Bolder launches win more deals and carry more safety risk.

| Level | Name | `LAUNCH_POSTURE.dealEdge` | `LAUNCH_POSTURE.exposure` |
|---|---|---|---|
| 1 | Very cautious | −0.04 | −0.10 |
| 2 | Cautious | −0.02 | −0.05 |
| 3 | Balanced | 0 | 0 |
| 4 | Bold | +0.03 | +0.08 |
| 5 | Very bold | +0.06 | +0.16 |

- `dealEdge` is added to every Deal Desk win and keep chance (§11.2) before the 5–95% clamp.
- `exposure` is added to the safety exposure (§15), so a bold posture lowers the safety ratio.
- From level `MIS_SELLING.appetiteFrom` (4) the capability over-claim incident is `appetiteMult` (1.5×) as likely (CONTENT §22).
- The Chief Safety Officer and the CFO step it (§17.2). Approval (§9.6) no longer reads it.
- Worked example: Bold (4) with a model at the bar (exposure 1) gives exposure 1.08, so a Safety floor at strength 1.0 reads 92.6% instead of 100%; the 60.5% contract chance of §11.2 becomes 63.5%.

### 16.9 Platform & Security and the app
- `appRating = ema(appRating, 2.0 + 2.5 × itCoverage' × itSkill/100 + ctoBonus − ctoVacancy + digitalProjectBonus, 0.05)`, clamped to 1–5.
  - `itSkill` = the Platform & Security department's average skill, or 70 while it has no staff, so a small lab with no such floor rests near 3.75.
  - `ctoBonus = 0.4 × CTO expertise/100`.
  - `ctoVacancy = 0.3` once you've had a CTO and the seat is empty, so a resignation drags the rating down until you hire a replacement.
- Incident multipliers for breaches and outages: `1 + 2 × (1 − itCoverage')`.

### 16.10 HQ marketing
- **Brand campaigns** run per city or per country with a weekly cost and a gain to `b`.
- **Agency packages:** a one-time `b` boost spread over the package length, with no staff needed.

### 16.11 Hiring sales office managers for you
- The COO's **Sales office operations** (§17.2) is the one way managers are hired for you: each week every **open** office with no manager gets the candidate in its city with the highest total of the four skills (people + product + marketing + ethics; ties go to the first listed, `strongestCandidate`), hired with the player's own `hireManager`, so at the candidate's asking salary, and the office gets the default delegation `EXEC_DELEGATION.cooDelegation`. An office still being built waits until it opens; a city with no candidates waits for its next pool.
- This also refills an office whose manager was poached (§6.5) the following week.
- Until schema 22 the HR floor had its own hiring switch (`people.hrHiring`) that filled seats without touching delegation; migration 21 → 22 switches a seated COO's Sales office operations on where it was on.

### 16.12 Training runs and the frontier
- **Training runs** (Products floor required; one at a time; `startTrainingRun`, `cancelTrainingRun`). The player names the model, picks a focus axis, a term from `DEV_TERMS` and a weekly budget (≥ `TRAINING.minWeekly` $20k, step $5k).
  - Odds use §16.6's `devScore`/`starOdds` with the budget scored from $20k (B 0) to $2M (B 1).
  - **Frontier cost curve** (`FRONTIER_COST`, `src/sim/frontier.ts`): past house model quality `fromQuality` (7), training gets `perPoint` (2.5×) dearer a point: `frontierCostMult = 2.5^max(0, quality − 7)`, and the budget is scored as `budget ÷ frontierCostMult`. The budget slider's top is `$2M × frontierCostMult`. Worked example: at quality 9, mult 6.25, so a $1.25M week scores like $200k did at quality 7. Once every axis is at the ceiling (10) a run can't lift the model; the card says so.
  - The run pays `weeklyBudget × devSpeed` a week (P&L line `development`) and progresses at `devSpeed`; it pauses without a Products floor or during a mandated pause. Cancelling loses what was spent.
  - On finishing, stars are drawn from the odds (`training` stream). The new **trained model** copies the active model's mix and adds a lift: `TRAINING.starLift[stars−1]` on every axis plus `focusLift[stars−1]` on the focus axis, on top of the active model's own lift (so generations stack when you train from a trained model). Its radar = mix radar + lift, capped at 10; cost = the custom mix's cost. It is not switched on: use it in Manage Models (the usual 2-week switch).
- **Rival models.** Every rival lab has a model (`RivalBank.model`) starting at `5.8 + U(−0.5, 0.1)`, generation 2. A lab that appears later starts `lateGap` (0.3) under the best rival model.
  - Each quarter start, every active rival releases a new generation with chance 0.2, gaining `max(0.05, normal(0.18, 0.12)) + 0.005 × its researchers' stars` (§16.13; cap 10). A release that takes the lead is a bigger Ledger story.
- **The frontier.** `frontierRise = max(0, best rival model − frontierBase)`, where `frontierBase` is the best rival model at the start (or at migration). `qualityBar = 5.8 + MODEL_EFFECTS.frontierWeight (0.5) × frontierRise` is the reference in price headroom, contract chances, the Products rating and the safety ratio's exposure, so a model that stands still slowly loses pricing power and deals.
- **Leaderboard:** every active lab's model by quality (your active model included).
- **Balance check (seed 42, steady):** the strategy trains from its Products floor (~week 130) at 1% of cash a week (capped at $150k); by week 260 it is on generation 5 at quality 8.0 against the best rival's 8.3.

### 16.13 The CPO's research lead and the talent war
- **Training score.** A run's score is `devScore + cpoTrainingBonus + researchBonus(focus)` (§16.12), fixed when the run starts.
  - `cpoTrainingBonus = CPO_TRAINING.scoreMax (0.15) × expertise/100` with a CPO seated, else 0 (the Chief Scientist's lift until schema 22).
  - `researchBonus = min(0.2, Σ 0.012 × stars × (2 on the researcher's specialty = the run's focus, else 1))` over your researchers.
- **Researchers** (`state.talent.researchers`): name, portrait, specialty axis, 1–5 stars (weights 30/30/20/12/8), salary, employer (you, a rival, or none).
  - Market salary a year = `220,000 × (1 + 0.4 × (stars − 1)) × home city wage level × (1 + RESEARCHERS.frontierPay (0.6) × frontierPoints)`, rounded to $5k, where `frontierPoints = max(0, best model anywhere (yours or a rival's) − FRONTIER_COST.fromQuality (7))`. As the frontier climbs the going rate rises, and so does the poaching chance on anyone paid below it.
  - A new game seeds 16, each at a random active rival with chance 0.6, otherwise on the market.
  - **Hiring** (`hireResearcher`, Products floor required, team of up to 8): a free researcher at the higher of their salary and the market salary. From a rival: that × 1.3, plus a signing bonus of 13 weeks of it (P&L `hqStaff`). Cash must cover the bonus and a week's pay.
  - **Letting go** (`releaseResearcher`): back on the market, no cost.
  - Your researchers' salaries are paid weekly into `hqStaff` (tick step 15).
- **Each quarter start** (tick step 20, before rival model releases):
  - Researchers at a rival that closed or merged go back on the market.
  - For each of yours, a random active rival bids with chance `0.12 × (market salary ÷ salary)²` (capped at 1), raising **RESEARCHER_POACHED**: *Counter-offer* (salary +25%) or *Let them go* (they join that rival).
  - Each free researcher signs with a random rival with chance 0.2.
  - New graduates join until at least 3 are on the market.
- **The CPO's Routine training runs** delegation (`training`, `CPO_TRAINING`): when no run is under way and there's a Products floor, starts a run on the active model's weakest axis, shaped by the **training style** you dial (`executives.trainingStyle`, `CPO_TRAINING.styles`, default Balanced): Quantity 8-week runs at ×0.6 budget, Balanced 12 weeks at ×1, Quality 24 weeks at ×1.5. Quantity ships more generations with weaker star odds; Quality fewer, stronger ones.
  - That run's budget is `cashShare` (1%) × the style's `budgetMult` of cash a week, between $20k and `maxWeekly` ($150k) × `budgetMult` × `frontierCostMult` (§16.12, step $5k), and needs `cashFloorRuns` (40) weeks of it in cash. With every axis at the ceiling the CPO starts no run.
  - It never switches models: the CPO's **Models** delegation (§17.2) switches to a trained model when its quality less licence cost beats the active model's by `MODEL_DELEGATE.minGain`, the same test it applies to data-vendor packages.

## 17. People AI

### 17.1 Sales office manager (when delegated)
- **Staffing:** `targetStaff = max(staffNeeded, ceil(staffNeeded × clamp(W, 1, 1.3) × COO step))`, so a manager never leaves a desk empty (the COO's trim only eats into the extra); wage = `marketWage × (0.95 + 0.15 × People/100)`.
- **Products & rates:**
  - Each price targets `m ± offset` to hold the Price rating at 3.2–3.6 while keeping a healthy margin over the default price.
  - Product skill adds a pricing error that shrinks as Product rises.
  - Offers products with local `aff_p ≥ 0.05` (`DELEGATE.minAffinity`).
- **Marketing:** turns on campaigns whose estimated awareness ROI > 0 using a 26-week horizon; Marketing skill scales the effect.
- **Office troubles:** auto-resolves incidents by choosing the option with the best expected value, plus error scaled by (1 − (People + Ethics)/200).
- **Deal Desk:** §11.4.

### 17.2 Executives
- **Skills:** Leadership, Expertise and Loyalty, each 0–100.
- **Department multiplier:** `execMult = 0.9 + 0.25 × expertise/100` on the departments in their domain.
- **Seats:** CEO (you), COO, CFO, CPO, CMO and CTO as in the original, plus the Chief Safety Officer (seat id `cro`) as a seventh: `ExecSeat = coo | cfo | cpo | cmo | cto | cro`. The Executive suite's 7 desks (§16.1) are those seven people. Two seats were folded away in schema 22 (DESIGN decision log 2026-10-27): the Chief Infrastructure Officer's rents and buying went to the CFO, whose Expertise is also pricing power on the buildings it manages (§21.2), and the Chief Scientist's training went to the CPO, whose Expertise also lifts training odds (§16.13).

**Delegations:**

| Exec | Domain | Delegations |
|---|---|---|
| COO | HR, all sales offices | **Expansion:** opens sales offices for you in the cities you mark for growth (one at most every 4 weeks, in the growth city with the most room, at the busiest free storefront, in your usual fit-out, keeping 8 weeks of costs in cash). **Company troubles:** settles company and city incidents the way a delegated manager would (§17.1), valuing effects in weeks of company revenue with error shrinking with Expertise; cases marked `yours` (the outage rumour, the mandated pause, poached executives) always come to you. **Sales office operations:** auto-hires managers for new offices and turns on default delegation. **HR benefits:** keeps average morale at or over the **morale target** you dial (`executives.moraleTarget`, one of `EXEC_DELEGATION.moraleTargets` 70 / 80 / 90, default 70) at least cost, within `benefitsBudgetShare` (8%) of payroll. **HR division:** auto-staffs every floor to 100% coverage. **Pay reviews:** on the **cadence** you dial (`executives.payReviewCadence`: quarterly = every 13 weeks, annual = every 52, `PAY_REVIEW.cadences`, default quarterly) sets every executive to `execMarketSalary × (1 + payPremium)` and every manager to their market pay (§6.5) × `(1 + payPremium)`, rounded to the salary steps and inside the allowed ranges; it also runs at once when switched on and whenever you change the premium (`setPayPremium`, −10% to +30% in 5% steps, default +5%). **Sales office guidance (staffing):** see below. |
| CFO | Finance, owned buildings (the lab's and yours) | Halves statement delays. **Capital:** at Tight or Critical runway (§15), sells the company's stocks for cash. **Share sales** (its own switch, so the owner can keep their stake undiluted): under `RUNWAY.cfoRaiseBelowMonths` (12) months of runway, or with cash below zero, sells new shares through the cheapest investment bank (private placement while private, within the round limits; secondary once listed), sized to reach `RUNWAY.cfoTargetMonths` (18) at the current burn, in steps of `cfoRaiseStep` (1%) of the lab. Never launches the IPO. **Investing: the lab's money** and **Investing: your money:** every `EXEC_DELEGATION.investEveryWeeks` (4) weeks, on weeks ≡ `investPhase` (2), each switch for its account (rival labs' shares are never touched): (1) sells every listed-company stock whose price is ≤ `investTrimAt` (75%) of its average cost, and doesn't buy it back for `investCooldownWeeks` (52); (2) buys one stock, the listed company with the largest gap `capShare × (held + budget) − heldValue` (capShare = its market cap ÷ all listed companies'), so holdings build toward a market-cap weighting; buys under `investMinTrade` ($10K) are skipped; (3) backs one startup from the Investment floor pipeline: the highest pentagon average ≥ `investMinScore` (6) among those raising that the account doesn't already hold, taking one offer lot (§20.4); none without an Investment floor. Lab: never at a restricted or critical tier; stocks ≤ `investStockCap` (5%) and startup stakes ≤ `investVentureCap` (3%) of total assets; one stock buy ≤ `investStockLot` (1%) of total assets; each buy leaves at least `RUNWAY.gateMonths` (12) months of runway (it spends at most `cash − 12 × 52/12 × burn`, all of it with no burn); `expansionReserveWeeks` (8) of costs stay in cash. You: keeps `buyReserveYears` (1) of CEO salary; one purchase spends at most `investSpareShare` (25%) of the personal cash above that. **Dividends:** proposes a dividend at board meetings. Under a **Buildings** heading: **Rents: the lab's buildings** and **Rents: your own buildings** (two switches, so your private buildings can stay yours to price): every `EXEC_DELEGATION.rentEveryWeeks` (4) weeks, and at once when a switch goes on, each covered building's rent is set to hold that owner's **occupancy dial** (80 / 85 / 90 / 95 / 100%, default 100, one dial under each switch; `rentForOccupancy`, §21.2). At 100% that is `bestRent`: the highest rent that still fills it, counting the CFO's pricing power, rounded down to the $5 step and kept inside the 50–160% range. Changing a dial reprices at once. **Buying: the lab's buildings** and **Buying: your own buildings:** every `EXEC_DELEGATION.buyEveryWeeks` (4) weeks each buys at most one listed building, in any city, at its asking price (always accepted, no travel needed): the listing with the best net yield, a year of `propertyWeek(…).net` at the rent the CFO would set and the occupancy it settles at ÷ asking, among those the budget allows. Lab: never at a restricted or critical tier; its buildings' value stays ≤ `buyAssetCap` (5%) of total assets; at least `RUNWAY.gateMonths` (12) months of runway remain after the purchase (§15); `expansionReserveWeeks` (8) of weekly costs stay in cash. You: keeps `buyReserveYears` (1) of CEO salary, and a building may cost at most `buySpareShare` (50%) of the personal cash above that. Tenants of a covered building accept rent up to `marketRent × (1 + 0.10 × expertise/100)` with no loss of occupancy. The lab pays the CFO either way. The old **Funding** switch (auto-funding and funding offers, §13.3) went in schema 22: legacy funding lots simply run off. |
| CPO | Products | **Pricing:** keeps the company lineup priced like a delegated manager (§17.1) when Apply-to-all is on. **Developments:** starts one when none is running, within a budget cap of 1% of revenue. **Models:** switches to the data package or trained model with the best quality per dollar (§16.7, §16.13). **Routine training runs** (§16.13). **Sales office guidance (lineup):** see below. |
| CTO | Platform & Security, Compute | App rating bonus (§16.9); runs digital projects. **Compute** (`execDelegationsCompute.ts`): each week, with a Compute floor, reserves GPU lots from the floor's market (§13.0) until `plannedCapacity` (data-center and power-deal GPUs, data centers in fit-out at their usable GPUs, rented lots) covers the **cover target** you dial (`executives.computeCover`, one of `CTO_COMPUTE.coverTargets` 60 / 75 / 90%, default 75%) of last week's `demandGpus`. It acts only when the gap is at least `CTO_COMPUTE.slack` (5%) of demand, takes only offers priced under spot, in whole `GPU_MARKET.sizeStep` lots, and orders offers by the chip phase: longest term first in a glut, shortest first in a shortage, cheapest per GPU-week in a normal market (ties by price, then id). Auto spot-buy is untouched and covers the rest. An empty seat applies the vacancy penalty. |
| Chief Safety Officer | Safety & Alignment | **Launch posture** switch (id `appetite`): every `croEveryWeeks` (4) weeks, steps it down one level while the safety tier is Watch, Restricted or Critical, and up one while it is Strong, up to `croMaxAppetite` (4, Bold). **Deal Desk policy** (§11.4). |
| CMO | Marketing | Runs brand campaigns to hold `b` near the **awareness target** you dial (`executives.brandTarget`, one of `EXEC_DELEGATION.brandTargets` 40–70%, default 50%) in active cities within a budget cap of 3% of revenue. **Sales office guidance (marketing):** see below. |

**Sales office guidance** (`src/sim/branchGuidance.ts`): the C-suite steers the managers you delegate to, so managers still decide with their own skills but aim where HQ points them. `company.guidance` holds whole steps in `GUIDANCE.min..max` (−1..+3), moved one step every `GUIDANCE.everyWeeks` (4):
- **Staffing (COO):** +1 while open delegated-staffing offices average staff morale below `GUIDANCE.moraleLow` (65), −1 above `moraleHigh` (82). Effect: delegated wages × `(1 + 0.02 × staffing)` and staff target × `(1 + 0.05 × staffing)`, on top of the manager's People skill.
- **Marketing (CMO):** +1 while average brand awareness across the cities of open delegated-marketing offices is below the dialled `brandTarget − GUIDANCE.brandBand` (40% at the default target), −1 above `brandTarget + brandBand` (60%). Effect: the awareness value a delegated manager weighs each campaign against (§17.1) × `(1 + 0.2 × marketing)`.
- **Products (CPO):** +1 while open delegated-products offices average a Products rating below `productsLow` (3★), −1 at `productsHigh` (4★) or better. Effect: delegated fee prices × `(1 − 0.03 × products)` (also the CPO's own company pricing) and the lineup's affinity bar (`DELEGATE.minAffinity`) × `(1 − 0.25 × products)`, so more products go on.
- With no delegated office to read, a part holds its step. A part whose switch is off or whose seat is empty returns to 0 that week.

**Delegation dials** (`src/sim/execPolicy.ts`, the CTO's in `execDelegationsCompute.ts`): four delegations carry a stepped slider under their switch, and a tagline estimates what the chosen stop means right now, by the routine's own rule and without changing anything:
- **Morale target** (COO · HR benefits): walks the routine's benefit steps from today's benefits (most morale per dollar up, least morale lost per dollar down) until the estimated average morale reaches the target or the 8% budget runs out, and reports the weekly benefits cost, its change, its share of payroll and the morale it reaches (`moraleEstimate`).
- **Awareness target** (CMO · Brand campaigns): for each city with an open office, a campaign starts where `b < target − brandSlack` (the cheapest city campaign not already running, only while the 3% budget covers it) and running ones stop where `b > target + brandSlack`; reports the weekly spend, its change and share of revenue, how many cities are pushed, and the change in new-customer flow once those cities sit at the target, from the awareness factor in §9.2 with each office's own `a` held (`brandEstimate`).
- **Training style** (CPO · Routine training runs): runs the routine's own plan (`cpoTrainingPlan`) for the chosen stop and reports the run length, weekly budget, focus axis and the chance of a 4★ or better model, or that it waits for more cash.
- **Cover target** (CTO · Compute): runs the routine's own plan (`computeCoverPlan`) for the chosen stop and reports the share of demand covered now and the GPUs it would reserve this week with their weekly bill, "nothing to reserve" once covered, "within 5% of target, nothing to reserve" when the gap is under the slack, or that no offer under spot fits.
- **Review cadence** (COO · Pay reviews): reviews a year, how far pay can lag the market between reviews (`MANAGER_PAY.tenureGrowth × weeks ÷ 52`: ~0.8% quarterly, 3% annual) and what the next review would add to annual pay across executives and managers (`nextReviewDelta`).

**Resignation:** weekly probability `0.002 × (1.5 − loyalty/100) × (pay/market < 0.9 ? 2 : pay/market ≥ 1.1 ? 0.5 : 1) × (unvested grants ? 0.5 : 1)`. Triggers the `EXEC_POACHED` incident.

**Candidate pools** refresh every 4 weeks. Candidate skills roll uniformly in EXECUTIVES.skillRange (35–93). A seat's pool can be rerolled sooner for a recruiter's fee (`rerollExecCandidates`): CANDIDATE_REROLL.feeShare × the executive market salary, doubling with each reroll of that seat until the free refresh; posted to `execPay`. A University Graduate Program adds +10 to candidate skills. Candidates come with every delegation on; a seat remembers the toggles its last holder left, and the next hire for that seat starts with those, so a resignation never silently changes how the lab is run.

**Growth cities and "Open now":** `setGrowthCity` marks a city the COO may build in (only cities you have visited, not regional sites); hiring a COO with Expansion on, or switching it on, with none marked seeds the list with the cities you already have offices in. `cooOpenBranch(cityId)` has a seated COO build their usual pick at once, needing only the cash for the build (no reserve, no cadence); it works from any city, because the COO travels for you.

### 17.3 Board meeting
- **When:** once per calendar quarter, with an Executive suite. The loop pauses once per quarter to remind you (after weekly results and incidents).
- **Votes:** the founder and executive holders vote For. Outside holders approve with `a`; `forShare = insiders + (1 − insiders) × a`; an item passes at ≥ 50%. While you hold a majority, every proposal passes.
- **Dividend approval `a`:** payout = dps × shares × 4 ÷ trailing net income. With no profit: 0.9 for a zero dividend, 0.15 otherwise. With profit: 0.6 for zero; 0.9 up to a 60% payout, falling linearly to 0.1 at 120%.
- **CEO salary approval `a`:** CEO market rate = 1.5 × the executive market salary. 0.9 at or below it, else `clamp(0.9 − 0.8 × (new/market − 1), 0.05, 0.95)`; −0.2 for a raise above 25%; −0.15 while ROE_ttm < COE. The board won't consider more than 4× the market rate.
- **Caps (§15):** Watch caps the quarter's dividend total at 50% of trailing-four-quarter net income ÷ 4; Restricted and Critical allow none. A new dividend can't be declared while the last is unpaid.
- **Declared dividend:** retained earnings fall at once and the total is a liability ("dividends payable") until it is paid 3 weeks later (financing cash); the founder's share goes to personal cash. `DIVIDEND_DUE` reminds you at declaration.
- Numbers: `BOARD_VOTE`, `GOVERNANCE` in balance.ts.

### 17.4 Executive details
- **Market salary** = ($180,000 + $60,000 per $1B of total assets) × city wageIndex, capped at $2.5M. A candidate asks market × (0.8 + 0.4 × average skill/100), in $5k steps; salaries can be set from 0.5× to 3× market. Severance on firing: 26 weeks of salary.
- **execMult** multiplies the department's staff effectiveness (§16.4) for the seat's departments: COO → HR, CFO → Finance, CPO → Products, CMO → Marketing, CTO → Platform & Security and Compute, Chief Safety Officer → Safety & Alignment. Expertise under 40 lowers it below 1. Leadership only feeds the asking salary in v1.
- **Grants:** a grant is at most 2% of outstanding shares; it vests 25% a year. Grant-date value: the share price (RSU) or max(price − strike, 25% of price) (option), expensed straight-line as non-cash `grantExpense` with paid-in capital rising by the same amount. Vested RSUs issue shares; vested options are exercised whenever in the money (the strike comes in as cash). Leaving forfeits the unvested part; booked expense isn't reversed.
- **Employee Stock Plan** (public only) adds +5 to executive loyalty in the resignation formula.
- **Delegation details:** `EXEC_DELEGATION` in balance.ts (COO benefits spending ≤ 8% of payroll; CFO dividend proposal 40% of trailing net income; CPO/CTO developments of 12 weeks at Medium within 1% of revenue; CMO awareness 45–55% within 3% of revenue; Chief Safety Officer steps the launch posture every 4 weeks by the safety tier, at most 4 (`croMaxLoss` is only the attention list's loss ceiling now); CFO Capital targets `cfoTargetCr` 12% in raise steps of 1% of the lab; COO Expansion builds your last fit-out (`company.lastBuild`, else the newest office's, then mid, then basic), `expansionEveryWeeks` 4, `expansionReserveWeeks` 8 of weekly costs (revenue less net income, averaged over `revenueWeeks`), `expansionMinRoom` 0.2 of §9.2 room, never past `CITY_BRANCH_GUIDE`; COO Company troubles option error `troublesError` 0.5 × (1 − Expertise/100)).

## 18. Rivals

- **18.1 State:**
  - strategy, brand color and monogram, model (§16.12), researchers (§16.13)
  - offices: lot, size, quality profile, prices
  - per-office books on **customers and ARR** (`src/sim/rivalBooks.ts`, `src/sim/rivalFinance.ts`, schema 23): an office's customers move `RIVAL_BOOKS.ema` (5%) of the gap a week toward `matureCustomers` (4,500) × its size multiplier (C2b) × the city's income index × overall ÷ `RIVAL_QUALITY_REF` (3.4) × the competition factor (`RIVAL_COMPETITION`: crowding by offices within `RIVAL_RADIUS` and, city-wide, your offices' share of prospects over `playerShareRef`) × the ramp of a young office (1 − (1 − age/`RIVAL_RAMP_WEEKS`)³, mature at 156 weeks) × the downturn factor. ARR = customers × what one pays × the downturn factor, where a customer pays the rival's own plan prices there (weighted by `ACQUIRED_PLAN_MIX`, billed monthly, so price wars §18.6 cut it) + `usagePerCustomer` ($300, API and apps) × the nominal index (§4.6).
  - **Downturn factor:** max(`cycle.min` 0.6, 1 − `cycle.sens` (0.4) × strategy `cycleMult` × (creditCycle − 1)) (§4.5): a recession shrinks the customer pool and what each customer pays (downgrades, less usage); disruptors (×1.6) feel it most, premium labs (×0.8) least.
  - **cash** (corporate cash), **costs** (last week's running costs), **runway** = cash ÷ costs in weeks, **equity** = cash + every office at its replacement value (`RIVAL_EXPANSION.buildCost` × units × cost index × the nominal index); public/private, shares and price, executives
- **18.2 Prices:** per §5, using strategy fee stances; difficulty's `rivalRateEdge` shifts rival rate prices.
- **18.3 Ratings:** the strategy quality profile ± normal(0, 0.2) per office (difficulty's `rivalQuality` adds coins). Overall usually 3.0–4.4. Their app rating comes from the strategy.
  - **Rivals learn:** at each year end, every rival office in a city where you run an open office whose overall is below your average overall there moves each quality coin up by `RIVAL_LEARNING.step` (0.1), capped at `maxQuality` (4.6); a rival sharing a city with you lifts its app rating by the same step toward yours.
- **18.4 Expansion** (monthly check per rival):
  - **Rival sales offices:** each rival lab holds one office per city, with a `size` from your `OFFICE_SIZES` table (`src/sim/rivalOffices.ts`). An office of size s counts as `sizeMult(s)` units wherever units are summed: mature books, running costs, crowding, the market-reference price weight (§5), campaign costs, the disruptor's grow-up count (`RIVAL_TECH.growUpBranches`) and city entry (`entryMinUnits`). Mergers and network splits fold offices together (`giveRivalOffice`, `foldRivalCity`); a new lab opens one Standard office. The room rule counts every office, yours and theirs, by its multiplier.
  - **Growing:** if trailing profit > 0 and the build leaves it `RIVAL_EXPANSION.minRunwayWeeks` (39) of running costs in cash, in **each city it serves** a `chance` (6%, disruptors ×0.25) roll grows the lab's office one size, divided by the units the step adds (1.5, 2.5, 4), while the city keeps room (`maxRivalLotShare` 40% of lots rival-held, `minFreeLotShare` 20% free). The cost (`buildCost` × costIndex × the nominal index × the units added) comes off cash; the office is worth the same on the books, so equity is unchanged. A city the lab serves without an office reopens a Starter. Events `RIVAL_OFFICE_GROWN` and `RIVAL_OFFICE_SHRUNK`.
  - **Entering a new city:** the same month, a rival with at least `entryMinUnits` (6) units rolls `entryChance` (5%, disruptors ×0.25) to open its first office in a generated city with storefronts it doesn't serve: one in its home country, or any city once it serves `abroadMinCities` (3) cities. It picks the city with the most free lots (ties by id); `RIVAL_CITY_ENTRY` event and Ledger story. Cities you haven't visited aren't generated, so rivals grow where the world exists.
  - **Shrinking:** an office whose contribution has been negative for 26 weeks shrinks one size, books in proportion, before a Starter ever closes. Weeks while its country is in recession or recovery don't count, so a lab rides out a downturn.
  - A lab you have bought, that failed, or that another rival has bought (§18.8) is never seeded into a city generated later. A new lab (§18.7) enters new cities from its own home country.
- **18.5 Financials (`RIVAL_BOOKS`):**
  - **Weekly revenue** = ARR ÷ 52 per office. **Costs** per office: compute = `computeShare` (25%) × revenue × the compute index (§13.0) × strategy `computeMult`; staff and rent = `officeCost` ($45k a week) × units × the city's cost index × the price list (§4.6) × `costMult`; model training = `trainingShare` (8%) × revenue × `trainingMult`. Contribution = revenue − costs (what the closure rule reads, §18.4). Worked example at a compute index of 1.2, a Starter incumbent office in a cost-index-1 city with $6M of ARR: revenue $115,385 a week; compute 0.25 × 115,385 × 1.2 = $34,615; office $35,000; training $9,231; contribution $36,538.
  - Strategy multipliers (`RIVAL_BOOKS.strategy`): incumbent 1 / 1 / 1 (cost / compute / training), premium 1.3 / 0.9 / 1.2, community 0.95 / 1.1 / 0.8, disruptor 0.6 / 1.2 / 1.3; `cycleMult` 1 / 0.8 / 1.2 / 1.6; `expandMult` 1 except disruptors 0.25.
  - The lab's week: earnings summed over its offices, taxed at its home country's rate when positive, added to **cash**; `costs` is the week's running costs; campaigns (§18.9) and tech spend come off cash too. Quarterly revenue and net income are reported.
  - **Starting cash:** `startRunwayWeeks` of running costs by strategy, drawn once (incumbent and premium 78–104, community 52–78, disruptor 20–40). A new lab (§18.7) starts with `RIVAL_CHARTER.capital`.
  - **Dividends:** when the quarter was profitable and cash exceeds `cashTargetWeeks` (26) of running costs, dividend = min(excess, clamp(`RIVAL_PAYOUT.excessShare` × excess, `ratio` × NI, `maxRatio` × NI)); listed labs pay your holdings (§19.1).
  - **Funding round (`RIVAL_RAISE`):** at quarter-end a lab that lost money last quarter with under `maxRunwayWeeks` (26) of runway rolls `chance` (5%) to raise `weeks` (78) of running costs: new shares at its fair value per share (§19.8) less `discount` (20%), never under `minPrice` ($1), so every holder is diluted. Event `RIVAL_RAISE`.
  - **Insolvency (`RIVAL_FAILURE`):** at quarter-end a lab whose cash has been negative at `insolventQuarters` (2) quarter-ends in a row, or sits below −`maxDebtWeeks` (13) of running costs, goes into **administration** (status `distressed`, the app says "In administration"). Its network is offered as a **distressed sale** in M&A for `distressWeeks` (8) at ARR × `MERGERS.distressedMultiple` (0.5–0.8). Unsold networks are split among the other rivals (status `seized`, kept for save compatibility; the app reads it as failed).
  - **Runway tiers (`RIVAL_RUNWAY_TIERS`):** runway ≥ 104 weeks Strong, ≥ 52 Adequate, ≥ 26 Watch, ≥ 8 Restricted, else Critical. Panels show the band; M&A reads it for the premium a target wants (§19.8).
- **18.6 Price wars:** if your Price rating in a city stays ≥ 4.0 for 8 weeks, each rival there has a 30% chance per month to cut its plan prices by `PRICE_WAR.bump` (5%), up to `PRICE_WAR.cap` (20%) in all; once your streak ends the cut fades by `PRICE_WAR.decay` (0.5 points) a week. Rival plan price = base × (1 + fee stance − cut). The `PRICE_WAR` incident's Match option cuts your plan prices in the city by `matchCut` (10%) for 26 weeks (the `planCut` effect).
- **18.7 New labs (`RIVAL_CHARTER`):** at each year end every generated city (not a regional site) rolls for a new rival lab: `RIVAL_CHARTER.chance` (35%) when it has fewer active rival labs than its usual count (`competitorsFor`, because you bought one, one failed or one merged away), else `roomChance` (8%) when at least `roomShare` (35%) of its storefronts are empty. A city needs at least three free lots and `RIVAL_EXPANSION.minFreeLotShare` free. At most `maxPerYear` (3) a year, from the `charters` stream. The new lab draws a strategy (disruptor 35%, community 30%, premium 20%, incumbent 15%), an invented name (CONTENT §15), an ink and a CEO; it is private, its home is the city's country, it starts with `capital` ($15M) × the nominal index of cash (its share count is set on that, then the first office is paid for), and opens one Standard office on the best free lot. Its office ramps like any new rival office, and it expands once it has a year of profits. The paper runs a new-lab story.
- **18.8 Rivals buy each other:** at each quarter start, after earnings, every rival rolls `RIVAL_MERGERS.chance` (4%) from the `rivalMergers` stream. A buyer needs four reported quarters, a profitable year and `minRunwayWeeks` (52) of running costs in cash. Its target is an active rival with ARR at most `maxTargetShare` (50%) of the buyer's, not under your pending offer, that it meets in a shared city or in one of its home countries (most shared cities first, then the biggest ARR). The price is the target's fair value per share (§19.8) × (1 + premium) × its shares, premium U(15%, 40%), paid in cash; the deal goes ahead only if the buyer's cash plus the target's, less the price, still covers `minRunwayWeeks` of their combined running costs. The buyer takes the target's cash with its offices. At most `maxPerQuarter` (1) a quarter. Every holder is paid in cash at the deal price: your company's holding is marked to the price first (gain or loss to investment gains, §19.7), then turned into cash; your personal shares become personal cash. The buyer takes the target's offices, cities, any corporate loans and credit line it made you in an old save (§19.9), its business contracts and its plans partnerships with employers; the target's status becomes `merged` (`mergedInto` the buyer) and it leaves the market like a lab you bought.
- **18.9 Campaigns and technology:**
  - **Ad campaigns.** At each monthly expansion check, a rival with a profitable year rolls `RIVAL_MARKETING.chance` (4%) × its strategy weight (premium 1.2, incumbent 1, community 0.8, disruptor 0.5) in each city it serves where you run an open office, from the `rivalAds` stream. A campaign lasts `weeks` (12): its office there reads `overall + boost` (+0.15, capped at 5) in your share formula (§9.3) and in its own book target (§18.1), and it costs `costPerBranch` ($6,000) a week per unit × the city's cost index × the price list (§4.6), out of equity and quarterly earnings.
  - **Technology.** At each year end, a rival with a profitable year spends `RIVAL_TECH.spendShare` (5%) of that year's profit: its app rating moves `appStep` (0.08–0.12 by strategy) toward its strategy's `appCap` (community 4.0 to disruptor 4.9), and every office's Products coin rises `productStep` (0.05) up to `RIVAL_LEARNING.maxQuality`. The paper notes an app crossing a half star.
  - **Growing up.** A disruptor with `growUpBranches` (20) units becomes an incumbent: full expansion speed and the incumbent finance profile, with its prices drifting to the incumbent sheet (§5).

## 19. Markets and valuation

### 19.1 Listed companies
- **Shared weekly shock:** `marketShock ~ normal(equityMarketDrift/52, 0.018)`.
- **Company return:** `r = μ_sector(phase)/52 + β_c × marketShock + σ_c/√52 × normal()`.
- **Earnings weeks:** add a surprise of `normal(0, 0.04)` plus a sector-phase tilt.
- Price floor $1.
- EPS grows with growth_c ± noise. P/E = price / trailing EPS.
- Dividends are paid quarterly at the stated yield to company and personal holders.
- **Details:** beta comes from the sector; returns use the phase of the home country (a listed rival: its first city's country). The earnings tilt is 10% of the sector's annual μ; EPS grows by growth/4 plus the surprise each quarter. Dividends pay a quarter of the yield on the current price at quarter-end. The index ("Inference Composite", 1000 at the start) is chain-linked over non-lab companies and trading listed rivals; your lab isn't in it. History keeps 104 weeks.
- **Listed rivals** price on revenue (§19.2); before their first report they're priced at book. Private rivals trade at book value; a failed rival's shares go to 0.
- **Company holdings** are marked to market every week through the non-cash P&L line `investmentGains`; they carry the 2.5× risk weight. You and your company together may own at most 30% of a listed company or rival.

### 19.2 Your lab while private (revenue multiple)
- `value/share = max(BVPS, ARR × multiple ÷ shares)`: book value is the floor.
- `multiple = clamp(3 + 6 × clamp(growth, 0, 2) + 2 × (model quality − quality bar), 1.5, 16)` (`VALUATION`).
- `growth` = the latest quarter's revenue ÷ the same quarter a year earlier − 1. With fewer than five quarters reported it is the growth since the first quarter, scaled to a year (`(last/first)^(4/n) − 1`). It is 0 before two quarters.
- Private: `valuation/share = max(BVPS, ARR × multiple × PRIVATE_VALUATION (0.8) ÷ shares)`.
- **Worked numbers:** 10M shares, BVPS $5, ARR $50M, a model at the bar, private.
  - Flat revenue: 3× → $12.00.
  - Revenue doubled in a year: 9× → $36.00.
  - Growth of 200% or more: 15× → $60.00.
  - No ARR: $5.00, the book floor.
- ROE_ttm stays for board votes and the CEO pay vote.
- **Listed rivals** price on revenue too: target = `max(BVPS, revenue_ttm × multiple ÷ shares) × sentiment`, with the same multiple from their own reported quarters' growth and their model's quality over the bar (`multipleFor` in `valuation.ts`, `rivalTargetPrice` in `marketRivals.ts`). Revenue_ttm is the last four quarters, annualised when fewer. Seed 42's listed rivals trade at about 1–8× book. Offers for a listed rival measure their premium against this price (§19.8).

### 19.3 Private placement
- Sell new shares up to 25% of outstanding per round at the private valuation × 0.9 (`PLACEMENT`).
- Limits: at most 3 rounds, at least 26 weeks apart.
- The investor is a generated fund; it appears in top shareholders.

### 19.4 IPO
- **Eligibility:**
  - ARR ≥ `IPO.minArr` ($100M)
  - last 4 quarters profitable
  - Finance coverage' ≥ 0.8
  - safety tier Adequate or better
  - not in a Recession, unless runway is Strong (§15)
- **Choices:** float 10–40% as new shares, and the investment bank (fee 4.0–6.5%; quality sets the first-day pop of 0–25%).
- **Offer price:** `max(BVPS, ARR × multiple ÷ shares) × 0.9` (§19.2).
- **Listing:** at the next quarter-end tick, with a news event. Eligibility is checked again then; if it fails the IPO is withdrawn.
- **Float:** the float % is the public's share after listing: new shares = outstanding × f ÷ (1 − f). The ticker comes from your monogram; the exchange is your home country's.

### 19.5 Your lab while public
- `target = max(BVPS, ARR × multiple ÷ shares) × sentiment × irPenalty` (§19.2, no private discount)
- `irPenalty = 1 − 0.15 × (1 − financeCoverage')`
- **Sentiment:**
  - mean-reverting random walk: σ = 2% per week, reverting at 5% per week toward 1
  - shocks: incidents −3% to −15%; earnings growth vs last quarter ±(0–8%); dividend raise +3%, cut −6%
- **Price:** `price = ema(price, target, 0.15) × (1 + normal(0, 0.025))`.
- Track the 52-week high/low and P/E.
- **Details:** sentiment stays within 0.4–1.8. Incident shock = −(3% + 12% × severity), severity per type in `INCIDENT_PRICE_SEVERITY` (minor office mishaps, reminders, city and personal cases don't move it). Earnings growth of 25% or more (or a swing from loss to profit) gives the full ±8%. A weekly move of 8% or more is news.
- **Public duties:** Finance needs +4 staff; Finance k′ below 0.6 at quarter-end files late (fine 0.02% of the quarter's revenue, `LATE_FILING`).

### 19.6 Secondary offering
- New shares n, entered as a % of outstanding.
- Price per share = current × 0.97 (`SECONDARY_DISCOUNT`).
- Gross proceeds = n × price. Underwriting fee = the investment bank's fee %, default 4.55%. Capital raised = gross − fee.
- Price impact: −2% to −5%, scaled by size up to the 25% cap per offering.

### 19.6a Share buyback
- A listed lab buys n shares back from the public (entered as a % of outstanding, up to `BUYBACK.maxPct` 10%) and retires them.
- Price per share = current × 1.02 (`BUYBACK.premium`). Broker's fee = 1% of the gross (`BUYBACK.fee`). Cost = gross + fee.
- **Books:** cash −cost (financing) and retained earnings −cost, like a dividend, so the balance identity holds. Shares outstanding and the public holder each fall by n; the founder's stake rises.
- **Limits:**
  - one programme per 13 weeks (`gapWeeks`)
  - the public keeps at least 10% of the lab (`minFloat`): n ≤ (public − 0.10 × outstanding) / 0.90
  - at least `RUNWAY.gateMonths` (12) months of runway must remain once the cost leaves cash (§15)
- Price impact: +1% to +4%, scaled by size up to the 10% cap. The weekly price then follows its target as usual.

### 19.7 Trading
- Two accounts: company (Investment floor or portfolio) and personal.
- Commission 0.1% (`COMMISSION`).
- Track position, average cost and gain/loss.

### 19.8 Rival lab M&A
- **Reference price and fair value:** `premium = P_offer / price − 1`. A listed rival's price is its market price; a private rival's is its **fair value per share** = max(book value per share, ARR × multiple ÷ shares) with the §19.2 multiple from its own revenue growth (`multipleFor`, model lead 0 here); a distressed network's is its asking price. Listed rivals' market prices follow the same fair value (with their model lead) × sentiment (§19.5, `src/sim/marketRivals.ts`).
- **Acceptance:** `accept = sigmoid((premium − req)/0.06)`.
  - `req` = 0.30 for healthy targets, 0.15 for targets whose runway tier is Watch or worse (§18.5), −0.20 for distressed sales.
  - Rejected offers can be raised once per 2 weeks (`MERGERS.retryWeeks`).
- **Regulator check:** at least `RUNWAY.gateMonths` (12) months of runway once the cash part of the price leaves corporate cash, at today's burn (§15), AND your share in every affected city ≤ 50% (`maxCityShare`, see Closing details). A Lobbying "Fast-track a merger review" win relaxes the share limit to 65% (`fastTrackShare`) for one deal. A **distressed sale** skips the share test (`distressedShareExempt`): the regulator wants the failed lab rescued, and the offer sheet says so in the share row.
- **Payment:** cash, or once listed, a share-for-share mix: the offer sheet picks 0%, 25%, 50%, 75% or 100% paid in new shares (`SHARE_DEALS.stockStep`).
  - **Share part:** S = stockPct × price × shares bought. New shares = S ÷ your share price on closing day, issued to the public; your own holding of the target is paid in the same mix, so its share part becomes founder shares.
  - **Board:** the target weighs `boardPrice = P_offer × (1 − stockPct × 0.05)` (`boardDiscount`), so an all-share offer needs about 5% more on the price to land the same premium.
  - **Books:** paid-in capital +S; goodwill = C + S + V − net assets. Paying in shares spends less cash, so it eases the runway test.
  - **Limits:** one deal may issue at most 50% new shares (`maxNewSharePct`). The issue moves your price −2% to −6% by size up to that cap (`SHARE_DEALS.impact`).
- **On close:**
  - Offices convert over 8 weeks: REBRAND_COST ($60,000) per office unit (spread evenly over the 8 weeks), staff morale −10, managers kept.
- **Closing details:** the target brings cash R = max(0, K − X − LD), where K is its corporate cash (§18.5), X the corporate debt you owe it (settled) and LD the lease deposits on its lots (which move to you). Net assets = R + LD + X. Goodwill = cash paid + new shares + your company's holding of it at market − net assets (a negative difference is a bargain gain). Personal holdings are paid out at the offer price. Acquired fit-outs aren't booked as fixed assets. An acquired office brings its real customers: it starts with customers × `PRODUCTS_PER_CUSTOMER` plan seats, split by `ACQUIRED_PLAN_MIX` (Plus 60%, Team 20%, Pro 15%, Campus Plan 5%) and billed at your prices, so its customer count carries over. Build by seller strategy: premium → premium, incumbent and community → mid, disruptor → basic. City share compares your customers (plus the target's) with every active rival's customers in the city. A regulator block doesn't start the retry wait; an accepted deal that can no longer close (cash or tier) lapses.
- **Distressed ask:** ARR × a multiple rolled once at failure in `MERGERS.distressedMultiple` (0.5–0.8) ÷ shares, floored at $1 per share. Offers to a distressed lab compare with the ask.

### 19.9 Corporate debt from investment banks
Investment banks lend to you on their Debt tab (`src/sim/corporateDebt.ts`, `CORPORATE_LENDING`).
- **Lenders** (`lendersNearYou`): the investment bank offices in cities where you run an open sales office, keyed by site id. A bank in a city without your office shows its terms but won't lend.
- **Venture debt** (term loans): every `refreshWeeks` (4) weeks, `offersPerLender` (2–3) offers from each lender, on the `corporateDebt` stream.
  - amount: a share of your room, where room = `maxEquityShare` (40%) × equity − corporate debt already owed
  - rate `policy + 0.05` (`spreadWorst`) down to `+0.025` (`spreadBest`) by a score from 0 to 1: the average of runway (months ÷ `bestRunwayMonths` 24, capped at 1, and 1 with no burn) and ARR (÷ `bestArr` $50M, capped at 1); ± a little noise
  - term 52–156 weeks
  - weekly payment amortized; payments are taken even when cash is short (the insolvency rule then applies)
- **Credit line** (one per lender): limit = `lineEquityShare` (60%) × equity, live; rate `policy + lineSpread` (4%); draw or repay any week; never drawn automatically. The share was 20% when each city had about three rival lenders; a city has about one investment bank.
- These are corporate debt and flow through corporate cash.
- **Old saves:** loans and lines taken from rival labs keep accruing and can be repaid from any Debt tab ("Your debt"), but a rival line can't be drawn. Offers still held from rival labs are replaced on the next tick.

### 19.10 Currencies (FX)
A deliberately simple "country up or down" investment (DESIGN §5.12a). Your books stay in one currency.
- **State:** a strength level per country, `L[c]`, starting at 100. A currency's rate against your home currency is `fx[c] = L[c] / L[home] × 100`, so your home currency always reads 100 and can't be bought.
- **Weekly move** (tick step 19, after listed prices), per country:
  - `r_c = FX.growthW × gdp_c/100/52 + FX.rateW × policy_c/52 + FX.phase[phase_c] + normal(0, vol_c × FX.volMult)`
  - `L[c] *= 1 + r_c`, clamped to [FX.min, FX.max] × 100.
  - So `fx[c]` moves by about `r_c − r_home`: growth and rate differentials plus the cycle gap and noise.
  - HK is pegged to the US: `L[HK] = L[US] × (1 + normal(0, FX.pegVol))`.
  - Currency volatilities are in `src/data/currencies.ts`.
- **Positions:** buy an amount of a currency as the company or personally: `units = amount / fx[c]`; value = `units × fx[c]`. Buying and selling pay FX.spread on the amount (to `commissions` for the company). No carry is paid; the rate differential is already in the drift.
- **Books:** company positions are investments at value, marked through `investmentGains` like stocks.
- **News:** a currency moving more than FX.newsMove (2%) in a week makes the Markets page.

## 20. Ventures

- **20.1 Startup state:**
  - sector, founded date, CEO
  - pentagon: Management, Product maturity, Market size, Competitiveness, Financial health
  - quarterly revenue and net income history
  - stage (Seed, A, B, C, D, Public, Acquired, Failed)
  - shares outstanding, cap table, post-money valuation, cash runway
- **20.2 Quarterly update:**
  - Growth `g ~ normal(μ_sector + 0.03 × (avg − 5), 0.12)`, applied to revenue.
  - Net margin moves toward the sector margin as Product maturity rises.
  - Each pentagon score drifts by ±1 with 30% probability.
  - **New round** when runway < 4 quarters:
    - new money = 15–30% of post-money
    - price step = 1.2–3.0× with good growth (g > 0.1), 0.5–0.9× otherwise (down round)
    - two offer lots of 15% each (as in the original), open 4 weeks
  - **Failure:** `0.03 × (1 + 0.35 × (5 − FinHealth)) × (Recession ? 1.5 : 1)` per quarter.
  - **IPO:** 25% per quarter once quarterly revenue > $50M, net income > 0 and stage ≥ C. It becomes a listed company.
  - **Acquisition:** 5% per quarter at 2–6× annual revenue.
- **20.3 Discovery:** the Investment floor refreshes every 4 weeks with `N = 1 + floor(staff/4)` (max 8) currently-raising startups. Conventions add 3–6 exclusive ones.
- **20.4 Investing:** as the company (corporate cash; the CFO keeps 12 months of runway, §17.2) or privately (personal cash).
- **20.5 Compute credits (venture debt, `VENTURE_DEBT`):**
  - Offer up to 10% of post-money at a rate you choose. Accepted if rate ≤ `policy + 0.08`.
  - Amortizes over 156 weeks.
  - On failure: LGD 0.8, booked as bad debts (§14.2).
- **20.6 Marks:** shares × the latest round price per share. Public → market price. Failed → 0. Acquired → cash.
- **20.7 Details:**
  - **Creation:** seed startups get a share price from `VENTURE_GEN.sharePrice[stage]`, a founder plus 1–2 funds on the cap table, 4 quarters of revenue history at post-money ÷ the sector P/S multiple (`src/data/startups.ts`), cash for 2–10 quarters of burn and a funding history (last round 12% of post-money, each earlier one 40% of the next). The generator keeps the pipeline supplied from the name and blurb pools.
  - **Rounds:** the new shares are offered as two equal lots (a 30% round gives the original's two 15% lots). The round price becomes the mark when the round opens; shares are issued as lots are taken; unsold lots go to a fund at close. Generated startups open their first round at their current valuation.
  - **Margin:** target = sector margin − `VENTURE_MARGIN.gap` × max(0, 8 − Product maturity) / 8; each quarter closes 25% of the gap. A startup whose cash goes negative fails.
  - **IPO:** lists at the last round price × U(1.0, 1.5) (`VENTURE_IPO`) with vol 0.45, growth min(4μ, 20%) and no dividend; your stakes move into market holdings at cost, and the listing pop is marked through `investmentGains`.
  - **Investing** as the company (lots and compute credits) is refused at the Restricted and Critical tiers, like acquisitions. A startup you hold or lend to stays visible wherever you are.
  - **Housekeeping:** convention exclusives you never backed leave at year end; finished startups you didn't hold keep only the last 12; held ones stay.
- **20.8 Conventions:** this year's and next year's runs are kept (`state.conventions.runs`), from the CONTENT §19 calendar. CONVENTIONS.announceWeeks (4) before opening a run is announced (Ledger story) and 3–6 exclusive startups appear with rounds open through the event; it is open for CONVENTIONS.activeWeeks (4), a month each way so a player reading monthly results never misses one. Its startups are visible and buyable only from that city's convention centre while it is open, and never enter the Investment floor pipeline. The convention centre's map pin shows only from announcement to close.

## 21. Real estate

- **21.1 Listings** (per city, refreshed every 4 weeks):
  - size m², district, market rent per m² per year (district × city.rentIndex), occupancy
  - estimated value = `size × marketRent × 3.2 × cre/100`
  - asking price = estimate × U(0.95, 1.10)
  - Offers below asking: acceptance = `clamp((offer/asking − 0.85)/0.15, 0, 1)`.
- **21.2 Owned property:**
  - **Market rent follows the cycle:** a building's base rent is `district × city.rentIndex` (§21.1) and today's market rent is `base × cre/100`. An owned building's `marketRent` eases toward today's by `REAL_ESTATE.rentEma` (0.05) a week (half-life about 14 weeks), so values move with the cycle at once and rents follow months later; a newly bought building starts at today's market rent. The owner's rent is clamped into its 50–160% range of the new market each week.
  - `occTarget = clamp(0.97 − 1.6 × (rent/(marketRent × (1 + pricingPower)) − 1), 0.30, 0.98)` and `occ = ema(occ, occTarget, 0.06)`. `pricingPower` is `EXEC_DELEGATION.rentPricingPower (0.10) × the CFO's expertise/100` while the CFO's Rents switch covers the building's owner (§17.2), else 0.
  - `bestRentRatio = 1 − (0.98 − 0.97)/1.6 = 0.99375`: the highest rent/market that still fills the building; `bestRent = floor(marketRent × (1 + pricingPower) × 0.99375 / 5) × 5`, inside the rent range. This is what the CFO sets at the 100% occupancy dial.
  - **Occupancy dial:** for a stop `t` below 0.98, `rentForOccupancy = floor(marketRent × (1 + pricingPower) × (1 + (0.97 − t)/1.6) / 5) × 5`, inside the rent range, so occupancy settles at `t` (a hair above after rounding). Lower stops charge more per m² but earn less in total: at 90% about +5% rent per m² but about 4% less rent revenue than at 100% (80%: +11% per m², about 9% less), and more again after vacancy cost. The dial's tagline shows that against 100%.
  - weekly revenue = `size × rent × occ / 52`
  - maintenance = `size × marketRent × 0.55 / 52` (fixed)
  - vacancy cost = `size × (1 − occ) × 2 / 52`
  - net = revenue − maintenance − vacancy
  - ROI = annualized net / purchase price
  - Value tracks `cre`: `size × baseRent × 3.2 × cre/100`, i.e. size × today's market rent × 3.2, whatever the building's own `marketRent` has caught up to.
  - **For Sale** toggle: sells within 2–8 weeks at value × normal(1, 0.04).
  - Reference: the original showed about 8.7% ROI at 85% occupancy.
- **21.3 REO:** Retired: foreclosed homes came from defaulted mortgages, which an AI lab doesn't hold.
- **21.4 Ownership:** choose Company or Private at purchase. Private property counts in personal wealth only.
- **21.5 Details:**
  - Each city has REAL_ESTATE.buildingsPerCity property buildings (S 6, M 9, L 12, XL 15), sized by city (`sqmRangeBySize`: S 1,500–5,000 m², M 2,000–7,000, L 3,000–12,000, XL 4,000–16,000) so the big cities hold the high-value towers; a building outside the financial, downtown and waterfront districts stays under `lowRiseMaxSqm` (5,000 m²). Every 4 weeks `max(1, round(0.4 × unowned))` are listed; listings not picked again disappear. An unowned building's occupancy is drawn once from U(0.75, 0.95). Estimates follow cre weekly; asking prices stay fixed.
  - **Offers** are answered at once. A rejected offer locks that listing until the city's next refresh. The offer stepper runs from 80% of asking up to asking.
  - **Books:** a company purchase pays investing cash and enters the balance sheet at the estimate; paying more or less than the estimate is posted to `propertyGains` (non-cash), as are weekly revaluations with cre. Rent → `rentalIncome`; maintenance and vacancy → `propertyCosts`. Company purchases are refused at the Restricted and Critical tiers.
  - Rent can be set from 50% to 160% of market rent in steps of 5 per m². Turning For Sale off cancels a pending sale. A sold building returns to the listable pool.
  - Deals of $10M or more make the paper.
- **21.6 Lobbying** (DESIGN §5.8.10, `src/data/lobbying.ts`, `LOBBYING`):
  - Campaigns (ids unchanged from the bank game):
    - **Ease the AI safety rules** (`easeBuffer`; $2.5M, 55% success, 12% exposure): the buffer in that country drops 1pp for 52 weeks, so every safety tier line drops 5 points (`SAFETY.bufferPerPp`, §15).
    - **Fast-track a merger review** ($1.5M, 60%, 10%): the next deal that closes may reach 65% of a city's market (MERGERS.fastTrackShare).
    - **Stall the AI safety bill** (`stallBuffer`; $1.2M, 50%, 15%): only while an AI safety buffer bill is pending there. A win makes it fail its vote.
    - **Grant campaigns** (`computeSubsidy`, `dcPermits`, `fairUse`, `rdCredit`, `chipRelief`; fees, odds and grants in CONTENT §16): a win pays the lab a one-off grant, booked as a refund on the lobbying line (`spend('lobbying', -grant)`), so the year's lobbying cost nets down. No other effect.
  - The fee is paid at the start (`lobbying`, opex); the outcome arrives in 4–8 weeks (a stall no later than the vote). One pending campaign per type; a fast-track can't be bought while one is unused.
  - Exposure is rolled win or lose: a fine of 50% of the fee and −0.03 brand awareness in your cities in that country, plus a Ledger exposé.

## 22. Personal

- **Personal cash:**
  - Starts at $150,000.
  - Weekly in: CEO salary/52, personal dividends, personal rents.
  - Weekly out: upkeep — homes 1%/yr, cars 2%/yr, jet 8%/yr, collectible insurance 0.2%/yr.
  - Plus or minus trades.
  - No personal tax (PERSONAL_TAX = 0, a balance key).
- **CEO salary:** starts at $120,000 and is changed by board vote.
- **Founder shares:** 10,000,000 at the start, 100% of the lab. Value = shares × price (or the private valuation).
- **Asset values:**
  - homes track their region's hpi. **Rebuild** (the option exists in the original; effects assumed): costs 25% of value, takes 8 weeks, then value +20%
  - cars lose 12% a year, except classics, which gain 3%
  - genuine collectibles drift +3%/yr with σ 8% applied yearly
  - the jet loses 6% a year
  - a franchise grows with league revenue
- **Net worth** = personal cash + stocks at market + real estate + other assets.
- **Travel allowance:** TRAVEL_KM_PER_WEEK = 24,140 km, reset each weekly tick (step 18). Distances are great-circle km on CONTENT §2 coordinates (Earth radius 6,371 km), rounded to whole km. A flight within the remaining km is free and uses that distance. A longer flight is never refused: it costs FLIGHT_FARE × the destination's costIndex (FLIGHT_FARE = 80,000) from personal cash and leaves the allowance untouched; any part personal cash can't cover is paid by the lab (P&L `travel`, opex). Jet flights are free within the jet's range (Corvid 600: 6,000 km; Albatross 8000: global); longer hops use the normal rules. The jet's upkeep (8%/yr of value) comes from personal cash weekly; it loses 6% a year and resells at value × (1 − JET.resaleHaircut 0.10).
- **First visit:** the destination is generated on arrival (lots `citygen:{city}`, rivals `rivals:{city}` for every city but the start city, buildings `sites…:{city}`, businesses `businesses:{city}`), then gets its first property listings.
- **Insider trading:** a personal trade in your own lab's shares within 2 weeks before a quarter-end has a 15% chance per trade of an investigation. Outcome: fine of max(3× the gain, $250k), overall rating −0.1 for 8 weeks, news.
- **Auctions:**
  - Each house holds a monthly auction of 3–5 lots, each with an estimate.
  - **Bidding:** the player sets a max bid. Clearing price = estimate × lognormal(1, 0.25). You win if max bid ≥ clearing and pay clearing + 12% buyer's premium.
  - **Counterfeits:** authenticity is hidden. Fake odds by house: 4% / 8% / 6%.
  - **Appraise:** fee 1% of purchase price, takes 1 week, reveals the truth. A fake is worth $0 and can't be consigned.
  - **Consigning** a genuine item: hammer price = value × lognormal(1, 0.15), minus a 10% seller fee.
- **Rich list:** a generated list of 50 fixed fortunes drawn log-uniform between $150M and $2B (`RICH_LIST.fortune`), each growing with the home country's nominal index (§4.6; `richList.nominalRef` remembers the level at the last ranking) times its own real growth of −2% to +5% a year (`RICH_LIST.growth`). Yearly rank event. A founder typically enters the list in years 8–12 and needs a long, strong game to top it.

## 23. Incidents

- Each incident type has a weekly base probability, a scope (sales office, city, company or personal), conditions, multipliers, a cooldown (default 8 weeks per scope) and 2–3 options with costs and effects.
- Full list in CONTENT (Incidents). Lab-wide cases that matter here: Outage rumour (§13.8), Mandated pause and Safety audit (§15), Price war (§18.6), Capability over-claim (`MIS_SELLING`, more likely at a Bold or Very bold launch posture, §16.8).
- **Office incidents:** auto-resolved when "Office troubles" is delegated (§17.1), with a toast. Otherwise they queue and pause the game.
- Unresolved incidents choose the worst option after 4 weeks.
- **AI-native cases (2026-10-27, CONTENT §22):** a viral jailbreak (p × (1.3 − model Safety axis/10)) and a hallucination lawsuit (p × (1.3 − Reasoning axis/10); the settlement is 1% of company ARR) need customers; a training-data copyright suit and a leak of the model weights need a trained model (the leak's odds fall with Platform & Security coverage′ and CTO expertise like the data breach; the suit's win odds are 25% + 35% × CSO expertise/100 + 30% × Safety coverage′). Deepfake misuse is an office case for offices selling the Creative Suite; pulling the plan puts a `pulled` effect on the office for 8 weeks (no sign-ups, nothing billed for it). A data-centre fire and a grid failure are company rolls whose chance is the base p × the number of exposed data centers (every open one for a fire; those at an energy site for the grid); the fire's `gpuDerate` effect takes 30% of that hall's GPUs out for 12 weeks (`runningGpus`, which the compute pool and the power bill read), and an unbacked grid failure sets `compute.outageWeeksLeft` to 1 so the §13.0 outage churn and §11.2 contract losses run for a week. Cases with several texts pick one from the `incidents` stream when raised.
- **Milestones (DESIGN §5.18, CONTENT §19b):** checked after incidents each week from the state alone (so an old save catches up on load). The compute-independence goal reads `compute.ownedStreak`, kept by the weekly tally: weeks in a row with owned GPUs ≥ demand and demand > 0, reset to 0 otherwise.

## 24. News (The Weekly Inference)

- **Each week**, compose 6–14 articles from `events.log`, macro state and the world desks below, by priority (the World desk keeps `NEWS_WORLD.minPerIssue` (2) stories first, however busy the week):
  1. your company's events
  2. central bank decisions in countries where you operate, then elsewhere
  3. rival actions in your cities
  4. earnings and dividends of listed companies
  5. conventions and auctions
  6. sports
  7. filler: housing, politics, rankings
- **Templates:** each event type has 2–4 headline/body templates (CONTENT). Fill numbers from the event payload. Never repeat the same template for the same subject in consecutive weeks.
- **Tabs filter by category:** Top = the 6 highest priority; World; AI (code id `banking`); Business; Markets; Politics; Sports.
- **Your routine stories are rationed.** The weekly figures print when the week is news (a loss, a swing back to profit, a record at least `NEWS_RECORD_MARGIN` (10%) above every earlier week once `NEWS_RECORD_MIN_WEEKS` (12) have passed) or every `NEWS_ROUTINE_EVERY_WEEKS` (4) weeks; a Watch-tier safety note on a change of tier or every 4 weeks (Restricted and Critical every week). Weekly figures, the contract tally, the Watch note and the price watch share the `youRoutine` cap of 2 per issue; auctions are capped at 1.
- **Rankings:** at year end, the Fastest Growing ranking (Business tab) names the labs with the biggest asset growth over the year (`RANKING_SIZE`, `RANKING_MIN_ASSETS`).
- **24.1 World desk.** `NEWS_WORLD.perIssue` (4) stories a week from around the ten countries, none about your lab (World tab). Each slot picks the home country with `homeShare` (25%), else one abroad, then one of 61 beats (`src/data/newsWorldBeats.ts` and `newsWorldBeatsMore.ts`: weather and nature, science and building, work and prices, everyday life, crime and courts, travel and food, culture and odd news) that fits the country: its phase (strikes in a slowdown or recession, layoffs and gloom in a recession, hiring in an expansion with unemployment ≤ `lowUnemployment` 4.5%, new plants and transit lines in an expansion or recovery), inflation ≥ `highInflation` (3.5%) for price stories, house prices over a year (> `housingHot` 4% for rents, falling for building slowdowns), the month (southern seasons flipped for Australia) and its climate (typhoons in Hong Kong and Japan, monsoon in Singapore, bushfires in Australia). One beat per issue; a beat rests `cooldownWeeks` (26) in a country. Flavour only: nothing changes in the simulation. Priority 40 at home, 36 abroad; group cap 4.
- **24.2 Company desk.** A listed company whose share price moved at least max(`moverMin` 6%, `moverSigma` 2.2 × its weekly volatility, vol ÷ √52) this week gets a Markets story quoting its real closing price, with a reason that fits its sector and direction (cap 2, priority 44 + |move| ÷ 2, at most +10). With `corporateChance` (35%) an issue also carries corporate news from a non-lab listed company: a new chief executive, a product launch or a new site. The reasons explain a move the market model already made; nothing here moves a price.
- **24.3 Money Column.** Every `NEWS_COLUMN.everyWeeks` (2) weeks, a personal-finance column for the home country (Business tab, priority 32). Topic: a rate move within `rateWindowWeeks` (13), inflation ≥ 3.5%, house prices up over 4%, or a slowdown/recession; one is picked at random when several apply; otherwise an evergreen tip. It quotes the real policy rate, inflation, house-price change and unemployment.
- **24.4 Commodities.** Oil, gold, wheat, coffee and copper (`src/data/commodities.ts`) move every week on their own `commodities` stream: log step = noise (each commodity's weekly vol) + `driftPerWeek` (0.4%) × its lean (gold −1, the rest +1) × the world mood (average over countries of expansion 1, recovery 0.5, slowdown −0.5, recession −1) + `revert` (3%) × (ln(base × average nominal index) − ln price). A week of at least `newsMove` (8%) is a story with a reason; otherwise a one-year high or low is, if the last `recordGapWeeks` (8) had none; the first issue of each month carries a wrap of all five with their four-week change (priority 37). Prices over $1,000 print with separators and no cents. Flavour only.
- **24.5 From the archive.** Every `NEWS_ARCHIVE.everyWeeks` (4) weeks the issue's lead story is kept for good (`desk.archive`), skipping routine figures, columns, wraps, rate decisions, economy and market reports, results and dividends. On those weeks the paper reprints the story from 10, 5, 3, 2 or 1 years earlier, the furthest first that hasn't been reprinted; one-year-old stories only every `oneYearEvery` (2) archive weeks so others age further. A story is flagged once its reprint makes the issue, so each runs again at most once. Priority 31, in the original story's tab.
- **24.6 World calendar.** Fixtures (`src/data/worldCalendar.ts`) fire on their week of the year. The **Nations Cup** (years ≡ 2 mod 4, week 25) and **World Games** (years ≡ 0 mod 4, week 30) are announced 4 weeks ahead in a random game city; the whole event is played at once from the `news` stream and stored as a script of weekly stories (`desk.scheduled`). Cup: two groups of five, round robin, top two to the semi-finals; goals per side ~ Poisson(1.3 + 1.5 × strength gap, ≥ 0.2), host +0.1 strength, level knockout games go to penalties (0.5 + 0.5 × gap). Games: golds, silvers and bronzes per nation ~ Poisson(3 + 30 × strength, host +8). Stories: announcement, opening (or opening ceremony), groups (or halfway leader), semi-finals, final (or closing table). The **World Expo** (years ≡ 0 mod 5, week 18) opens and closes 26 weeks later. Every year: film awards (week 10), New Year fireworks (week 1), a science prize (week 41) and the Grand Sale Weekend (week 47; a record in an expansion or recovery at home, quiet otherwise). Priority 46 (finals and closing days 52, annual 38), cap 2 per issue. Flavour only.
- **Sports abroad:** each week one league from a country you don't operate in takes its turn in the Sports tab (priority 22, cap 1), and every league's season finish reports at year end (yours rank higher).
- **Archive:** keep the last 52 issues.
- **Politics:** fictional, neutral parties. Policy proposals (price caps, AI safety buffers) can become regulatory events, e.g. a passed AI safety buffer (`CAPITAL_BUFFER_PP` +1 for `CAPITAL_BUFFER_WEEKS` 52: every safety tier line +5 points, every credit tier line +1 point) in that country. Bills and votes draw from their own `politics` stream, so news changes never change which laws pass.
- **Polls and elections:** every `NEWS_POLL_EVERY_WEEKS` (6) weeks every country's poll drifts (σ 1.2 points, floor 8%) and renormalises; the home poll makes a story. Every country votes every `NEWS_ELECTIONS.termWeeks` (208), the first votes staggered `staggerWeeks` (21) apart by country. The campaign is announced `campaignWeeks` (6) ahead with the latest poll; on the day the poll leader wins with `leaderWinP` (70%), otherwise the runner-up, and the winner gains `winnerBounce` (8) poll points. Priority 60 where you operate, 42 elsewhere; cap 2. Who governs is flavour only.

## 25. Balance targets

Run `npm run balance` with seed 42 and the start city Calgary, unless noted. Office checkpoints read the steady strategy's home office, built on an "average lot" (the median-rent free lot in Midtown). Weekly revenue and income checkpoints use a 4-week average.

**Cross-seed rule.** The first-office checkpoints describe a typical city, so they are judged on the median of 20 cities: `npm run balance -- --years 5 --seeds 1-20` runs steady once per seed, prints each seed's key numbers and checks every band against the median (`scripts/branchCheckpoints.ts`). One city's "average lot" can sit 30–40% above or below the median, which is the map doing its job, not drift. A single-seed run still prints its own checks for reference.

**Money.** Every money band is in start-of-game money. `npm run balance` deflates the checkpoints and the year-10 ARR band by the home country's nominal index (§4.6), prints the index in its yearly table, and labels the ARR check "(real)".

| Checkpoint | Target | Checked by |
|---|---|---|
| First office build + lease deposit (mid build, average lot) | $300k–$450k out of the $1.5M seed | branchCheckpoints |
| First office weekly income turns positive | week 6–16 | branchCheckpoints |
| Office at week 26 | ARR $1.5–5M; income positive | branchCheckpoints |
| Office at week 52 | ARR $3–8M; customers 3,500–9,000; income +$24k–$60k/week | branchCheckpoints |
| Growing home office | week 104: ARR $8–20M, revenue $160–380k/week, income $55–140k/week; week 156: $12–28M, $250–520k, $85–230k; week 208: $16–36M, $320–700k, $110–340k; week 260: $16–38M, $320–720k, $110–360k | branchCheckpoints |
| Payback of a mid build on an average lot | ≤ 44 weeks from opening | branchCheckpoints |
| Year 2 (steady) | 1–4 sales offices; HQ required; cash never < 0 | strategyTargets, balance |
| IPO (steady) | listed in years 3–6 | balance |
| Year 10 (steady) | offices in 10–25 cities; company ARR $0.5–5B (real) | strategyTargets |
| Year 15 (steady) | weekly revenue $20–80M; founder net worth $2–40B | not checked (a design aim) |
| ROE | 8–18% in Expansion | printed, not checked |
| Turtle (no Enterprise contracts) | profitable by year 5, but < 40% of steady's year-5 equity | strategyTargets |
| Aggressive (launch posture 5, cheapest prices) | more ARR than steady at year 3; its fast growth strains Safety into the Watch tier or worse at some point | strategyTargets |
| Recession stress (forced at year 3) | steady never reaches Critical; aggressive reaches Watch or worse and its cash never goes below 0 | strategyTargets |
| Every run | corporate cash never < 0; balance identity gap < $1 | balance |

**History.** The bank-era targets (deposits, loans, net interest margin, loan losses, loan-to-deposit, branch counts and total assets) were set in Stages 1–10 and re-cut for one office per city in C2a–C2c; they were replaced by the ARR and safety targets above in C3a–C8d. The full trail is in git history and `docs/archive/CONVERSION_PLAN.md`.

**Note (C3a, the AI product catalog):** offices sell Plans, API usage and Apps & Services (§10.7), so the office checkpoints measure ARR and year 10 measures company ARR. The ARR bands were set from the 20-city median (week 26 $1.6M; week 52 $3.7M / 5,028 customers / $28k income; week 104 $10.8M / $207k / $86k; week 156 $17.7M / $343k / $158k; week 208 $20.8M / $405k / $196k; week 260 $23.8M / $453k / $233k). Payback moved to ≤ 44 weeks: a subscription office earns nothing until its seats build up, so the median reads about 41.5 weeks. Seed 42 is a weak city (week 52 ARR $3.0M, payback 46 weeks) and reads about $1.0B ARR in year 10.

**Note (C4a–C5a, compute and businesses):** offices follow the chip cycle's price index and are charged spot for every GPU-week, with the saving booked at company level, so the median week-52 income floor is $24k. Steady and aggressive reserve GPU lots once demand passes 60% of the spot limit (`scripts/strategies/compute.ts`); with them, seed 42 never hits a crunch. With the GPU market emptied every week the same strategies hit the 20,000-GPU spot ceiling in year 4 and run in crunch and outage for most of the rest of the game, which is the C4 acceptance. Businesses take about half of each district's free storefronts; aggressive now keeps 3 weeks of running costs before it expands or grows an office, so its cash stays above zero.

**Note (C7, safety):** the recession-tier checks read n/a from C3a until C7a brought the safety ratio; C7b moved valuation to a revenue multiple and the IPO bar to ARR ≥ $100M.

**Note (C8d, balance pass):** the two recession-tier checks are in safety-tier terms. A recession reaches a lab through its cash and its customers, not through bank capital, and the safety ratio doesn't move with the economy. So aggressive must reach Watch or worse at some point in its run (growth outpaces its Safety floor), and in the forced recession stress-aggressive must reach Watch or worse and keep cash at or above $0. Listed rivals price on revenue (§19.2). Seeds 42 and 7: every target met for steady, turtle, aggressive and stress. The 20-city median passes every first-office checkpoint. Seed 42 steady's week-52 income ($23.3k) sits just under its band on its own.

**Note (C8f, seed money):** the seed round is $1.5M, all spendable, where the bank started with $900k plus $2M locked in reserves. The extra spendable cash builds the first office sooner and fuller, so the week-26 ARR band is $1.5–5M, week-52 ARR $3–8M and week-52 customers 3,500–9,000. The head start lasts (about 20% more income), so the growing office's income ceilings are $230k (week 156), $340k (week 208) and $360k (week 260). The launch posture now trades deal odds for safety exposure (§16.8). The "Watch or worse" checks count Restricted and Critical too (a fix in `strategyTargets.ts`, which had the tier order backwards). Seeds 42 and 7 pass every strategy; the 20-city median passes every first-office checkpoint.

**Note (rival books on ARR, 2026-10-27):** rival labs now keep books on customers, ARR, cash and runway (§18.1, §18.5) instead of deposits, loans and a capital ratio. The player's checkpoints above are unchanged by it (seed 42 steady passes every one). The rivals' own aggregate was re-based rather than matched: on the old books 34 of 53 rivals failed in ten years of seed 42 steady, almost all with an income of −$30M to −$90M a year on networks of 5–9 units, which came from the price-war cut (a 20% plan-price cut, §18.6) being applied as a 20-point cut to their net interest margin. On the new books the cut reaches ARR as a 20% price cut, so in the same run 0 of 43 fail, 19 offices shrink and 7 close, 11 new labs are founded (21 before), 5 offices grow and 15 open (7 and 21 before), no rival-to-rival deal closes in that run (one at $11M before; they close at fair value plus a premium when a buyer has the cash), and the rivals' combined ARR at year 10 is $1.9B against your $2.3B (their revenue was $0.4B before). Failures still happen under a forced recession and when a lab's cash runs out (tests in `tests/sim/rivalBooks.test.ts`). No target in the table above describes rivals; this note is the reference for the next pass.

**Strategies** (`scripts/strategies/*.ts`):
- `idle`: one sales office, no further actions.
- `steady`: follows default prices; staffs HQ floors to 100%; takes up to 2 placements when runway is under 7 months and cash is short (`manageEquity`); grows the busiest office a size, or else opens an office in the next city, when cash > 2× the cost, runway is over 6 months (or the lab isn't burning cash) and 2 weeks of running costs stay in reserve; builds a data center at 4× its cost from year 5; reserves GPU lots; trains at 1% of cash a week.
- `turtle`: declines new RFPs and turns Enterprise contracts off; grows its one office to Standard at most, and only after a profitable quarter with 26 weeks of running costs in hand. It never lists, but once runway falls out of Comfortable (under 12 months) it sells a private placement of half the largest size, as a CFO's Share sales switch would.
- `aggressive`: launch posture 5 (Very bold); default prices with rate offsets (which touch only the Enterprise contracts' list rate); expands at 1.2× the cost with over 3 months of runway (grows offices down to 2) and 3 weeks of costs in reserve; a data center at 3× its cost; trains at 1.5% of cash.
- `stress`: steady plus `forceRecessionAtWeek = 156` (and aggressive under the same recession).
- `nohq`: steady without HQ floors, for comparison.

**Output:** a yearly table (year, offices, ARR, loans, equity, safety ratio, gross margin, loss, ROE, cash, safety tier, policy rate and phase, HQ staff, minimum HQ coverage, nominal index) plus a warning list for every out-of-range target.

## 26. Parameter index (`balance.ts`)

The main groups, with the defaults shown above. Names marked (legacy) belong to bank machinery that still runs but no longer shapes play.

- **TIME:** `DAY_MS = 1000`, `SPEEDS = [0, 1, 2, 4]`, `DAYS_PER_WEEK`, `WEEKS_PER_YEAR`, `QUARTERS_PER_YEAR`, `START_DATE = '2027-01-04'`
- **START:**
  - `START_CASH = 1_500_000` (seed money, all spendable), `START_CASH_OPTIONS = [1_000_000, 1_500_000, 2_000_000, 2_500_000]`, `START_SHARES = 10_000_000`, `START_PERSONAL_CASH = 150_000`, `START_CEO_SALARY = 120_000`, `DEV_PAYMENT = 10_000_000` (Settings developer tools), `COMPETITORS = { min: 1, max: 5 }`
  - `DIFFICULTY` per level: `demandMult` on prospects (§9.2), `rivalQuality` coins added at rival seeding (§18.3), `rivalRateEdge` on rival rate prices (§18.2). Its `lossMult` column is no longer read.

    | Level | demandMult | rivalQuality | rivalRateEdge |
    |---|---|---|---|
    | Easy | 1.15 | −0.3 | −0.10pp |
    | Normal | 1 | 0 | 0 |
    | Hard | 0.92 | +0.2 | +0.10pp |
    | Expert | 0.85 | +0.4 | +0.20pp |
  - **Competitors:** a city takes the first n rivals in strategy order. Its starting rival office total (CONTENT §15) scales by n ÷ the city's usual count, with at least one each.
- **MACRO:** `MACRO_TRANSITIONS`, `MACRO_TARGETS`, `MACRO_EMA`, `MACRO_SIGMA`, `MACRO_MIN_PHASE_WEEKS`, `POLICY_*` (rule weights, steps, `POLICY_FLOOR`, `POLICY_CAP`), `CREDIT_CYCLE`, `LOAN_DEMAND`, `NOMINAL_INDEX`, `EQUITY_MARKET_DRIFT`, `MARKET_SHOCK_SIGMA`
- **PRICES:** `RIVAL_PRICE_DRIFT`, `FEE_COMP_MIN`, `FEE_COMP_SCALE`, `FEE_STEP_MIN`, `FEE_PF_SCALE`, `PRICE_FACTOR_CLAMP`; (legacy) `DEPOSIT_BETA_UP`, `DEPOSIT_BETA_DOWN`, `LOAN_PASS_THROUGH`, `CARD_REPRICE_GAP`, `PF_RATE_STEP`
- **STAFF:** `BASE_TELLER_WAGE`, `HOURS_PER_WEEK`, `MANAGER_BASE_SALARY`, `QUIT_BASE`, `HIRE_BASE`, `SERVICE_VISIT_RATE`, `MORALE`, `SKILL`, `CANDIDATE_REROLL`, `MANAGER_PAY`
- **MARKETING:** `START_AWARENESS`, `GRAND_OPENING_BONUS`, `AWARENESS_DECAY`, `BRAND_DECAY`, `BRAND_PASSIVE_PER_BRANCH`
- **RATINGS:** `RATING_EMA`, `PRODUCTS_RATING`, `SERVICE_RATING`, `BRANCH_RATING_WEIGHTS`, `NO_ATM_QUALITY`, `UPKEEP_PENALTY`, `OVERALL_WEIGHTS`, `REVIEW_RATE`
- **DEMAND:** `PROSPECT_RATE`, `CATCHMENT_MULT`, `SATURATION_EXP`, `SHARE_EXP`, `CITY_MARKET`, `CITY_SATURATION_EXP`, `CITY_BRANCH_GUIDE`, `OFFICE_SIZES`, `OFFICE_TRAFFIC_MULT`, `TAKEUP_CAP`, `STARS_TAKEUP`, `PRODUCTS_PER_CUSTOMER`, `OVERALL_CHURN`, `INTEREST_PERIODS`; (legacy) `RIVAL_RADIUS`, `DISTANCE_FALLOFF`, `MORTGAGE_SPECIAL`, `APPROVAL_INCLUSION`, `INTERCHANGE`
- **COMPUTE:** `COMPUTE`, `GPU_MARKET`, `SPOT`, `OUTAGE`, `DATA_CENTER`, `POWER_DEAL`
- **DEALS:** `BUSINESS`, `DEAL`, `SECTOR_DISTRICT_WEIGHT`
- **SALES OFFICE:** `EQUIP_MAINT`, `FITOUT_UPKEEP`, `BRANCH_OVERHEAD`, `ATM_FEE`, `CLOSE_RECOVERY = 0.30`, `CLOSE_RENT_WEEKS`, `LEASE_DEPOSIT_WEEKS`, `BRANCH_PNL_WEEKS`, `FITOUT_LIFE_WEEKS`, `EQUIPMENT_LIFE_WEEKS`
- **TREASURY (legacy except reserves):** `RESERVE_RATE_SPREAD`, `LIQ_MIN`, `LIQ_TARGET_DEFAULT`, `OVERNIGHT_SPREAD`, `OVERNIGHT_LIMIT`, `WINDOW_SPREAD`, `WINDOW_STIGMA`, `RATING_SPREADS`, `TREASURY_PENALTY`, `FUNDING_REFRESH_WEEKS = 2`, `FUNDING_OFFERS`, `FUNDING_SIZE`, `FUNDING_RATE_NOISE = 0.0008`
- **PARTNERSHIPS:** `PARTNER_CONTRACT_WEEKS`, `PARTNER_FEE_PER_EMPLOYEE`, `ARR_PER_EMPLOYEE`, `PARTICIPATION`, `PARTNER_HEALTH`, `PARTNER_PERKS`, `PARTNER_RUNOFF_WEEKS`, `PARTNER_RENEWAL`, `STUDENT_PARTNERSHIP`, `GRAD_PROGRAM`
- **SAFETY AND CREDIT:** `SAFETY`, `SAFETY_TIER_THRESHOLDS`, `CAPITAL_GATE`, `MANDATED_PAUSE`, `LICENCE`, `REGULATOR_REVIEW` (fail base 0.02, ethics base 1.6, fine 0.05–0.3% of trailing revenue), `FAILURE`, `CAPITAL_BUFFER_PP`, `CAPITAL_BUFFER_WEEKS`, `BANK_RUN` (`creditShare` 0.02 for service credits); runway: `RUNWAY` (tiers, `gateMonths`, the CFO's `cfoRaiseBelowMonths` and `cfoTargetMonths`); `LAUNCH_POSTURE`, `DEFAULT_LAUNCH_POSTURE`, `RISK_LOSS_WEEKS`, `DELINQUENCY`
- **RIVALS:** `RIVAL_EXPANSION`, `RIVAL_LEARNING`, `RIVAL_CHARTER`, `RIVAL_MERGERS`, `RIVAL_MARKETING`, `RIVAL_TECH`, `RIVAL_CLOSURE`, `RIVAL_FAILURE`, `RIVAL_RAISE`, `RIVAL_RUNWAY_TIERS`, `RIVAL_PAYOUT`, `PRICE_WAR`; the rival books: `RIVAL_BOOKS` (matureCustomers, ema, usagePerCustomer, cycle, computeShare, officeCost, trainingShare, cashTargetWeeks, startRunwayWeeks, strategy multipliers), `RIVAL_QUALITY_REF`, `RIVAL_RAMP_WEEKS`, `RIVAL_COMPETITION`
- **HQ:** `OFFICE_LISTINGS`, `OFFICE_RENT_PER_FLOOR`, `OFFICE_DEPOSIT_WEEKS`, `FLOOR_FITOUT`, `MAIN_OFFICES_MAX`, `DESKS_PER_FLOOR_OPTIONS = [24, 32]` (the Executive suite's 7 desks come from `src/data/departments.ts`), `FOUNDER_MODE_ASSETS = 250_000_000`, `FOUNDER_RAMP`, `DEPT_REQUIREMENTS`, `HQ_COVERAGE`, `HQ_EFFECTS`, `APP_RATING`
- **PRODUCTS AND MODELS:** `DEV_TERMS`, `DEV_*` (score, budget, `DEV_SIGMA`, `DEV_TIER`), `MODEL_QUALITY`, `BUREAU_HOSTED`, `INTERNAL_HISTORY`, `MODEL_EFFECTS`, `MODEL_DELEGATE`, `MODEL_SWITCH_WEEKS`, `TRAINING`, `RIVAL_MODEL`, `CPO_TRAINING`, `RESEARCHERS`, `DELEGATE`
- **PEOPLE:** `EXECUTIVES`, `EXEC_PAY`, `EXEC_DELEGATION`, `GUIDANCE`, `PAY_REVIEW`, `GOVERNANCE`, `BOARD_VOTE`
- **MARKETS:** `COE`, `VALUATION`, `PRIVATE_VALUATION = 0.8`, `PLACEMENT`, `IPO` (`minArr` 100M), `PUBLIC_PRICE`, `SECONDARY`, `SECONDARY_DISCOUNT = 0.03`, `BUYBACK`, `STOCK_MARKET`, `COMMISSION = 0.001`, `MERGERS`, `SHARE_DEALS`, `REBRAND_COST`, `INCIDENT_PRICE_SEVERITY`, `LATE_FILING`
- **CORPORATE DEBT:** `CORPORATE_LENDING` (`refreshWeeks` 4, `offersPerLender` [2, 3], `maxEquityShare` 0.4, `lineEquityShare` 0.6, `lineSpread` 0.04; §19.9)
- **INVESTMENTS:** `VENTURES`, `VENTURE_DEBT`, `VENTURE_MARGIN`, `VENTURE_GEN`, `VENTURE_IPO`, `VENTURE_NEWS`, `CONVENTIONS`, `REAL_ESTATE`, `LOBBYING`, `FX`, `FX_START_INDEX = 100`
- **NEWS:** `NEWS_*` (articles, priorities, world desk, company desk, commodities, archive, calendar, column, elections, polls, policy), `RANKING_SIZE`, `RANKING_MIN_ASSETS`, sports `SPORTS_*`
- **PERSONAL:** `PERSONAL_TAX = 0`, `TRAVEL_KM_PER_WEEK = 24_140`, `FLIGHT_FARE = 80_000` (× destination costIndex), `EARTH_RADIUS_KM = 6_371`, `JET = { upkeepRate: 0.08, depreciation: 0.06, resaleHaircut: 0.1 }`, `HOMES_CFG`, `CARS_CFG`, `COLLECTIBLES_CFG`, `AUCTIONS`, `FRANCHISE`, `RICH_LIST`, `INSIDER`
- **FEATURES:** flags per stage (ROADMAP)
