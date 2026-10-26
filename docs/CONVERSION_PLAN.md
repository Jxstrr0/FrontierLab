# Frontier Lab — Conversion Plan (Vault Street → AI lab)

**Status:** approved with changes, 2026-10-26. The owner's decisions and the revised map are in the full design brief ([Frontier Lab — Full Design Brief](https://claude.ai/artifact/XtCq5XYg2YaxkP5eSZ34KF), section "Decisions locked"). Where this plan and the brief differ, the brief wins. The biggest change: instead of 1–3 campuses per city there are 1–2 main offices worldwide, one sales office per city (the only way to open a city) and data centers anywhere, including remote energy sites. Read "campus" below as "sales office" (sales) or "data center" (compute). §4 is the working roadmap, and each stage updates SIMULATION, SCREENS, CONTENT and DATA_MODEL as it lands. **C0 is done** (v0.1.0, 2026-10-26).

**Goal:** turn the bank tycoon into an AI-lab tycoon. The player founds an AI lab and grows it into a global company. Keep the same art style, mechanics and feel, and reuse as much code as possible. Every name stays fictional: no real AI companies, models, products or people.

---

## 0. The idea in one paragraph

Vault Street's engine has three layers:
- **The shop layer:** a branch on a lot, ratings, staff, campaigns and demand. This carries over almost untouched. Branches become Campuses, and the self-serve customers keep the same prospects → share → served math.
- **The deal layer:** the Loan Desk, with individual applications, a pentagon and a hidden risk. This becomes the Deal Desk for named customer businesses.
- **The money layer:** deposits fund loans, liquidity, capital ratio and the regulator. This is the only part that doesn't fit an AI lab as it stands. Customers' money isn't held in trust, and nothing is "lent out". Most of the real code work is in this layer.

The plan re-points it:
- Money worries become **compute** worries (capacity, GPU lots, outages).
- The capital ratio becomes a **safety** ratio.
- Customer revenue becomes ordinary cash.

---

## 1. Proposed DESIGN §3.1 mapping table

Columns: the original game → Vault Street (today) → Frontier Lab (proposed). Rows marked **(new row)** are bank-specific systems that the current table leaves out.

| Coffee Inc 2 | Vault Street | Frontier Lab | Notes |
|---|---|---|---|
| Coffee shop | Branch | **Campus** | 1–3 per city instead of 5–15 |
| Property for lease | Storefront lot | **Campus site** (a few large lots per city) | Spare storefront lots become **customer businesses** (below) |
| Build store: exterior, interior, machines | Build branch: exterior, lobby, teller line, vault, ATM | **Build campus: exterior, workspace, sales floor, GPU hall, power** | Builds about 10–20× costlier, with a longer fit-out |
| Store tabs | Branch tabs: Service, Products, Loan Desk, Marketing, Finance | **Campus tabs: Service, Products, Deal Desk, Marketing, Finance** | Same five tabs |
| Staff, wage, skill, morale | Same | Same (sales & support staff) | |
| Store manager, 4 skills, toggles | Branch manager, 5 toggles incl. Loan approvals | **Campus lead**, same skills; Loan approvals → **Deal approvals** | |
| — | Manager risk appetite (approval pd threshold) **(new row)** | **Manager discount limit** | Delegated deals are approved only within this discount |
| Reviews: Price, Product, Service, Atmosphere | Rates, Products, Service, Branch | **Price, Model, Service, Campus** | |
| Menu tabs Hot / Cold / Food | Deposits / Lending / Cards & Services | **Plans / API / Apps & Services** | |
| Product card | Rate or fee, funding cost, margin ring | Price, **compute cost**, margin ring | |
| Company blend, Manage Blends | House underwriting model, Manage Models | **Our AI model** (radar, inference cost per user), Manage Models mixes data sources | Model quality feeds the Model rating |
| Roasters | Credit bureaus (map layer) | **Data vendors** (map layer): licensed datasets, hosted custom training | |
| Develop new product | Product development (4–48 weeks, star odds) | **Training runs** (same controls and odds table) | Produces model versions and product variants |
| Coffee bean inventory | Funding inventory: lots, maturity, rate, amount, radar | **Compute inventory: GPU lots** (provider, term, price per GPU-hour, size, radar) | Compute floor |
| — | Liquidity ratio, auto-funding, overnight, central bank window **(new row)** | **Compute headroom**, auto spot-buy, emergency burst capacity (with stigma) | Headroom = capacity ÷ demand |
| — | Funding freeze **(new row)** | **Capacity crunch**: waitlist, no new sign-ups | |
| — | Bank runs **(new row)** | **Outages** that spiral into mass churn | |
| — | Government bonds, mark-to-market **(new row)** | **Remove** (option: GPU lots marked to the spot compute price) | |
| — | Deposit beta **(new row)** | **Price beta**: rivals pass compute price cuts on to customers slowly | |
| — | Adverse selection **(new row)** | **Bargain churn**: deals signed far over a customer's max price churn more at renewal | |
| Plantations | Payroll partnerships (Employers layer) | **Data-centre & power deals** (energy sites: the regional sites) | Same curve, health and renewal |
| — | University student partnership, graduate program **(new row)** | **Research partnership**, **fellowship program** | |
| — | Loan Desk applications **(new row in table)** | **Deal Desk RFPs** from named businesses on the map | See §3.3 |
| — | Business loan (amount, term, collateral) **(new row)** | **Enterprise contract** (annual value, contract length, data terms) | |
| — | Default chance **(new row)** | **Churn chance** (at renewal, plus rare mid-term failure) | See §3.4 |
| — | Pentagon: Management, Track record, Market, Competitiveness, Financial health **(new row)** | **AI readiness, Budget, Data sensitivity, Switching cost, Financial health** | |
| — | Max rate accepted **(new row)** | **Max price accepted** | |
| — | Funds transfer pricing **(new row)** | **Compute charge from HQ** at the internal compute price | |
| — | Deposits vs corporate cash, charter capital **(new row)** | **Remove the split.** Revenue is corporate cash. Charter capital → **seed round** | |
| Ten campaigns | Ten branch campaigns | Ten campus campaigns (free credits, hackathons, dev-rel, etc.) | |
| HQ floors | Finance, HR, Products, Treasury, Marketing, IT & Security, Risk & Compliance, Executive, Investment | Finance, HR, **Research**, **Compute**, Marketing, **Platform & Security**, **Safety & Alignment**, Executive, Investment | |
| Understaffing warnings | Same + coverage % | Same | |
| HR benefits | + Staff Mortgage Discount | + **Compute Allowance** | |
| Force prices to all stores | Apply rates to all branches | Apply prices to all campuses | |
| Commercial bank lending | Rival bank HQ: corporate loans, credit line | **Lenders** on the Investment Bank's new Debt tab | Rival labs don't lend; see §3.7 |
| Central bank headlines | Central bank per country | **Kept** as the economy, plus a **compute price index** | See §3.6 |
| — | Capital ratio + regulator tiers **(new row)** | **Safety ratio** + **AI regulator tiers** (Strong → Critical) | Gates and fines as now |
| — | Quarterly regulator review, emergency recap, takeover **(new row)** | Quarterly **safety audit**, **mandated pause** offer, **licence revoked** | |
| — | Chief Risk Officer **(new row)** | **Chief Safety Officer** | |
| Investment bank | Same + private placement, IPO | Same (funding rounds) | |
| Secondary offering, stock card | Same | Same | |
| Coffee companies M&A | Rival bank M&A, regulator approval | **Rival lab M&A**, regulator approval (safety and market share) | |
| Competitor store | Rival branch: reviews, rate sheet | **Rival campus**: reviews, price sheet, model card | |
| Weekly results + newspaper | The Weekly Ledger (Banking tab) | The Weekly Inference, **AI** tab replaces Banking | Done in C1c |
| Incidents | Robbery, breach, fraud ring, mis-selling, audit, walkout, flood, run… | Server-room break-in, key leak, abuse ring, capability over-claim, safety audit, walkout, data-centre heatwave, outage… | |
| Executive floor | 6 seats + CRO + CREO | 6 seats + **CSO** + CREO | |
| Investment floor, ventures | + venture debt | + **compute credits** (same mechanics as venture debt) | |
| Conventions | Fintech conventions | **AI and developer conferences** | |
| Real estate | + foreclosed homes (REO) | **Remove REO** | |
| — | Currencies (FX) **(new row)** | Kept | |
| Airports, homes, cars, auctions, franchise, personal wealth, rich list | Same | **Unchanged** apart from names | |
| Settings, saves | Export/import code | Same, under **its own storage keys** (§3.1) | |
| Map layers (13) | 14 incl. Credit Bureaus, Banks, Employers | **Campuses, Offices, Real Estate, Data Vendors, Rival Labs, Investment Banks, Marketing Agencies, Conventions, Lobbying Firms, Sports Teams, Auto Dealers, Auction Houses, Universities, Businesses** | Employers layer becomes Businesses |

---

## 2. Files in `src/sim` and `src/data`, grouped by change

"Relabel" means the logic stays and only names, ids, strings and comments change. Most relabel work is in `src/app` and the ledger templates, not in the math.

### 2.1 Rename / relabel only
- **`src/sim`**
  - Game flow: `engine.ts` (tick order unchanged until C3), `calendar.ts`, `rng.ts`, `ids.ts`, `math.ts`, `detmath.ts`, `difficulty.ts`
  - Map: `geo.ts`, `cityGeo.ts`, `cityGeoMasks.ts`, `cityLayout.ts`, `citygen.ts`, `cityGrowth.ts`, `waterForms.ts`, `worldGen.ts`
  - Title screen: `coverMeta.ts`, `coverWorld.ts`
  - Events and news: `events.ts`, `eventCatalog.ts`, `ledger.ts`, `news*.ts` (all 25)
  - Executives and governance: `attention.ts`, `execBuying.ts`, `execCandidates.ts`, `execGrants.ts`, `execInvesting.ts`, `execPolicy.ts`, `execSeatChanges.ts`, `execSeats.ts`, `executives.ts`, `execDelegationsGrowth.ts`, `execDelegationsPeople.ts`, `execDelegationsProperty.ts`, `governance.ts`, `governanceVotes.ts`, `payReviews.ts`, `people.ts`, `candidateRerolls.ts`
  - HQ: `hqMarketing.ts`, `hqSites.ts`, `hqTabs.ts`, `hrHiring.ts`, `company.ts` (app rating → platform rating)
  - Markets and shares: `market.ts`, `marketHolders.ts`, `marketInit.ts`, `marketRivals.ts`, `marketStocks.ts`, `marketsTypes.ts`, `securities.ts`, `shares.ts`, `shareDeals.ts`, `buybacks.ts`, `equityIpo.ts`, `equityOffers.ts`, `insider.ts`, `fx.ts`, `nominal.ts`, `priceList.ts`, `macro.ts`
  - Mergers: `mergers.ts`, `mergerRules.ts`, `mergerPricing.ts`, `acquisition.ts`, `acquisitionBranch.ts`
  - Investments: `investmentSites.ts`, `investmentsInit.ts`, `investmentsTypes.ts`, `portfolio.ts`, `capitalSites.ts`, `ventures.ts`, `ventureAccess.ts`, `ventureExits.ts`, `ventureGen.ts`, `ventureModel.ts`, `ventureRounds.ts`, `venturesInit.ts`, `ventureDebt.ts` (→ compute credits)
  - Personal layer: `personal*.ts`, `netWorth.ts`, `richList.ts`, `auctions.ts`, `franchise.ts`, `franchiseMath.ts`, `franchisePlayers.ts`, `travel.ts`
  - Property and other: `realEstate.ts`, `propertyBuy.ts`, `propertyListings.ts`, `propertyMath.ts`, `conventions.ts`, `lobbying.ts`, `nameGen.ts`
  - Rivals: `rivalAi.ts`, `rivalCharters.ts`, `rivalLearning.ts`, `rivalMarketing.ts`, `rivalMergers.ts`, `rivalQuarter.ts`, `rivalReviews.ts`
  - `incident/*` (texts and choices; the bank-run rule moves to §2.3)
- **`src/data`**
  - Text and names: `avatarParts`, `brandInks`, `logoShapes`, `names`, `nameParts`, `startupBlurbs`, `startups`, `reviews`, `lessons`, `tutorial`, `settingsOptions`, `incidentParams`, `incidents`, `milestones` (labels; targets in §2.2)
  - Ledger and news text: all `ledgerTemplates*` (text rewrite, same shape), `newsWorld*`, `worldCalendar`
  - World and map: `cityLooks`, `districts`, `houseStyles`, `countries`, `currencies`, `mapLayers`
  - Personal layer: `cars`, `homes`, `jets`, `collectibles`, `franchises`, `richList`
  - Companies and markets: `conventions`, `lobbying`, `investmentBanks`, `mergers`, `rivalCharters`, `stocks` (Banking sector → AI), `commodities`
  - HQ and staff: `benefits`, `brandCampaigns`, `campaigns`, `departments`, `executives`
  - Shared: `types` (labels; ids kept, see §3.8)

### 2.2 Constant / content-value changes (`balance.ts` + data tables, logic untouched)
- `branch/cityMarket.ts`: `CITY_MARKET`, `CITY_BRANCH_GUIDE` (→ about 1/2/2/3).
- `branch/staff.ts`, `branch/marketing.ts`, `branch/ratings.ts`: capacity per seat, wages, rating weights.
- `cityPlacement.ts`: `LOTS_BASE`, `LOTS_PER_RIVAL`, `LOT_COUNT_BY_SIZE` (campus sites), plus how many leftover lots become businesses.
- `hq.ts`: `DEPT_REQUIREMENTS` perBranch → per campus, and `FOUNDER_RAMP`.
- `rivalExpansion.ts`, `competitionSites.ts`: rival campus counts and expansion thresholds.
- `branchGuidance.ts`, `development.ts`, `difficulty.ts`, `milestones.ts`: thresholds (for example "100 branches" → "25 campuses").
- **Data:** `cities` (market sizes), `equipment` (new slots and prices), `segments` (sensitivities, tickets), `products` (catalog), `bureaus` → data vendors, `fundingTypes` → GPU lot types, `employers` → business types, `loanSectors` → deal sectors (contract value instead of loan amount), `capitalFixes` → safety fixes, `devTemplates` → training templates, `rivals` (strategies), `departments`.

### 2.3 Formula changes
- **Demand:** `branch/demand.ts` gets whole-city catchment (mostly constants, §3.2), and loan approval becomes a capacity gate.
- **Books:** `branch/books.ts`, `branch/pricing.ts`, `branch/branchPnl.ts`, `branch/week.ts`.
  - Deposit and loan books become subscription and usage books. Every product uses the existing fee and volume paths.
  - Funds transfer pricing becomes the compute charge.
- **Deal Desk:** `branch/loanDesk.ts` → `dealDesk.ts`, with RFPs tied to businesses, renewals and churn. Also `branch/delegation.ts` (discount limit).
- **Prices:** `rates.ts` adds the compute price index next to the policy rate. Also `rivalPrices.ts` and `priceWar.ts`.
- **Compute:** `treasury.ts`, `fundingLots.ts`, `fundingMarket.ts`, `centralBank.ts` (window → emergency burst), `partnerships.ts` (power and data-centre deals).
- **Safety and statements:**
  - `capital.ts`, `riskFloor.ts`, `failure.ts`, `execDelegationsCapital.ts`, `execDelegationsFinance.ts`: safety ratio and tiers.
  - `balanceSheet.ts`, `statements.ts`, `cashCover.ts`, `acquisitionPlan.ts`: no deposits or loans on the balance sheet.
- **Valuation:** `equityModel.ts`, `equityPrice.ts`, `valuation.ts`. Price-to-book × ROE becomes a revenue multiple (§3.5).
- **Model:** `underwriting.ts` (the AI model radar and its effects), `products.ts`.
- **Rivals:** `rivalBooks.ts` (ARR instead of deposits and loans), `corporateDebt.ts` (lenders move, §3.7).
- **State:** `state.ts`, `newGame.ts`, `save/migrations.ts` (a schema bump each stage).
- **Commands:** `commands/loanDesk.ts`, `commands/treasury.ts`, `commands/partnerships.ts`, `commands/branches.ts`.

### 2.4 Remove
- **`reo.ts`**: foreclosed homes. Plus the REO lines in `books.ts`, `balanceSheet.ts`, `ledgerTemplatesRealEstate.ts` and the `addReo` path.
- **Bank-only machinery:**
  - government bonds inside `treasury.ts`
  - the `transferToTreasury` command
  - mortgage special-casing (`MORTGAGE_SPECIAL`, prepayment, GIC renewal, student conversion)
  - charter capital floor `CHARTER_MIN_EQUITY`
- **Interest-rate products** in `data/products.ts`: mortgage, GIC, savings, cards. Replaced by AI products.

Nothing in `src/art` is removed. The campus look reuses the office and tall-building art.

---

## 3. Where the plan doesn't fit the code, with suggested fixes

### 3.1 Both games share one save store (fix first)
GitHub Pages serves both games from `jxstrr0.github.io`, so they share browser storage.
- **Problem:** saves use the keys `vaultstreet.*` and the IndexedDB database `vaultstreet` (`src/sim/save/storage.ts`, `slotData.ts`). On your iPhone, Frontier Lab would see Vault Street's save slots, and saving in one game would overwrite the other.
- **Fix (stage C0):** rename both to `frontierlab`. Tag export codes with the game so a Vault Street code is turned away with a clear message. Also rename the service worker plugin and the manifest.

### 3.2 "Catchment covers the whole city"
- **Problem:** catchment is built per lot (foot traffic, plus competitors within 12 tiles).
- **Fix:** keep the per-campus math. It already handles a whole-city market correctly if:
  - `RIVAL_RADIUS` covers the map
  - `DISTANCE_FALLOFF` is large (distance stops mattering)
  - every campus site in a city gets the same city traffic
- **Why that works:** your own second campus already counts as a competitor (cannibalisation), so two campuses split one city pool instead of doubling it. `cityRoom` (CITY_MARKET) still caps the total. A second campus in the same city then adds capacity (sales seats, GPU hall), not new customers. That matches "1–3 large buildings".

### 3.3 Named businesses on the map
The plan was "Employers layer plus spare lots". The problem: employers are `Site`s (2–4 a city), awnings are drawn only on storefront `Lot`s, and Loan Desk applicants are made up each week and never kept.
- **Fix:** make the leftover storefront lots (about 20–60 a city) the businesses.
  - Each lot gets a `business` record: name, sector, size, pentagon, current vendor (rival lab id or none) and renewal week.
  - `Lot.occupant` already supports `{type:'rival'}`, which draws the awning in the rival's ink. Showing your colours only needs `buildings.ts` to draw the awning for `player` too (it draws a roof flag now).
  - Employer sites become a few "anchor" accounts with bigger contracts.
- **Deal Desk:** RFPs come from these businesses (no vendor, or a contract within 8 weeks of renewal), not from thin air. The application carries a `businessId`. A won contract replaces `BusinessLoan` with `Contract { businessId, annualValue, termWeeks, weeksLeft, churnChance }`.

### 3.4 Your open question: when do contracts churn?
**Recommendation: both, but on each contract's own renewal date, not in one quarterly renewal season.**

*Renewal:*
- At renewal, the business compares your price and Model/Service ratings against the best rival offer. It stays, leaves for that rival, or goes without.
- Its churn chance (the old default chance) sets the base odds.
- Four weeks ahead, the Deal Desk lists "Renewals due" so you can offer a discount. That is the same approve-at-a-price control as now.

*Mid-term:*
- A contract can still end mid-term, but only the way loans default: the business fails (more often in recessions; the credit-cycle factor already exists) or there's a major outage.
- Rivals don't poach mid-term. This keeps rival AI simple: they only bid at renewal.

*Why not a quarterly season:*
- The game's rhythm is weekly, and contracts start in any week.
- A single season would dump dozens of decisions into one week four times a year. On a phone that's a chore spike, against pillar 3 ("Decisions, not chores").
- Spreading renewals across the year keeps every week a bit interesting.

### 3.5 There are no deposits to hold, so the bank's balance sheet mostly falls away
- **Problem:** deposits are a liability backed by liquid assets, and loans are assets. An AI lab has neither. Subscription money is simply revenue.
- **Fix:**
  - Books keep `accounts` and `balance`, but `balance` means **ARR** (annual recurring revenue), a figure that isn't on the balance sheet. Revenue = ARR/52 cash in.
  - Plans use the existing "fee per account" path (today's chequing, safe box). The API uses the "volume × markup" path (today's FX & Wires).
  - The balance-identity test stays: equity = assets − liabilities still has to reconcile with cash flows.
  - The balance sheet gets simpler: cash, campuses and GPUs as fixed assets, prepaid compute, investments, goodwill, less corporate debt and deferred revenue (prepaid annual contracts).
- **Share price:** today it's based on book value × ROE. That would make a fast-growing lab nearly worthless, so it changes to a revenue multiple driven by growth and model quality, with book value as a floor.

### 3.6 Rates are everywhere
- **Problem:** the policy rate drives deposit and loan pricing, funds transfer pricing, bond values and valuations.
- **Fix:** keep central banks as the background economy (customer budgets, debt cost, stock prices).
- Add a per-country **compute price index** built with the same rates machinery: a "chip cycle" with shortages and gluts in place of rate meetings.
- The compute charge, GPU lot prices and price beta follow it. This turns a whole-system rewrite into one new series plus re-pointed inputs.

### 3.7 Rival labs don't lend
- **Problem:** corporate loans come from rival bank HQs (`corporateDebt.ts`, `rivalHq` sites).
- **Fix:** rival lab HQs keep their panel minus the loan section. The same loan and credit-line cards move to a new **Debt** tab on the Investment Bank panel (reuse the component), with fictional lenders.

### 3.8 Five customer segments, a three-segment brief
- **Problem:** segments (students, young pros, families, retirees, businesses) are a fixed union used by lot mixes, campaigns, sensitivities and reviews.
- **Fix:** keep five slots and their ids in code, relabelled on screen: **Students, Developers, Consumers, Creators, Small shops**. The brief's three types are kept; Students and Creators are added to fill the other two slots. This avoids a risky refactor of every table. (Ambiguity A1.)

### 3.9 Counts built for 5–15 branches a city
- **Problem:** founder mode (≤2 branches), HQ requirements per branch, milestones (10 and 100 branches), COO expansion, rival network thresholds and the balance targets per branch all assume many small branches.
- **Fix:** in C2, re-key them to campuses with lower thresholds:
  - founder mode = 1 campus
  - HQ requirements phase in over 2–4 campuses
  - milestones become 5, 25 and 50 campuses
  - SIMULATION §25 targets are re-set per campus (each campus is about 10× a branch)

### 3.10 The "power" build slot
- **Problem:** ATM is extra self-serve capacity, and power has no customer meaning.
- **Fix:**
  - Sales floor = the teller line (serves prospects).
  - GPU hall = the vault (its `boxes` cap becomes a usage cap).
  - Power caps how much of the GPU hall runs: `usable = min(gpuHall, power)`. This is a small new formula.
  - Owned compute (GPU halls) plus rented compute (GPU lots) together form the compute pool from §3.6.

### 3.11 Saves during the conversion
- Frontier Lab's save chain starts at `schemaVersion` 1 (decision A6; done in C0, which dropped Vault Street's 37 migration steps). Every stage that changes state shape bumps it with a migration. Saves from earlier Frontier Lab stages keep loading. Where a bank concept is removed (REO, bonds), the migration sells or zeroes it with a news note.
- Vault Street saves are not carried over: §3.1 separates them.

---

## 4. Staged conversion plan

The same rules as ROADMAP: each stage ends playable and deployed, with green CI, and with PROGRESS updated. A half-built system hides behind a `FEATURES` flag. Each stage notes whether the determinism snapshot changed and why.

### C0 — Fork hygiene (small, code)
- **Build:**
  - Own save keys and database name (§3.1)
  - Game tag on export codes
  - Service worker, manifest, `<title>` and title-screen wordmark become "Frontier Lab"
  - Version `0.1.0` and save schema 1, starting Frontier Lab's own migration chain (A6)
  - Service worker caches named `frontierlab-*`, so neither game's worker deletes the other's offline files
  - Confirm Pages is set to GitHub Actions for this repo
- **Accept:** on the iPhone, Vault Street and Frontier Lab show separate save slots. The game plays exactly as before. The determinism snapshot changes only because the save's schema number is now 1.

### C1 — Words and pictures that already fit
- **Status:** C1a (floors, executives, segments, campaigns, benefits, conferences, incidents, stock sector, map layers) done in v0.1.1; C1b (rival lab names, "the lab" wording) done in v0.1.2; C1c (The Weekly Inference, AI tab) done in v0.1.3. **C1 done.**
- **Build:** relabel the systems whose math already fits:
  - HQ floor names, executives (CRO → CSO), departments, campaigns and benefits
  - incidents, the Ledger (AI tab), conventions, lobbying, stock sectors
  - rival names (procedural, fictional)
  - map layer names, tutorial copy for these parts
- Money words stay bank-flavoured until C3, so nothing says "subscriptions" while interest is still being paid.
- **Accept:** a 2-year run reads as an AI company everywhere except the product and Treasury screens. No balance drift. The snapshot changes only from names.

### C2 — Campuses and city scale
- **Build:**
  - Campus sites (a few large lots per city, drawn with office and tall art)
  - Build slots: exterior, workspace, sales floor, GPU hall, power
  - New prices and fit-out time
  - Whole-city catchment (§3.2)
  - `CITY_MARKET` and `CITY_BRANCH_GUIDE` lowered
  - Re-keyed thresholds and milestones (§3.9)
  - Rival campus counts
  - New balance targets in SIMULATION §25
- **Accept:**
  - The steady strategy runs 1–3 campuses per city.
  - The first campus pays back in about the same game time as a branch did.
  - The balance script stays within the new targets.

### C3 — The money model (split into C3a–C3c)
- **C3a:** new product catalog (Plans / API / Apps & Services) on the fee and volume book paths, and ARR books (§3.5).
- **C3b:** funds transfer pricing becomes the compute charge. New P&L lines, statements and a simpler balance sheet. Revenue goes to corporate cash.
- **C3c:** remove REO, bonds, mortgage and GIC special cases, and the treasury transfer, with migrations.
- **Accept:** the balance identity holds every tick. A 10-year steady run is profitable within the new targets. Old C2 saves load.

### C4 — Compute
- **Build:**
  - Compute floor (Treasury relabelled and re-pointed)
  - Compute price index (§3.6)
  - GPU lots from the funding market
  - Headroom gauge, auto spot-buy and emergency burst
  - Capacity crunch and outages (the bank-run rule)
  - GPU hall and power from campuses (§3.10)
  - Data-centre and power deals on the regional energy sites (payroll partnerships)
- **Accept:** growing without buying compute visibly causes waitlists, then outages. GPU lots expire correctly.

### C5 — Businesses and the Deal Desk
- **Build:**
  - Businesses on leftover lots plus anchor employers (§3.3)
  - Deal Desk RFPs, contracts, renewals and churn (§3.4)
  - Manager discount limit
  - Rivals holding and winning contracts
  - Your colours on won businesses' awnings
  - Businesses layer
- **Accept:** in a 3-year run you win, keep and lose contracts. The map shows who serves whom. Big losses make the news.

### C6 — The AI model and training runs
- **Build:**
  - The underwriting model becomes our AI model: radar (Reasoning, Speed, Breadth, Safety, Efficiency) and inference cost
  - Data vendors on the map
  - Training runs using the development system
  - Rival model releases moving the market
- **Accept:** a better model visibly lifts the Model rating, win rates and price headroom.

### C7 — Safety, regulation and valuation
- **Build:**
  - Safety ratio and AI regulator tiers, with today's gates and fines
  - Safety & Alignment floor
  - Safety audit and mandated-pause path
  - Lobbying becomes AI policy
  - Revenue-multiple valuation (§3.5)
  - IPO rules re-keyed
- **Accept:** cutting safety staff in a run leads to audits and gates. An IPO is reachable in years 3–6 of a steady run.

### C8 — Polish and relaunch
- **Build:**
  - Tutorial rewrite
  - Art pass (campus and GPU-hall vignettes, icons)
  - Balance pass across every strategy
  - Docs sweep: DESIGN, SIMULATION, SCREENS and CONTENT fully in AI terms, and this file archived
  - Hub card on Kelbo.Website (in a separate session)
- **Accept:** same as ROADMAP Stage 10.

**Why this order:**
- C0 protects your saves.
- C1 and C2 are low-risk and change how the game feels most.
- C3 is the riskiest stage, so it comes once the shape is settled.
- C4–C7 each swap one bank system for its AI version, on top of C3.

---

## 5. Owner decisions (2026-10-26)

All open questions were answered on 2026-10-26; the full list (A1–A12) and the reasoning are in the design brief linked at the top. In short:
- **A1 Segments:** Students, Developers, Consumers, Researchers, Small shops.
- **A2 Rival names:** a hand-written list of about 25–30 labs, checked against real companies.
- **A3 Personal layer:** mostly unchanged; a few items re-themed for tech-founder flavour.
- **A4 Bonds:** removed.
- **A5 Venture debt:** compute credits that draw on real compute capacity (renamed in C1, linked in C4).
- **A6 Versions and saves:** separate from Vault Street: v0.1.0, save schema 1, its own migration chain (done in C0).
- **A7 Churn:** a quarterly renewal season with a "Renewals due" list four weeks ahead; mid-term loss only from business failure or an outage.
- **A8 Free tier:** a $0 product that converts users to paid plans.
- **A9 Art:** the same Banknote Deco engraving, with a new palette for the AI theme.
- **A10 Newspaper:** the planning session invents a fictional name.
- **A11 Licence revoked:** not game over; a long mandated pause, then a restart under strict watch, keeping the personal fortune.
- **A12 Starting money:** a $10–15M seed round, all spendable.
- **Added:** safety has upside (data-sensitive businesses prefer safe labs; a high tier fast-tracks approvals), models age against a rising frontier bar with a weekly benchmark leaderboard, and a talent war over named researchers (both in C6).
- **Still open:** what "CREO" means in the brief's section 4.7 (probably the property executive from Vault Street).
