# Progress Log

Claude Code updates this at the end of every session. Newest entries go at the top.

**Current stage:** 4 — HQ and operations (built and live; awaiting the owner's iPhone check). The Stage 2 and 3 checks are still open too.
**Live URL:** https://jxstrr0.github.io/VaultStreet/ (first deployed 2026-10-24)
**Determinism snapshot:** `0831e6b2f8796e` (seed 42, scripted commands, 260 weeks; `tests/sim/determinism.test.ts`)

---

## Session log

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
