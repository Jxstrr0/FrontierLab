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
14. **Year-end** (first tick of a new year):
    - rankings: Fastest Growing Banks, Rich List
    - next year's conventions calendar
    - sports season results
    - fee products re-priced for inflation
15. `incidents.roll` (§23)
16. `news.compose` (§24)
17. Weekly results snapshot, then autosave.

**Central bank meetings:** each country meets on the fixed week-of-year list in CONTENT (Countries table). A meeting in a given week is processed inside step 1.

**Auto-pause** when any of these needs a decision: an unresolved incident, the weekly results modal (if enabled), the board meeting reminder (once per quarter), or Loan Desk applications expiring this week (optional setting).

## 3. RNG and determinism

- Use the `sfc32` PRNG.
- Transcendental math (exp, log, non-integer powers, cos, tanh) goes through `src/sim/detmath.ts`, built from + − × ÷ and sqrt only. Engines are free to round `Math.pow` and friends differently (Node 22 and 24 already disagree), and these are bit-identical everywhere. ESLint bans the Math versions and `**` in `src/sim`.
- **Per-system streams:** each stream's seed = hash(saveSeed, streamName). Stream names include `macro`, `rivals`, `demand`, `loanDesk`, `market`, `ventures`, `incidents`, `news`, `citygen:{cityId}`, `people` and `auctions`. Adding draws to one system then never reshuffles another, which keeps balancing stable.
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
  - Fee products re-price yearly by inflation.
- **Credit cards** use a fixed APR that isn't FTP-linked. They re-price only on large moves (|ΔFTP| ≥ 1pp since the last change).

## 6. Branch staff, capacity, managers

### 6.1 Market wage
`marketWage(city) = BASE_TELLER_WAGE (24.00/hr) × city.wageIndex`.

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
- `staffNeeded = teller.stations + lobby.advisorOffices`
- `staffing = min(1, staff / staffNeeded)`
- `C = (teller.stations × teller.productivity × staffing + atm.productivity) × (0.7 + 0.3 × skill/100) × (0.85 + 0.15 × morale/100) × campaignCapacity`. `C` is customer interactions per week.
- `visitRate = SERVICE_VISIT_RATE (0.03) × (1.2 − 0.1 × appRating)`. A better app means fewer branch visits.
- `L = captured + visitRate × customers` (load)
- `W = L / C` (wait index). Label it Short below 0.8, Busy from 0.8 to 1.1, and Long above 1.1.
- `served = captured × clamp((C − visitRate × customers) / captured, 0, 1)`

### 6.5 Branch managers
- **Hiring.** Hire from 3 candidates; the pool refreshes every 4 weeks.
  - Skills: People, Product, Marketing and Ethics, each drawn from normal(60, 15) and clamped to 25–98.
  - Salary ask: `MANAGER_BASE_SALARY (72,000) × city.wageIndex × (0.7 + 0.6 × avgSkill/100)`.
- **People** lifts morale and skill (§6.2, §6.3) and the Service rating (§8).
- **Product** sets delegated pricing quality and Loan Desk estimate accuracy (§11, §17).
- **Marketing** multiplies campaign effects by `0.8 + 0.4 × marketing/100`.
- **Ethics** multiplies mis-selling, fraud and walkout incident odds by `1.6 − ethics/100` (§23).
- **No manager:** Service −0.3, morale −5, and no delegation.

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
- `population = footTraffic × CATCHMENT_MULT (1.0)` (tuned from 2.5 in Stage 1 so branches mature within about two years)
- `penetration = customers / population`

### 9.2 Prospects
`P = footTraffic × PROSPECT_RATE (0.040) × (0.25 + 0.75 × e) × loanDemand^0.5 × (1 − penetration)^SATURATION_EXP (2.8) × noise(±5%)`. (Stage 1 tuning: 0.030 → 0.040 and 2.5 → 2.8.)

**Pacing intent:** like the original's stores, a branch should reach most of its mature size within about a year, with most of the growth in the first six months, rather than compounding for a decade. High intake plus strong saturation does that, so a mid build pays back in under ~40 weeks.

### 9.3 Share
- `A = (Overall/5)^2.2` for this branch.
- **Competitors** are every branch (rival or your own) within RIVAL_RADIUS (12 tiles). Each gets weight `w_j = 1 / (1 + d_j/6)` and `A_j` computed from its own overall rating.
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
After all flows, if `L < LIQ_MIN × deposits`:
- **Auto-funding ON:**
  1. Borrow overnight interbank up to OVERNIGHT_LIMIT = `0.10 × deposits × ratingMult` at `policy + 0.0020 + ratingSpread + treasuryPenalty`.
  2. Beyond that, borrow from the central bank window at `policy + 0.0100`. Window stigma: overall rating −0.05 on every branch for 4 weeks, and a 20% chance per week of a `WINDOW_USE` news event.
- **Auto-funding OFF or limits exhausted:** **funding freeze.** `fundingGate = 0` until `LR ≥ LIQ_MIN + 0.02`.

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
- **Listings:** floors 3–10, desks per floor 24 or 32 (set per building).
- **Rent:** weekly rent = `floors × OFFICE_RENT_PER_FLOOR ($1,100) × city.rentIndex`. Deposit = 8 × weekly rent.
- **Floors:** each floor slot holds one department. Fit-out = FLOOR_FITOUT ($120,000) × city.costIndex, a fixed asset.
- **Desks per floor:** set by the building, 24 or 32 (the original showed both). Investment floors always have 32. The Executive suite always has 7 desks (you plus six executives).
- **Releasing:** you can release a floor or a whole office. Staff above the remaining desks are let go, with 4 weeks' salary as severance.

### 16.2 Department state
- `staff`, `desks` (sum across offices), `salary`, `skill`, `morale`, `targetStaff`, `openPositions`.
- Staffing works like §6.2–6.3, using the department market salary (CONTENT Floors) in place of wage.

### 16.3 Requirements
- Per-department formulas are in CONTENT (Floors).
- **Founder-mode ramp:** `ramp = (totalAssets ≥ $250M) ? 1 : clamp((branches − 2)/4, 0, 1)`.

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
- **Seats:** CEO (you), COO, CFO, CPO, CMO and CTO as in the original, plus CRO as a seventh. The Executive suite has 7 desks.

**Delegations:**

| Exec | Domain | Delegations |
|---|---|---|
| COO | HR, all branches | **Branch operations:** auto-hires managers for new branches and turns on default delegation. **HR benefits:** keeps average morale ≥ 70 at least cost. **HR division:** auto-staffs every floor to 100% coverage. |
| CFO | Finance, Treasury | Halves statement delays. **Treasury:** auto-funding, bond share and buying funding offers to keep LR within ±2pp of target. **Dividends:** proposes a dividend at board meetings. |
| CPO | Products | **Pricing:** keeps the company lineup priced like a delegated manager (§17.1) when Apply-to-all is on. **Developments:** starts one when none is running, within a budget cap of 1% of revenue. **Models:** switches to the bureau package with the best defaults saved per dollar. |
| CTO | IT | App rating bonus (§16.9); runs digital projects. An empty seat applies the vacancy penalty. |
| CRO | Risk | Tunes risk appetite to hold CR ≥ 12% and the annualized loss rate ≤ 1.2% (expansion target); Loan Desk policy. |
| CMO | Marketing | Runs brand campaigns to hold `b` near 0.5 in active cities within a budget cap of 3% of revenue. |

**Resignation:** weekly probability `0.002 × (1.5 − loyalty/100) × (pay/market < 0.9 ? 2 : 1) × (unvested grants ? 0.5 : 1)`. Triggers the `EXEC_POACHED` incident.

**Candidate pools** refresh every 4 weeks. A University Graduate Program adds +10 to candidate skills.

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
- **Delegation details:** `EXEC_DELEGATION` in balance.ts (COO benefits spending ≤ 8% of payroll; CFO dividend proposal 40% of trailing net income; CPO/CTO developments of 12 weeks at Medium within 1% of revenue; CMO awareness 45–55% within 3% of revenue; CRO steps appetite every 4 weeks, at most 4).

## 18. Rivals

- **18.1 State:**
  - strategy, brand color and monogram
  - branches: lot, quality profile, prices
  - per-branch aggregate books: deposits and loans grow toward the city's mature size × quality over 156 weeks
  - cash, capital ratio, public/private, shares and price, executives
- **18.2 Prices:** per §5, using strategy offsets.
- **18.3 Ratings:** the strategy quality profile ± normal(0, 0.2) per branch. Overall usually 3.0–4.4. Their app rating comes from the strategy.
- **18.4 Expansion** (monthly check per rival):
  - If trailing profit > 0 and CR > 11%: open one branch at the best free lot by `score = footTraffic × (1 − localShare) × incomeFit(strategy)`.
  - Disruptors open rarely, at 0.25× the rate.
  - Close a branch whose contribution has been negative for 26 weeks.
- **18.5 Financials:**
  - Branch earnings = `NIM_city × assets + fees − costs`, using the same constants as yours, simplified.
  - Quarterly revenue and net income are reported.
  - **Recession failure check:** a rival with CR < 6% fails with 15% probability per quarter. It is seized and its network is offered as a **distressed sale** in M&A for 8 weeks at P/B 0.4–0.7. Unsold networks are split among the other rivals.
- **18.6 Price wars:** if your Rates rating in a city stays ≥ 4.0 for 8 weeks, each rival there has a 30% chance per month to raise deposit rates +0.15pp (`PRICE_WAR` incident and news).

## 19. Markets and valuation

### 19.1 Listed companies
- **Shared weekly shock:** `marketShock ~ normal(equityMarketDrift/52, 0.018)`.
- **Company return:** `r = μ_sector(phase)/52 + β_c × marketShock + σ_c/√52 × normal()`.
- **Earnings weeks:** add a surprise of `normal(0, 0.04)` plus a sector-phase tilt.
- Price floor $1.
- EPS grows with growth_c ± noise. P/E = price / trailing EPS.
- Dividends are paid quarterly at the stated yield to company and personal holders.
- The equity market index = cap-weighted average of all listed companies (used by Wealth AUM).

- **Details (Stage 6):** beta comes from the sector; returns use the phase of the home country (a listed rival: its first city's country). The earnings tilt is 10% of the sector's annual μ; EPS grows by growth/4 plus the surprise each quarter. Dividends pay a quarter of the yield on the current price at quarter-end. The index ("Ledger Composite", 1000 at the start) is chain-linked over non-bank companies and trading listed rivals; your bank isn't in it. History keeps 104 weeks.
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

### 19.7 Trading
- Two accounts: company (Investment floor or portfolio) and personal.
- Commission 0.1%.
- Track position, average cost and gain/loss.

### 19.8 Rival bank M&A
- **Premium:** `premium = P_offer / price − 1`. Private rivals use price = BVPS × 1.0.
- **Acceptance:** `accept = sigmoid((premium − req)/0.06)`.
  - `req` = 0.30 for healthy targets, 0.15 for Watch-tier targets, −0.20 for distressed sales.
  - Rejected offers can be raised once per 4 weeks.
- **Regulator check:** pro-forma CR ≥ 10.5% AND your deposit share in every affected city ≤ 35%. A Lobbying "Fast-track merger" win relaxes the share limit to 45% for one deal.
- **Payment:** cash only in v1.
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
- **20.8 Conventions:** this year's and next year's runs are kept (`state.conventions.runs`), from the CONTENT §19 calendar. Two weeks before opening a run is announced (Ledger story) and 3–6 exclusive startups appear with rounds open through the event; it is open for 1 week. Its startups are visible and buyable only from that city's convention centre while it is open, and never enter the Investment floor pipeline. The convention centre's map pin shows only from announcement to close.

## 21. Real estate

- **21.1 Listings** (per city, refreshed every 4 weeks):
  - size m², district, market rent per m² per year (district × city.rentIndex), occupancy
  - estimated value = `size × marketRent × 3.2 × cre/100`
  - asking price = estimate × U(0.95, 1.10)
  - Offers below asking: acceptance = `clamp((offer/asking − 0.85)/0.15, 0, 1)`.
- **21.2 Owned property:**
  - `occTarget = clamp(0.97 − 1.6 × (rent/marketRent − 1), 0.30, 0.98)` and `occ = ema(occ, occTarget, 0.06)`
  - weekly revenue = `size × rent × occ / 52`
  - maintenance = `size × marketRent × 0.55 / 52` (fixed)
  - vacancy cost = `size × (1 − occ) × 2 / 52`
  - net = revenue − maintenance − vacancy
  - ROI = annualized net / purchase price
  - Value tracks `cre`.
  - **For Sale** toggle: sells within 2–8 weeks at value × normal(1, 0.04).
  - Reference: the original showed about 8.7% ROI at 85% occupancy.
- **21.3 REO** (foreclosed homes, aggregated per city):
  - units = `Σ recovery / avgHomeValue(city)`; value tracks `hpi`; carrying cost 6% per year
  - **Sell all:** 90% of value, settles in 1–4 weeks, cash to corporate cash
  - **Rent:** yield 4.5% per year of value at 90% occupancy
  - **Hold**
  - RWA weight 1.0.
- **21.4 Ownership:** choose Company or Private at purchase. Private property counts in personal wealth only.
- **21.5 Details (Stage 7):**
  - Each city has REAL_ESTATE.buildingsPerCity property buildings (S 4, M 6, L 8, XL 10; 1,500–12,000 m²). Every 4 weeks `max(1, round(0.4 × unowned))` are listed; listings not picked again disappear. An unowned building's occupancy is drawn once from U(0.75, 0.95). Estimates follow cre weekly; asking prices stay fixed.
  - **Offers** are answered at once. A rejected offer locks that listing until the city's next refresh. The offer stepper runs from 80% of asking up to asking.
  - **Books:** a company purchase pays investing cash and enters the balance sheet at the estimate; paying more or less than the estimate is posted to `propertyGains` (non-cash), as are weekly revaluations with cre. Rent → `rentalIncome`; maintenance and vacancy → `propertyCosts`. Company purchases are refused at the Restricted and Critical tiers.
  - Rent can be set from 50% to 160% of market rent in steps of 5 per m². Turning For Sale off cancels a pending sale. A sold building returns to the listable pool.
  - **REO:** carrying cost is charged in Hold and Rent; selling has none, can't be called off, and includes foreclosures that arrive meanwhile. The 10% haircut at settlement is a property loss. Mode changes don't require being in that city.
  - Deals of $10M or more make the paper.
- **21.6 Lobbying** (DESIGN §5.8.10, `src/data/lobbying.ts`, `LOBBYING`):
  - Campaigns: **Ease the capital buffer** ($2.5M, 55% success, 12% exposure): tier thresholds in that country drop 1pp for 52 weeks. **Fast-track a merger review** ($1.5M, 60%, 10%): the next deal that closes may reach 45% of a city's deposits (MERGERS.fastTrackShare). **Stall the capital buffer bill** ($1.2M, 50%, 15%): only while a capital-buffer bill is pending there; a win makes it fail its vote.
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
- **Rich list:** a generated list of 50 fixed fortunes, each growing 4–8% a year. Yearly rank event.

## 23. Incidents

- Each incident type has a weekly base probability, a scope (branch, city, company or personal), conditions, multipliers, a cooldown (default 8 weeks per scope) and 2–3 options with costs and effects.
- Full list in CONTENT (Incidents).
- **Branch incidents:** auto-resolved when "Branch troubles" is delegated (§17.1), with a toast. Otherwise they queue and pause the game.
- Unresolved incidents choose the worst option after 4 weeks.

## 24. News (The Daily Ledger)

- **Each week**, compose 6–12 articles from `events.log`, by priority:
  1. your company's events
  2. central bank decisions in countries where you operate, then elsewhere
  3. rival actions in your cities
  4. earnings and dividends of listed companies
  5. conventions and auctions
  6. sports
  7. filler: housing, politics, rankings
- **Templates:** each event type has 2–4 headline/body templates (CONTENT). Fill numbers from the event payload. Never repeat the same template for the same subject in consecutive weeks.
- **Tabs filter by category:** Top = the 6 highest priority; Banking; Business; Markets; Politics; Sports.
- **Archive:** keep the last 52 issues.
- **Politics:** fictional, neutral parties. Policy proposals (fee caps, capital buffers) can become regulatory events, e.g. CAPITAL_BUFFER +1pp for 4 quarters in that country.

## 25. Balance targets

Run `npm run balance` with seed 42 and the start city Calgary, unless noted. Branch checkpoints read the first branch of the steady strategy, built on an "average lot" (the median-rent free lot in Midtown). Weekly revenue and income checkpoints use a 4-week average, so a single large default doesn't swing them.

**Note (Stage 5):** the branch checkpoints are a seed-42 reference and assume Expansion. With every country simulated, seed 42's path has a recession at weeks 97–134 and policy cuts to 1.5%, so week 156 reads about $90k revenue / $41k income (below band) before recovering inside it by week 208. Other seeds (e.g. 7, 99) already missed the first-branch checkpoints in Stage 4 because their median Midtown lot is weaker; a cross-seed calibration is open.

**Note (Stage 6):** steady takes one private placement when capital binds and lists as soon as it's eligible: seed 42 lists in week 222, seed 7 in week 248, seed 99 in week 261 (years 5–6), with the founder keeping 60%. The IPO money lifts steady from 7 to about 44 branches in year 5. Acceptance test: `tests/sim/ipoAcceptance.test.ts`.

**Updated 2026-10-24 (Stage 1, owner's decision):** with CONTENT's fees and card rates at the 3.5–4% policy rates the macro rule produces, a mature branch earns about $50–65k a week on $120–145k of revenue. That is close to the original's store economics (about £51k income on £84k revenue), so the targets below were raised to match instead of cutting fee income. The old values are kept in brackets.

| Checkpoint | Target |
|---|---|
| First branch build + lease deposit (mid build, average lot) | $300k–$450k, leaving room for at most one more basic branch from the $750k start |
| First branch weekly income turns positive | week 6–16 |
| Branch at week 26 | deposits $15–30M; income positive |
| Branch at week 52 | deposits $30–50M; loans 75–90% of deposits; customers 3,000–5,000; income +$20k–$40k/week [was $15k–$30k] |
| Mature branch (week 104+) | deposits $40–65M (organic chequing growth keeps it creeping up) [was $40–60M]; loans 75–90% of deposits; revenue $110k–$150k/week [was $80k–$100k]; income +$45k–$70k/week [was $25k–$35k] |
| Payback of a mid build on an average lot | ≤ 40 weeks from opening |
| Year 2 (steady) | 4–8 branches; HQ required; cash never < 0 |
| Capital first binds (no raises) | years 1–3; private placements and the IPO are the intended growth fuel |
| IPO eligible (steady) | years 3–6 |
| Year 10 (steady) | 60–200 branches; total assets $8–40B |
| Year 15 (steady) | weekly revenue $20–80M; founder net worth $2–40B |
| Annual loan loss rate | 0.4–1.0% of loans in Expansion; 1.2–2.5% in Recession |
| Net interest margin | 3.0–5.0% [was 2.0–3.5%; even §12.1's own figures give about 4.7%] |
| Company loan-to-deposit ratio | 0.75–0.90 in Expansion (tune mortgage approval first) |
| ROE | 8–18% in Expansion |
| Turtle (deposits only) | profitable, but < 40% of steady's year-5 equity |
| Aggressive (appetite 5, cheapest prices) | higher growth to year 3, then Watch tier or worse in the first recession |
| Recession stress (forced at year 3) | steady survives without Critical tier; aggressive hits Restricted or Critical |

**Note (Stage 8):** steady now expands to other cities once the home city has no good lots left (years 5–6). Year 10: seed 42 223 branches / $9.8B assets, seed 7 171 / $7.2B, seed 99 167 / $8.1B. Seed 42 sits just above the branch band and seed 7 just below the asset band; left for the full tuning pass (owner: testing and tuning come later).

**Strategies** (`scripts/strategies/*.ts`):
- `idle`: one branch, no further actions
- `steady`: open a branch when cash > 2× build cost and CR > 12%; HQ floors staffed to 100%; appetite 3; default prices
- `aggressive`
- `turtle`: lending products off
- `stress`: steady plus `forceRecessionAtWeek = 156`

**Output:** a yearly table (branches, deposits, loans, equity, CR, NIM, loss rate, ROE, cash, net worth) plus a warning list for every out-of-range target.

## 26. Parameter index (`balance.ts`)

Group the constants like this, with the defaults shown above:

- **TIME:**
  - `DAY_MS = 1000`, `SPEEDS = [0, 1, 2, 4]`
  - `START_DATE = '2027-01-04'`, `QUARTER_ENDS`
- **START:**
  - `START_CASH = 750_000`, `CHARTER_CAPITAL = 2_000_000` (in reserves), `START_SHARES = 10_000_000`
  - `START_CASH_OPTIONS = [500_000, 750_000, 1_000_000, 1_250_000]`; `COMPETITORS = { min: 1, max: 5 }`
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
- **PERSONAL:** `PERSONAL_TAX = 0`, `INSIDER_WINDOW_WEEKS = 2`, `INSIDER_PROB = 0.15`, `TRAVEL_KM_PER_WEEK = 24_140`, `FLIGHT_FARE = 80_000` (× destination costIndex), `EARTH_RADIUS_KM = 6_371`, `JET = { upkeepRate: 0.08, depreciation: 0.06, resaleHaircut: 0.1 }`
- **FEATURES:** flags per stage (ROADMAP)
