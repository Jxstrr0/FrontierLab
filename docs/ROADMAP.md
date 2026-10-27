# Roadmap

> Stages 0–10 below are the Vault Street build, all done and inherited by this fork. The Frontier Lab conversion ran as its own stages (C0–C8), all done; the record is in `archive/CONVERSION_PLAN.md`.

Eleven stages. Each one ends playable and deployed. A stage usually takes several sessions: split it into numbered steps (1a, 1b…) in PROGRESS.md and finish each step with green CI and a working live site. Turn later systems on with `FEATURES` flags in `balance.ts`.

---

## How to run a session (paste into Claude Code)

**First session:**
> Read CLAUDE.md, then docs/DESIGN.md, docs/ROADMAP.md and docs/PROGRESS.md. We're starting Stage 0. Before writing code, summarize your plan for this stage in 5–8 bullets and list anything in the docs that's ambiguous or contradictory. Then build Stage 0, make sure GitHub Pages deploys, and update docs/PROGRESS.md.

**Every session after that:**
> Read CLAUDE.md and docs/PROGRESS.md. Continue the current stage in docs/ROADMAP.md. Work in small steps, keep CI green, stop at a stable point, deploy, and update docs/PROGRESS.md with what changed, what's next and any decisions (also logged in docs/DESIGN.md §7).

**Testing a stage on the phone:** open the live URL in Safari, or add it to the Home Screen (Share → Add to Home Screen) to play full screen and offline.

---

## Stage 0 — Scaffold and deploy
**Goal:** an empty game shell live on GitHub Pages.

**Build:**
- Vite + TypeScript (strict) + Preact + @preact/signals
- ESLint + Prettier
- Vitest with one sample test
- `tokens.css` with the palette and type from ART_DIRECTION
- @fontsource fonts
- Title screen: wordmark, disabled New Game/Continue, version string
- GitHub Actions deploy workflow (DEPLOYMENT.md)
- `src/config/balance.ts` stub with `FEATURES`
- PROGRESS.md first entry

**Accept:**
- The live URL loads on an iPhone with the right fonts and colours.
- CI is green on push.
- No console errors.

## Stage 1 — Simulation core (headless)
**Goal:** the bank works in numbers before any UI.

**Build:**
- `state.ts` + `newGame(seed, cityId)`; rng streams; clock
- Macro for one country (§4) and rates (§5)
- Rivals as static price sheets and quality profiles only (for market reference and share)
- Staff and capacity (§6), awareness and campaigns (§7), ratings (§8), demand (§9)
- Books: deposits, amortizing loans, revolving, wealth, services (§10)
- Branch P&L (§12)
- Treasury §13.1–13.5 (auto overnight only)
- Statements (§14) and capital and tiers (§15)
- Commands: `leaseStorefront`, `buildBranch`, `setOffered`, `setPrice`, `setStaffTarget`, `setWage`, `setCampaignLevel`, `hireManager`, `setDelegation` (heuristics §17.1), `transferToTreasury`
- Generated lots for one city without art: a list of lots with district values
- `scripts/balance.ts` with strategies idle, steady, turtle and aggressive
- Determinism, balance-identity and save round-trip tests

**Accept:**
- `npm run balance -- --years 5 --strategy steady` prints a yearly table with branch-level checkpoints inside SIMULATION §25.
- All tests pass.

## Stage 2 — Playable loop in plain UI
**Goal:** play the founder phase on a phone, without the art map.

**Build:**
- Game loop with speeds and auto-pause
- HUD: cash, date, speed, menu
- New Game wizard (name, monogram, ink, founder name, start city)
- A temporary "city list" view (districts → lots) in place of the map
- Storefront panel and Build flow
- Branch panel, all five tabs, with the Loan Desk (§11)
- Weekly results modal (numbers and cash flow; Ledger placeholder)
- Company summary, Branches list
- Saves: autosave, 3 slots, export/import code
- Settings basics
- UI components from SCREENS §0.5 with simple styling

**Accept:**
- A two-game-year founder run works end to end on an iPhone.
- A save code moves between iPhone Safari and desktop Chrome.
- No console errors.

## Stage 3 — The city map (Banknote Deco v1)
**Goal:** replace the list view with the engraved isometric map.

**Build:**
- `citygen` (districts, streets, lots, special buildings, water, parks), seeded per city
- Isometric canvas renderer with chunk pre-render, pinch, pan and inertia, culling, devicePixelRatio
- DOM pins with clustering
- Layers sheet
- Tapping a pin opens its panel
- Rival branches placed on lots
- Procedural building styles per district
- City ink and paper treatment

**Accept:**
- Smooth panning (target 60 fps) on a recent iPhone in an L city.
- Every pin is tappable, and layer toggles persist.
- Sharp on retina screens.

## Stage 4 — HQ and operations depth
**Build:**
- Offices for lease
- HQ panel with floors
- Departments (§16.1–16.4) with the founder-mode ramp and wired effects
- HR benefits
- Products floor: house model, Manage Models, risk appetite, lineup and Apply-to-all, product development with the live odds table
- Credit bureaus on the map
- Treasury floor: policy, bonds with mark-to-market, funding market and inventory, central bank window
- Marketing floor: brand campaigns, agencies
- IT floor: app rating
- Risk floor: loss tables, regulator status, quarterly review

**Accept:**
- A steady 5-year run clearly needs an HQ, and understaffing visibly bites (delays, spreads, defaults).
- Funding lots mature correctly.
- Bonds lose value when rates rise.

## Stage 5 — Competition, macro and news
**Build:**
- Full rival AI (§18): expansion, closures, price wars, failures and distressed sales
- Rival branch and rival HQ panels, including corporate lending (§19.9)
- Central banks and meetings for every country in the data
- The Weekly Ledger generator, tabs and archive
- Incident system with every v1 incident and delegation
- Review card templates
- Payroll partnerships and the Employers layer (§13.7)
- Universities: student partnership and graduate program

**Accept:**
- Over 3 years the Ledger reads like a living paper, with correct numbers and no repeated template for the same subject in back-to-back weeks.
- A 10-year run includes at least one recession with visibly higher defaults.

## Stage 6 — Governance and capital markets
**Build:**
- Executive floor: board meeting and votes, dividends with regulator caps, CEO pay, seven executive seats (COO, CFO, CPO, CMO, CTO, CRO plus you) with delegation, grants and resignations
- Investment banks: Market, Equity and M&A
- Listed company simulation (§19.1)
- Your bank's valuation, private and public
- Private placement, IPO and listing, secondary offering
- Company and personal trading
- Rival M&A with regulator checks and 8-week integration
- Distressed sales

**Accept:**
- An IPO is achievable in years 3–6 of a steady run.
- The share price responds to earnings and incidents.
- After an acquisition the balance-identity test still passes, and the branches convert.

## Stage 7 — Investments and real estate
**Build:**
- Investment floor and portfolio
- Venture lifecycle (§20), startup detail and venture debt
- Conventions calendar and panels
- Real estate: buy, rent and sell, as company or personal
- REO from mortgage defaults
- Lobbying firms
- Currencies (FX) as an investment category: per-country index, positions as company or personal (SIMULATION §19.10)

**Accept:**
- Portfolio values tie out to the balance sheet and RWA.
- A convention appears on schedule, and its ventures can only be bought there.

## Stage 8 — Multi-city and travel
**Build:**
- Every v1 city and regional site generated on first visit
- Airports and departure boards with great-circle distances and the weekly mileage allowance (travel is never blocked: past the allowance a flight costs a fare)
- Play everywhere at once: any city, any time, every asset
- Flight animation
- Each country runs its own macro and central bank
- Remote management through the Branches list
- Private jet

**Accept:**
- Branches open in 3 countries.
- Each country's policy rate differs and drives its own branches' margins.

## Stage 9 — Personal empire
**Build:**
- Personal Wealth screen
- Homes
- Car dealer (showroom; the dealer financing tab was removed in the 2026-10-25 content trim)
- Auction houses: bidding, appraisal, counterfeits, consignment
- Sports franchise, simplified (§SCREENS 20)
- Rich list, insider-trading risk, milestones

**Accept:**
- Net worth ties out.
- A counterfeit can be bought and discovered.
- Kit sponsorship raises brand awareness in that country.

## Stage 10 — Art pass, onboarding, polish, launch
**Build:**
- The full Banknote Deco pass: vignettes for every panel, portrait generator, rosettes, coin ratings, Ledger styling, the signature weekly-results motion
- Optional sound
- Tutorial (SCREENS §27)
- Accessibility pass: contrast, text size, reduced motion, focus states
- Performance pass
- Balance pass across every strategy
- PWA: manifest, icons, offline cache, respecting the sub-path base
- Credits screen
- In a separate session in the hub repo, add a Frontier Lab card to Kelbo.Website

**Accept:**
- Lighthouse mobile ≥ 90.
- A new player finishes the tutorial in under 10 minutes.
- Balance targets are met for steady, turtle, aggressive and stress.
- No blocking bugs open.

---

## Backlog (post-launch ideas)
- ~~Share-for-share mergers and share buybacks~~ (built 2026-10-26, SIMULATION §19.6a, §19.8)
- FX between currencies
- An investment banking division of your own
- Office renovations and relocations
- A credit rating agency score for your lab
- Scenario mode (start in a recession, rescue a failing lab)
- Seasonal events
- Leaderboards via export codes
