# Progress Log

Claude Code updates this at the end of every session. Newest entries go at the top.

**Current stage:** 2 — Playable loop in plain UI (built; awaiting the owner's iPhone check)
**Live URL:** (after the first deploy) https://jxstrr0.github.io/VaultStreet/
**Determinism snapshot:** `1a6f96ddc5855e` (seed 42, scripted commands, 260 weeks; `tests/sim/determinism.test.ts`)

---

## Session log

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
- **Known issues:**
  - Loan Desk "declined" and "approval rate" are counted by the screen only, so they reset on reload and miss manager-declined applications. Moving these counters into the sim needs a schema bump.
  - Branch history keeps 26 weeks, so the branch "Year" statement shows what's on record.
  - The capital ratio reads in the hundreds of percent before any loans exist (true, but odd-looking).
  - No hero vignettes, portraits or area mini-map yet (art stages); the advisor bar doesn't cycle hints on tap.
  - Typing into a rate stepper accepts "3.25" or "0.0325"; it edits the raw value rather than the display value.

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
