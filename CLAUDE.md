# CLAUDE.md — Build brief for Frontier Lab

You are building **Frontier Lab**, a browser tycoon game where the player founds an AI lab and grows it into a global company. It is a conversion of our bank tycoon *Vault Street* (itself a faithful, system-for-system remake of the mobile tycoon *Coffee Inc 2*), reusing as much of its code as possible: the same original "Banknote Deco" art direction, the same core mechanics and the same feel. All names stay fictional: no real AI companies, models or people.

**Conversion done (2026-10-27).** Stages C0–C8 turned the bank game into the AI-lab game, and the docs now describe it in AI terms. The record of the mapping is in `docs/archive/CONVERSION_PLAN.md`. Some code identifiers keep bank names (`branch`, `bankName`, `capitalRatio`); the docs give their AI meaning.

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
2. **Static site on GitHub Pages.** No backend, accounts, analytics, ads or runtime network calls. Bundle all assets, with fonts via @fontsource. It is served at the root of `https://frontierlab.longlight.games/` (the old `jxstrr0.github.io/FrontierLab/` address forwards there) and must keep working from any address, sub-paths included (relative base `./`).
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

## Versions
The game version is `gameVersion` in `package.json`, four numbers: **Major.Minor.Patch.Build** (for example `0.1.62.0`), the same scheme as every Longlight game. Major = overhaul, Minor = feature batch, Patch = tweak or fix, Build = republish. Bump it with every release; `vite.config.ts` feeds it to the title screen, the update toast and new saves as `__APP_VERSION__`, and the build fails if it isn't four numbers. The `version` field above it must stay three-number semver (npm refuses four) and is not shown to players; leave it alone. The service worker's cache name is a content hash, not this number.

## Commits
Author commits as `Claude <noreply@anthropic.com>` so GitHub shows them as Verified (the owner chose this on 2026-10-30; earlier commits are authored as Jxstrr0). At the start of a session, run `git config user.name "Claude"` and `git config user.email "noreply@anthropic.com"`, and keep the Co-Authored-By trailer for Claude in each message.

## Branches and pull requests (persistent rule)
Never commit straight to `main`. Several sessions often work at once, and direct pushes collide on the version number and PROGRESS.md.
1. Put each change on its own short branch from the latest `main` (for example `feat/quant-noir`), and push it with `git push -u origin <branch>`.
2. Open a pull request to `main` (ready for review, not a draft) with a short body: what changed, what was checked. The Deploy workflow builds and tests every pull request.
3. **Turn on GitHub auto-merge (merge commit) as soon as the pull request is open**, so it lands by itself when the checks pass, with the branch deleted. The repo allows auto-merge. If enabling it fails, merge it yourself, without asking, as soon as it has no conflicts and the checks are green. Merging to `main` deploys the site.
4. If `main` moved and the pull request conflicts, merge `main` into the branch, resolve, bump the version past whatever landed, re-run `npm run lint`, `npm test -- --run` and `npm run build`, push, and merge. Ask the owner only when both sides changed the same logic and picking either would lose behaviour.
5. If a check fails, fix it on the branch and push again; never merge red.

## Don't
- Use real bank, brand or company names, logos, or real people.
- Add monetization, telemetry or network calls.
- Touch `localStorage` outside `src/sim/save/`.
- Build later-stage features "while you're there".
- Commit screenshots or recordings of the original game.
- Leave a stage half-wired on `main`. Use feature flags in `balance.ts` (`FEATURES`) if a system is partly built.

## Reference repo
This game is a fork of Vault Street (remote: upstream).
- Treat upstream as read-only. Never push to it.
- To see how Vault Street handled something, use
  git show upstream/main:<path> or git diff main upstream/main -- <path>.
- Only bring over upstream changes when asked, and log them in PROGRESS.md.

## Studio context
Frontier Lab is a Longlight Interactive game. The studio hub site is a separate repo (`Jxstrr0/Kelbo.Website`). At launch (ROADMAP Stage 10), a card linking to this game gets added there in a separate session. Never edit that repo from here.

## Longlight brand (studio pieces only)

This game keeps its own look. Its fonts, colours and art style stay as they
are, and game screens are never restyled to match the studio. The Longlight
brand applies only to studio pieces: the studio logo or splash, the
"Longlight Interactive" credit line, the studio block on a credits or about
screen, and any link back to the studio site.

- **Logo:** the horizon lockup, a half-set clay sun on a long horizon line
  with LONGLIGHT above INTERACTIVE. Use the official files from the studio
  site's press kit (https://longlight.games/press.html; the
  files are `assets/press/longlight-logo-dark` and `longlight-logo-light`,
  SVG plus 2x PNG, in `Jxstrr0/Kelbo.Website`). Copy them into this repo;
  never hotlink, redraw or recolour them, or swap the letters for live text.
- **Colours, inside studio pieces only:** Clay `#D97757`, Purple `#7B3FC4`,
  Slate `#141413`, Ivory `#FAF9F5`, Lilac `#B48CE8`. Nothing else in the
  logo or the studio block.
- **Font, inside studio pieces only:** Space Grotesk 500/700. If a studio
  piece uses it, self-host it; don't add a new font host or outside request.
- **Name:** always "Longlight Interactive" in full. Credit line:
  "© year Kelbo / Longlight Interactive" (the studio isn't a registered
  business yet). Never Kelbo's real name or initials.
- **Studio site:** https://longlight.games/

## Studio catalogue

`LONGLIGHT-STUDIO.md` (repo root) covers every Longlight game: looks, names
already taken, storage and cache prefixes (kept from the shared-origin days), a reuse map and
improvement ideas. Read it before pitching new ideas, names or looks, and
before building a system another Longlight game may already have. This file
wins where the two disagree. Don't edit the copy here: the master is
`.github/LONGLIGHT-STUDIO.md` in Jxstrr0/Kelbo.Website; it gets recopied.
