# CLAUDE.md — Build brief for Vault Street

You are building **Vault Street**, a browser tycoon game where the player founds a bank and grows it into a global financial empire. It is a faithful, system-for-system remake of the mobile tycoon *Coffee Inc 2*, re-themed from coffee shops to bank branches, with an original "Banknote Deco" art direction.

The owner (Kelbo, Longlight Interactive) mostly plays and tests on an iPhone and has beginner-level coding experience. You do the engineering. Explain decisions in plain language in PROGRESS.md.

## Read first, in this order
1. `docs/DESIGN.md`: what the game is, every system, and the decision log. Source of truth for intent.
2. `docs/ROADMAP.md`: the staged build plan. Work on the current stage only.
3. `docs/PROGRESS.md`: where the last session stopped. Update it at the end of every session.
4. As needed:
   - `docs/SIMULATION.md`: formulas, tick order, balance targets
   - `docs/SCREENS.md`: every screen and its fields
   - `docs/CONTENT.md`: data tables
   - `docs/DATA_MODEL.md`: state types and the save format
   - `docs/ART_DIRECTION.md`: the look
   - `docs/REFERENCE_NOTES.md`: how the original game does it
   - `docs/DEPLOYMENT.md`: GitHub Pages

When docs disagree, DESIGN wins for intent, SIMULATION for numbers and formulas, and SCREENS for layout. Fix the disagreement in the docs as part of the same change.

## Non-negotiables
1. **Faithful systems, original surface.** Mirror the original's system structure (DESIGN §3.1 mapping table). Never copy its names, writing, art, icons, logos, sounds or company names. Every name in CONTENT.md is original: use those or invent new ones.
2. **Static site on GitHub Pages.** No backend, accounts, analytics, ads or runtime network calls. Bundle all assets, with fonts via @fontsource. It must work when served from a sub-path (`/VaultStreet/`).
3. **Phone-first.** Build and check at 390×844 portrait first, then scale up.
   - Tap targets ≥ 44 px, no hover-only interactions.
   - Respect `env(safe-area-inset-*)`.
   - One-handed use where possible.
4. **Pure, deterministic simulation.** It lives in TypeScript in `src/sim/`: no DOM, no Preact, no `Date.now()`, no `Math.random()`. All randomness comes from the seeded RNG streams stored in game state. The same seed plus the same player commands must give identical state.
5. **Numbers live in one place.** Tuning constants go in `src/config/balance.ts` and content in `src/data/*.ts`. Logic files contain no magic numbers. Constant names match the CAPS names used in SIMULATION.md.
6. **Commands only.** Player actions go through command functions in `src/sim/commands/`, which validate and then mutate state. UI components never mutate game state directly.
7. **Saves never break.** Every save carries `schemaVersion`. Whenever the state shape changes, bump it and add a migration in `src/sim/save/migrations.ts`. Keep the round-trip test green.
8. **Always shippable.** Every session ends with `main` building, tests passing and the live site working.
9. **Readable over clever.**
   - Keep files small (aim under ~300 lines) with descriptive names.
   - Give every module a header comment saying what it does.
   - For non-obvious formulas, add a comment with the doc reference, e.g. `// SIMULATION §9.3: share of prospects`.

## Tech stack
- Vite + TypeScript (strict mode)
- Preact + @preact/signals for UI
- Canvas 2D for the isometric city map
- SVG for vignettes, portraits, charts and icons
- Plain CSS with custom-property tokens: one `tokens.css` plus co-located component CSS
- Vitest for tests, ESLint + Prettier
- lz-string for export/import save codes
- @fontsource packages: `bodoni-moda`, `public-sans`

Don't add other runtime dependencies without a clear reason. Log every addition, and why, in PROGRESS.md.

## Project layout
```
/
├─ CLAUDE.md, README.md
├─ docs/                      design docs (keep updated)
├─ index.html
├─ vite.config.ts             base: './'
├─ .github/workflows/deploy.yml
├─ scripts/balance.ts         headless multi-year sim for tuning (npm run balance)
├─ src/
│  ├─ main.tsx                boot, mount <App/>, start the loop
│  ├─ app/                    UI (Preact) — never imports from src/sim internals except types, selectors, commands
│  │  ├─ App.tsx, nav.ts      in-app screen stack (no URL routes)
│  │  ├─ selectors.ts         computed views of GameState
│  │  ├─ hud/                 top bar, bottom bar, speed control, menu
│  │  ├─ map/                 MapView: canvas host + DOM pin layer
│  │  ├─ panels/              one folder per panel (branch/, storefront/, hq/, investmentBank/ …)
│  │  ├─ modals/              weekly results, incident, board meeting, trade, offer …
│  │  ├─ components/          Panel, AdvisorBar, TabBar, Segmented, Stepper, Toggle, CoinRating,
│  │  │                       StatBar, RingGauge, RadarRosette, BarChart, LineChart, Donut, Carousel …
│  │  └─ styles/              tokens.css, base.css
│  ├─ art/                    procedural art: citygen, isoRenderer, vignettes, portraits, icons
│  ├─ sim/                    pure simulation (no DOM)
│  │  ├─ state.ts             GameState types + newGame()
│  │  ├─ engine.ts            tick orchestration (SIMULATION §2)
│  │  ├─ rng.ts, clock.ts
│  │  ├─ macro.ts, rates.ts, staff.ts, marketing.ts, ratings.ts, demand.ts
│  │  ├─ books.ts, loanDesk.ts, branchPnl.ts, treasury.ts, statements.ts, capital.ts
│  │  ├─ hq.ts, products.ts, underwriting.ts, partnerships.ts, people.ts
│  │  ├─ rivals.ts, market.ts, valuation.ts, ventures.ts, realEstate.ts
│  │  ├─ governance.ts, personal.ts, incidents.ts, news.ts, travel.ts, milestones.ts
│  │  ├─ commands/            player actions (one file per area)
│  │  └─ save/                serialize, migrations, export/import
│  ├─ config/balance.ts       every tuning constant
│  └─ data/                   content tables from CONTENT.md
└─ tests/                     vitest specs mirroring src/sim
```

## Scripts
- `npm run dev`: local dev server
- `npm run build` / `npm run preview`
- `npm test`: Vitest (CI runs `npm test -- --run`)
- `npm run balance -- --years 10 --seed 42 --strategy steady`: prints yearly KPIs against the targets in SIMULATION §25
- `npm run lint`

## Architecture notes
- **Game loop.** `requestAnimationFrame` accumulates real time and advances game days at the current speed (1× = 1 day per second). Every 7th day runs `engine.weeklyTick(state)`. Auto-pause when a modal needs a decision.
- **State.** One `GameState` object lives in a signal. A tick mutates it in place and notifies the signal once at the end. UI reads through `computed` selectors.
- **Map rendering.**
  - The map canvas redraws only on pan, zoom or building changes.
  - City art is pre-rendered into chunk canvases.
  - DOM pins are repositioned with transforms.
- **Worker-ready sim.** Keep plain data in and out, with no module-level mutable state, even though v1 runs on the main thread.
- **Units.**
  - Money is a JS number in whole currency units; round only for display.
  - Rates are decimals (0.0325 = 3.25%).
  - Sim time is `week` (integer since start) plus `day`.
- **News and events.** Systems push typed events into `state.events.log` during the tick. `news.ts` and the weekly results snapshot read that log.

## Testing
- Unit tests for every formula module, using the worked examples in SIMULATION.md.
- **Determinism:** seed 42 plus a scripted command list, run for 260 weeks, must produce a state hash matching the stored snapshot. Update the snapshot only for intended changes and note it in PROGRESS.md.
- **Save round-trip:** serialize, export code, import, then deep-equal.
- **Balance identity:** after every tick, total assets equal liabilities plus equity (to within $1). Run this assertion in tests and dev builds.
- `npm run balance` must stay inside the targets table. Treat drift as a bug, or update the targets in the doc with reasoning.

## Definition of done (every feature)
- Matches the spec docs.
- Works at 390×844 in iOS Safari and in Chrome mobile emulation.
- No console errors.
- Tests pass.
- All numbers come from the balance and data files.
- PROGRESS.md is updated and the site is deployed.

## When something isn't specified
Check REFERENCE_NOTES.md for how the original handles it, then pick the simplest option consistent with DESIGN's pillars. Implement it and add a one-line entry to DESIGN's decision log.

## Don't
- Use real bank, brand or company names, logos, or real people.
- Add monetization, telemetry or network calls.
- Touch `localStorage` outside `src/sim/save/`.
- Build later-stage features "while you're there".
- Commit screenshots or recordings of the original game.
- Leave a stage half-wired on `main`. Use feature flags in `balance.ts` (`FEATURES`) if a system is partly built.

## Studio context
Vault Street is a Longlight Interactive game. The studio hub site is a separate repo (`Jxstrr0/Kelbo.Website`). At launch (ROADMAP Stage 10), a card linking to this game gets added there in a separate session. Never edit that repo from here.
