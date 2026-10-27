# Simulation Spec

How the economy works, step by step. Every CAPS name is a key in `src/config/balance.ts` (§26). Content values (products, equipment, cities…) are in `CONTENT.md`. Design intent is in `DESIGN.md`.

---

## 1. Conventions

- **Money:** JS number in currency units. Round only for display.
- **Rates:** decimal annual rates (0.0325 = 3.25%). Weekly accrual = annual / 52.
- **Ratings:** continuous 1.0–5.0, displayed as coins with one decimal.
- **Scales:** skills and morale 0–100; awareness 0–1.
- **Helpers:** `clamp(x, lo, hi)`, `ema(x, target, k) = x + k × (target − x)`, `pp` = percentage point (0.01).
- **Expected values:** flows use expected values plus small seeded noise (`noise(±5%)` = ×(1 + U(−0.05, 0.05))). Use Poisson only where counts are small (Loan Desk applications, incidents).
- **Balance identity:** after every weekly tick, assets = liabilities + equity (to within $1). Assert this in tests.

## 2. Clock and tick order

**Daily** (1 game day = 1 s at 1×):
- Advance the date.
- Resolve scheduled events due today: fit-out done, auction closed, dividend paid, offer expired. (Flights are instant; the flight animation is cosmetic.)
- Animate the HUD cash and date.

**Weekly** (every 7th day), in this order:
1. `macro.update` for every country (§4)
2. `rates.update`: FTP rates and market reference prices (§5)
3. `rivals.weekly` (§18)
4. For each open player branch, in order:
   1. staff (§6)
   2. capacity (§6.4)
   3. awareness (§7)
   4. ratings (§8)
   5. demand (§9)
   6. books: originate, run off, default, reprice (§10)
   7. Loan Desk (§11)
   8. branch P&L (§12)
5. `partnerships.weekly` (§13.7)
6. `treasury.weekly` (§13)
7. `hq.weekly`: floors, coverage, benefits, then developments (§16.6) and underwriting models (custom model refresh, switch countdown, §16.7)
8. Corporate items: offices, executives, brand marketing, corporate debt, M&A, real estate, REO, ventures (venture debt payments, rounds closing, the pipeline), conventions, lobbying outcomes, depreciation (§14, §20, §21)
9. `statements.close`: P&L, cash flow, balance sheet, tax (§14)
10. `capital.evaluate` and regulator tier (§15)
11. `personal.weekly` (§22), then `travel.weekly`: reset the km allowance, jet upkeep and depreciation (§22)
12. `market.weekly`: listed prices, your valuation, portfolios (§19), then currencies (§19.10)
13. **Quarter-end** (first weekly tick after Mar 31, Jun 30, Sep 30, Dec 31):
    - earnings for every listed company, rival and you
    - dividends declared, paid 3 weeks later
    - board meeting unlocks
    - ventures report and raise (§20)
    - regulator review (§15)
    - partnership reviews
    - the quarter's report sums the weeks whose last day falls in it, so when this tick lands on the quarter's first day the week just closed still counts for the old quarter
14. **Year-end** (first tick of a new year):
    - rankings: Fastest Growing Banks, Rich List
    - next year's conventions calendar
    - sports season results
    - fee products re-priced for inflation
15. `incidents.roll` (§23)
16. `news.compose` (§24)
17. Weekly results snapshot, then autosave.

**Central bank meetings:** each country meets on the fixed week-of-year list in CONTENT (Countries table). A meeting in a given week is processed inside step 1.

**Auto-pause** when any of these needs a decision: an unresolved incident, the results modal (every week, or the tick that closes a month's or quarter's last week, per the setting; a week belongs to the month its last day falls in, and the report rolls up every week of the period that just ended), the board meeting reminder (once per quarter), or Loan Desk applications expiring this week (optional setting). The clock also holds, without changing the speed setting, while any panel or sheet is open: days pass only on the map.

## 3. RNG and determinism

- Use the `sfc32` PRNG.
- Transcendental math (exp, log, non-integer powers, cos, tanh) goes through `src/sim/detmath.ts`, built from + − × ÷ and sqrt only. Engines are free to round `Math.pow` and friends differently (Node 22 and 24 already disagree), and these are bit-identical everywhere. ESLint bans the Math versions and `**` in `src/sim`.
- **Per-system streams:** each stream's seed = hash(saveSeed, streamName). Stream names include `macro`, `rivals`, `demand`, `loanDesk`, `market`, `ventures`, `incidents`, `news`, `politics` (bills and votes, split from `news` on 2026-10-26), `commodities` and `reviews` (branch review cards; both split from `news` 2026-10-26 so newspaper changes never touch them), `citygen:{cityId}`, `people` and `auctions`. Adding draws to one system then never reshuffles another, which keeps balancing stable.
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

| Factor | Formula |
|---|---|
| `creditCycle` | `max(0.8, 1 + 0.35 × (unemployment − 5.0))`, multiplies default rates (slope raised from 0.16 in Stage 5 so recessions reach the §25 loss band) |
| `loanDemand` | `clamp(1 + 0.05 × (gdp − 2) − 0.12 × (policyRate − neutralRate) × 100, 0.6, 1.3)`, with rates in decimals ×100 to get pp |
| `depositGrowth` | `1 + 0.01 × (gdp − 2)` |
| `hpiYoY` | % change of hpi over 52 weeks |
| `mortgageLgdMult` | `1 + 3 × max(0, −hpiYoY)` |
| `equityMarketDrift` | Expansion +8%/yr, Slowdown 0, Recession −15%/yr, Recovery +18%/yr (§19) |

### 4.6 The nominal index (added 2026-10-26)
Each country carries `nominal`, its price-and-wealth level: 1 at the start of a game, and every week `nominal ×= 1 + (gdp + inflation + NOMINAL_INDEX.trend) / 100 / 52` (`trend` = 4 percentage points, the one dial). In an expansion that is about 9% a year; over a cycle about 8%, so the level doubles in roughly nine years. It is read by:
- **Balances.** New-account tickets (§9.6) are × the city's country index, and every deposit and amortizing loan balance drifts up by the week's growth (`nominalWeeklyGrowth`, on top of chequing's organic growth), paired with reserves as usual; revolving targets, card spend and card annual fees are × the index, and `feeIndex` (fee product prices, yours and rivals') steps up by the same yearly rate instead of inflation alone. So a mature branch's books and fees, and the whole bank, keep growing with the economy once a city is full, and the loan-to-deposit ratio holds.
- **Pay.** `marketWage`, department market salaries, manager base salaries and executive market pay are × the index of the city they're paid in, so wages rise with incomes (delegated staffing and the COO's pay reviews follow; a manual player sees "Underpaid").
- **Rivals.** A rival branch's mature deposits (§18.1) and the build cost of a new branch are × the index.
- **The rich list** (§22) grows with the home country's index.
- **Price lists** (added 2026-10-26, the second half of the same change). Each country also carries `listIndex`, its price list: 1 at the start, and at each year end it steps to that year's `nominal`, so catalogue prices hold still through the year like a printed price list. Charged × the list of the city's country (`listPrice`, `listLevel`): branch builds and equipment (and the fixed asset recorded), equipment upkeep and branch overhead, branch campaign costs (weekly, per new account and per account), robbery vault upgrades and the apology and flood options, office floor fit-outs and office listing rents, flight fares, cars at the dealer, partnership signing and renewal fees, lobbying fees, and a rival branch's weekly running cost. Charged × the home country's list: brand campaigns, agency packages, private jets and the merger rebrand bill. At the review every rent moves by the step `nominal / listIndex`: free storefronts, your branch leases, office listings and leased offices (a lease deposit stays as paid). New storefronts and offices are generated at today's list. Not indexed: homes (they follow house prices), clubs, collectibles and startups (their own markets), percentage fees and player-set budgets. An older save starts its lists at 1 and catches up at its next year end.
The §25 checkpoints are in start-of-game money: `npm run balance` deflates them by the home country's index and prints the index in its yearly table.

## 5. Rates

- **FTP:** `FTP_short = policyRate` and `FTP_long = policyRate + termPremium`. Each product has a tenor of short or long (CONTENT Products).
- **Default prices:** each product has a default price rule, e.g. savings = `FTP_short − 1.00%` with a floor of 0.10%. Rivals and new branches start from it.
- **Market reference `m(p, city)`:** the average current price of product p across all rival branches in the city, weighted by branch count. If no rival offers p, use the default rule. Your own branches are excluded, so you can't move the market reference yourself.
- **Rival pricing (deposit beta):**
  - Rival target price = default rule + strategy offset (CONTENT Rivals).
  - When FTP moves by Δ:
    - **Deposit rates** move toward `old + β × Δ`, with β = DEPOSIT_BETA_UP (0.45) on hikes and DEPOSIT_BETA_DOWN (0.75) on cuts. They get there over 4–8 weeks (each rival picks a lag).
    - **Loan rates** move by 0.9 × Δ within 2 weeks.
  - Each rival also drifts toward its target at 2% of the gap per week, so the beta discount fades over about a year.
  - Fee products re-price yearly by the economy's nominal growth (§4.6; by inflation alone until 2026-10-26), yours and rivals' alike.
- **Credit cards** use a fixed APR that isn't FTP-linked. They re-price only on large moves (|ΔFTP| ≥ 1pp since the last change).

## 6. Branch staff, capacity, managers

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
- **Hiring:** `openPositions = targetStaff − staff`. Hires per week = `min(open, HIRE_BASE (1) + floor(2 × hrCoverage' × attraction))`, where `attraction = clamp(wage/marketWage, 0.7, 1.3) × benefitsAttraction`.

### 6.4 Capacity and waits
**Office size (stage C2a).** Each city holds one sales office of yours, grown in place: `OFFICE_SIZES` = Starter ×1, Standard ×2.5, Large ×5, Flagship ×9 (`size` 0–3 on the branch, `src/sim/branch/officeSize.ts`). The size multiplier `sizeMult` scales seats (stations, advisor offices), staff needed, ATM throughput, safe deposit boxes, rent, lease deposit, overhead, and the cost and upkeep of every interior slot; the exterior is one piece at every size. `upgradeOffice` grows an open office one size: it pays the interior parts × (new mult − old mult) plus the extra lease deposit, multiplies the weekly rent by the ratio and raises the staff target.

- `staffNeeded = round((teller.stations + lobby.advisorOffices) × sizeMult)`
- `staffing = min(1, staff / staffNeeded)`
- `C = (teller.stations × teller.productivity × staffing + atm.productivity) × sizeMult × (0.7 + 0.3 × skill/100) × (0.85 + 0.15 × morale/100) × campaignCapacity`. `C` is customer interactions per week.
- `visitRate = SERVICE_VISIT_RATE (0.03) × (1.2 − 0.1 × appRating)`. A better app means fewer branch visits.
- `L = captured + visitRate × customers` (load)
- `W = L / C` (wait index). Label it Short below 0.8, Busy from 0.8 to 1.1, and Long above 1.1.
- `served = captured × clamp((C − visitRate × customers) / captured, 0, 1)`

### 6.5 Branch managers
- **Hiring.** Hire from 3 candidates; the pool refreshes free every 4 weeks. **Paid reroll** (`rerollManagerCandidates`, drawn from the `people` stream): a recruiter deals 3 new candidates for CANDIDATE_REROLL.feeShare (7.5%; 10% before 2026-10-25) × the city's manager market pay (MANAGER_BASE_SALARY × wageIndex), rounded to $100; each further reroll before the free refresh multiplies the fee by CANDIDATE_REROLL.growth (2). The free refresh resets the count; a paid reroll doesn't move its date. The fee is posted to `managers`. Until your first manager is hired, the first candidate (the tutorial guide) is kept.
  - Skills: People, Product, Marketing and Ethics, each drawn from normal(62, 16) and clamped to 25–98 (v0.10.12: a slightly stronger pool, about one in eight scores 80+ rather than one in eleven).
  - Salary ask: `MANAGER_BASE_SALARY (72,000) × city.wageIndex × (0.7 + 0.6 × avgSkill/100)`.
- **People** lifts morale and skill (§6.2, §6.3) and the Service rating (§8).
- **Product** sets delegated pricing quality and Loan Desk estimate accuracy (§11, §17).
- **Marketing** multiplies campaign effects by `0.8 + 0.4 × marketing/100`.
- **Ethics** multiplies mis-selling, fraud and walkout incident odds by `1.6 − ethics/100` (§23).
- **No manager:** Service −0.3, morale −5, and no delegation.
- **Market pay and poaching** (2026-10-25). A manager's market pay is their hiring ask × `(1 + MANAGER_PAY.tenureGrowth (0.03) × years at the bank)`: rivals pay more for experience, so a fixed salary slowly falls behind. Each week a rival may poach each manager with probability `MANAGER_PAY.poachBase (0.0006) × (pay/market < 0.9 ? 3 : pay/market ≥ 1.1 ? 0.5 : 1)` (stream `managerPoach`). A poached manager leaves at once, every branch delegation comes back to you, and a `MANAGER_POACHED` event and toast say so; the COO's Branch operations, or the HR floor (§16.11), rehires. `MANAGER_PAY.salaryStep` (1,000) is the salary stepper's step.

## 7. Awareness and marketing

- **Branch awareness `a`.** A new branch starts at 0.20, with a grand-opening bonus of +0.15 that decays linearly over 6 weeks.
  - Weekly: `a = a × (1 − AWARENESS_DECAY (0.03)) + Σ gain_c × (1 − a) × mktMult`.
  - `mktMult = (0.8 + 0.4 × managerMarketing/100) × marketingFloorMult`, where `marketingFloorMult` is 1.0 below founder-mode thresholds and otherwise `0.5 + 0.5 × marketingCoverage'`.
- **City brand awareness `b`** (HQ brand campaigns, kit sponsorship, number of branches in the city): decays at BRAND_DECAY (0.02) with the same gain shape. Each branch in a city adds a passive gain of 0.002.
- **Effective awareness:** `e = 1 − (1 − a)(1 − b)`.
- **Campaign effects** (CONTENT Campaigns):
  - awareness gain per week
  - rating bumps (category and amount)
  - segment boosts (multipliers on segment share among new customers)
  - take-up multipliers
  - churn multipliers
  - a capacity multiplier
  - cost model: weekly fixed, per new account, or a % of fee income

## 8. Ratings

Targets are computed each week. Displayed ratings follow them with `ema(rating, target, 0.20)`.

- **Rates (Price):** for each offered product p, take its competitiveness `c_p`, clamped to [−2, +2]:

  | Product type | `c_p` |
  |---|---|
  | Deposit rate products | `(price − m)/0.005` |
  | Loan and card rate products | `(m − price)/0.005` |
  | Fee products | `(m − price)/max(0.25 × m, 1)` ($ fees) or `max(0.25 × m, 0.25pp)` (% fees) |

  Weight each product by `w_p = balanceShare_p + 0.1`.

  `Rates* = clamp(3.0 + Σ w_p c_p / Σ w_p + bumps, 1, 5)`.
- **Products:**
  - `Products* = clamp(Σ aff_p × stars_p / Σ aff_p + breadth + 0.30 × (appRating − 3) + 0.10 × (modelQuality − 5) + bumps, 1, 5)`.
  - `modelQuality` = mean of the house model's five radar values (1–10). This mirrors the original, where blend quality feeds product ratings.
  - `aff_p` = Σ over segments of `mix_s × affinity[s][p]` at this lot, counting only offered products.
  - `breadth` = +0.3 if offered products cover ≥ 80% of the lot's total affinity mass, −0.5 if they cover < 40%, otherwise 0.
- **Service:** `Service* = clamp(1.0 + 2.0 × skill/100 + 1.2 × morale/100 + 0.5 × managerPeople/100 + 0.08 × (model.speed − 5) + bumps − 1.5 × max(0, W − 1) − (no manager ? 0.3 : 0), 1, 5)`.
- **Branch (atmosphere):**
  - `Branch* = clamp(0.25 × Q_ext + 0.35 × Q_lobby + 0.15 × Q_teller + 0.10 × Q_vault + 0.15 × Q_atm + bumps − upkeepPenalty, 1, 5)`, where Q is each component's quality coins.
  - `Q_atm` = 2.0 if the branch has no ATM.
  - `upkeepPenalty` = 0.2 per 5 years of component age beyond its depreciation life. Refitting a component resets its age.
- **Overall:** `Overall* = 0.30 × Rates + 0.20 × Products + 0.30 × Service + 0.20 × Branch`.
- **Reviews:** `reviewCount += served × REVIEW_RATE (0.12)`.
- **Review cards:** keep the last 8. Each week, add 1–2 drawn from template pools (CONTENT) keyed to the strongest and weakest category and any active campaigns. Each card's coin value = round(category rating + normal(0, 0.7)), clamped to 1–5.

## 9. Demand and competition

### 9.1 Catchment
- **Office reach (stage C2a):** `traffic = median storefront traffic in the city × min(sizeMult, CITY_BRANCH_GUIDE[size]) × density × OFFICE_TRAFFIC_MULT (1.5)` (`officeTraffic`). The office draws on the whole city, not its own lot: a Starter reaches about one and a half storefronts' worth, and each size reaches more until it matches the branch network the city used to support (a Flagship in a small city reaches no more than a Large: `nextSizeAddsReach`). Prospects (§9.2) and population read this `traffic` in place of `footTraffic`.
- `population = traffic × CATCHMENT_MULT (1.0)` (tuned from 2.5 in Stage 1 so branches mature within about two years)
- `penetration = customers / population`

### 9.2 Prospects
`P = footTraffic × PROSPECT_RATE (0.040) × (0.25 + 0.75 × e) × loanDemand^0.5 × (1 − penetration)^SATURATION_EXP (2.8) × cityRoom × noise(±5%)`. (Stage 1 tuning: 0.030 → 0.040 and 2.5 → 2.8.)

**City-wide pool (added 2026-10-25):** `cityRoom = 1 − reach^CITY_SATURATION_EXP (3)`, where `reach = clamp(your customers across every branch in the city ÷ (CITY_MARKET[size] × city density), 0, 1)` and `CITY_MARKET = { S: 32,000, M: 38,000, L: 50,000, XL: 72,000 }` (`src/sim/branch/cityMarket.ts`). Without it each lot brought its own foot traffic, so profit kept rising until almost every lot in a city was yours (about 30 branches in a small city). With it, total profit levels off at about 5 branches in a small city, 7–9 in a medium one, 9–12 in a large one and 12–15 in an extra-large one, and extra branches mostly split customers with your own. A first branch alone barely feels it (reach ≈ 0.3 → room 0.97). Dense cities (CONTENT §2, `density`, Moscow 1.35) scale the pool and the guide. `CITY_BRANCH_GUIDE = { S: 5, M: 7, L: 9, XL: 12 }` is advice only: the storefront panel and the scripted strategies use it. Delegated marketing (§17.1) uses the same multiplier.

**Pacing intent:** like the original's stores, a branch should reach most of its mature size within about a year, with most of the growth in the first six months, rather than compounding for a decade. High intake plus strong saturation does that, so a mid build pays back in under ~40 weeks.

### 9.3 Share
- `A = (Overall/5)^2.2` for this branch.
- **Competitors (stage C2a):** with a city-wide reach there is no distance. Each active rival lab with branches in the city counts once, at weight 1 and `A_j` from the average overall rating of its branches there. (Before C2a: every branch within RIVAL_RADIUS, weighted `1 / (1 + d_j/6)`.)
- **Incumbent baseline:** `A0 = city.incumbentStrength` (0.25–0.45). This stands for the city's big banks not drawn on the map.
- `share = A / (A + Σ w_j A_j + A0)`

**Calibration example:**
- A 3.0★ branch with one 3.5★ rival 6 tiles away and A0 = 0.35: share ≈ 0.36.
- The same branch at 4.3★: share ≈ 0.55.

### 9.4 Capture and service
- `captured = P × share`
- `served` comes from §6.4. Turned-away prospects are logged (they hurt Service through W).

### 9.5 New customers by segment
`n_s = served × mix'_s`, where `mix'` = the lot mix × campaign segment boosts, renormalized to sum to 1.

### 9.6 Product take-up
- **Per segment and offered product:** `q = affinity[s][p] × pf[s][p] × (0.6 + 0.2 × stars_p) × approval_p × special_p × takeUpBoost_p`, capped at 0.95.
- **`special_p`** depends on the product:
  - mortgage: `(homeownerShare/0.6) × clamp(0.6 + 0.2 × advisorOffices, 0.6, 1.2)`
  - wealth: 0 if there are no advisor offices
  - safe box: 0 once the vault's boxes are full
  - otherwise 1
- **Approval** (loan and card products only):
  - `approval = baseApproval_p × appetite.volumeMult × (0.85 + 0.03 × model.inclusion) × fundingGate × capitalGate`
  - `fundingGate` = 0 during a funding freeze (§13.5), otherwise 1.
  - `capitalGate` = 1 at Strong, Adequate or Watch; 0.5 at Restricted; 0 at Critical.
- **Results:**
  - `newAccounts_p = Σ_s n_s × q`
  - `newVolume_p = Σ_s n_s × q × ticket_p × lot.incomeIndex × ticketMult[s][category_p] × noise(±5%)`

### 9.7 Price factors `pf`
| Product type | Formula |
|---|---|
| Deposit-rate products | `clamp(1 + sensDep_s × (price − m)/PF_RATE_STEP, 0.25, 2.0)` |
| Loan and card rate products | `clamp(1 − sensLoan_s × (price − m)/PF_RATE_STEP, 0.20, 1.8)` |
| Fee products (incl. wealth fee and FX markup) | `clamp(1 − sensFee_s × (price − m)/max(0.5 × m, FEE_STEP_MIN), 0.20, 1.8)` |

Segment sensitivities are in CONTENT (Segments). FEE_STEP_MIN = $2 for $-denominated fees and 0.25pp for %-denominated fees. PF_RATE_STEP = 0.01 (tuned in Stage 1 from 0.005, which made deposits too price-elastic: half a point above market doubled retiree take-up and GIC renewals). The Rates rating (§8) still uses 0.005 steps.

### 9.8 Customers
`customers = round(Σ_p accounts_p / PRODUCTS_PER_CUSTOMER (1.6))`.

### 9.9 Data centers (stage C2c)
A second building kind beside the sales office (`src/sim/dataCenters.ts`, commands in `src/sim/commands/dataCenters.ts`, parts in CONTENT §7c). Any number per city, on a free storefront lot (lot rent and deposit, like a sales office) or at a regional energy site's employer (`DATA_CENTER.energySiteRent` ($3,000) × the city's cost index a week, no deposit, at most `DATA_CENTER.perEnergySite` (3) per site). You build only in the city you're in, never at a restricted or critical tier. Prices go through the price list (§4.6).

- **Parts:** a GPU hall (GPUs it holds and fit-out weeks), a power feed (GPUs it can run) and cooling (PUE). `usableGpus = min(hall GPUs, power GPUs)`.
- **Fit-out:** the hall's weeks (8, 12 or 16), counted down in tick step 4 before the sales offices. A fitting-out data center pays rent but no power.
- **Weekly costs (open):** rent to the Rent line; power `usableGpus × DATA_CENTER.powerPerGpuWeek (12) × PUE × powerIndex` to the Equipment line, where `powerIndex` is `DATA_CENTER.energySitePower` (0.5) at an energy site and the city's cost index elsewhere. Worked example: a Twin hall on a Grid feed with Liquid loops at an energy site runs 3,000 GPUs for 3,000 × 12 × 1.25 × 0.5 = $22,500 a week.
- **Latency lift:** each sales office's Service target (§8) gains `DATA_CENTER.liftSameCity` (+0.25 stars) when an open data center is in its city, else `DATA_CENTER.liftNear` (+0.1) when one is within `DATA_CENTER.nearKm` (1,200 km). Not additive across data centers. Its compute joins the pool in C4.
- **Accounts:** the hall is a fit-out asset (`FITOUT_LIFE_WEEKS`), power and cooling equipment (`EQUIPMENT_LIFE_WEEKS`), owned by the data center id; the deposit goes to lease deposits.
- **Upgrades:** only to a dearer part in the same slot. The old part's book value is written off to depreciation and the new one bought at today's price. Power and cooling take effect at once; a new hall closes the data center for `ceil(hall weeks × DATA_CENTER.upgradeWeeksShare (0.5))` weeks, then it reopens.
- **Closing:** as a sales office (§6): `CLOSE_RECOVERY` (30%) of book value comes back, the rest is written off, and the deposit is refunded less `CLOSE_RENT_WEEKS` (2) of rent. The lot is freed.

## 10. Books

One `Book` per (branch, product): `accounts`, `balance`, `bookRate`, `pd` (annual, balance-weighted), `lgd`, plus last-week flow fields for the UI (`newAccounts`, `newVolume`, `deltaAccounts`).

### 10.1 Deposits
1. **Inflow:** `balance += newVolume`, `accounts += newAccounts`.
   - Variable products (chequing, savings, student, business): `bookRate = payRate`, where `payRate` is the price itself for savings or the fixed pay rate in CONTENT for fee-based accounts.
   - Term products (GIC): `bookRate` becomes the balance-weighted average of old and new.
2. **Organic growth:** `balance ×= 1 + organic_p × depositGrowth / 52`.
3. **Churn:**
   - `k = churn_p/52 × (1 + rateChurnSens_p × max(0, (m − price)/0.005)) × (1 + 0.6 × max(0, 3.2 − Overall)) × signupChurn × runMult`
   - For fee-priced accounts (chequing), the gap is the fee comparison from §8 instead: `max(0, −c_p)`.
   - Then `balance −= balance × k` and `accounts −= accounts × k`.
   - `signupChurn` is the Sign-Up Bonus multiplier, applied for 26 weeks to that week's cohort. Approximate it as a branch-level multiplier with linear decay.
4. **GIC maturity:**
   - `maturing = balance / 52`
   - `renewProb = clamp(GIC_RENEW_BASE (0.72) × pf_avg, 0, 0.95)`
   - Renewed money re-prices at the current price; the rest leaves. Accounts move proportionally.
5. **Student conversion:** 8% per year of student accounts move to chequing, keeping their balances.
6. **Cash:**
   - interest paid = `balance × bookRate / 52` (cash out)
   - fees = `monthlyFee × accounts × 12/52` (cash in)

### 10.2 Amortizing loans (personal, auto, mortgage)
1. **Origination:**
   - `pdNew = basePD_p × appetite.pdMult × (1.30 − 0.06 × model.accuracy) × (1 + 0.02 × (model.inclusion − 5)) × adverse × riskMult`
   - `adverse = max(0.85, 1 + 0.25 × max(0, (price − m)/0.01) − 0.05 × max(0, (m − price)/0.01))`
   - `riskMult = 1 + 1.5 × (1 − riskCoverage')` (§16.4, CONTENT §9)
   - Update the balance-weighted `pd` and `bookRate`. `lgd` is a product constant.
   - Cash: liquid pool −= `newVolume`, plus the origination fee (CONTENT; mortgage 0.5%) as cash in.
2. **Scheduled runoff:** `principal = balance / term_p`. Mortgages use the 1,300-week amortization.
3. **Prepayment** (mortgage and auto): extra runoff = `PREPAY_BASE (0.0010) + 0.003 × max(0, (bookRate − m − 0.0075)/0.01)`. This creates a refinance wave when market rates fall.
4. **Repricing:**
   - Mortgage `bookRate` moves 1/260 of the way toward the current price each week (5-year fixed terms rolling over).
   - Personal and auto loans don't re-price; the mix changes only through runoff and new loans.
5. **Defaults:**
   - `dRate = pd × creditCycle / 52`
   - `defaulted = balance × dRate`
   - `loss = defaulted × lgd × (mortgage ? mortgageLgdMult : 1)`
   - `recovery = defaulted − loss`
   - `balance −= defaulted` and `accounts −= accounts × dRate`.
   - **Non-mortgage** recovery goes to the liquid pool.
   - **Mortgage** recovery becomes REO inventory in that city, at recovery value (§21.3).
   - `loss` is a non-cash expense (loan losses).
6. **Interest received:** `balance × bookRate / 52`, after defaults (cash in).
7. **Liquid pool flows:** principal runoff and prepayments go to the liquid pool.

### 10.3 Revolving (line of credit, credit card)
- **Balance target:** `accounts × avgDrawn_p × lot.incomeIndex × (Recession ? 1.10 : 1)`. Each week, `balance = ema(balance, target, 0.20)`, and the change flows to or from the liquid pool.
- **Rate:** `bookRate = price` (variable).
- **Cards:**
  - interchange = `accounts × spendPerMonth × 12/52 × INTERCHANGE (0.015)`
  - annual fee = `accounts × annualFee/52`
- **Defaults:** same as §10.2. Recovery goes to the liquid pool.

### 10.4 Wealth Advice
- AUM ticket per account.
- `AUM ×= 1 + 0.6 × marketWeeklyReturn`, using the equity market index (§19.1).
- Fee income = `AUM × fee/52`.
- Churn 8% per year × `(1 + 0.6 × max(0, 3.2 − Service))`.
- Only offered where the lobby has at least one advisor office.

### 10.5 Services
- **Safe deposit boxes:** accounts are capped at `vault.boxes`. Income = `accounts × fee/52`.
- **FX & Wires:**
  - `volume = customers × FX_PER_CUSTOMER (900/yr; tuned from 1,800) × incomeIndex × pf`
  - income = `volume × markup / 52`

### 10.6 Applications and servicing
- **Applications:** `apps = Σ (new loan and card accounts) / max(approval, 0.2)`. Underwriting cost = `apps × model.costPerApp`.
- **Servicing:** `Σ accounts_p × servicing_p` (CONTENT, $ per account per week).

## 11. Loan Desk

- **Arrival rate:** `λ = LOANDESK_BASE (0.5) + 3.0 × mix_BIZ × (footTraffic/8000) × (0.25 + 0.75 × e) × loanDemand × searchBoost`. Applications this week = `poisson(λ)`.
- **Each application:**
  - **Sector:** weighted pick by district (CONTENT Loan Desk sectors).
  - **Business name:** from the name generator.
  - **Amount:** `lognormal(70,000 × incomeIndex × sector.amountMult, 0.7)` (tuned from 120,000), clamped to $20k–$3M.
  - **Term:** within the sector's range.
  - **Pentagon** (Management, Track record, Market, Competitiveness, Financial health): each score = round(normal(sector profile, 1.6)), clamped to 1–10. In a Recession, Financial health −1.
  - **Collateral:** None 30%, Partial 45%, Full 25%.
  - **Max rate they'll accept:** `FTP_short + 0.0525 + 0.006 × (5 − avg) + normal(0, 0.004)`. Typical applicants accept FTP + 5–5.5%, above the default SBL price of FTP + 4.5%; weaker businesses will pay more.
  - **Hidden risk:**
    - `avg = 0.30 × FinHealth + 0.20 × Track + 0.20 × Mgmt + 0.15 × Market + 0.15 × Comp`
    - `pd = SBL_BASE_PD (0.025) × exp(−0.22 × (avg − 5)) × collateralPD (1.20 / 1.00 / 0.85) × creditCycle`, recomputed weekly for booked loans
    - `lgd` by collateral: 0.75 / 0.50 / 0.30
  - Expires after 2 weekly ticks.
- **Player decision:**
  - **Approve at rate r.** Acceptance probability is 0.97 if r ≤ maxRate, otherwise `clamp(0.97 − 0.6 × (r − maxRate)/0.01, 0, 0.97)`. Draw on approval; a refusal is shown as "They went elsewhere."
  - **Decline**, or let it expire.
- **Shown estimate:** "Low / Medium / High risk" from the estimated pd. Visible only with a Risk floor or manager Product ≥ 60. The estimate uses `avg + normal(0, σ)` with `σ = 0.6 × (1 − estimatorSkill/100)`, where estimatorSkill = max(manager Product, 40 + 50 × riskCoverage').
- **Delegated:**
  - The manager approves if the estimated pd ≤ the appetite threshold: {0.020, 0.030, 0.045, 0.060, 0.080} for appetite levels 1–5.
  - Rate = `max(product price, FTP_short + estPd × lgd + 0.025)`.
- **Booked loans** become a `BusinessLoan`:
  - Each one amortizes and defaults on its own each week (default draw: `rng < pd × creditCycle / 52`).
  - On default: `loss = balance × lgd` and the recovery goes to the liquid pool.
  - Defaults of $500k or more emit a Ledger event.
- The SBL product card on the Products tab shows totals across business loans.

## 12. Branch P&L (funds transfer pricing)

- **Branch revenue (shown):** loan and card interest + deposit funding credit (`Σ deposit balance × FTP_tenor/52`) + fees + wealth fees + services + ATM fees (`atm.productivity × 0.25 × $2.50`).
- **Branch expenses:**
  - deposit interest paid
  - loan funding charge (`Σ loan balance × FTP_tenor/52`)
  - loan losses
  - staff wages (`staff × wage × 40`)
  - manager salary / 52
  - rent
  - campaigns
  - equipment maintenance: EQUIP_MAINT (6%/yr) × the cost of the teller line, vault and ATM / 52
  - fit-out upkeep: 2%/yr × the cost of the exterior and lobby / 52
  - overhead: BRANCH_OVERHEAD ($450) × city.costIndex
  - servicing and underwriting
- **Branch income** = revenue − expenses. Keep 52 weeks of history (`BRANCH_PNL_WEEKS`) so the branch Finance tab can show a full year.
- Depreciation is a company-level item, not part of branch income.
- **Statement line groups:**
  - Revenues: Loan interest, Deposit funding credit, Fees, Wealth & services
  - Expenses: Deposit interest, Loan funding charge, Loan losses, Staff, Manager, Rent, Marketing, Equipment & upkeep, Servicing & underwriting, Overhead

### 12.1 Worked example (mature branch, policy 3.25%, term premium +0.40%)
The balance script should land near this; §25 targets match it. Treat it as calibration, not as test truth.

**Superseded in Stage 1 (2026-10-24):** the deposit and loan sizes still hold, but with CONTENT's fee table the "fees and other" line comes to about $1.4M a year rather than $0.75M, and policy rates sit nearer 3.75–4%. A mature branch therefore earns about $50–65k a week; §25 was updated to match.

| Item | Approximate value |
|---|---|
| Deposits | ~$45M (chequing $9M, savings $18M, GIC $10M, business $6M, student $0.3M, payroll partners $1.7M) |
| Loans | ~$36M, about 80% of deposits (mortgage $17M, SBL $6M, auto $5.5M, personal $3M, cards $2.5M, LOC $2M) |
| Liquid assets | ~$9M (deposits − loans), so no wholesale funding is needed |
| Revenue / yr | Loan interest $2.6M + funding credit $1.5M + fees and other $0.75M ≈ **$4.8M ≈ $92k/week** |
| Expenses / yr | Deposit interest $0.78M + funding charge $1.26M + losses $0.30M + staff $0.35M + manager $0.08M + rent $0.08M + marketing $0.08M + equipment and upkeep $0.05M + overhead $0.02M + servicing $0.20M ≈ $3.2M |
| Branch income | **≈ $1.6M/yr ≈ $30k/week.** A mid build (~$332k) pays back in about 11 weeks at maturity, close to the original's store economics. |

## 13. Treasury

### 13.1 Pools
- **Liquid assets `L`:** reserves `R` plus government bonds `Bd` (market value).
- **Wholesale funding:** lots `W[]`.
- **Corporate cash** is separate (§14). Deposits never flow into corporate cash.
- **Charter capital** (CHARTER_CAPITAL, $2,000,000) sits in reserves from the start. It's part of L, counts in equity and can't be transferred out.

### 13.2 Weekly flows into L
- Plus: deposit net flows, loan principal repaid and prepaid, non-mortgage recoveries, wholesale draws, capital transfers (corporate cash → L).
- Minus: loan originations, revolving draw increases, wholesale maturities and repayments, REO purchases.
- The player can transfer corporate cash into L. There is no reverse transfer.

### 13.3 Liquidity ratio
- `LR = L / totalDeposits` (∞ with no deposits).
- LIQ_MIN = 0.10.
- Player target `liqTarget` defaults to 0.15 (range 0.10–0.40).

### 13.4 Allocation, bonds and reserves
- **Bonds share** `bondShare` (0–0.8, default 0.30) applies to liquid assets above `LIQ_MIN × deposits`. Rebalance weekly by buying or selling at market value.
- **Bond yield on purchase:** `FTP_long + 0.0010`. Book yield is the purchase-weighted average.
- **Duration:** BOND_DURATION = 4.0 years. When the country's `FTP_long` changes by Δ in a week, `Bd_market ×= 1 − 4.0 × Δ`.
- **Unrealized gain/loss** = market − book. It counts in equity (§14.4). Selling realizes it pro rata.
- **Bond coupon** cash = `book × bookYield / 52`.
- **Reserves** earn the deposit-facility rate, RESERVE_RATE_SPREAD (0.50%) below policy: `R × max(0, policy − 0.005) / 52` cash in (Stage 5; keeps a deposits-only bank well behind a lender).
- Bonds pull to par: each week, close 1/208 of the market–book gap.

### 13.5 Shortfall handling
After all flows:
- **Auto-funding ON** (default), if `L < liqTarget × deposits`:
  1. Borrow overnight interbank to bring L up to `liqTarget × deposits`, within OVERNIGHT_LIMIT = `0.10 × deposits × ratingMult`, at `policy + 0.0020 + ratingSpread + treasuryPenalty`. So the ratio holds at the player's target by itself as loans outgrow deposits (changed 2026-10-25; before, only the minimum was defended and the ratio drifted under target for years).
  2. If L is still under `LIQ_MIN × deposits` once overnight is capped, borrow the rest of that minimum shortfall from the central bank window at `policy + 0.0100`. Window stigma: overall rating −0.05 on every branch for 4 weeks, and a 20% chance per week of a `WINDOW_USE` news event.
- **Auto-funding OFF:** nothing is borrowed. If `L < LIQ_MIN × deposits`: **funding freeze.** `fundingGate = 0` until `LR ≥ LIQ_MIN + 0.02`.

If `L > liqTarget + 0.05`: repay central bank window borrowing first, then overnight.

### 13.6 Funding market (Treasury floor required)
- **Refresh:** offers regenerate every 2 weeks. Count = `2 + floor(3 × treasuryCoverage') + (CFO expertise ≥ 70 ? 1 : 0)`.
- **Each offer:**
  - type (weighted, CONTENT Funding types) and counterparty name
  - amount = `typeSize × max(1, deposits/100M) × noise(±25%)`
  - rate = type basis + type spread + ratingSpread + treasuryPenalty + normal(0, 0.0008)
  - term and radar from the type
- **Rating spread by capital ratio:**

  | Capital ratio | Spread |
  |---|---|
  | ≥ 14% | −0.0010 |
  | 10.5–14% | 0 |
  | 8–10.5% | +0.0035 |
  | < 8% | +0.0100 |

- **Treasury penalty** = `(1 − treasuryCoverage') × 0.0050`.
- **Buying an offer:** borrow any amount up to the offer size. The lot's rate is fixed. L += amount and a liability is created.
- **Interest** is paid weekly from corporate cash.
- **Maturity:** L −= amount. If that breaches LIQ_MIN, §13.5 runs.
- **Covered bonds** require mortgage balances ≥ 1.25 × covered bonds outstanding.
- **Types offered:** Term Interbank and Covered Bond (CONTENT §12). Brokered Deposits and Senior Bond merged into them in schema v15.

### 13.7 Payroll partnerships (Employers layer)
- **Signing:**
  - Signing fee paid from corporate cash (CONTENT formula). It becomes an intangible asset amortized over the contract.
  - Choose a host branch in the same city and a package (any offered deposit product).
- **Participation curve** over a contract of `L` weeks (default 364):
  - rises along an S-curve from 0 to 0.65 by week 52
  - linear to 0.80 by week 104
  - flat at 0.80 until `L − 104`
  - linear down to 0.45 at `L`
- **Balance target:** `employees × participation × DEPOSIT_PER_EMPLOYEE (4,500) × incomeIndex × (0.5 + 0.6 × health/100)`. The partnership keeps its own mini-book (balance, accounts, rate = package price). It moves toward target at 0.15 of the gap per week; the flow goes through L. Accounts are reported inside the host branch's product card as "incl. partners".
- **Health:**
  - target = `40 + 12 × (hostOverall − 3) + 10 × c_package + perksBonus`, where `c_package` is the competitiveness of the package (§8)
  - `health = ema(health, target, 0.05)`
  - Health < 30 for 8 straight weeks: the partner terminates and the balance runs off over 12 weeks.
- **End of term:**
  - Renew at fee × `(1.5 − health/100)` for another full term.
  - Or let it lapse: run off over 12 weeks.

- **Student partnership (universities):** students by city size S 6,000 / M 10,000 / L 16,000 / XL 24,000; fee $30 × students × incomeIndex; $600 per participating student; same curve, health and term rules. A university has one payroll and one student deal at a time.
- **Graduate program (universities):** $120,000 × city wageIndex a year, charged up front and every 52 weeks; +10 skill for manager candidates and +1 hire a week at branches and HQ floors.

### 13.8 Bank runs
- **Trigger:**
  - Condition: average overall rating < 2.6 AND (capital tier Restricted or Critical OR LR < 0.08).
  - Chance: 4% per week while the condition holds.
  - Duration: 3–6 weeks.
- **During a run:** `runMult = 6` on deposit churn (§10.1).
- **Response:** the `BANK_RUN` incident offers the choices (§23).

## 14. Corporate cash and statements

### 14.1 Corporate cash
Shown in the top bar. Moves only with cash items:
- interest received and paid, fees
- wages, rents, campaigns
- capex, lease and office deposits
- wholesale interest, corporate debt draws, repayments and interest
- taxes, dividends, share issuance proceeds
- purchases and sales of assets (stocks, ventures, real estate, REO sales)
- partnership fees, fines, incident costs
- transfers to Treasury

### 14.2 Weekly company P&L
| Line | Contents |
|---|---|
| Interest income | loans and cards, reserves, bond coupons, venture debt |
| Interest expense | deposits, wholesale funding, corporate debt |
| **Net interest income** | |
| Fee & other income | account fees, card fees and interchange, wealth, services, ATM, real estate rent, dividends received, realized gains/losses |
| Operating expenses | branch staff, managers, rents (branches and offices), HQ salaries, executive pay (including grant expense), marketing (branch and brand), equipment and upkeep, overheads, servicing, underwriting, benefits, development spend, fines, incident costs |
| Loan losses | non-cash |
| Depreciation & amortization | non-cash: branch fit-outs over 10 years, equipment over 5 years, office fit-outs over 10 years, partnership fees over the contract; goodwill is not amortized |
| Pre-tax income | |
| Tax | country rate on positive pre-tax income, with loss carry-forward; accrued weekly, paid quarterly |
| **Net income** | |

"Weekly revenue" in the weekly results = interest income + fee & other income.

### 14.3 Cash flow
- **Operations:** net income + non-cash items (loan losses, D&A) ± change in taxes payable.
- **Investing:** capex; real estate, stock and venture purchases and sales; partnership fees; transfers to Treasury.
- **Financing:** share issuance, dividends paid, corporate debt draws and repayments.
- **Net cash flow** = change in corporate cash. This must reconcile; test it.

### 14.4 Balance sheet
- **Assets:**
  - corporate cash
  - liquid assets (reserves + bonds at market value)
  - loans (books and business loans)
  - REO
  - fixed assets at book value (branches, offices)
  - investments: stocks at market, ventures at last-round price, real estate at value, venture debt
  - intangibles (unamortized partnership fees)
  - goodwill
- **Liabilities:**
  - deposits (books and partnerships)
  - wholesale funding (including overnight and window)
  - corporate debt
  - dividends payable
  - taxes payable
- **Equity** = assets − liabilities. Track paid-in capital separately.
  - Retained earnings = equity − paid-in − AOCI.
  - AOCI = unrealized bond gains/losses.
- **Why it balances:** deposits arriving raise L and deposits together; a new loan moves L into loans; a write-off lowers loans and equity together. Corporate cash moves only with cash items.

### 14.5 Statement periods
Week, Quarter and Year sum the weekly records.

### 14.6 Finance delays
If Finance coverage' < 0.9, the newest `ceil((0.9 − k') × 10)` weeks show as "Delayed" in the statements and the weekly results. The simulation runs normally underneath.

## 15. Capital and the regulator

- `CET1 = equity − goodwill − intangibles`
- `RWA = Σ loans × rw_p + REO × 1.0 + realEstate × 1.0 + (stocks + ventures) × 2.5 + ventureDebt × 1.5 + fixedAssets × 1.0 + OP_RISK_MULT (1.0) × trailing-52-week net revenue (net interest income + fee & other income)`
- `CR = CET1 / max(RWA, 1)`
- Charter floor: if equity < CHARTER_MIN_EQUITY ($2,000,000), the tier is Critical regardless of CR.

**Tiers** (badge shown everywhere capital matters):

| Tier | CR | Effects |
|---|---|---|
| Strong | ≥ 14% | Funding spread −0.10% |
| Adequate | 10.5–14% | None |
| Watch | 8–10.5% | Dividends capped at 50% of trailing-4-quarter net income; advisor warnings |
| Restricted | 6–8% | No dividends, branches or acquisitions; `capitalGate` 0.5; a regulator letter (incident) |
| Critical | < 6% | `capitalGate` 0; fine 0.1% of RWA per quarter; after 8 consecutive weeks below 4.5%, an emergency recapitalisation offer |

**Emergency recapitalisation:**
- Mechanics: forced new shares worth enough to reach a 10.5% capital ratio, priced at 50% of book value per share.
- If declined, or if the ratio is still below 4.5% after 5 more weeks: regulator takeover and game over.

**Quarterly regulator review:**
- Failure probability: `0.02 × (1 + 3 × (1 − riskCoverage')) × (1.6 − avgManagerEthics/100)`.
- On failure: a fine of 0.05–0.3% of trailing annual revenue, plus the `REGULATOR_AUDIT` incident and news.

## 16. HQ

### 16.1 Offices
- **Listings:** OFFICE_LISTINGS.countBySize per city (S 2, M 2, L 3, XL 4; a bank only ever needs a handful of offices), split across the financial, downtown and midtown districts by largest remainder; floors 3–10, desks per floor 24 or 32 (set per building).
- **Rent:** weekly rent = `floors × OFFICE_RENT_PER_FLOOR ($1,100) × city.rentIndex`. Deposit = 8 × weekly rent.
- **Floors:** each floor slot holds one department. Fit-out = FLOOR_FITOUT ($120,000) × city.costIndex, a fixed asset.
- **Desks per floor:** set by the building, 24 or 32 (the original showed both). Investment floors always have 32. The Executive suite always has 7 desks (you plus six executives).
- **Releasing:** you can release a floor or a whole office. Staff above the remaining desks are let go, with 4 weeks' salary as severance.
- **Main offices (C2d2):** at most MAIN_OFFICES_MAX (2) office buildings. The second must be in a different country from the first; it adds floors (and desks) to the same departments. Saves from before the cap keep any extra offices they hold, but can't lease more until they're under it.
- **Company-wide prices (C2d2):** with "Apply rates to all sales offices" on, every office charges its country's HQ price list and follows the HQ lineup, except an office switched to **Set prices here** (`Branch.ownPrices`). That office starts from the HQ prices and lineup, then keeps its own rate sheet (its manager can price it under Products & rates delegation); HQ price and lineup changes skip it until it follows HQ again, which re-applies the HQ lineup. Marketing already works the same way: brand campaigns at HQ (§16.10) cover cities and countries, and each office can run its own campaigns on top.

### 16.2 Department state
- `staff`, `desks` (sum across offices), `salary`, `skill`, `morale`, `targetStaff`, `openPositions`.
- Staffing works like §6.2–6.3, using the department market salary (CONTENT Floors) in place of wage.

### 16.3 Requirements
- Per-department formulas are in CONTENT (Floors).
- **Founder-mode ramp:** `ramp = (totalAssets ≥ $250M) ? 1 : clamp((officeUnits − 3)/5, 0, 1)` (FOUNDER_RAMP).
- **Office units (stage C2a):** every per-branch requirement and the ramp count office units, not offices: each office counts its size's `hqUnits` (Starter 1, Standard 2, Large 3, Flagship 4). A Flagship does far more business than a Starter but shares its back office, so it weighs on HQ like four Starters rather than nine.

### 16.4 Coverage
- `staffEff = staff × (0.6 + 0.4 × skill/100) × (0.85 + 0.15 × morale/100) × execMult`
- `k = min(1.2, staffEff / max(required, 0.01))`
- `k' = 1 − ramp × (1 − min(k, 1))`. This is the coverage every effect reads.
- **Shortfall curve:** `effect(k') = k'^0.7`. Above 1.0, bonuses are capped at +5%.
- Per-department effects are in CONTENT (Floors).
- **Gating:** some features need the floor to exist, regardless of coverage — funding market (Treasury), product development and custom models (Products), ventures (Investment), executives (Executive), brand campaigns (Marketing).

### 16.5 Benefits
- Each benefit has a control value and a cost formula (CONTENT Benefits).
- Effects add to `benefitsMorale`, `benefitsAttraction`, `retentionBonus`, `tuitionBonus` (skill growth) and reputation.
- They apply to every employee, branch and HQ.
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
- **Result:** a new catalog product (template + tier + stars). Enable it at branches, or company-wide with "Apply to all".
- **Spending and pace:** each week pays `weeklyBudget × progress made`, so the total stays budget × weeks even when a short-staffed team stretches the calendar. Developments pause while there is no Products floor.
- **Target tier** (`DEV_TIER`): the default price number moves with the tier — rate products −0.10pp / 0 / +0.15pp, fee products ×0.85 / ×1 / ×1.25 — and Premium adds +0.05 to the Products rating where it's offered.
- **Developed products** are full products with their own id, offers and books. Spec = base product + template modifiers (CONTENT §6) + tier; affinity = base + bumps. The market reference is the base product's (× the fee ratio for templates that set their own fee, e.g. Robo-Advisor, Premium Package). Products rating breadth counts each base product once, covered if it or a variant is offered.
- **Digital templates** (IT floor required) run once each and create no product: Mobile App 2.0 adds 0.3 to the app rating now and to its target for good (`digitalProjectBonus`, §16.9); Instant Decisions adds 2 to the house model's Speed (capped at 10).
- **Deleting** a developed product moves its accounts and balances onto the base product's book at each branch.

### 16.7 Underwriting models
- **Radar** (1–10 each): Accuracy, Speed, Inclusion, FraudShield, Fairness. Plus `costPerApp`.
- **Packaged models** are bought from credit bureaus: fixed mixes at fixed prices.
- **Custom models** (Products floor required): weights over data inputs (CONTENT).
  - `radar = Σ w × profile × qualityMult`, where `qualityMult = 0.9 + 0.2 × productsCoverage' × avgSkill/100`
  - `cost = Σ w × cost`
  - The Internal History input needs ≥ 5,000 loans booked. Its accuracy = `4 + min(5, loansBooked/20,000 × 5)`.
- **Bureau-hosted custom model:** like the original's custom blend at a roaster. No Products floor needed; same mix rules, with `qualityMult = 0.95` and cost × 1.15.
- **Switching models** takes 2 weeks; old and new blend linearly over that time: the old model's weight is `weeksLeft / (MODEL_SWITCH_WEEKS + 1)`, so 2/3 then 1/3, then fully new. Radar and cost per application both blend.
- Custom models' radars are recomputed every week, so they follow the Products team's coverage and skill and Internal History's growing accuracy. Radar values cap at 10.

### 16.8 Risk appetite
Levels 1–5 (Very conservative to Very aggressive):

| | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| volumeMult | 0.70 | 0.85 | 1.00 | 1.15 | 1.30 |
| pdMult | 0.70 | 0.85 | 1.00 | 1.20 | 1.45 |

### 16.9 IT and the app
- `appRating = ema(appRating, 2.0 + 2.5 × itCoverage' × itSkill/100 + ctoBonus − ctoVacancy + digitalProjectBonus, 0.05)`, clamped to 1–5.
  - `itSkill` = the IT department's average skill, or 70 while it has no staff, so a small bank with no IT floor rests near 3.75.
  - `ctoBonus = 0.4 × CTO expertise/100`.
  - `ctoVacancy = 0.3` once you've had a CTO and the seat is empty, so a resignation drags the rating down until you hire a replacement.
- Incident multipliers for breaches and outages: `1 + 2 × (1 − itCoverage')`.

### 16.10 HQ marketing
- **Brand campaigns** run per city or per country with a weekly cost and a gain to `b`.
- **Agency packages:** a one-time `b` boost spread over the package length, with no staff needed.

### 16.11 HR hires branch managers
- With an HR floor and `people.hrHiring` on (the default; switch on the HR floor, `setHrHiring`), each week (tick step 8, right after the executives) every **open** branch with no manager gets the candidate in its city with the highest total of the four skills (people + product + marketing + ethics; ties go to the first listed), hired with the player's own `hireManager`, so at the candidate's asking salary. A branch still being built waits until it opens; a city with no candidates waits for its next pool.
- HR only fills the seat: the branch's delegations stay as they were. The COO's **Branch operations** (§17.2) runs first in the same week and does the same hire plus default delegation, so with both on the COO's version wins.
- This also refills a branch whose manager was poached (§6.5) the following week.

## 17. People AI

### 17.1 Branch manager (when delegated)
- **Staffing:** `targetStaff = ceil(staffNeeded × clamp(W, 0.9, 1.3))`; wage = `marketWage × (0.95 + 0.15 × People/100)`.
- **Products & rates:**
  - Each price targets `m ± offset` to hold Rates at 3.2–3.6 while keeping the margin ≥ 40% of the default spread.
  - Product skill adds error `normal(0, 0.15pp × (1 − Product/100))`.
  - Offers products with local `aff_p ≥ 0.05`.
- **Marketing:** turns on campaigns whose estimated awareness ROI > 0 using a 26-week horizon; Marketing skill scales the effect.
- **Branch troubles:** auto-resolves incidents by choosing the option with the best expected value, plus error scaled by (1 − (People + Ethics)/200).
- **Loans:** §11.

### 17.2 Executives
- **Skills:** Leadership, Expertise and Loyalty, each 0–100.
- **Department multiplier:** `execMult = 0.9 + 0.25 × expertise/100` on the departments in their domain.
- **Seats:** CEO (you), COO, CFO, CPO, CMO and CTO as in the original, plus CRO as a seventh and a Chief Infrastructure Officer (CIO; seat id `creo`, Vault Street's Chief Real Estate Officer) as an eighth (2026-10-26). The Executive suite has 8 desks. The CREO lifts no department: its Expertise is pricing power on the buildings it manages (§21.2).

**Delegations:**

| Exec | Domain | Delegations |
|---|---|---|
| COO | HR, all branches | **Expansion:** opens branches for you in the cities you mark for growth (one at most every 4 weeks, in the growth city with the most room, at the busiest free storefront clear of your other branches, in your usual fit-out, keeping 8 weeks of costs in cash). **Company troubles:** settles company and city incidents the way a delegated manager would (§17.1), valuing effects in weeks of company revenue with error shrinking with Expertise; cases marked `yours` (bank run, rescue offer, poached executives) always come to you. **Branch operations:** auto-hires managers for new branches and turns on default delegation. **HR benefits:** keeps average morale at or over the **morale target** you dial (`executives.moraleTarget`, one of `EXEC_DELEGATION.moraleTargets` 70 / 80 / 90, default 70) at least cost, within `benefitsBudgetShare` (8%) of payroll. **HR division:** auto-staffs every floor to 100% coverage. **Pay reviews:** on the **cadence** you dial (`executives.payReviewCadence`: quarterly = every 13 weeks, annual = every 52, `PAY_REVIEW.cadences`, default quarterly) sets every executive to `execMarketSalary × (1 + payPremium)` and every branch manager to their market pay (§6.5) × `(1 + payPremium)`, rounded to the salary steps and inside the allowed ranges; it also runs at once when switched on and whenever you change the premium (`setPayPremium`, −10% to +30% in 5% steps, default +5%). **Branch guidance (staffing):** see below. |
| CFO | Finance, Treasury | Halves statement delays. **Treasury:** auto-funding, bond share and buying funding offers to keep LR within ±2pp of target. **Capital:** at Watch or worse, sells the company's stocks and steps risk appetite down every 4 weeks, 2 weeks after the CRO's turn (`cfoAppetitePhase`), so a seated CRO keeps tuning it too and the two never move it twice in one week. **Share sales** (its own switch since 2026-10-25, so the owner can keep their stake undiluted): at Restricted or Critical, sells new shares through the cheapest investment bank (private placement while private, within the round limits; secondary once listed), sized to reach 12% plus any regulator buffer, or what the charter floor needs. Never launches the IPO. **Investing: the bank's money** and **Investing: your money**: every `EXEC_DELEGATION.investEveryWeeks` (4) weeks, on weeks ≡ `investPhase` (2), each switch for its account (rival banks' shares are never touched): (1) sells every listed-company stock whose price is ≤ `investTrimAt` (75%) of its average cost, and doesn't buy it back for `investCooldownWeeks` (52); (2) buys one stock, the listed company with the largest gap `capShare × (held + budget) − heldValue` (capShare = its market cap ÷ all listed companies'), so holdings build toward a market-cap weighting, largest company first; buys under `investMinTrade` ($10K) are skipped; (3) backs one startup from the Investment floor pipeline: the highest pentagon average ≥ `investMinScore` (6) among those raising that the account doesn't already hold, taking one offer lot (§20.4); none without an Investment floor. Bank: never at a restricted or critical tier; stocks ≤ `investStockCap` (5%) and startup stakes ≤ `investVentureCap` (3%) of total assets; one stock buy ≤ `investStockLot` (1%) of total assets; the capital ratio after each buy stays ≥ `buyMinCr` (12%): a stock buy is at most `(CET1 − 0.12 × RWA) / (0.12 × STOCK_RISK_WEIGHT + COMMISSION)` and a lot needs `CET1 / (RWA + price × VENTURE_RISK_WEIGHT) ≥ 0.12`; `expansionReserveWeeks` (8) of costs stay in cash. You: keeps `buyReserveYears` (1) of CEO salary; one purchase spends at most `investSpareShare` (25%) of the personal cash above that. The Capital switch still sells all company stocks at Watch; buying stops above that line, at 12%. **Dividends:** proposes a dividend at board meetings. **Branch guidance (funding),** with the CRO: see below. |
| CPO | Products | **Pricing:** keeps the company lineup priced like a delegated manager (§17.1) when Apply-to-all is on. **Developments:** starts one when none is running, within a budget cap of 1% of revenue. **Models:** switches to the bureau package with the best defaults saved per dollar. **Branch guidance (lineup):** see below. |
| CTO | IT | App rating bonus (§16.9); runs digital projects. An empty seat applies the vacancy penalty. |
| CRO | Risk | Tunes risk appetite to hold CR ≥ 12% and the annualized loss rate ≤ 1.2% (expansion target); Loan Desk policy. **Branch guidance (lending),** with the CFO: see below. |
| CREO | Owned buildings (the bank's and yours) | **Rents: the bank's buildings** and **Rents: your own buildings** (two switches, so your private buildings can stay yours to price): every `EXEC_DELEGATION.rentEveryWeeks` (4) weeks, and at once when a switch goes on, each covered building's rent is set to hold that owner's **occupancy dial** (80 / 85 / 90 / 95 / 100%, default 100, one dial under each switch; `rentForOccupancy`, §21.2). At 100% that is `bestRent`: the highest rent that still fills it, counting the chief's pricing power, rounded down to the $5 step and kept inside the 50–160% range. Changing a dial reprices at once. **Buying: the bank's buildings** and **Buying: your own buildings**: every `EXEC_DELEGATION.buyEveryWeeks` (4) weeks each buys at most one listed building, in any city, at its asking price (always accepted, no travel needed): the listing with the best net yield, a year of `propertyWeek(…).net` at the rent the chief would set and the occupancy it settles at ÷ asking, among those the budget allows. Bank: never at a restricted or critical tier; its buildings' value stays ≤ `buyAssetCap` (5%) of total assets; the capital ratio after the purchase, `(CET1 + value − asking) / (RWA + value × PROPERTY_RISK_WEIGHT)`, stays ≥ `buyMinCr` (12%); `expansionReserveWeeks` (8) of weekly costs stay in cash. You: keeps `buyReserveYears` (1) of CEO salary, and a building may cost at most `buySpareShare` (50%) of the personal cash above that. Tenants of a covered building accept rent up to `marketRent × (1 + 0.10 × expertise/100)` with no loss of occupancy. The bank pays the chief either way. No branch guidance. |
| CMO | Marketing | Runs brand campaigns to hold `b` near the **awareness target** you dial (`executives.brandTarget`, one of `EXEC_DELEGATION.brandTargets` 40–70%, default 50%) in active cities within a budget cap of 3% of revenue. **Branch guidance (marketing):** see below. |

**Branch guidance** (`src/sim/branchGuidance.ts`, 2026-10-25): the C-suite steers the branch managers you delegate to, so managers still decide with their own skills but aim where HQ points them. The CFO and CRO steer managers who handle products or loan approvals (and the CPO's company pricing, which uses the same rule); the COO, CMO and CPO (schema v18) steer managers who handle staffing, marketing and products. `company.guidance` holds five whole steps in `GUIDANCE.min..max` (−1..+3), moved one step every `GUIDANCE.everyWeeks` (4):
- **Deposits (CFO):** +1 while the liquidity ratio is below `liqTarget − 0.01`, −1 above `liqTarget + 0.05`.
- **Loans (CRO):** +1 (tighter) while CR < 12% or losses > 1.2% a year; −1 when CR ≥ 14% and losses ≤ 0.9% (the CRO's appetite marks).
- **Effect:** a delegated manager's deposit rate moves by `deposits × GUIDANCE.rateStep (0.10 pp)`, never above FTP; loan rates by `loans × 0.10 pp`, never below FTP; the delegated Loan Desk's PD threshold is × `(1 − 0.12 × loans)` and its offered rate rises by the same loan offset.
- **Staffing (COO):** +1 while open delegated-staffing branches average staff morale below `GUIDANCE.moraleLow` (65), −1 above `moraleHigh` (82). Effect: delegated wages × `(1 + 0.02 × staffing)` and staff target × `(1 + 0.05 × staffing)`, on top of the manager's People skill.
- **Marketing (CMO):** +1 while average brand awareness across the cities of open delegated-marketing branches is below the dialled `brandTarget − GUIDANCE.brandBand` (40% at the default target), −1 above `brandTarget + brandBand` (60%). Effect: the awareness value a delegated manager weighs each campaign against (§17.1) × `(1 + 0.2 × marketing)`.
- **Products (CPO):** +1 while open delegated-products branches average a products rating below `productsLow` (3★), −1 at `productsHigh` (4★) or better. Effect: delegated fee prices × `(1 − 0.03 × products)` (also the CPO's own company pricing) and the lineup's affinity bar (`DELEGATE.minAffinity`) × `(1 − 0.25 × products)`, so more products go on.
- With no delegated branch to read, a part holds its step. A part whose switch is off or whose seat is empty returns to 0 that week.

**Delegation dials** (`src/sim/execPolicy.ts`, 2026-10-25): three delegations carry a stepped slider under their switch, and a tagline estimates what the chosen stop means right now, by the routine's own rule and without changing anything:
- **Morale target** (COO · HR benefits): walks the routine's benefit steps from today's benefits (most morale per dollar up, least morale lost per dollar down) until the estimated average morale reaches the target or the 8% budget runs out, and reports the weekly benefits cost, its change, its share of payroll and the morale it reaches (`moraleEstimate`).
- **Awareness target** (CMO · Brand campaigns): for each city with an open branch, a campaign starts where `b < target − brandSlack` (the cheapest city campaign not already running, only while the 3% budget covers it) and running ones stop where `b > target + brandSlack`; reports the weekly spend, its change and share of revenue, how many cities are pushed, and the change in new-customer flow once those cities sit at the target, from the awareness factor in §9.1 with each branch's own `a` held (`brandEstimate`).
- **Review cadence** (COO · Pay reviews): reviews a year, how far pay can lag the market between reviews (`MANAGER_PAY.tenureGrowth × weeks ÷ 52`: ~0.8% quarterly, 3% annual) and what the next review would add to annual pay across executives and managers (`nextReviewDelta`).

**Resignation:** weekly probability `0.002 × (1.5 − loyalty/100) × (pay/market < 0.9 ? 2 : pay/market ≥ 1.1 ? 0.5 : 1) × (unvested grants ? 0.5 : 1)`. Triggers the `EXEC_POACHED` incident.

**Candidate pools** refresh every 4 weeks. Candidate skills roll uniformly in EXECUTIVES.skillRange (35–93; v0.10.12 raised the top from 90 so a few more very good candidates turn up). A seat's pool can be rerolled sooner for a recruiter's fee (`rerollExecCandidates`): CANDIDATE_REROLL.feeShare × the executive market salary, doubling with each reroll of that seat until the free refresh; posted to `execPay`. A University Graduate Program adds +10 to candidate skills. Candidates come with every delegation on; a seat remembers the toggles its last holder left, and the next hire for that seat starts with those (schema v13), so a resignation never silently changes how the bank is run.

**Growth cities and "Open now":** `setGrowthCity` marks a city the COO may build in (only cities you have visited, not regional sites); hiring a COO with Expansion on, or switching it on, with none marked seeds the list with the cities you already have branches in. `cooOpenBranch(cityId)` has a seated COO build their usual pick at once, needing only the cash for the build (no reserve, no cadence); it works from any city, because the COO travels for you.

### 17.3 Board meeting (Stage 6)
- **When:** once per calendar quarter, with an Executive suite. The loop pauses once per quarter to remind you (after weekly results and incidents).
- **Votes:** the founder and executive holders vote For. Outside holders approve with `a`; `forShare = insiders + (1 − insiders) × a`; an item passes at ≥ 50%. While you hold a majority, every proposal passes.
- **Dividend approval `a`:** payout = dps × shares × 4 ÷ trailing net income. With no profit: 0.9 for a zero dividend, 0.15 otherwise. With profit: 0.6 for zero; 0.9 up to a 60% payout, falling linearly to 0.1 at 120%.
- **CEO salary approval `a`:** CEO market rate = 1.5 × the executive market salary. 0.9 at or below it, else `clamp(0.9 − 0.8 × (new/market − 1), 0.05, 0.95)`; −0.2 for a raise above 25%; −0.15 while ROE_ttm < COE. The board won't consider more than 4× the market rate.
- **Caps (§15):** Watch caps the quarter's dividend total at 50% of trailing-four-quarter net income ÷ 4; Restricted and Critical allow none. A new dividend can't be declared while the last is unpaid.
- **Declared dividend:** retained earnings fall at once and the total is a liability ("dividends payable") until it is paid 3 weeks later (financing cash); the founder's share goes to personal cash. `DIVIDEND_DUE` reminds you at declaration.
- Numbers: `BOARD_VOTE`, `GOVERNANCE` in balance.ts.

### 17.4 Executive details (Stage 6)
- **Market salary** = ($180,000 + $60,000 per $1B of total assets) × city wageIndex, capped at $2.5M. A candidate asks market × (0.8 + 0.4 × average skill/100), in $5k steps; salaries can be set from 0.5× to 3× market. Severance on firing: 26 weeks of salary.
- **execMult** multiplies the department's staff effectiveness (§16.4) for the seat's departments: COO → HR, CFO → Finance and Treasury, CPO → Products, CMO → Marketing, CTO → IT, CRO → Risk. Expertise under 40 lowers it below 1. Leadership only feeds the asking salary in v1.
- **Grants:** a grant is at most 2% of outstanding shares; it vests 25% a year. Grant-date value: the share price (RSU) or max(price − strike, 25% of price) (option), expensed straight-line as non-cash `grantExpense` with paid-in capital rising by the same amount. Vested RSUs issue shares; vested options are exercised whenever in the money (the strike comes in as cash). Leaving forfeits the unvested part; booked expense isn't reversed.
- **Employee Stock Plan** (public only) adds +5 to executive loyalty in the resignation formula.
- **Delegation details:** `EXEC_DELEGATION` in balance.ts (COO benefits spending ≤ 8% of payroll; CFO dividend proposal 40% of trailing net income; CPO/CTO developments of 12 weeks at Medium within 1% of revenue; CMO awareness 45–55% within 3% of revenue; CRO steps appetite every 4 weeks, at most 4; CFO Capital targets `cfoTargetCr` 12% in raise steps of 1% of the bank; COO Expansion builds your last fit-out (`company.lastBuild`, else the newest branch's, then mid, then basic), `expansionEveryWeeks` 4, `expansionReserveWeeks` 8 of weekly costs (revenue less net income, averaged over `revenueWeeks`), `expansionMinRoom` 0.2 of §9.2 room, lot score footTraffic × min(1, distance to your nearest branch ÷ `expansionSpacing` 12 tiles), never past `CITY_BRANCH_GUIDE`; COO Company troubles option error `troublesError` 0.5 × (1 − Expertise/100)).

## 18. Rivals

- **18.1 State:**
  - strategy, brand color and monogram
  - branches: lot, quality profile, prices
  - per-branch aggregate books: deposits and loans grow toward the city's mature size × quality × the nominal index (§4.6) over 156 weeks
  - cash, capital ratio, public/private, shares and price, executives
- **18.2 Prices:** per §5, using strategy offsets.
- **18.3 Ratings:** the strategy quality profile ± normal(0, 0.2) per branch. Overall usually 3.0–4.4. Their app rating comes from the strategy.
  - **Rivals learn (2026-10-26):** at each year end, every rival branch in a city where you run open branches whose overall is below your average overall there moves each quality coin up by `RIVAL_LEARNING.step` (0.1), capped at `maxQuality` (4.6); a rival sharing a city with you lifts its app rating by the same step toward yours. A rival you out-serve closes the gap over the years instead of standing still.
- **18.4 Expansion** (monthly check per rival):
  - **Rival sales offices (stage C2b):** each rival lab holds one office per city, with a `size` from your `OFFICE_SIZES` table (`src/sim/rivalOffices.ts`). An office of size s stands for `sizeMult(s)` branches of the old network wherever they were summed: mature deposits, running costs, crowding (§18.1, weighted by size), the market-reference price weight (§5), campaign costs, the disruptor's grow-up count (`RIVAL_TECH.growUpBranches`) and city entry (`entryMinUnits`). Seeding draws a city's branches exactly as before, then folds each lab's into one office of the nearest size (1→Starter, 2–3→Standard, 4–7→Large, 8+→Flagship) with quality blended and mature books, so start-of-game rival strength is unchanged. Mergers, network splits and old saves fold the same way (`giveRivalOffice`, `foldRivalCity`); a charter opens one office sized for its 2–3 branches. The room rule counts every office, yours and theirs, by its multiplier.
  - **Growing (C2b):** the per-city roll below grows the lab's office there one size instead of opening a branch. Its chance is divided by the units the step adds (1.5, 2.5, 4), so a network adds units at about the old rate; the cost is `buildCost` × the units added. A city the lab serves without an office (it closed) reopens a Starter. A loss-making office shrinks one size, books in proportion, before a Starter ever closes. Events `RIVAL_OFFICE_GROWN` and `RIVAL_OFFICE_SHRUNK`.
  - If trailing profit > 0 and CR > 11%: in **each city it serves**, a `chance` (6%, disruptors ×0.25) roll to open one branch at the best free lot by `score = footTraffic × (1 − localShare) × incomeFit(strategy)`, while the city keeps room (`maxRivalLotShare` 40% of lots rival-held, `minFreeLotShare` 20% free; were 30%/30% until 2026-10-26). The build cost (`buildCost` × costIndex × the nominal index) comes off equity.
  - **Entering a new city (2026-10-26):** the same month, a rival with at least `entryMinUnits` (6) units (C2b; was `entryMinBranches`) rolls `entryChance` (5%, disruptors ×0.25) to open its first branch in a generated city with storefronts it doesn't serve: one in its home country, or any city once it serves `abroadMinCities` (3) cities. It picks the city with the most free lots (ties by id); `RIVAL_CITY_ENTRY` event and Ledger story. Cities you haven't visited aren't generated, so rivals grow where the world exists.
  - Close a branch whose contribution has been negative for 26 weeks. Weeks while its country is in recession or recovery don't count (2026-10-26): once costs kept pace with the economy (§4.6), whole networks of healthy branches closed in the first long recession, so a bank now rides out a downturn.
  - A bank you have bought, the regulator has seized or another rival has bought (§18.8) is never seeded into a city generated later. A chartered bank (§18.7) enters new cities from its own home country.
- **18.5 Financials:**
  - Branch earnings = `NIM_city × assets + fees − costs`, using the same constants as yours, simplified. Running costs are `RIVAL_BRANCH_COST` ($18k a week) × the city's cost index × the strategy's cost multiplier × the price list (§4.6).
  - Quarterly revenue and net income are reported.
  - **Recession failure check:** a rival with CR < 6% fails with 15% probability per quarter. It is seized and its network is offered as a **distressed sale** in M&A for 8 weeks at P/B 0.4–0.7. Unsold networks are split among the other rivals.
- **18.6 Price wars:** if your Rates rating in a city stays ≥ 4.0 for 8 weeks, each rival there has a 30% chance per month to raise deposit rates +0.15pp (`PRICE_WAR` incident and news).
- **18.7 New charters (2026-10-26):** at each year end every generated city (not a regional site) rolls for a newly chartered bank: `RIVAL_CHARTER.chance` (35%) when it has fewer active rival banks than its usual count (`competitorsFor`, because you bought one, the regulator seized one or one merged away), else `roomChance` (8%) when at least `roomShare` (35%) of its storefronts are empty. A city needs at least three free lots and `RIVAL_EXPANSION.minFreeLotShare` free. At most `maxPerYear` (3) charters a year, from the `charters` stream. The new bank draws a strategy (disruptor 35%, community 30%, premium 20%, incumbent 15%), an invented name (CONTENT §15 charter names), an ink and a CEO; it is private, its home is the city's country, it starts with `capital` ($25M) × the nominal index of equity, and opens 2–3 branches on the best free lots by the §18.4 score (C2b: one office on the best lot, sized for 2–3 branches, a Standard). Its branches ramp like any new rival branch, and it expands once it has a year of profits. A bank with capital and no loans yet reads a capital ratio of 100%. The paper runs "New bank on the block".
- **18.8 Rivals buy each other (2026-10-26):** at each quarter-end, after earnings, every rival rolls `RIVAL_MERGERS.chance` (4%) from the `rivalMergers` stream. A buyer needs four reported quarters, a profitable year and a capital ratio of its strategy target + `excessCr` (1.5pp). Its target is an active rival with equity at most `maxTargetShare` (50%) of the buyer's, not under your pending offer, that it meets in a shared city or in one of its home countries (most shared cities first, then the biggest). The price is book value × (1 + premium), premium U(15%, 40%); the deal goes ahead only if the buyer's pro-forma capital ratio (equity − premium × target book over the combined loans) stays at or above `MERGERS.minProFormaCr` (9%). At most `maxPerQuarter` (1) a quarter. Every holder is paid in cash at the deal price: your company's holding is marked to the price first (gain or loss to Investment gains, §19.7), then turned into cash; your personal shares become personal cash. The buyer takes the target's branches (lots change hands), cities, any corporate loans and credit line it made you (§19.9) and its payroll partnerships with employers; the target's status becomes `merged` (`mergedInto` the buyer) and it leaves the market like a bank you bought.
- **18.9 Campaigns and technology (2026-10-26):**
  - **Ad campaigns.** At each monthly expansion check, a rival with a profitable year rolls `RIVAL_MARKETING.chance` (4%) × its strategy weight (premium 1.2, incumbent 1, community 0.8, disruptor 0.5) in each city it serves where you run an open branch, from the `rivalAds` stream. A campaign lasts `weeks` (12): its branches there read `overall + boost` (+0.15, capped at 5) in your share formula (§9.3) and in their own deposit target (§18.1), and it costs `costPerBranch` ($6,000) a week per branch there × the city's cost index × the price list (§4.6), out of equity and quarterly earnings. The rival branch sheet shows a running campaign.
  - **Technology.** At each year end, a rival with a profitable year spends `RIVAL_TECH.spendShare` (5%) of that year's profit: its app rating moves `appStep` (0.08–0.12 by strategy) toward its strategy's `appCap` (community 4.0 to disruptor 4.9), and every branch's Products coin rises `productStep` (0.05) up to `RIVAL_LEARNING.maxQuality`. The paper notes an app crossing a half star.
  - **Growing up.** A disruptor with `growUpBranches` (20) branches becomes an incumbent: full expansion speed and the incumbent finance profile, with its prices drifting to the incumbent sheet (§5).

## 19. Markets and valuation

### 19.1 Listed companies
- **Shared weekly shock:** `marketShock ~ normal(equityMarketDrift/52, 0.018)`.
- **Company return:** `r = μ_sector(phase)/52 + β_c × marketShock + σ_c/√52 × normal()`.
- **Earnings weeks:** add a surprise of `normal(0, 0.04)` plus a sector-phase tilt.
- Price floor $1.
- EPS grows with growth_c ± noise. P/E = price / trailing EPS.
- Dividends are paid quarterly at the stated yield to company and personal holders.
- The equity market index = cap-weighted average of all listed companies (used by Wealth AUM).

- **Details (Stage 6):** beta comes from the sector; returns use the phase of the home country (a listed rival: its first city's country). The earnings tilt is 10% of the sector's annual μ; EPS grows by growth/4 plus the surprise each quarter. Dividends pay a quarter of the yield on the current price at quarter-end. The index ("Inference Composite", 1000 at the start) is chain-linked over non-bank companies and trading listed rivals; your bank isn't in it. History keeps 104 weeks.
- **Listed rivals** follow the §19.5 model (with the banking sector's shock folded into their sentiment); before their first report they're priced at book. Private rivals trade at book value; a seized rival's shares go to 0.
- **Company holdings** are marked to market every week through the non-cash P&L line `investmentGains`; they carry the 2.5× risk weight. You and your company together may own at most 30% of a listed company or rival.

### 19.2 Your bank while private
- `valuation/share = BVPS × PB_priv`
- `PB_priv = clamp(ROE_ttm / COE (0.10), 0.5, 2.5) × 0.8`

### 19.3 Private placement
- Sell new shares up to 25% of outstanding per round at `PB_priv` valuation × 0.9.
- Limits: at most 3 rounds, at least 26 weeks apart.
- The investor is a generated fund; it appears in top shareholders.

### 19.4 IPO
- **Eligibility:**
  - equity ≥ $25M
  - last 4 quarters profitable
  - Finance coverage' ≥ 0.8
  - tier Adequate or better
  - not in a Recession, unless CR ≥ 14%
- **Choices:** float 10–40% as new shares, and the investment bank (fee 4.0–6.5%; quality sets the first-day pop of 0–25%).
- **Offer price:** `BVPS × clamp(ROE_ttm/COE, 0.5, 3.0) × 0.9`.
- **Listing:** at the next quarter-end tick, with a news event. Eligibility is checked again then; if it fails the IPO is withdrawn.
- **Float:** the float % is the public's share after listing: new shares = outstanding × f ÷ (1 − f). The ticker comes from your monogram; the exchange is your home country's.

### 19.5 Your bank while public
- `target = BVPS × clamp(ROE_ttm/COE, 0.3, 3.0) × sentiment × irPenalty`
- `irPenalty = 1 − 0.15 × (1 − financeCoverage')`
- **Sentiment:**
  - mean-reverting random walk: σ = 2% per week, reverting at 5% per week toward 1
  - shocks: incidents −3% to −15%; earnings growth vs last quarter ±(0–8%); dividend raise +3%, cut −6%
- **Price:** `price = ema(price, target, 0.15) × (1 + normal(0, 0.025))`.
- Track the 52-week high/low and P/E.
- **Details (Stage 6):** sentiment stays within 0.4–1.8. Incident shock = −(3% + 12% × severity), severity per type in `INCIDENT_PRICE_SEVERITY` (minor branch mishaps, reminders, city and personal cases don't move it). Earnings growth of 25% or more (or a swing from loss to profit) gives the full ±8%. A weekly move of 8% or more is news.
- **Public duties:** Finance needs +4 staff; Finance k′ below 0.6 at quarter-end files late (fine 0.02% of the quarter's revenue).

### 19.6 Secondary offering
- New shares n, entered as a % of outstanding.
- Price per share = current × 0.97.
- Gross proceeds = n × price. Underwriting fee = bank fee %, default 4.55%. Capital raised = gross − fee.
- Price impact: −2% to −5%, scaled by size up to the 25% cap per offering.

### 19.6a Share buyback
- A listed bank buys n shares back from the public (entered as a % of outstanding, up to `BUYBACK.maxPct` 10%) and retires them.
- Price per share = current × 1.02 (`BUYBACK.premium`). Broker's fee = 1% of the gross (`BUYBACK.fee`). Cost = gross + fee.
- **Books:** cash −cost (financing) and retained earnings −cost, like a dividend, so the balance identity holds. Shares outstanding and the public holder each fall by n; the founder's stake rises.
- **Limits:**
  - one programme per 13 weeks (`gapWeeks`)
  - the public keeps at least 10% of the bank (`minFloat`): n ≤ (public − 0.10 × outstanding) / 0.90
  - capital after the cost leaves CET1 must stay in the Adequate tier or better
- Price impact: +1% to +4%, scaled by size up to the 10% cap. The weekly price then follows its target as usual, which now spreads earnings over fewer shares.

### 19.7 Trading
- Two accounts: company (Investment floor or portfolio) and personal.
- Commission 0.1%.
- Track position, average cost and gain/loss.

### 19.8 Rival bank M&A
- **Premium:** `premium = P_offer / price − 1`. Private rivals use price = BVPS × 1.0.
- **Acceptance:** `accept = sigmoid((premium − req)/0.06)`.
  - `req` = 0.30 for healthy targets, 0.15 for Watch-tier targets, −0.20 for distressed sales.
  - Rejected offers can be raised once per 2 weeks (`MERGERS.retryWeeks`; was 4 until 2026-10-26).
- **Regulator check (lightened 2026-10-26):** pro-forma CR ≥ 9% (`minProFormaCr`; was 10.5%, so the bank may sit in the Watch tier after a deal) AND your deposit share in every affected city ≤ 50% (`maxCityShare`; was 35%). A Lobbying "Fast-track merger" win relaxes the share limit to 65% (`fastTrackShare`; was 45%) for one deal. A **distressed sale** skips the share test altogether (`distressedShareExempt`): the regulator wants the failed network rescued, and the offer sheet says so in the share row.
- **Payment:** cash, or once listed, a share-for-share mix: the offer sheet picks 0%, 25%, 50%, 75% or 100% paid in new shares (`SHARE_DEALS.stockStep`).
  - **Share part:** S = stockPct × price × shares bought. New shares = S ÷ your share price on closing day, issued to the public; your own holding of the target is paid in the same mix, so its share part becomes founder shares.
  - **Board:** the target weighs `boardPrice = P_offer × (1 − stockPct × 0.05)` (`boardDiscount`), so an all-share offer needs about 5% more on the price to land the same premium.
  - **Books:** paid-in capital +S; goodwill = C + S + V − net assets. Pro-forma CET1 adds S, so paying in shares eases the capital test.
  - **Limits:** one deal may issue at most 50% new shares (`maxNewSharePct`). The issue moves your price −2% to −6% by size up to that cap (`SHARE_DEALS.impact`).
- **On close:**
  - Goodwill = price − target book equity (floored at 0; a negative difference is booked as a gain).
  - Books and wholesale funding merge.
  - Branches convert over 8 weeks: REBRAND_COST ($60,000) per branch (spread evenly over the 8 weeks), staff morale −10, managers kept.
- **Closing details (Stage 6):** the target brings cash R = D + E − L − (corporate debt you owe it, which is settled) − (lease deposits on its lots, which move to you); if R would be negative its loans are marked down until R = 0. Goodwill = cash paid + your company's holding of it at market − net assets. Personal holdings are paid out at the offer price. Acquired fit-outs aren't booked as fixed assets. Books split by a mature mix (deposits: chequing 28%, savings 34%, GIC 26%, business 10%, student 2%; loans: mortgage 62%, personal 8%, auto 12%, line of credit 8%, card 10%), which also sets the pro-forma risk weights. Build by seller strategy: premium → premium, incumbent and community → mid, disruptor → basic. City share counts branch deposit books of you and every rival not seized or acquired. A regulator block doesn't start the 4-week retry wait; an accepted deal that can no longer close (cash or tier) lapses.
- **Distressed ask:** BVPS × P/B rolled once at failure in 0.4–0.7, floored at $1 per share. Offers to a distressed bank compare with the ask.

### 19.9 Rival corporate lending (Banks layer)
- **Business loans:** 2–3 offers.
  - amount up to 40% of your equity
  - rate `policy + 0.025` to `+0.05`, by your CR
  - term 52–156 weeks
  - weekly payment amortized
- **Line of credit:**
  - limit = 20% of equity
  - rate `policy + 0.04`
  - draw or repay any week
- These are corporate debt and flow through corporate cash.

### 19.10 Currencies (FX)
A deliberately simple "country up or down" investment (DESIGN §5.12a). Your books stay in one currency.
- **State:** a strength level per country, `L[c]`, starting at 100. A currency's rate against your home currency is `fx[c] = L[c] / L[home] × 100`, so your home currency always reads 100 and can't be bought.
- **Weekly move** (tick step 12, after listed prices), per country:
  - `r_c = FX.growthW × gdp_c/100/52 + FX.rateW × policy_c/52 + FX.phase[phase_c] + normal(0, vol_c × FX.volMult)`
  - `L[c] *= 1 + r_c`, clamped to [FX.min, FX.max] × 100.
  - So `fx[c]` moves by about `r_c − r_home`: growth and rate differentials plus the cycle gap and noise.
  - HK is pegged to the US: `L[HK] = L[US] × (1 + normal(0, FX.pegVol))`.
  - Currency volatilities are in `src/data/currencies.ts`.
- **Positions:** buy an amount of a currency as the company or personally: `units = amount / fx[c]`; value = `units × fx[c]`. Buying and selling pay FX.spread on the amount (to `commissions` for the company). No carry is paid; the rate differential is already in the drift.
- **Books:** company positions are investments at value, marked through `investmentGains` like stocks; risk weight FX_RISK_WEIGHT (1.0).
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
- **20.4 Investing:** as the company (corporate cash, RWA 2.5×) or privately (personal cash).
- **20.5 Venture debt:**
  - Offer up to 10% of post-money at a rate you choose. Accepted if rate ≤ `policy + 0.08`.
  - Amortizes over 156 weeks.
  - On failure: LGD 0.8.
- **20.6 Marks:** shares × the latest round price per share. Public → market price. Failed → 0. Acquired → cash.
- **20.7 Details (Stage 7):**
  - **Creation:** seed startups get a share price from `VENTURE_GEN.sharePrice[stage]`, a founder plus 1–2 funds on the cap table, 4 quarters of revenue history at post-money ÷ the sector P/S multiple (`src/data/startups.ts`), cash for 2–10 quarters of burn and a funding history (last round 12% of post-money, each earlier one 40% of the next). The generator keeps the pipeline supplied from the name and blurb pools.
  - **Rounds:** the new shares are offered as two equal lots (a 30% round gives the original's two 15% lots). The round price becomes the mark when the round opens; shares are issued as lots are taken; unsold lots go to a fund at close. Generated startups open their first round at their current valuation.
  - **Margin:** target = sector margin − `VENTURE_MARGIN.gap` × max(0, 8 − Product maturity) / 8; each quarter closes 25% of the gap. A startup whose cash goes negative fails.
  - **IPO:** lists at the last round price × U(1.0, 1.5) (`VENTURE_IPO`) with vol 0.45, growth min(4μ, 20%) and no dividend; your stakes move into market holdings at cost, and the listing pop is marked through `investmentGains`.
  - **Investing** as the company (lots and venture debt) is refused at the Restricted and Critical tiers, like acquisitions. A startup you hold or lend to stays visible wherever you are.
  - **Housekeeping:** convention exclusives you never backed leave at year end; finished startups you didn't hold keep only the last 12; held ones stay.
- **20.8 Conventions:** this year's and next year's runs are kept (`state.conventions.runs`), from the CONTENT §19 calendar. CONVENTIONS.announceWeeks (4) before opening a run is announced (Ledger story) and 3–6 exclusive startups appear with rounds open through the event; it is open for CONVENTIONS.activeWeeks (4), a month each way so a player reading monthly results never misses one. Its startups are visible and buyable only from that city's convention centre while it is open, and never enter the Investment floor pipeline. The convention centre's map pin shows only from announcement to close.

## 21. Real estate

- **21.1 Listings** (per city, refreshed every 4 weeks):
  - size m², district, market rent per m² per year (district × city.rentIndex), occupancy
  - estimated value = `size × marketRent × 3.2 × cre/100`
  - asking price = estimate × U(0.95, 1.10)
  - Offers below asking: acceptance = `clamp((offer/asking − 0.85)/0.15, 0, 1)`.
- **21.2 Owned property:**
  - **Market rent follows the cycle** (2026-10-26): a building's base rent is `district × city.rentIndex` (§21.1) and today's market rent is `base × cre/100`. An owned building's `marketRent` eases toward today's by `REAL_ESTATE.rentEma` (0.05) a week (half-life about 14 weeks), so values move with the cycle at once and rents follow months later; a newly bought building starts at today's market rent. The owner's rent is clamped into its 50–160% range of the new market each week.
  - `occTarget = clamp(0.97 − 1.6 × (rent/(marketRent × (1 + pricingPower)) − 1), 0.30, 0.98)` and `occ = ema(occ, occTarget, 0.06)`. `pricingPower` is `EXEC_DELEGATION.rentPricingPower (0.10) × the CREO's expertise/100` while the CREO's Rents switch covers the building's owner (§17.2), else 0.
  - `bestRentRatio = 1 − (0.98 − 0.97)/1.6 = 0.99375`: the highest rent/market that still fills the building; `bestRent = floor(marketRent × (1 + pricingPower) × 0.99375 / 5) × 5`, inside the rent range. This is what the CREO sets at the 100% occupancy dial.
  - **Occupancy dial** (2026-10-26): for a stop `t` below 0.98, `rentForOccupancy = floor(marketRent × (1 + pricingPower) × (1 + (0.97 − t)/1.6) / 5) × 5`, inside the rent range, so occupancy settles at `t` (a hair above after rounding). Lower stops charge more per m² but earn less in total: at 90% about +5% rent per m² but about 4% less rent revenue than at 100% (80%: +11% per m², about 9% less), and more again after vacancy cost. The dial's tagline shows that against 100%.
  - weekly revenue = `size × rent × occ / 52`
  - maintenance = `size × marketRent × 0.55 / 52` (fixed)
  - vacancy cost = `size × (1 − occ) × 2 / 52`
  - net = revenue − maintenance − vacancy
  - ROI = annualized net / purchase price
  - Value tracks `cre`: `size × baseRent × 3.2 × cre/100`, i.e. size × today's market rent × 3.2, whatever the building's own `marketRent` has caught up to.
  - **For Sale** toggle: sells within 2–8 weeks at value × normal(1, 0.04).
  - Reference: the original showed about 8.7% ROI at 85% occupancy.
- **21.3 REO** (foreclosed homes, aggregated per city):
  - units = `Σ recovery / avgHomeValue(city)`; value tracks `hpi`; carrying cost 6% per year
  - **Rent** (every pool starts here): yield 4.5% per year of value at 90% occupancy
  - **Sell all:** 90% of value, settles in 1–4 weeks, cash to corporate cash; carrying cost and rent stop
  - (Hold, carrying the cost with no rent, was removed in schema v15: Rent always beat it.)
  - RWA weight 1.0.
- **21.4 Ownership:** choose Company or Private at purchase. Private property counts in personal wealth only.
- **21.5 Details (Stage 7):**
  - Each city has REAL_ESTATE.buildingsPerCity property buildings (S 6, M 9, L 12, XL 15), sized by city (`sqmRangeBySize`: S 1,500–5,000 m², M 2,000–7,000, L 3,000–12,000, XL 4,000–16,000) so the big cities hold the high-value towers; a building outside the financial, downtown and waterfront districts stays under `lowRiseMaxSqm` (5,000 m²). Every 4 weeks `max(1, round(0.4 × unowned))` are listed; listings not picked again disappear. An unowned building's occupancy is drawn once from U(0.75, 0.95). Estimates follow cre weekly; asking prices stay fixed.
  - **Offers** are answered at once. A rejected offer locks that listing until the city's next refresh. The offer stepper runs from 80% of asking up to asking.
  - **Books:** a company purchase pays investing cash and enters the balance sheet at the estimate; paying more or less than the estimate is posted to `propertyGains` (non-cash), as are weekly revaluations with cre. Rent → `rentalIncome`; maintenance and vacancy → `propertyCosts`. Company purchases are refused at the Restricted and Critical tiers.
  - Rent can be set from 50% to 160% of market rent in steps of 5 per m². Turning For Sale off cancels a pending sale. A sold building returns to the listable pool.
  - **REO:** carrying cost is charged in Hold and Rent; selling has none, can't be called off, and includes foreclosures that arrive meanwhile. The 10% haircut at settlement is a property loss. Mode changes don't require being in that city.
  - Deals of $10M or more make the paper.
- **21.6 Lobbying** (DESIGN §5.8.10, `src/data/lobbying.ts`, `LOBBYING`):
  - Campaigns: **Ease the capital buffer** ($2.5M, 55% success, 12% exposure): tier thresholds in that country drop 1pp for 52 weeks. **Fast-track a merger review** ($1.5M, 60%, 10%): the next deal that closes may reach 65% of a city's deposits (MERGERS.fastTrackShare). **Stall the capital buffer bill** ($1.2M, 50%, 15%): only while a capital-buffer bill is pending there; a win makes it fail its vote.
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
- **Founder shares:** 10,000,000 at the start, 100% of the bank. Value = shares × price (or the private valuation).
- **Asset values:**
  - homes track their region's hpi. **Rebuild** (the option exists in the original; effects assumed): costs 25% of value, takes 8 weeks, then value +20%
  - cars lose 12% a year, except classics, which gain 3%
  - genuine collectibles drift +3%/yr with σ 8% applied yearly
  - the jet loses 6% a year
  - a franchise grows with league revenue
- **Net worth** = personal cash + stocks at market + real estate + other assets.
- **Travel allowance:** TRAVEL_KM_PER_WEEK = 24,140 km, reset each weekly tick (step 11). Distances are great-circle km on CONTENT §2 coordinates (Earth radius 6,371 km), rounded to whole km. A flight within the remaining km is free and uses that distance. A longer flight is never refused: it costs FLIGHT_FARE × the destination's costIndex (FLIGHT_FARE = 80,000) from personal cash and leaves the allowance untouched; any part personal cash can't cover is paid by the bank (P&L `travel`, opex). Jet flights are free within the jet's range (Corvid 600: 6,000 km; Albatross 8000: global); longer hops use the normal rules. The jet's upkeep (8%/yr of value) comes from personal cash weekly; it loses 6% a year and resells at value × (1 − JET.resaleHaircut 0.10).
- **First visit:** the destination is generated on arrival (lots `citygen:{city}`, rivals `rivals:{city}` for every city but the start city, buildings `sites…:{city}`), then gets its first property listings.
- **Insider trading:** a personal trade in your own bank's shares within 2 weeks before a quarter-end has a 15% chance per trade of an investigation. Outcome: fine of max(3× the gain, $250k), overall rating −0.1 for 8 weeks, news.
- **Auctions:**
  - Each house holds a monthly auction of 3–5 lots, each with an estimate.
  - **Bidding:** the player sets a max bid. Clearing price = estimate × lognormal(1, 0.25). You win if max bid ≥ clearing and pay clearing + 12% buyer's premium.
  - **Counterfeits:** authenticity is hidden. Fake odds by house: 4% / 8% / 6%.
  - **Appraise:** fee 1% of purchase price, takes 1 week, reveals the truth. A fake is worth $0 and can't be consigned.
  - **Consigning** a genuine item: hammer price = value × lognormal(1, 0.15), minus a 10% seller fee.
- **Rich list:** a generated list of 50 fixed fortunes drawn log-uniform between $150M and $2B (`RICH_LIST.fortune`; was $1.5B–$120B until 2026-10-26, which no founder could reach), each growing with the home country's nominal index (§4.6; `richList.nominalRef` remembers the level at the last ranking, so an older save just starts from its current level) times its own real growth of −2% to +5% a year (`RICH_LIST.growth`; was a flat 4–8% before the index existed). Yearly rank event. A founder typically enters the list in years 8–12 and needs a long, strong game to top it.

## 23. Incidents

- Each incident type has a weekly base probability, a scope (branch, city, company or personal), conditions, multipliers, a cooldown (default 8 weeks per scope) and 2–3 options with costs and effects.
- Full list in CONTENT (Incidents).
- **Branch incidents:** auto-resolved when "Branch troubles" is delegated (§17.1), with a toast. Otherwise they queue and pause the game.
- Unresolved incidents choose the worst option after 4 weeks.

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
- **Tabs filter by category:** Top = the 6 highest priority; World; Banking; Business; Markets; Politics; Sports.
- **Your routine stories are rationed (2026-10-26, owner's ask: more stories that aren't about your bank).** The weekly figures print when the week is news (a loss, a swing back to profit, a record at least `NEWS_RECORD_MARGIN` (10%) above every earlier week once `NEWS_RECORD_MIN_WEEKS` (12) have passed) or every `NEWS_ROUTINE_EVERY_WEEKS` (4) weeks; a Watch-tier capital note on a change of tier or every 4 weeks (Restricted and Critical every week). Weekly figures, the loan tally, the Watch note and the rate watch share the `youRoutine` cap of 2 per issue; auctions are capped at 1.
- **24.1 World desk.** `NEWS_WORLD.perIssue` (4) stories a week from around the ten countries, none about your bank (World tab). Each slot picks the home country with `homeShare` (25%), else one abroad, then one of 61 beats (`src/data/newsWorldBeats.ts` and `newsWorldBeatsMore.ts`: weather and nature, science and building, work and prices, everyday life, crime and courts, travel and food, culture and odd news) that fits the country: its phase (strikes in a slowdown or recession, layoffs and gloom in a recession, hiring in an expansion with unemployment ≤ `lowUnemployment` 4.5%, new plants and transit lines in an expansion or recovery), inflation ≥ `highInflation` (3.5%) for price stories, house prices over a year (> `housingHot` 4% for rents, falling for building slowdowns), the month (southern seasons flipped for Australia) and its climate (typhoons in Hong Kong and Japan, monsoon in Singapore, bushfires in Australia). One beat per issue; a beat rests `cooldownWeeks` (26) in a country. Flavour only: nothing changes in the simulation. Priority 40 at home, 36 abroad; group cap 4.
- **24.2 Company desk.** A listed company whose share price moved at least max(`moverMin` 6%, `moverSigma` 2.2 × its weekly volatility, vol ÷ √52) this week gets a Markets story quoting its real closing price, with a reason that fits its sector and direction (cap 2, priority 44 + |move| ÷ 2, at most +10). With `corporateChance` (35%) an issue also carries corporate news from a non-bank listed company: a new chief executive, a product launch or a new site. The reasons explain a move the market model already made; nothing here moves a price.
- **24.3 Money Column.** Every `NEWS_COLUMN.everyWeeks` (2) weeks, a personal-finance column for the home country (Business tab, priority 32). Topic: a rate move within `rateWindowWeeks` (13), inflation ≥ 3.5%, house prices up over 4%, or a slowdown/recession; one is picked at random when several apply; otherwise an evergreen tip. It quotes the real policy rate, inflation, house-price change and unemployment.
- **24.4 Commodities.** Oil, gold, wheat, coffee and copper (`src/data/commodities.ts`) move every week on their own `commodities` stream: log step = noise (each commodity's weekly vol) + `driftPerWeek` (0.4%) × its lean (gold −1, the rest +1) × the world mood (average over countries of expansion 1, recovery 0.5, slowdown −0.5, recession −1) + `revert` (3%) × (ln(base × average nominal index) − ln price). A week of at least `newsMove` (8%) is a story with a reason; otherwise a one-year high or low is, if the last `recordGapWeeks` (8) had none; the first issue of each month carries a wrap of all five with their four-week change (priority 37). Prices over $1,000 print with separators and no cents. Flavour only.
- **24.5 From the archive.** Every `NEWS_ARCHIVE.everyWeeks` (4) weeks the issue's lead story is kept for good (`desk.archive`), skipping routine figures, columns, wraps, rate decisions, economy and market reports, results and dividends. On those weeks the paper reprints the story from 10, 5, 3, 2 or 1 years earlier, the furthest first that hasn't been reprinted; one-year-old stories only every `oneYearEvery` (2) archive weeks so others age further. A story is flagged once its reprint makes the issue, so each runs again at most once. Priority 31, in the original story's tab.
- **24.6 World calendar.** Fixtures (`src/data/worldCalendar.ts`) fire on their week of the year. The **Nations Cup** (years ≡ 2 mod 4, week 25) and **World Games** (years ≡ 0 mod 4, week 30) are announced 4 weeks ahead in a random game city; the whole event is played at once from the `news` stream and stored as a script of weekly stories (`desk.scheduled`). Cup: two groups of five, round robin, top two to the semi-finals; goals per side ~ Poisson(1.3 + 1.5 × strength gap, ≥ 0.2), host +0.1 strength, level knockout games go to penalties (0.5 + 0.5 × gap). Games: golds, silvers and bronzes per nation ~ Poisson(3 + 30 × strength, host +8). Stories: announcement, opening (or opening ceremony), groups (or halfway leader), semi-finals, final (or closing table). The **World Expo** (years ≡ 0 mod 5, week 18) opens and closes 26 weeks later. Every year: film awards (week 10), New Year fireworks (week 1), a science prize (week 41) and the Grand Sale Weekend (week 47; a record in an expansion or recovery at home, quiet otherwise). Priority 46 (finals and closing days 52, annual 38), cap 2 per issue. Flavour only.
- **Sports abroad:** each week one league from a country you don't operate in takes its turn in the Sports tab (priority 22, cap 1), and every league's season finish reports at year end (yours rank higher).
- **Archive:** keep the last 52 issues.
- **Politics:** fictional, neutral parties. Policy proposals (fee caps, capital buffers) can become regulatory events, e.g. CAPITAL_BUFFER +1pp for 4 quarters in that country. Bills and votes draw from their own `politics` stream, so news changes never change which laws pass.
- **Polls and elections:** every `NEWS_POLL_EVERY_WEEKS` (6) weeks every country's poll drifts (σ 1.2 points, floor 8%) and renormalises; the home poll makes a story. Every country votes every `NEWS_ELECTIONS.termWeeks` (208), the first votes staggered `staggerWeeks` (21) apart by country. The campaign is announced `campaignWeeks` (6) ahead with the latest poll; on the day the poll leader wins with `leaderWinP` (70%), otherwise the runner-up, and the winner gains `winnerBounce` (8) poll points. Priority 60 where you operate, 42 elsewhere; cap 2. Who governs is flavour only.

## 25. Balance targets

Run `npm run balance` with seed 42 and the start city Calgary, unless noted. Branch checkpoints read the first branch of the steady strategy, built on an "average lot" (the median-rent free lot in Midtown). Weekly revenue and income checkpoints use a 4-week average, so a single large default doesn't swing them.

**Updated 2026-10-25 (cross-seed calibration):** the first-branch checkpoints describe a typical city, so they are judged on the median of 20 cities: `npm run balance -- --years 5 --seeds 1-20` runs steady once per seed, prints each seed's key numbers and checks every band against the median (`scripts/branchCheckpoints.ts`). One city's "average lot" can sit 30–40% above or below the median (seeds 7, 8 and 16 below; 14 and 17 above), which is the map doing its job, not drift. A single-seed run still prints its own first-branch checks for reference. The median city meets every band; its revenue and income keep climbing with deposits through years 2–3 ($101k/$40k at week 104, $112k/$46k at week 208). Since the city-wide pool (§9.2) the home city fills at about 7 branches, so the first branch levels off at about $100–105k revenue and $40–43k income, and one band ($95k+ / $38k+) applies from week 104.

**Updated 2026-10-26 (stage C2a, sales offices):** a city now holds one office of yours, grown in place (§6.4), with reach that grows with its size (§9.1). The steady script grows its busiest office a size whenever the next size reaches more of the city, the city still has 20% room and cash is over 2× the cost, and opens an office in the next city otherwise. The first-office checkpoints therefore follow the home office as it grows rather than a single storefront that levels off: week 26 and its build and payback bands are unchanged, and the later bands were re-set from the 20-city median (week 52 $57.9M / 5,597 customers / $43k income; week 104 $128M / $268k / $96k; week 156 $194M / $395k / $134k; weeks 208–260 $244–269M / $517–520k / $180–191k; loans 68–71% of deposits, as an office's deposits outgrow its loan demand). Branch counts gave way to offices and cities: seed 42 reads 2 offices at year 2, 20 cities at year 10 with $26B nominal ($11.9B real) of assets, and lists in week 235. Aggressive grows its office down to a 7.5% capital ratio (its own opening bar stays 8.5%), so it runs at Restricted from year 3, as its row expects.

**Updated 2026-10-26 (stage C2b, rival sales offices):** rivals hold one office per city (§18.4). Start-of-game rival strength is unchanged (seeding folds the same draws), but rounding to four sizes shifts market-reference price weights slightly toward smaller labs. Every strategy target and the 20-city median still pass (median payback 36.5 weeks); seed 42's own first-office payback reads 42 weeks and its IPO week 274 (was 39 and 235), a single-seed reference reading per the cross-seed rule above.

**Updated 2026-10-26 (stage C2c, data centers):** steady (cash over 4× the cost) and aggressive (3×) build one Row-hall data center from year 5 on the busiest free lot of a city with their office; stress follows steady. Seed 42 builds in weeks 260–300. Every strategy target and the 20-city median still pass; seed 42 steady's year-10 real assets read $8.4B (was $8.6B: about $5M to build and $35–40k a week of rent and power).

**Note (Stage 5):** the branch checkpoints are a seed-42 reference and assume Expansion. With every country simulated, seed 42's path has a recession at weeks 97–134 and policy cuts to 1.5%, so week 156 reads about $90k revenue / $41k income (below band) before recovering inside it by week 208. Other seeds (e.g. 7, 99) already missed the first-branch checkpoints in Stage 4 because their median Midtown lot is weaker; a cross-seed calibration is open.

**Note (Stage 6):** steady takes one private placement when capital binds and lists as soon as it's eligible: seed 42 lists in week 222, seed 7 in week 248, seed 99 in week 261 (years 5–6), with the founder keeping 60%. The IPO money lifts steady from 7 to about 44 branches in year 5. Acceptance test: `tests/sim/ipoAcceptance.test.ts`.

**Updated 2026-10-24 (Stage 1, owner's decision):** with CONTENT's fees and card rates at the 3.5–4% policy rates the macro rule produces, a mature branch earns about $50–65k a week on $120–145k of revenue. That is close to the original's store economics (about £51k income on £84k revenue), so the targets below were raised to match instead of cutting fee income. The old values are kept in brackets.

| Checkpoint | Target |
|---|---|
| First branch build + lease deposit (mid build, average lot) | $300k–$450k, leaving room for at most one more basic branch from the $900k start |
| First branch weekly income turns positive | week 6–16 |
| Branch at week 26 | deposits $15–30M; income positive |
| Office at week 52 | deposits $35–80M; loans 65–90% of deposits; customers 3,500–8,000; income +$25k–$60k/week [was $30–50M, 75–90%, 3,000–5,000 and $20–40k before C2a] |
| Mature branch (week 104+) | deposits $38–70M (organic chequing growth keeps it creeping up; in start-of-game money) [was $40–65M, then $40–70M until 2026-10-26]; loans 70–90% of deposits [was 75–90%]; revenue $85k–$150k/week from week 156, $80k+ at week 104 [was $110k+ from week 208, then $95k+ from week 156 until 2026-10-26, and $85k+ at week 104 until the price-list change of 2026-10-26, when the 20-city median read $84k there on main as well]; income +$32k–$70k/week from week 156, +$31k+ at week 104 [was +$45k+ from week 208, then +$38k+, then +$35k (+$33k at week 104) until the rival-competition change of 2026-10-26: chartered banks replace the rivals that fail in recessions, rivals advertise in your cities, and rivals ride out downturns instead of closing branches (§18.4), so the 20-city median first branch reads $32.6–35k from week 156 and $32.8k at week 104]. Since rivals learn (§18.3), a first branch the steady script never upgrades gives up about 1.5% of its deposits a year to them, which is where the 2026-10-26 lower edges come from (seed 42 reads $40.3M, $88k and $38k real at week 260 against $43.6M, $97k and a one-week default loss before). With fewer storefronts per city (CONTENT §3, 2026-10-25) rival branches stand closer to yours, so year 2 ramps a little slower. Since the city-wide customer pool (§9.2, 2026-10-25) the home city fills at about 7 branches by year 4, so the first branch levels off instead of climbing through years 4–5. Loan-ratio, revenue and income checkpoints in a recession or the 26 weeks after it read n/a |
| Growing home office (C2a, from week 104) | week 104: deposits $70–180M, revenue $160–380k/week, income $55–140k/week; week 156: $110–260M, $250–520k, $85–190k; weeks 208–260: $140–360M, $320–720k, $110–260k; loans 65–90% of deposits. Replaces the mature-branch row above, kept for the record |
| Payback of a mid build on an average lot | ≤ 40 weeks from opening |
| Year 2 (steady) | 1–4 sales offices [3–8 branches before C2a; 4–8 before 2026-10-26]; HQ required; cash never < 0 |
| Capital first binds (no raises) | years 1–3; private placements and the IPO are the intended growth fuel |
| IPO eligible (steady) | years 3–6 |
| Year 10 (steady) | offices in 10–25 cities [60–250 branches before C2a]; total assets $6–40B [was 60–200; $8–40B] |
| Year 15 (steady) | weekly revenue $20–80M; founder net worth $2–40B |
| Annual loan loss rate | 0.4–1.0% of loans in Expansion; 1.2–2.5% in Recession |
| Net interest margin | 3.0–5.0% [was 2.0–3.5%; even §12.1's own figures give about 4.7%] |
| Company loan-to-deposit ratio | 0.75–0.90 in Expansion (tune mortgage approval first) |
| ROE | 8–18% in Expansion |
| Turtle (deposits only) | profitable, but < 40% of steady's year-5 equity |
| Aggressive (appetite 5, cheapest prices) | higher growth to year 3, then Watch tier or worse in the first recession |
| Recession stress (forced at year 3) | steady survives without Critical tier; aggressive hits Restricted or Critical |

**Note (Stage 8):** steady now expands to other cities once the home city has no good lots left (years 5–6). Year 10: seed 42 223 branches / $9.8B assets, seed 7 171 / $7.2B, seed 99 167 / $8.1B. Seed 42 sits just above the branch band and seed 7 just below the asset band; left for the full tuning pass (owner: testing and tuning come later).

**Updated 2026-10-24 (Stage 10 balance pass):** `npm run balance` now checks each strategy's own targets (`scripts/strategyTargets.ts`): the first-branch checkpoints apply to steady only, as this section always said; turtle is compared with a steady run on the same seed; aggressive's year-3 growth is total assets against steady's, and its first-recession tier must be Watch or worse; stress checks steady never reaches Critical and runs aggressive under the same forced recession (must reach Restricted or Critical). Three bands moved, with reasons: mature deposits to $40–70M and loans to 70–90% of deposits (chequing balances keep growing for five years while loan demand doesn't — the seed-42 branch reads $67M and 74% at week 260), and year 10 to 60–250 branches and $6–40B of assets (since Stage 8 steady expands to other cities, which the old band didn't foresee; seeds 42/7/99 read 235/171/167 branches and $10.3/7.2/8.1B). Seed 42: every target met for steady, turtle, aggressive and stress. Seeds 7 and 99 still miss the first-branch checkpoints (their median Midtown lot is weaker) — part of the owner's later tuning pass.

**Note (2026-10-26, the nominal index §4.6):** every money band in this table is in start-of-game money. Balances and wages now grow with each country's economy (about 9% a year in an expansion), so `npm run balance` deflates the first-branch checkpoints and the year-10 asset band by the home country's index before judging them, prints the index in its yearly table, and labels the asset check "(real)". Nominal figures run far above the bands in a long game by design: seed 42 steady reads about $20B of deposits at year 10 (index 2.2) where the real figure is $9B.

**Strategies** (`scripts/strategies/*.ts`):
- `idle`: one branch, no further actions
- `steady`: grow the busiest office a size, or else open an office in the next city, when cash > 2× the cost and CR > 12% (C2a); HQ floors staffed to 100%; appetite 3; default prices
- `aggressive`
- `turtle`: lending products off; grows its one office to Standard at most (C2a: a bigger office needs an HQ team its deposit-only income can't pay)
- `stress`: steady plus `forceRecessionAtWeek = 156`

**Output:** a yearly table (branches, deposits, loans, equity, CR, NIM, loss rate, ROE, cash, net worth) plus a warning list for every out-of-range target.

## 26. Parameter index (`balance.ts`)

Group the constants like this, with the defaults shown above:

- **TIME:**
  - `DAY_MS = 1000`, `SPEEDS = [0, 1, 2, 4]`
  - `START_DATE = '2027-01-04'`, `QUARTER_ENDS`
- **START:**
  - `START_CASH = 900_000`, `CHARTER_CAPITAL = 2_000_000` (in reserves), `START_SHARES = 10_000_000`
  - `START_CASH_OPTIONS = [600_000, 900_000, 1_200_000, 1_500_000]`; `DEV_PAYMENT = 10_000_000` (Settings developer tools); `COMPETITORS = { min: 1, max: 5 }`
  - `DIFFICULTY` per level (`demandMult` on prospects §9.2, `rivalQuality` coins added at rival seeding, `rivalRateEdge` pp toward customers on rival rates §18.2, `lossMult` on new-loan and business-loan PDs §10.3, §11):

    | Level | demandMult | rivalQuality | rivalRateEdge | lossMult |
    |---|---|---|---|---|
    | Easy | 1.15 | −0.3 | −0.10pp | 0.85 |
    | Normal | 1 | 0 | 0 | 1 |
    | Hard | 0.92 | +0.2 | +0.10pp | 1.10 |
    | Expert | 0.85 | +0.4 | +0.20pp | 1.25 |
  - **Competitors:** a city takes the first n rivals in strategy order. Its starting rival branch total (CONTENT §15) scales by n ÷ the city's usual count, with at least one branch each.
  - `START_PERSONAL_CASH = 150_000`, `START_CEO_SALARY = 120_000`
  - `CHARTER_MIN_EQUITY = 2_000_000`
- **MACRO:**
  - `MACRO_TRANSITIONS`, `MACRO_TARGETS`, `MACRO_EMA`
  - `MACRO_MIN_PHASE_WEEKS`, `POLICY_FLOOR`, `POLICY_CAP`
- **RATES:** `DEPOSIT_BETA_UP`, `DEPOSIT_BETA_DOWN`, `RIVAL_PRICE_DRIFT`
- **STAFF:**
  - `BASE_TELLER_WAGE`, `MANAGER_BASE_SALARY`
  - `QUIT_BASE`, `HIRE_BASE`, `SERVICE_VISIT_RATE`
- **MARKETING:** `AWARENESS_DECAY`, `BRAND_DECAY`, `GRAND_OPENING_BONUS`
- **DEMAND:**
  - `PROSPECT_RATE`, `CATCHMENT_MULT`, `SATURATION_EXP`, `RIVAL_RADIUS`
  - `CITY_MARKET`, `CITY_SATURATION_EXP`, `CITY_BRANCH_GUIDE`
  - `PRODUCTS_PER_CUSTOMER`, `REVIEW_RATE`, `FEE_STEP_MIN`
- **BOOKS:**
  - `GIC_RENEW_BASE`, `PREPAY_BASE`, `INTERCHANGE`
  - `FX_PER_CUSTOMER`, `SBL_BASE_PD`, `LOANDESK_BASE`
- **BRANCH:** `EQUIP_MAINT`, `FITOUT_UPKEEP`, `BRANCH_OVERHEAD`, `CLOSE_RECOVERY = 0.30`
- **TREASURY:**
  - `LIQ_MIN`, `LIQ_TARGET_DEFAULT`, `BOND_SHARE_DEFAULT`, `BOND_DURATION`
  - `OVERNIGHT_SPREAD`, `WINDOW_SPREAD`, `RATING_SPREADS`
  - `DEPOSIT_PER_EMPLOYEE`
  - `FUNDING_REFRESH_WEEKS = 2`, `FUNDING_OFFERS`, `FUNDING_SIZE`, `FUNDING_RATE_NOISE = 0.0008`, `TREASURY_PENALTY = 0.005`
- **CAPITAL:** `RISK_WEIGHTS`, `OP_RISK_MULT`, `TIER_THRESHOLDS`, `RECAP_DISCOUNT = 0.5`
  - `REGULATOR_REVIEW` (fail base 0.02, ethics base 1.6, fine 0.05–0.3% of trailing revenue), `RISK_LOSS_WEEKS = 13`, `DELINQUENCY`
- **HQ:**
  - `OFFICE_RENT_PER_FLOOR`, `FLOOR_FITOUT`, `DESKS_PER_FLOOR_OPTIONS = [24, 32]`, `EXEC_SUITE_DESKS = 7`
  - `FOUNDER_MODE_ASSETS = 250_000_000`, `DEV_SIGMA`
- **MARKETS:**
  - `COE`, `IPO_MIN_EQUITY = 25_000_000`, `PRIVATE_DISCOUNT = 0.8`
  - `SECONDARY_DISCOUNT = 0.03`, `REBRAND_COST`, `COMMISSION = 0.001`
- **INVESTMENTS (Stage 7):**
  - `VENTURES` (pipeline, growth, rounds, failure, IPO and acquisition odds), `VENTURE_DEBT`, `VENTURE_MARGIN`, `VENTURE_GEN`, `VENTURE_IPO`, `VENTURE_NEWS`
  - `VENTURE_RISK_WEIGHT = 2.5`, `VENTURE_DEBT_RISK_WEIGHT = 1.5`, `PROPERTY_RISK_WEIGHT = 1.0`, `FX_RISK_WEIGHT = 1.0`
  - `CONVENTIONS`, `REAL_ESTATE`, `REO`, `LOBBYING`, `FX`, `FX_START_INDEX = 100`
- **PERSONAL:** `PERSONAL_TAX = 0`, `INSIDER_WINDOW_WEEKS = 2`, `INSIDER_PROB = 0.15`, `TRAVEL_KM_PER_WEEK = 24_140`, `FLIGHT_FARE = 80_000` (× destination costIndex), `EARTH_RADIUS_KM = 6_371`, `JET = { upkeepRate: 0.08, depreciation: 0.06, resaleHaircut: 0.1 }`; Stage 9: `HOMES_CFG`, `CARS_CFG`, `COLLECTIBLES_CFG`, `AUCTIONS`, `FRANCHISE`, `RICH_LIST`, `INSIDER` (src/config/balance.ts)
- **FEATURES:** flags per stage (ROADMAP)
